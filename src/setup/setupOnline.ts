import { type Bridge, BridgeSetupPromptKind, BridgeSetupStepState } from "@serverkgg/bridge";
import {
	type EnshroudedMetricsSnapshot,
	type EnshroudedStamp,
	patchEnshroudedStamp,
	readEnshroudedStamp,
	serverMetrics,
} from "../shared";

export const ONLINE_STEP = "online";

export const CHECK_ACTION = "check";

export enum OnlinePhase {
	Online = "online",
	Stopped = "stopped",
	Starting = "starting",
	Pending = "pending",
	NoSteam = "no-steam",
}

export interface OnlineState {
	running: boolean;
	stamp: EnshroudedStamp;
	snapshot: EnshroudedMetricsSnapshot;
}

const CHECK: Bridge.SetupAction = {
	id: CHECK_ACTION,
	label: {
		ar: "تحقق مرة ثانية",
		en: "Check again",
	},
};

const STOPPED_MESSAGE: Bridge.Text = {
	ar: "سيرفرك متوقف. شغّله، وتكتمل هذه الخطوة وحدها عندما يتصل بـ Steam ويفتح الماب.",
	en: "Your server is stopped. Start it, and this step finishes by itself once it reaches Steam and opens the world.",
};

const STARTING_MESSAGE: Bridge.Text = {
	ar: "جاري تشغيل سيرفرك. تكتمل هذه الخطوة وحدها عندما يتصل بـ Steam ويفتح الماب، عطه لحظة.",
	en: "Your server is starting. This step finishes by itself once it reaches Steam and opens the world.",
};

const PENDING_MESSAGE: Bridge.Text = {
	ar: "تُطبَّق إعداداتك الجديدة بعد الريستارت. نفّذ ريستارت لسيرفرك، وتكتمل هذه الخطوة عندما يعود متصلًا.",
	en: "Your new settings apply after a restart. Restart your server, and this step finishes once it's back online.",
};

const NO_STEAM_MESSAGE: Bridge.Text = {
	ar: "فتح سيرفرك الماب لكنه لم يتصل بـ Steam، فلا يظهر في قائمة Join. افتح الكونسول لترى السبب، ثم نفّذ ريستارت.",
	en: "Your server opened the world but didn't reach Steam, so it doesn't show in the Join list. Open the console to see why, then restart it.",
};

const pendingOf = (stamp: EnshroudedStamp) => {
	return Object.keys(stamp.settingsPending).length > 0;
};

export const provenOf = (stamp: EnshroudedStamp) => {
	const { onlineAt, settingsWrittenAt } = stamp;

	if (onlineAt === null || pendingOf(stamp)) {
		return false;
	}

	return settingsWrittenAt === null || Date.parse(onlineAt) >= Date.parse(settingsWrittenAt);
};

export const onlinePhaseOf = (state: OnlineState): OnlinePhase => {
	const { running, snapshot, stamp } = state;

	if (provenOf(stamp)) {
		return OnlinePhase.Online;
	}

	if (!running) {
		return OnlinePhase.Stopped;
	}

	if (pendingOf(stamp)) {
		return OnlinePhase.Pending;
	}

	if (snapshot.readyAt === null) {
		return OnlinePhase.Starting;
	}

	return snapshot.steamConnectedAt === null ? OnlinePhase.NoSteam : OnlinePhase.Online;
};

const stepsOf = (state: BridgeSetupStepState): Bridge.SetupStepStatus[] => {
	return [
		{
			id: ONLINE_STEP,
			state,
		},
	];
};

export const onlineRuntimeOf = (phase: OnlinePhase): Bridge.SetupRuntime => {
	switch (phase) {
		case OnlinePhase.Online: {
			return {
				prompt: null,
				steps: stepsOf(BridgeSetupStepState.Done),
			};
		}

		case OnlinePhase.Stopped: {
			return {
				prompt: {
					actions: [
						CHECK,
					],
					kind: BridgeSetupPromptKind.Action,
					message: STOPPED_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Active),
			};
		}

		case OnlinePhase.Starting: {
			return {
				prompt: {
					kind: BridgeSetupPromptKind.Wait,
					message: STARTING_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Active),
			};
		}

		case OnlinePhase.Pending: {
			return {
				prompt: {
					actions: [
						CHECK,
					],
					kind: BridgeSetupPromptKind.Action,
					message: PENDING_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Active),
			};
		}

		case OnlinePhase.NoSteam: {
			return {
				prompt: {
					actions: [
						CHECK,
					],
					kind: BridgeSetupPromptKind.Failed,
					message: NO_STEAM_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Failed),
			};
		}
	}
};

export const reportOnline = async (context: Bridge.Context, automatic = false): Promise<OnlinePhase> => {
	const stamp = await readEnshroudedStamp(context);
	const phase = onlinePhaseOf({
		running: context.server.running,
		snapshot: serverMetrics.snapshot(),
		stamp,
	});

	if (phase === OnlinePhase.Online && !provenOf(stamp)) {
		await patchEnshroudedStamp(context, {
			onlineAt: new Date().toISOString(),
		});
	}

	if (automatic && phase !== OnlinePhase.Online && stamp.onlineAt !== null) {
		return phase;
	}

	context.setup.report(onlineRuntimeOf(phase));

	return phase;
};

export const reportStarting = async (context: Bridge.Context) => {
	const stamp = await readEnshroudedStamp(context);

	if (provenOf(stamp)) {
		context.setup.report(onlineRuntimeOf(OnlinePhase.Online));

		return;
	}

	if (stamp.onlineAt === null) {
		context.setup.report(onlineRuntimeOf(OnlinePhase.Starting));
	}
};
