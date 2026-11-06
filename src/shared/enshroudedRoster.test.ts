import { describe, expect, it } from "bun:test";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	AVATAR_HASH_FIXTURE,
	JOIN_FIXTURE,
	LEAVE_FIXTURE,
	memoryContext,
	PEER_ADDED_FIXTURE,
	PEER_REMOVED_FIXTURE,
	PLAYER_HANDLE_FIXTURE,
	STEAM_ID_FIXTURE,
	steamSummariesOf,
} from "../testing";
import { parseJoin, parseLeave, parsePeerAdded, parsePeerRemoved, parsePlayerHandle } from "./enshroudedLog";
import { createRoster, enrichRoster, playerKeyOf, presenceOf, roster, rosterSync } from "./enshroudedRoster";

const OTHER_STEAM_ID = "76561198000000002";

const STEAM_KEY = {
	STEAM_WEB_API_KEY: "platform-key",
};

const joinedWith = (steamId: string) => {
	const joining = createRoster();

	joining.peer({
		index: 0,
		steamId,
	});
	joining.handle({
		index: 0,
	});
	joining.join(
		{
			player: "Meslzy",
		},
		1000,
	);

	return joining;
};

const seatGlobal = (steamId: string) => {
	roster.clear();
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
};

describe("the roster the log builds", () => {
	it("pairs the steam id to the name through the player index of the real lines, and keys the row by it", () => {
		const paired = createRoster();
		const peer = parsePeerAdded(PEER_ADDED_FIXTURE);
		const handle = parsePlayerHandle(PLAYER_HANDLE_FIXTURE);
		const joined = parseJoin(JOIN_FIXTURE);
		const left = parseLeave(LEAVE_FIXTURE);

		if (peer === null || handle === null || joined === null || left === null) {
			throw new Error("the join and leave fixtures do not parse");
		}

		paired.peer(peer);
		paired.handle(handle);
		paired.join(joined, 1000);

		expect(paired.all()).toEqual([
			{
				avatarHash: null,
				joinedAt: 1000,
				player: "Meslzy",
				steamId: STEAM_ID_FIXTURE,
			},
		]);
		expect(paired.all().map(playerKeyOf)).toEqual([
			STEAM_ID_FIXTURE,
		]);

		paired.leave(left);

		expect(paired.all()).toEqual([]);
	});

	it("joins a name line with no pending index under the name and no steam id, so the player is never dropped", () => {
		const unpaired = createRoster();

		unpaired.join(
			{
				player: "Sara",
			},
			1000,
		);

		expect(unpaired.all()).toEqual([
			{
				avatarHash: null,
				joinedAt: 1000,
				player: "Sara",
				steamId: null,
			},
		]);
		expect(unpaired.all().map(playerKeyOf)).toEqual([
			"Sara",
		]);
	});

	it("joins under the name when the pending index has no added peer", () => {
		const unpaired = createRoster();

		unpaired.handle({
			index: 3,
		});
		unpaired.join({
			player: "Sara",
		});

		expect(unpaired.all().map((player) => player.steamId)).toEqual([
			null,
		]);
	});

	it("spends a pending index on one name line, so the next name line joins under its name", () => {
		const paired = joinedWith(STEAM_ID_FIXTURE);

		paired.join({
			player: "Sara",
		});

		expect(paired.all().map(playerKeyOf)).toEqual([
			STEAM_ID_FIXTURE,
			"Sara",
		]);
	});

	it("pairs two players by their own indexes", () => {
		const paired = createRoster();

		paired.peer({
			index: 0,
			steamId: STEAM_ID_FIXTURE,
		});
		paired.peer({
			index: 1,
			steamId: OTHER_STEAM_ID,
		});
		paired.handle({
			index: 1,
		});
		paired.join({
			player: "Omar",
		});
		paired.handle({
			index: 0,
		});
		paired.join({
			player: "Meslzy",
		});

		expect(
			paired.all().map((player) => {
				return [
					player.player,
					player.steamId,
				];
			}),
		).toEqual([
			[
				"Omar",
				OTHER_STEAM_ID,
			],
			[
				"Meslzy",
				STEAM_ID_FIXTURE,
			],
		]);
	});

	it("drops the player by index on the removed peer line when the remove player line was missed", () => {
		const paired = joinedWith(STEAM_ID_FIXTURE);
		const removed = parsePeerRemoved(PEER_REMOVED_FIXTURE);

		if (removed === null) {
			throw new Error("the removed peer fixture does not parse");
		}

		paired.drop(removed);

		expect(paired.all()).toEqual([]);
	});

	it("leaves two players who share a name to the removed peer line, which drops the right one", () => {
		const paired = createRoster();

		paired.peer({
			index: 0,
			steamId: STEAM_ID_FIXTURE,
		});
		paired.peer({
			index: 1,
			steamId: OTHER_STEAM_ID,
		});
		paired.handle({
			index: 0,
		});
		paired.join({
			player: "Ahmed",
		});
		paired.handle({
			index: 1,
		});
		paired.join({
			player: "Ahmed",
		});
		paired.leave({
			player: "Ahmed",
		});

		expect(paired.all()).toHaveLength(2);

		paired.drop({
			index: 1,
		});

		expect(paired.all().map(playerKeyOf)).toEqual([
			STEAM_ID_FIXTURE,
		]);
	});

	it("does nothing on the removed peer line after the remove player line already dropped the player", () => {
		const paired = joinedWith(STEAM_ID_FIXTURE);

		paired.peer({
			index: 1,
			steamId: OTHER_STEAM_ID,
		});
		paired.handle({
			index: 1,
		});
		paired.join({
			player: "Omar",
		});
		paired.leave({
			player: "Meslzy",
		});
		paired.drop({
			index: 0,
		});

		expect(paired.all().map((player) => player.player)).toEqual([
			"Omar",
		]);
	});

	it("keeps the first join time when the same steam id joins again", () => {
		const paired = joinedWith(STEAM_ID_FIXTURE);

		paired.handle({
			index: 0,
		});
		paired.join(
			{
				player: "Meslzy",
			},
			2000,
		);

		expect(paired.all().map((player) => player.joinedAt)).toEqual([
			1000,
		]);
	});

	it("ignores a leave line for a player it never saw join", () => {
		const unpaired = createRoster();

		unpaired.join({
			player: "Sara",
		});
		unpaired.leave({
			player: "Mohammed",
		});

		expect(unpaired.all().map(playerKeyOf)).toEqual([
			"Sara",
		]);
	});

	it("forgets the peers and the pending index on clear", () => {
		const cleared = createRoster();

		cleared.peer({
			index: 0,
			steamId: STEAM_ID_FIXTURE,
		});
		cleared.handle({
			index: 0,
		});
		cleared.clear();
		cleared.join({
			player: "Meslzy",
		});

		expect(cleared.all().map((player) => player.steamId)).toEqual([
			null,
		]);
	});

	it("sets the avatar hash steam gave for a player's steam id", () => {
		const paired = joinedWith(STEAM_ID_FIXTURE);

		paired.join({
			player: "Sara",
		});
		paired.describe(
			new Map([
				[
					STEAM_ID_FIXTURE,
					AVATAR_HASH_FIXTURE,
				],
			]),
		);

		expect(paired.all().map((player) => player.avatarHash)).toEqual([
			AVATAR_HASH_FIXTURE,
			null,
		]);
	});
});

describe("the presence the roster sends", () => {
	it("sends the name, the steam id and the avatar hash the manifest declares", () => {
		expect(
			presenceOf({
				avatarHash: AVATAR_HASH_FIXTURE,
				joinedAt: 0,
				player: "Meslzy",
				steamId: STEAM_ID_FIXTURE,
			}),
		).toEqual({
			avatarHash: AVATAR_HASH_FIXTURE,
			player: "Meslzy",
			steamId: STEAM_ID_FIXTURE,
		});
	});

	it("leaves the steam id and the avatar out while they are unknown", () => {
		expect(
			presenceOf({
				avatarHash: null,
				joinedAt: 0,
				player: "Sara",
				steamId: null,
			}),
		).toEqual({
			player: "Sara",
		});
	});

	it("raises the join and the leave through the roster sync", () => {
		const { context, emits } = memoryContext();
		const player = {
			avatarHash: null,
			joinedAt: 0,
			player: "Meslzy",
			steamId: STEAM_ID_FIXTURE,
		};

		rosterSync.clear();
		rosterSync.sync(context, [
			player,
		]);
		rosterSync.sync(context, []);

		expect(emits).toEqual([
			{
				event: BridgeEventName.PlayerJoined,
				payload: {
					player: "Meslzy",
					steamId: STEAM_ID_FIXTURE,
				},
			},
			{
				event: BridgeEventName.PlayerLeft,
				payload: {
					player: "Meslzy",
					steamId: STEAM_ID_FIXTURE,
				},
			},
		]);
	});
});

describe("the steam avatars of the roster", () => {
	it("reads the avatar hash from the steam web api while the platform key is set", async () => {
		const steamId = "76561198000000011";
		const { context, requests } = memoryContext({
			json: () => steamSummariesOf(steamId, AVATAR_HASH_FIXTURE),
			secrets: STEAM_KEY,
		});

		seatGlobal(steamId);
		await enrichRoster(context);

		expect(roster.all().map((player) => player.avatarHash)).toEqual([
			AVATAR_HASH_FIXTURE,
		]);
		expect(requests).toHaveLength(1);
		expect(requests.at(0)).toContain(`steamids=${steamId}`);

		roster.clear();
	});

	it("asks steam nothing and keeps the player without an avatar while the key is missing", async () => {
		const { context, requests } = memoryContext();

		seatGlobal("76561198000000012");
		await enrichRoster(context);

		expect(roster.all().map((player) => player.avatarHash)).toEqual([
			null,
		]);
		expect(requests).toEqual([]);

		roster.clear();
	});

	it("keeps the player without an avatar when the steam web api fails", async () => {
		const { context, logged } = memoryContext({
			json: () => {
				throw new Error("429 too many requests");
			},
			secrets: STEAM_KEY,
		});

		seatGlobal("76561198000000013");
		await enrichRoster(context);

		expect(roster.all().map((player) => player.player)).toEqual([
			"Meslzy",
		]);
		expect(roster.all().map((player) => player.avatarHash)).toEqual([
			null,
		]);
		expect(logged.filter((entry) => entry.level === "warn")).toHaveLength(1);

		roster.clear();
	});

	it("asks steam nothing for a player the log never paired to a steam id", async () => {
		const { context, requests } = memoryContext({
			secrets: STEAM_KEY,
		});

		roster.clear();
		roster.join({
			player: "Sara",
		});
		await enrichRoster(context);

		expect(requests).toEqual([]);

		roster.clear();
	});
});
