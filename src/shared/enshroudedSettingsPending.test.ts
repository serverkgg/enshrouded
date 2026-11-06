import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { memoryContext } from "../testing";
import { CONFIG_FILE } from "./enshroudedApp";
import { patchServerConfig } from "./enshroudedConfig";
import { changedPendingKeys, replayPendingSettings, sameJson } from "./enshroudedSettingsPending";
import { readEnshroudedStamp } from "./enshroudedStamp";

const CONFIG = JSON.stringify({
	gameSettings: {
		enemyDamageFactor: 1,
		playerHealthFactor: 1,
	},
	name: "Embervale",
	slotCount: 8,
	userGroups: [
		{
			name: "Admin",
			password: "AdminSecret1",
		},
	],
});

const runningServer = () => {
	return memoryContext({
		files: {
			[CONFIG_FILE]: CONFIG,
		},
		running: true,
	});
};

describe("replaying the settings saved while enshrouded ran", () => {
	it("writes every waiting value into the file at the next start and clears the stamp", async () => {
		const { context, files, server } = runningServer();

		await patchServerConfig(context, {
			gameSettings: {
				enemyDamageFactor: 2,
			},
			name: "Embervale 2",
		});
		await patchServerConfig(context, {
			gameSettings: {
				playerHealthFactor: 3,
			},
		});

		server.running = false;

		expect(await replayPendingSettings(context)).toEqual([
			"gameSettings",
			"name",
		]);

		const written = JSON.parse(files.get(CONFIG_FILE) ?? "{}");

		expect(written.name).toBe("Embervale 2");
		expect(written.gameSettings).toEqual({
			enemyDamageFactor: 2,
			playerHealthFactor: 3,
		});
		expect((await readEnshroudedStamp(context)).settingsPending).toEqual({});
	});

	it("replaces the user groups whole, as the roles edit wrote them", async () => {
		const { context, files } = runningServer();

		await patchServerConfig(context, {
			userGroups: [
				{
					canKickBan: true,
					name: "Admin",
					password: "AdminSecret2",
				},
			],
		});
		await replayPendingSettings(context);

		expect(JSON.parse(files.get(CONFIG_FILE) ?? "{}").userGroups).toEqual([
			{
				canKickBan: true,
				name: "Admin",
				password: "AdminSecret2",
			},
		]);
	});

	it("reports the change once, naming only the settings that differ from the file", async () => {
		const { activities, context } = runningServer();

		await patchServerConfig(context, {
			gameSettings: {
				enemyDamageFactor: 1,
			},
			slotCount: 12,
		});
		await replayPendingSettings(context);

		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.SettingsApplied,
		]);
		expect(activities[0]?.details?.keys).toBe("slotCount");
	});

	it("writes nothing and reports nothing when no setting waits", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
			},
		});

		expect(await replayPendingSettings(context)).toEqual([]);
		expect(files.get(CONFIG_FILE)).toBe(CONFIG);
		expect(files.has(INSTALL_STAMP_FILE)).toBe(false);
		expect(activities).toEqual([]);
	});
});

describe("telling a waiting setting from the value it replaces", () => {
	it("compares nested values by content", () => {
		expect(
			sameJson(
				[
					{
						name: "Admin",
					},
				],
				[
					{
						name: "Admin",
					},
				],
			),
		).toBe(true);
		expect(
			sameJson(
				{
					a: 1,
				},
				{
					a: 1,
					b: 2,
				},
			),
		).toBe(false);
		expect(sameJson(16, "16")).toBe(true);
	});

	it("counts a secret as changed only by its flag, since its old value is never kept", () => {
		expect(
			changedPendingKeys({
				settingsBaseline: {
					secrets: {
						userGroups: false,
					},
					values: {},
				},
				settingsPending: {
					userGroups: [],
				},
			}),
		).toEqual([]);
	});
});
