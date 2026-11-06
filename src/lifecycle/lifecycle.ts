import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { execDetail } from "@serverkgg/bridge/utils";
import { CONTAINER_HOME } from "@serverkgg/bridge/wine";
import { reportOnline, reportStarting } from "../setup";
import {
	applyStartConfig,
	enshroudedProtonCommand,
	replayPendingSettings,
	roster,
	rosterSync,
	SERVER_EXE,
	SERVER_READY,
	START_WRAPPER,
	serverMetrics,
	WORLD_FILE,
	watchServerLog,
} from "../shared";
import { SERVER_PROCESS_SCRIPT, serverPidsOf, startArgs, WINE_PROCESS_SCRIPT } from "./enshroudedCommand";

export const STOP_TIMEOUT_SECONDS = 30;

export const STOP_SIGNAL = "-INT";

export const EXIT_WAIT_MS = 25_000;

export const EXIT_STEP_MS = 500;

export const STALE_PROCESS_WAIT_MS = 20_000;

export const STALE_PROCESS_STEP_MS = 1000;

const FIND_TIMEOUT_MS = 15_000;

const SIGNAL_TIMEOUT_MS = 15_000;

const MS_PER_SECOND = 1000;

let stopping: Promise<void> | null = null;

const listPids = async (context: Bridge.Context, script: string, subject: string): Promise<number[]> => {
	const found = await context.exec(
		[
			"sh",
			"-c",
			script,
		],
		{
			timeoutMs: FIND_TIMEOUT_MS,
		},
	);

	if (found.code !== 0) {
		context.log.warn(`could not list ${subject}`, {
			detail: execDetail(found),
		});

		return [];
	}

	return serverPidsOf(found.stdout);
};

export const serverPids = async (context: Bridge.Context): Promise<number[]> => {
	return await listPids(context, SERVER_PROCESS_SCRIPT, "the enshrouded process");
};

export const winePids = async (context: Bridge.Context): Promise<number[]> => {
	return await listPids(context, WINE_PROCESS_SCRIPT, "the wine processes");
};

interface PreviousInstance {
	server: number[];
	wine: number[];
}

const previousInstance = async (context: Bridge.Context): Promise<PreviousInstance> => {
	return {
		server: await serverPids(context),
		wine: await winePids(context),
	};
};

const isGone = (instance: PreviousInstance) => {
	return instance.server.length === 0 && instance.wine.length === 0;
};

const secondsSince = (startedAt: number) => {
	return Math.round((performance.now() - startedAt) / MS_PER_SECOND);
};

const instanceFields = (instance: PreviousInstance, startedAt: number) => {
	return {
		seconds: secondsSince(startedAt),
		serverPids: instance.server.join(", "),
		winePids: instance.wine.join(", "),
	};
};

export const awaitPreviousInstance = async (
	context: Bridge.Context,
	waitMs = STALE_PROCESS_WAIT_MS,
	stepMs = STALE_PROCESS_STEP_MS,
): Promise<void> => {
	const startedAt = performance.now();
	const found = await previousInstance(context);

	if (isGone(found)) {
		return;
	}

	let remaining = found;

	while (!isGone(remaining) && performance.now() - startedAt < waitMs) {
		await Bun.sleep(stepMs);

		remaining = await previousInstance(context);
	}

	if (!isGone(remaining)) {
		context.log.warn(
			"the previous enshrouded instance is still running, launching anyway",
			instanceFields(remaining, startedAt),
		);

		return;
	}

	context.log("waited for the previous enshrouded instance to end before launching", instanceFields(found, startedAt));
};

export const awaitExit = async (
	context: Bridge.Context,
	pid: number,
	waitMs = EXIT_WAIT_MS,
	stepMs = EXIT_STEP_MS,
): Promise<boolean> => {
	const startedAt = performance.now();

	while (performance.now() - startedAt < waitMs) {
		const pids = await serverPids(context);

		if (!pids.includes(pid)) {
			return true;
		}

		await Bun.sleep(stepMs);
	}

	return false;
};

export const worldModifiedAt = async (context: Bridge.Context): Promise<string | null> => {
	const entries = await context.files.list(WORLD_FILE);

	return entries.find((entry) => entry.path === WORLD_FILE)?.modifiedAt ?? null;
};

const signalServer = async (context: Bridge.Context, pid: number) => {
	const signalled = await context.exec(
		[
			"kill",
			STOP_SIGNAL,
			String(pid),
		],
		{
			timeoutMs: SIGNAL_TIMEOUT_MS,
		},
	);

	if (signalled.code !== 0) {
		context.log.warn("could not signal enshrouded, letting the supervisor stop the group", {
			detail: execDetail(signalled),
			pid,
		});

		return false;
	}

	return true;
};

export const shutdown = async (context: Bridge.Context, waitMs = EXIT_WAIT_MS, stepMs = EXIT_STEP_MS) => {
	context.emit(BridgeEventName.ServerStopping);
	roster.clear();
	rosterSync.sync(context, []);
	serverMetrics.clear();

	const pids = await serverPids(context);
	const pid = pids.at(0);

	if (pid === undefined) {
		context.log.warn("found no enshrouded process to stop, letting the supervisor stop the group");

		return;
	}

	if (pids.length > 1) {
		context.log.warn("found more than one enshrouded process, stopping the first", {
			pids: pids.join(", "),
		});
	}

	const before = await worldModifiedAt(context);
	const startedAt = performance.now();

	if (!(await signalServer(context, pid))) {
		return;
	}

	const exited = await awaitExit(context, pid, waitMs, stepMs);
	const after = await worldModifiedAt(context);
	const saved = after !== null && after !== before;

	context.log(exited ? "enshrouded shut down" : "enshrouded is still shutting down, leaving it to the supervisor", {
		pid,
		saved,
		seconds: secondsSince(startedAt),
	});

	if (saved) {
		context.emit(BridgeEventName.WorldSaved);
	}
};

export const lifecycle: Bridge.Lifecycle = {
	kind: BridgeKind.Lifecycle,
	ready: SERVER_READY,
	stopTimeoutSeconds: STOP_TIMEOUT_SECONDS,
	async command(context) {
		watchServerLog(context);
		roster.clear();
		serverMetrics.clear();

		await awaitPreviousInstance(context);
		await replayPendingSettings(context);
		await applyStartConfig(context);
		await reportStarting(context);

		return [
			START_WRAPPER,
			CONTAINER_HOME,
			...(await enshroudedProtonCommand(context, SERVER_EXE, startArgs())),
		];
	},
	async onReady(context) {
		serverMetrics.markReady();

		await reportOnline(context, true);
	},
	async stop(context) {
		stopping ??= shutdown(context).finally(() => {
			stopping = null;
		});

		await stopping;
	},
};
