import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { PORT_BIND_FAILED_LINE, SERVER_READY, STEAM_FAILURE_LINE, WINE_CRASH_LINE } from "../shared";

const EVENTS_RAISED_BY_ROSTER_SYNC = [
	BridgeEventName.PlayerJoined,
	BridgeEventName.PlayerLeft,
];

const EVENTS_RAISED_AS_ACTIVITY = [
	BridgeEventName.GameInstalled,
	BridgeEventName.SettingsApplied,
	BridgeEventName.WorldWiped,
	BridgeEventName.WorldImported,
];

export const detailOf = (pattern: RegExp) => {
	return new RegExp(`(?<detail>${pattern.source})`, pattern.flags);
};

export const events: Bridge.Events = {
	kind: BridgeKind.Events,
	emits: [
		...EVENTS_RAISED_BY_ROSTER_SYNC,
		...EVENTS_RAISED_AS_ACTIVITY,
		BridgeEventName.ServerStopping,
		BridgeEventName.ServerUpdated,
		BridgeEventName.WorldSaved,
	],
	patterns: [
		{
			emit: BridgeEventName.ServerStarted,
			match: SERVER_READY,
		},
		{
			emit: BridgeEventName.ServerCrashed,
			match: detailOf(STEAM_FAILURE_LINE),
		},
		{
			emit: BridgeEventName.ServerCrashed,
			match: WINE_CRASH_LINE,
		},
		{
			emit: BridgeEventName.PortBindFailed,
			match: PORT_BIND_FAILED_LINE,
		},
	],
};
