import type { Bridge } from "@serverkgg/bridge";
import {
	JOIN_LINE,
	LEAVE_LINE,
	PEER_ADDED_LINE,
	PEER_REMOVED_LINE,
	PLAYER_HANDLE_LINE,
	parseJoin,
	parseLeave,
	parsePeerAdded,
	parsePeerRemoved,
	parsePlayerHandle,
	parseVersion,
	STEAM_CONNECTED_LINE,
	VERSION_LINE,
} from "./enshroudedLog";
import { roster } from "./enshroudedRoster";

const MILLISECONDS_PER_SECOND = 1000;

export interface EnshroudedMetricsSnapshot {
	readyAt: number | null;
	online: number | null;
	max: number | null;
	steamConnectedAt: number | null;
	gameVersion: string | null;
	uptimeSeconds: number | null;
}

export interface EnshroudedMetrics {
	markReady(at?: number): void;
	recordPlayers(online: number | null, max: number | null): void;
	recordSteam(at?: number): void;
	recordVersion(version: string): void;
	snapshot(at?: number): EnshroudedMetricsSnapshot;
	clear(): void;
}

export const createMetrics = (): EnshroudedMetrics => {
	let readyAt: number | null = null;
	let online: number | null = null;
	let max: number | null = null;
	let steamConnectedAt: number | null = null;
	let gameVersion: string | null = null;

	return {
		markReady(at = Date.now()) {
			readyAt = at;
		},

		recordPlayers(count, limit) {
			online = count;
			max = limit;
		},

		recordSteam(at = Date.now()) {
			steamConnectedAt = at;
		},

		recordVersion(version) {
			gameVersion = version;
		},

		snapshot(at = Date.now()) {
			return {
				gameVersion,
				max,
				online,
				readyAt,
				steamConnectedAt,
				uptimeSeconds: readyAt === null ? null : Math.max(0, Math.floor((at - readyAt) / MILLISECONDS_PER_SECOND)),
			};
		},

		clear() {
			readyAt = null;
			online = null;
			max = null;
			steamConnectedAt = null;
			gameVersion = null;
		},
	};
};

export const serverMetrics = createMetrics();

const watched = new WeakSet<Bridge.Context>();

const lineOf = (match: RegExpMatchArray) => {
	return match.at(0) ?? "";
};

export const watchServerLog = (context: Bridge.Context) => {
	if (watched.has(context)) {
		return;
	}

	watched.add(context);

	context.logs.follow(PEER_ADDED_LINE, (match) => {
		const peer = parsePeerAdded(lineOf(match));

		if (peer) {
			roster.peer(peer);
		}
	});

	context.logs.follow(PLAYER_HANDLE_LINE, (match) => {
		const handle = parsePlayerHandle(lineOf(match));

		if (handle) {
			roster.handle(handle);
		}
	});

	context.logs.follow(JOIN_LINE, (match) => {
		const joined = parseJoin(lineOf(match));

		if (joined) {
			roster.join(joined);
		}
	});

	context.logs.follow(LEAVE_LINE, (match) => {
		const left = parseLeave(lineOf(match));

		if (left) {
			roster.leave(left);
		}
	});

	context.logs.follow(PEER_REMOVED_LINE, (match) => {
		const removed = parsePeerRemoved(lineOf(match));

		if (removed) {
			roster.drop(removed);
		}
	});

	context.logs.follow(STEAM_CONNECTED_LINE, () => {
		serverMetrics.recordSteam();
	});

	context.logs.follow(VERSION_LINE, (match) => {
		const version = parseVersion(lineOf(match));

		if (version !== null) {
			serverMetrics.recordVersion(version);
		}
	});
};
