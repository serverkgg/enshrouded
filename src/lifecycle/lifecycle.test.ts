import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { CONFIG_FILE, QUERY_PORT, START_WRAPPER, WORLD_FILE } from "../shared";
import { memoryContext } from "../testing";
import { SERVER_PROCESS_SCRIPT, WINE_PROCESS_SCRIPT } from "./enshroudedCommand";
import { awaitPreviousInstance, lifecycle, STOP_TIMEOUT_SECONDS, shutdown } from "./lifecycle";

const CONFIG = JSON.stringify({
	name: "Embervale",
	queryPort: 15_637,
});

const PORTS = {
	[QUERY_PORT]: 9401,
};

const QUICK_WAIT_MS = 30;

const SAVED_BEFORE = "2026-11-06T11:38:03.797Z";

const SAVED_AT_STOP = "2026-11-06T11:38:08.329Z";

const QUICK_STEP_MS = 5;

const isServerSearch = (command: string[]) => {
	return command[0] === "sh" && command[2] === SERVER_PROCESS_SCRIPT;
};

const isWineSearch = (command: string[]) => {
	return command[0] === "sh" && command[2] === WINE_PROCESS_SCRIPT;
};

const answer = (stdout: string) => {
	return {
		code: 0,
		stderr: "",
		stdout,
	};
};

describe("starting enshrouded", () => {
	it("runs the binary in the prefix from the install root through the wrapper", async () => {
		const { context } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
			},
			ports: PORTS,
		});

		const argv = await lifecycle.command(context);

		expect(argv.slice(0, 2)).toEqual([
			START_WRAPPER,
			"/home/container",
		]);
		expect(argv).toContain("runinprefix");
		expect(argv.at(-1)).toBe("/home/container/enshrouded_server.exe");
	});

	it("writes the allocated port and the bind address into the config before the start", async () => {
		const { context, files } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
			},
			ports: PORTS,
		});

		await lifecycle.command(context);

		expect(JSON.parse(files.get(CONFIG_FILE) ?? "{}")).toMatchObject({
			ip: "0.0.0.0",
			name: "Embervale",
			queryPort: 9401,
		});
	});

	it("replays the settings saved while the server ran before it writes the port", async () => {
		const { context, files } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsBaseline: {
						secrets: {},
						values: {
							name: "Embervale",
						},
					},
					settingsPending: {
						name: "Shroud Keep",
						queryPort: 1,
					},
				}),
			},
			ports: PORTS,
		});

		await lifecycle.command(context);

		expect(JSON.parse(files.get(CONFIG_FILE) ?? "{}")).toMatchObject({
			name: "Shroud Keep",
			queryPort: 9401,
		});
	});
});

describe("waiting for the previous enshrouded instance before a start", () => {
	it("waits for a lingering wineserver even when the server binary is already gone", async () => {
		let wineAnswers = 0;

		const { commands, context, logged } = memoryContext({
			exec: (command) => {
				if (isWineSearch(command)) {
					wineAnswers += 1;

					return answer(wineAnswers <= 1 ? "77\n81\n" : "");
				}

				return answer("");
			},
		});

		await awaitPreviousInstance(context, QUICK_WAIT_MS, QUICK_STEP_MS);

		expect(commands.filter(isWineSearch)).toHaveLength(2);
		expect(logged.at(-1)).toMatchObject({
			fields: {
				serverPids: "",
				winePids: "77, 81",
			},
			level: "info",
			message: "waited for the previous enshrouded instance to end before launching",
		});
	});
});

describe("stopping enshrouded", () => {
	it("declares no stop signal, so the supervisor waits for the driver to end the server", () => {
		expect(lifecycle.stopSignal).toBeUndefined();
		expect(STOP_TIMEOUT_SECONDS).toBeLessThanOrEqual(180);
	});

	it("interrupts only the server process and reports the save the shutdown writes", async () => {
		let signalled = false;

		const memory = memoryContext({
			exec: (command) => {
				if (command[0] === "kill") {
					signalled = true;
					memory.modified.set(WORLD_FILE, SAVED_AT_STOP);

					return answer("");
				}

				return answer(isServerSearch(command) && !signalled ? "308\n" : "");
			},
			files: {
				[WORLD_FILE]: "ksd",
			},
			modified: {
				[WORLD_FILE]: SAVED_BEFORE,
			},
		});

		await shutdown(memory.context, QUICK_WAIT_MS, QUICK_STEP_MS);

		expect(memory.commands.filter((command) => command[0] === "kill")).toEqual([
			[
				"kill",
				"-INT",
				"308",
			],
		]);
		expect(memory.emits.map((entry) => entry.event)).toEqual([
			BridgeEventName.ServerStopping,
			BridgeEventName.WorldSaved,
		]);
	});

	it("reports no save when the world file did not change during the shutdown", async () => {
		let signalled = false;

		const { context, emits } = memoryContext({
			exec: (command) => {
				if (command[0] === "kill") {
					signalled = true;
				}

				return answer(isServerSearch(command) && !signalled ? "308\n" : "");
			},
			files: {
				[WORLD_FILE]: "ksd",
			},
			modified: {
				[WORLD_FILE]: SAVED_BEFORE,
			},
		});

		await shutdown(context, QUICK_WAIT_MS, QUICK_STEP_MS);

		expect(emits.map((entry) => entry.event)).toEqual([
			BridgeEventName.ServerStopping,
		]);
	});

	it("reports no save when the server dies before it writes a world", async () => {
		let signalled = false;

		const { context, emits } = memoryContext({
			exec: (command) => {
				if (command[0] === "kill") {
					signalled = true;
				}

				return answer(isServerSearch(command) && !signalled ? "308\n" : "");
			},
		});

		await shutdown(context, QUICK_WAIT_MS, QUICK_STEP_MS);

		expect(emits.map((entry) => entry.event)).toEqual([
			BridgeEventName.ServerStopping,
		]);
	});

	it("sends no signal when the server process is already gone", async () => {
		const { commands, context } = memoryContext();

		await lifecycle.stop?.(context);

		expect(commands.every((command) => command[0] !== "kill")).toBe(true);
	});
});
