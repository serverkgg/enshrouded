import { describe, expect, it } from "bun:test";
import { BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { parseJoin, parseLeave, parsePeerAdded, parsePlayerHandle, roster } from "../shared";
import {
	JOIN_FIXTURE,
	LEAVE_FIXTURE,
	memoryContext,
	PEER_ADDED_FIXTURE,
	PLAYER_HANDLE_FIXTURE,
	STEAM_ID_FIXTURE,
} from "../testing";
import { onlineSection, playerRowOf, players } from "./players";

const JOINED_AT = Date.UTC(2026, 10, 6, 16, 20);

describe("the players table", () => {
	it("shows a player from the join lines, keyed by the steam id, until the leave line", async () => {
		const { context } = memoryContext({
			running: true,
		});
		const peer = parsePeerAdded(PEER_ADDED_FIXTURE);
		const handle = parsePlayerHandle(PLAYER_HANDLE_FIXTURE);
		const joined = parseJoin(JOIN_FIXTURE);
		const left = parseLeave(LEAVE_FIXTURE);

		if (peer === null || handle === null || joined === null || left === null) {
			throw new Error("the join and leave fixtures do not parse");
		}

		roster.clear();
		roster.peer(peer);
		roster.handle(handle);
		roster.join(joined, JOINED_AT);

		expect(await players.list(context)).toEqual([
			expect.objectContaining({
				id: STEAM_ID_FIXTURE,
				joined: "2026-11-06 16:20 UTC",
				player: "Meslzy",
				steamId: STEAM_ID_FIXTURE,
			}),
		]);

		roster.leave(left);

		expect(await players.list(context)).toEqual([]);
	});

	it("shows a player the log never paired under the name, with an empty steam id", () => {
		expect(
			playerRowOf(
				{
					avatarHash: null,
					joinedAt: JOINED_AT,
					player: "Sara",
					steamId: null,
				},
				JOINED_AT,
			),
		).toEqual(
			expect.objectContaining({
				id: "Sara",
				player: "Sara",
				steamId: "",
			}),
		);
	});

	it("says how long the player has been on in both languages", () => {
		expect(
			playerRowOf(
				{
					avatarHash: null,
					joinedAt: JOINED_AT,
					player: "Meslzy",
					steamId: STEAM_ID_FIXTURE,
				},
				JOINED_AT + 75 * 60 * 1000,
			),
		).toEqual({
			id: STEAM_ID_FIXTURE,
			joined: "2026-11-06 16:20 UTC",
			played: {
				ar: "ساعة و15 دقيقة",
				en: "1h 15m",
			},
			player: "Meslzy",
			steamId: STEAM_ID_FIXTURE,
		});
	});

	it("is read only while the game runs and offers no action, because enshrouded has no kick or ban channel", () => {
		expect(players.requiresRunning).toBe(true);
		expect(players.refreshSeconds).toBe(15);
		expect(players.actions).toBeUndefined();
	});

	it("places the online table on the players page with a column for each row key", () => {
		expect(onlineSection).toEqual(
			expect.objectContaining({
				id: "online",
				layout: BridgeLayout.Table,
				module: "players",
				place: BridgePlace.Players,
			}),
		);

		const row = playerRowOf(
			{
				avatarHash: null,
				joinedAt: JOINED_AT,
				player: "Meslzy",
				steamId: STEAM_ID_FIXTURE,
			},
			JOINED_AT,
		);
		const columns = onlineSection.layout === BridgeLayout.Table ? onlineSection.columns : [];

		expect(columns.map((column) => column.key)).toEqual([
			"player",
			"steamId",
			"joined",
			"played",
		]);
		expect(columns.every((column) => Object.hasOwn(row, column.key))).toBe(true);
	});
});
