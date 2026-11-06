import { describe, expect, it } from "bun:test";
import { BridgeTerminalLevel, BridgeUserError } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { CONFIG_FILE, roster, serverMetrics, WORLD_FILE } from "../shared";
import { EMPTY_STAMP, JOIN_FIXTURE, memoryContext, READY_FIXTURE, STEAM_ID_FIXTURE } from "../testing";
import { consoleCommands, consoleHandler, NO_CONSOLE, roleLines, rosterLines, worldLines } from "./consoleHandler";
import { terminal } from "./terminal";

const GROUPS = [
	{
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: true,
		canKickBan: true,
		name: "Admin",
		password: "admin-secret",
		reservedSlots: 0,
	},
	{
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: false,
		canKickBan: false,
		name: "Friend",
		password: "friend-secret",
		reservedSlots: 2,
	},
];

const CONFIG = JSON.stringify({
	name: "Embervale",
	slotCount: 8,
	userGroups: GROUPS,
});

const WORLD_SAVED_AT = "2026-11-06T15:40:00.000Z";

const replyOf = async (input: string, files: Record<string, string> = {}) => {
	const { context } = memoryContext({
		files: {
			[CONFIG_FILE]: CONFIG,
			...files,
		},
		modified: {
			[WORLD_FILE]: WORLD_SAVED_AT,
		},
	});

	return await consoleHandler(context, input);
};

describe("the enshrouded console", () => {
	it("answers status from the driver, never from the game", async () => {
		roster.clear();
		serverMetrics.clear();

		const reply = await replyOf("status", {
			[INSTALL_STAMP_FILE]: JSON.stringify({
				...EMPTY_STAMP,
				buildId: "20581234",
			}),
			[WORLD_FILE]: "ksd",
		});

		expect(reply?.line?.split("\n")).toEqual([
			"name: Embervale",
			"version: unknown",
			"build: 20581234",
			"players: 0/8",
			"uptime: unknown",
			`last save: ${WORLD_SAVED_AT}`,
		]);
	});

	it("lists the roster with each player's steam id and when they joined", async () => {
		expect(rosterLines([])).toEqual([
			"no players online",
		]);

		roster.clear();
		roster.peer({
			index: 0,
			steamId: STEAM_ID_FIXTURE,
		});
		roster.handle({
			index: 0,
		});
		roster.join(
			{
				player: "Meslzy",
			},
			Date.UTC(2026, 10, 6, 16, 20),
		);
		roster.join(
			{
				player: "Sara",
			},
			Date.UTC(2026, 10, 6, 16, 25),
		);

		expect((await replyOf("players"))?.line?.split("\n")).toEqual([
			"player,steamId,joined",
			`Meslzy,${STEAM_ID_FIXTURE},2026-11-06T16:20:00.000Z`,
			"Sara,unknown,2026-11-06T16:25:00.000Z",
		]);

		roster.clear();
	});

	it("prints each role with its permissions and never its password", async () => {
		const line = (await replyOf("roles"))?.line ?? "";

		expect(line.split("\n")).toEqual([
			"role,canKickBan,canAccessInventories,canEditWorld,canEditBase,canExtendBase,reservedSlots",
			"Admin,true,true,true,true,true,0",
			"Friend,false,true,true,true,false,2",
		]);
		expect(line).not.toContain("secret");
	});

	it("says a role change waits for the restart and marks a permission the file does not set", () => {
		expect(
			roleLines(
				[
					{
						name: "Guest",
					},
				],
				true,
			),
		).toEqual([
			"role,canKickBan,canAccessInventories,canEditWorld,canEditBase,canExtendBase,reservedSlots",
			"Guest,unset,unset,unset,unset,unset,unset",
			"changes to the roles apply after a restart",
		]);
		expect(roleLines([], false)).toEqual([
			"no roles in enshrouded_server.json",
		]);
	});

	it("prints the world file's size and time, or says there is none yet", async () => {
		expect(
			(
				await replyOf("world", {
					[WORLD_FILE]: "x".repeat(2048),
				})
			)?.line?.split("\n"),
		).toEqual([
			"world: savegame/world0.ksd",
			"size: 2 KB",
			`modified: ${WORLD_SAVED_AT}`,
		]);
		expect((await replyOf("WORLD"))?.line).toBe(
			"no world yet, enshrouded creates savegame/world0.ksd at its next start",
		);
		expect(worldLines(null)).toHaveLength(1);
	});

	it("lists what it answers on help", async () => {
		const line = (await replyOf("help"))?.line ?? "";

		for (const name of Object.keys(consoleCommands)) {
			expect(line).toContain(`${name}:`);
		}
	});

	it("refuses anything outside its table with a reason, never passing it to the game", async () => {
		await expect(replyOf("kick Mohammed")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("constructor")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("__proto__")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("hasOwnProperty")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("   ")).rejects.toThrow(BridgeUserError);
	});

	it("says in both languages that an enshrouded server reads nothing from a console", async () => {
		const refusal = await replyOf("save").catch((error: unknown) => error);

		expect(refusal).toBeInstanceOf(BridgeUserError);
		expect(refusal instanceof BridgeUserError ? refusal.text : null).toEqual(NO_CONSOLE);
	});

	it("documents every command it answers, and answers every command it documents", () => {
		expect(terminal.commands.map((command) => command.name).sort()).toEqual(Object.keys(consoleCommands).sort());
		expect(terminal.run).toBe(consoleHandler);
	});

	it("lights up the steam and wine failures as errors and the ready line as information", () => {
		const levelOf = (line: string) => {
			return (terminal.rules ?? []).find((rule) => rule.match.test(line))?.level ?? null;
		};

		expect(levelOf("[error] Failed to initialize Steamworks")).toBe(BridgeTerminalLevel.Error);
		expect(levelOf("wine: Unhandled page fault on read access")).toBe(BridgeTerminalLevel.Error);
		expect(levelOf(READY_FIXTURE)).toBe(BridgeTerminalLevel.Info);
		expect(levelOf(JOIN_FIXTURE)).toBe(BridgeTerminalLevel.Info);
	});
});
