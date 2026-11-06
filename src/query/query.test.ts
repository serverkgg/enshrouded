import { describe, expect, it } from "bun:test";
import type { Bridge } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { CONFIG_FILE, QUERY_PORT, roster, rosterSync, serverMetrics } from "../shared";
import { AVATAR_HASH_FIXTURE, type MemoryContextOptions, memoryContext, steamSummariesOf } from "../testing";
import { maxPlayersOf, query } from "./query";

const QUERY_HOST_PORT = 9401;

type A2s = Bridge.Context["probe"]["a2s"];

const sampled = (a2s: A2s, options: MemoryContextOptions = {}) => {
	const memory = memoryContext({
		...options,
		ports: {
			[QUERY_PORT]: QUERY_HOST_PORT,
		},
		running: true,
	});

	memory.context.probe = {
		a2s,
	} as unknown as Bridge.Context["probe"];

	return memory;
};

const answering = (online: number, max: number): A2s => {
	return async () => {
		return {
			latencyMs: 4,
			map: null,
			name: "Embervale",
			players: {
				max,
				online,
			},
		};
	};
};

const silent: A2s = async () => {
	throw new Error("a2s timed out");
};

describe("sampling the player count", () => {
	it("asks a2s on the query port for the count and the slots, and records them for the health card", async () => {
		const ports: number[] = [];
		const { context } = sampled(async (port) => {
			ports.push(port);

			return await answering(3, 16)(port);
		});

		roster.clear();
		rosterSync.clear();

		expect(await query.sample(context)).toEqual({
			max: 16,
			online: 3,
			tick: null,
		});
		expect(ports).toEqual([
			QUERY_HOST_PORT,
		]);
		expect(serverMetrics.snapshot().online).toBe(3);
	});

	it("falls back to the roster and the configured slots when a2s does not answer, warning once", async () => {
		const { context, logged } = sampled(silent, {
			files: {
				[CONFIG_FILE]: JSON.stringify({
					slotCount: 6,
				}),
			},
		});

		roster.clear();
		rosterSync.clear();
		roster.join({
			player: "Mohammed",
		});

		expect(await query.sample(context)).toEqual({
			max: 6,
			online: 1,
			tick: null,
		});

		await query.sample(context);

		expect(logged.filter((entry) => entry.level === "warn")).toHaveLength(1);

		roster.clear();
		rosterSync.clear();
	});

	it("raises the join and the leave from the roster on each sample", async () => {
		const { context, emits } = sampled(answering(1, 16));

		roster.clear();
		rosterSync.clear();
		roster.join({
			player: "Mohammed",
		});
		await query.sample(context);

		expect(emits).toEqual([
			{
				event: BridgeEventName.PlayerJoined,
				payload: {
					player: "Mohammed",
				},
			},
		]);

		roster.clear();
		await query.sample(context);

		expect(emits.at(-1)).toEqual({
			event: BridgeEventName.PlayerLeft,
			payload: {
				player: "Mohammed",
			},
		});
	});

	it("raises the join with the steam id and the avatar the steam web api gave, while the platform key is set", async () => {
		const steamId = "76561198000000021";
		const { context, emits } = sampled(answering(1, 16), {
			json: () => steamSummariesOf(steamId, AVATAR_HASH_FIXTURE),
			secrets: {
				STEAM_WEB_API_KEY: "platform-key",
			},
		});

		roster.clear();
		rosterSync.clear();
		roster.peer({
			index: 0,
			steamId,
		});
		roster.handle({
			index: 0,
		});
		roster.join({
			player: "Meslzy",
		});
		await query.sample(context);

		expect(emits).toEqual([
			{
				event: BridgeEventName.PlayerJoined,
				payload: {
					avatarHash: AVATAR_HASH_FIXTURE,
					player: "Meslzy",
					steamId,
				},
			},
		]);

		roster.clear();
		rosterSync.clear();
	});

	it("reads the slots the way the game clamps them, defaulting to sixteen", () => {
		expect(maxPlayersOf({})).toBe(16);
		expect(
			maxPlayersOf({
				slotCount: 40,
			}),
		).toBe(16);
		expect(
			maxPlayersOf({
				slotCount: 0,
			}),
		).toBe(1);
	});

	it("counts the roster with no limit when the config cannot be read", async () => {
		const { context } = sampled(silent, {
			files: {
				[CONFIG_FILE]: "{ not json",
			},
		});

		roster.clear();
		rosterSync.clear();

		expect(await query.sample(context)).toEqual({
			max: null,
			online: 0,
			tick: null,
		});
	});
});
