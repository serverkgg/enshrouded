import { describe, expect, it } from "bun:test";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { STEAM_FAILURE_LINE } from "../shared";
import { HOST_ONLINE_FIXTURE, PORT_BUSY_FIXTURE, READY_FIXTURE } from "../testing";
import { detailOf, events } from "./events";

const STEAM_INIT_FAILURE = "[error] Failed to initialize Steamworks";

const STEAM_CREATE_FAILURE = "[error] Failed to create Steamworks";

const WINE_CRASH = "wine: Unhandled page fault on read access to 0000000000000000 at address 0000000140123456";

const matchesOf = (line: string) => {
	return events.patterns.flatMap((pattern) => {
		const match = line.match(pattern.match);

		return match
			? [
					{
						detail: match.groups?.detail ?? null,
						emit: pattern.emit,
					},
				]
			: [];
	});
};

describe("the enshrouded events", () => {
	it("raises the start on the line the world starts running with, not the earlier session line", () => {
		expect(matchesOf(READY_FIXTURE)).toEqual([
			{
				detail: null,
				emit: BridgeEventName.ServerStarted,
			},
		]);
		expect(matchesOf(HOST_ONLINE_FIXTURE)).toEqual([]);
	});

	it("raises a busy port on the socket line the game prints before it exits, a line that names no port", () => {
		expect(matchesOf(PORT_BUSY_FIXTURE)).toEqual([
			{
				detail: "address in use",
				emit: BridgeEventName.PortBindFailed,
			},
		]);
	});

	it("raises a crash with its detail when steamworks fails or wine hits an unhandled fault", () => {
		expect(matchesOf(STEAM_INIT_FAILURE)).toEqual([
			{
				detail: "Failed to initialize Steamworks",
				emit: BridgeEventName.ServerCrashed,
			},
		]);
		expect(matchesOf(STEAM_CREATE_FAILURE).map((match) => match.detail)).toEqual([
			"Failed to create Steamworks",
		]);
		expect(matchesOf(WINE_CRASH)).toEqual([
			{
				detail: "page fault on read access to 0000000000000000 at address 0000000140123456",
				emit: BridgeEventName.ServerCrashed,
			},
		]);
	});

	it("declares the roster, world and settings events the code raises", () => {
		expect(events.emits).toEqual(
			expect.arrayContaining([
				BridgeEventName.PlayerJoined,
				BridgeEventName.PlayerLeft,
				BridgeEventName.ServerStopping,
				BridgeEventName.ServerUpdated,
				BridgeEventName.GameInstalled,
				BridgeEventName.SettingsApplied,
				BridgeEventName.WorldSaved,
				BridgeEventName.WorldWiped,
				BridgeEventName.WorldImported,
			]),
		);
	});

	it("wraps a pattern in a detail group without changing what it matches", () => {
		const pattern = detailOf(STEAM_FAILURE_LINE);

		expect("Failed to create Steamworks".match(pattern)?.groups?.detail).toBe("Failed to create Steamworks");
		expect(pattern.test("Steamworks ready")).toBe(false);
	});
});
