import { describe, expect, it } from "bun:test";
import {
	HOST_ONLINE_FIXTURE,
	JOIN_FIXTURE,
	JOIN_LOG,
	LEAVE_FIXTURE,
	LEAVE_LOG,
	LOADING_FIXTURE,
	PEER_ADDED_FIXTURE,
	PEER_REMOVED_FIXTURE,
	PLAYER_HANDLE_FIXTURE,
	PORT_BUSY_FIXTURE,
	READY_FIXTURE,
	SHUTDOWN_FIXTURE,
	STEAM_CONNECTED_FIXTURE,
	STEAM_ID_FIXTURE,
	VERSION_FIXTURE,
} from "../testing";
import {
	HOST_ONLINE_LINE,
	JOIN_LINE,
	LEAVE_LINE,
	PEER_ADDED_LINE,
	PEER_REMOVED_LINE,
	PLAYER_HANDLE_LINE,
	PORT_BIND_FAILED_LINE,
	parseJoin,
	parseLeave,
	parsePeerAdded,
	parsePeerRemoved,
	parsePlayerHandle,
	parseVersion,
	SERVER_READY,
	SHUTDOWN_LINE,
	STEAM_CONNECTED_LINE,
	STEAM_FAILURE_LINE,
	WINE_CRASH_LINE,
} from "./enshroudedLog";

describe("reading the server log", () => {
	it("calls the server ready once the world runs, not when the session first goes online", () => {
		expect(SERVER_READY.test(READY_FIXTURE)).toBe(true);
		expect(SERVER_READY.test(LOADING_FIXTURE)).toBe(false);
		expect(SERVER_READY.test(HOST_ONLINE_FIXTURE)).toBe(false);
		expect(HOST_ONLINE_LINE.test(HOST_ONLINE_FIXTURE)).toBe(true);
	});

	it("matches the steam connection and the steamworks failure", () => {
		expect(STEAM_CONNECTED_LINE.test(STEAM_CONNECTED_FIXTURE)).toBe(true);
		expect(STEAM_FAILURE_LINE.test("[E 00:00:00,600] Failed to initialize Steamworks")).toBe(true);
	});

	it("names why the game shut down", () => {
		expect(SHUTDOWN_LINE.exec(SHUTDOWN_FIXTURE)?.groups?.reason).toBe("Ctrl_C");
	});

	it("names the socket error when the query port is taken", () => {
		expect(PORT_BIND_FAILED_LINE.exec(PORT_BUSY_FIXTURE)?.groups?.detail).toBe("address in use");
	});

	it("names the detail of an unhandled wine exception", () => {
		expect(WINE_CRASH_LINE.exec("wine: Unhandled page fault on read access to 0000000000000000")?.groups?.detail).toBe(
			"page fault on read access to 0000000000000000",
		);
	});

	it("reads the game version", () => {
		expect(parseVersion(VERSION_FIXTURE)).toBe("1287369");
		expect(parseVersion("Game Version: unknown")).toBeNull();
	});
});

describe("reading players from the log", () => {
	it("reads the player name from a join and a leave line", () => {
		expect(parseJoin(JOIN_FIXTURE)).toEqual({
			player: "Meslzy",
		});
		expect(parseLeave(LEAVE_FIXTURE)).toEqual({
			player: "Meslzy",
		});
	});

	it("reads the peer index and the steam id from the added peer line", () => {
		expect(parsePeerAdded(PEER_ADDED_FIXTURE)).toEqual({
			index: 0,
			steamId: STEAM_ID_FIXTURE,
		});
	});

	it("reads the player index from the machine login line", () => {
		expect(parsePlayerHandle(PLAYER_HANDLE_FIXTURE)).toEqual({
			index: 0,
		});
	});

	it("reads the peer index from the removed peer line", () => {
		expect(parsePeerRemoved(PEER_REMOVED_FIXTURE)).toEqual({
			index: 0,
		});
	});

	it("reads no steam id that is not seventeen digits", () => {
		expect(parsePeerAdded("[I 05:12:02,879] [online] Added peer 0(1) (steamid:7656119907432014)")).toBeNull();
		expect(parsePeerAdded("[I 05:12:02,879] [online] Added peer 0(1) (steamid:)")).toBeNull();
	});

	it("matches each player line of a real join and leave once, and nothing around it", () => {
		const matchesOf = (pattern: RegExp) => {
			return [
				...JOIN_LOG,
				...LEAVE_LOG,
			].filter((line) => pattern.test(line));
		};

		expect(matchesOf(PEER_ADDED_LINE)).toEqual([
			PEER_ADDED_FIXTURE,
		]);
		expect(matchesOf(PLAYER_HANDLE_LINE)).toEqual([
			PLAYER_HANDLE_FIXTURE,
		]);
		expect(matchesOf(JOIN_LINE)).toEqual([
			JOIN_FIXTURE,
		]);
		expect(matchesOf(LEAVE_LINE)).toEqual([
			LEAVE_FIXTURE,
		]);
		expect(matchesOf(PEER_REMOVED_LINE)).toEqual([
			PEER_REMOVED_FIXTURE,
		]);
	});

	it("ignores a line that only names a player", () => {
		expect(parseJoin("[server] Player 'Mohammed' connected")).toBeNull();
		expect(parseLeave("[server] Player 'Mohammed' logged in with Permissions:")).toBeNull();
	});
});
