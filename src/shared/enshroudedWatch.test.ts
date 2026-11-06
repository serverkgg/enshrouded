import { describe, expect, it } from "bun:test";
import {
	JOIN_FIXTURE,
	JOIN_LOG,
	LEAVE_LOG,
	memoryContext,
	PEER_REMOVED_FIXTURE,
	STEAM_CONNECTED_FIXTURE,
	STEAM_ID_FIXTURE,
	VERSION_FIXTURE,
} from "../testing";
import { roster } from "./enshroudedRoster";
import { createMetrics, serverMetrics, watchServerLog } from "./enshroudedWatch";

describe("watching the enshrouded log", () => {
	it("pairs the steam id to the name from a real join, and drops the player on the real leave", () => {
		const { context, logLine } = memoryContext();

		roster.clear();
		watchServerLog(context);

		for (const line of JOIN_LOG) {
			logLine(line);
		}

		expect(roster.all()).toEqual([
			{
				avatarHash: null,
				joinedAt: expect.any(Number),
				player: "Meslzy",
				steamId: STEAM_ID_FIXTURE,
			},
		]);

		for (const line of LEAVE_LOG) {
			logLine(line);
		}

		expect(roster.all()).toEqual([]);
	});

	it("drops the player on the removed peer line when the remove player line never came", () => {
		const { context, logLine } = memoryContext();

		roster.clear();
		watchServerLog(context);

		for (const line of JOIN_LOG) {
			logLine(line);
		}

		logLine(PEER_REMOVED_FIXTURE);

		expect(roster.all()).toEqual([]);
	});

	it("joins a player under the name when no machine login came before the name line", () => {
		const { context, logLine } = memoryContext();

		roster.clear();
		watchServerLog(context);
		logLine(JOIN_FIXTURE);

		expect(roster.all()).toEqual([
			{
				avatarHash: null,
				joinedAt: expect.any(Number),
				player: "Meslzy",
				steamId: null,
			},
		]);

		roster.clear();
	});

	it("records the steam connection and the game version, raising no event", () => {
		const { context, emits, logLine } = memoryContext();

		serverMetrics.clear();
		watchServerLog(context);
		logLine(STEAM_CONNECTED_FIXTURE);
		logLine(VERSION_FIXTURE);

		const snapshot = serverMetrics.snapshot();

		expect(snapshot.steamConnectedAt).not.toBeNull();
		expect(snapshot.gameVersion).toBe("1287369");
		expect(emits).toEqual([]);
	});

	it("follows the log once per context however often it is called", () => {
		const { context, followers } = memoryContext();

		watchServerLog(context);
		watchServerLog(context);

		expect(followers.size).toBe(7);
	});
});

describe("the metrics the log feeds", () => {
	it("counts the uptime from the ready line", () => {
		const metrics = createMetrics();

		expect(metrics.snapshot(5000).uptimeSeconds).toBeNull();

		metrics.markReady(1000);

		expect(metrics.snapshot(91_000).uptimeSeconds).toBe(90);
	});

	it("forgets the whole run on clear, the steam connection included", () => {
		const metrics = createMetrics();

		metrics.markReady(1000);
		metrics.recordPlayers(2, 16);
		metrics.recordSteam(3000);
		metrics.recordVersion("812345");
		metrics.clear();

		expect(metrics.snapshot(4000)).toEqual({
			gameVersion: null,
			max: null,
			online: null,
			readyAt: null,
			steamConnectedAt: null,
			uptimeSeconds: null,
		});
	});
});
