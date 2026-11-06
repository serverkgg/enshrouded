import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { memoryContext } from "../testing";
import { CONFIG_FILE, GROUP_PASSWORD_LENGTH, QUERY_PORT } from "./enshroudedApp";
import {
	applyConfigPatch,
	applyStartConfig,
	EnshroudedGroup,
	formatServerConfig,
	minutesToNanoseconds,
	nanosecondsToMinutes,
	parseServerConfig,
	patchServerConfig,
	readServerConfig,
	seededServerConfig,
	seedServerConfig,
} from "./enshroudedConfig";
import { readEnshroudedStamp } from "./enshroudedStamp";

const CONFIG = {
	bannedAccounts: [
		"76561190000000001",
	],
	gameSettings: {
		enemyDamageFactor: 1,
		playerHealthFactor: 1,
	},
	gameSettingsPreset: "Custom",
	name: "Embervale",
	queryPort: 15_637,
	slotCount: 8,
	userGroups: [
		{
			canKickBan: true,
			name: "Admin",
			password: "AdminSecret1",
			reservedSlots: 0,
		},
	],
};

const configFiles = (config: object = CONFIG) => {
	return {
		[CONFIG_FILE]: JSON.stringify(config),
	};
};

const writtenConfig = (files: Map<string, string>) => {
	return JSON.parse(files.get(CONFIG_FILE) ?? "{}");
};

describe("reading enshrouded_server.json", () => {
	it("keeps keys the driver does not know, such as the ban list the game writes", () => {
		expect(parseServerConfig(JSON.stringify(CONFIG)).config.bannedAccounts).toEqual([
			"76561190000000001",
		]);
	});

	it("refuses a file that is not json with a message the customer can act on", () => {
		expect(() => parseServerConfig("{ name: ")).toThrow(BridgeUserError);
		expect(() => parseServerConfig("[]")).toThrow(BridgeUserError);
	});

	it("logs a fixed cause for a file that is not json, never a fragment of it, because the file holds the passwords", () => {
		const fragment = "AdminSecret123";
		let thrown: unknown;

		try {
			parseServerConfig(`{ "password": ${fragment} }`);
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(BridgeUserError);
		expect((thrown as BridgeUserError).cause).toEqual(new Error(`${CONFIG_FILE} is not valid json`));
		expect(String((thrown as BridgeUserError).cause)).not.toContain(fragment);
	});

	it("drops a known key of the wrong type and names it, so the game writes its default back", () => {
		const parsed = parseServerConfig(
			JSON.stringify({
				name: "Embervale",
				slotCount: "16",
				userGroups: [
					{
						name: "Admin",
						reservedSlots: "two",
					},
					{
						password: "orphan",
					},
				],
			}),
		);

		expect(parsed.config).toEqual({
			name: "Embervale",
			userGroups: [
				{
					name: "Admin",
				},
			],
		});
		expect(parsed.invalidKeys).toEqual([
			"slotCount",
			"userGroups",
		]);
	});

	it("reads a missing file as an empty document", async () => {
		expect(await readServerConfig(memoryContext().context)).toEqual({});
	});

	it("writes two-space json with a trailing newline", () => {
		expect(
			formatServerConfig({
				name: "Embervale",
			}),
		).toBe('{\n  "name": "Embervale"\n}\n');
	});
});

describe("patching the config document", () => {
	it("merges game settings by key and replaces the user groups whole", () => {
		const patched = applyConfigPatch(parseServerConfig(JSON.stringify(CONFIG)).config, {
			gameSettings: {
				enemyDamageFactor: 2,
			},
			userGroups: [
				{
					name: "Friend",
					password: "FriendSecret",
				},
			],
		});

		expect(patched.gameSettings).toEqual({
			enemyDamageFactor: 2,
			playerHealthFactor: 1,
		});
		expect(patched.userGroups).toEqual([
			{
				name: "Friend",
				password: "FriendSecret",
			},
		]);
		expect(patched.bannedAccounts).toEqual(CONFIG.bannedAccounts);
	});

	it("writes the file at once while the server is stopped, and stamps when, with nothing left pending", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		expect(
			await patchServerConfig(context, {
				slotCount: 12,
			}),
		).toEqual({
			pending: false,
		});
		expect(writtenConfig(files).slotCount).toBe(12);

		const stamp = await readEnshroudedStamp(context);

		expect(stamp.settingsPending).toEqual({});
		expect(stamp.settingsWrittenAt).not.toBeNull();
	});

	it("keeps a change made while the server runs for the next start and leaves the file alone", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
			running: true,
		});

		expect(
			await patchServerConfig(context, {
				slotCount: 12,
			}),
		).toEqual({
			pending: true,
		});
		expect(writtenConfig(files).slotCount).toBe(8);
		expect((await readEnshroudedStamp(context)).settingsPending).toEqual({
			slotCount: 12,
		});
	});

	it("keeps no copy of the old user groups while they wait, because they hold the passwords", async () => {
		const { context } = memoryContext({
			files: configFiles(),
			running: true,
		});

		await patchServerConfig(context, {
			userGroups: [
				{
					name: "Admin",
					password: "NewSecret123",
				},
			],
		});

		const stamp = await readEnshroudedStamp(context);

		expect(stamp.settingsBaseline.values).toEqual({});
		expect(stamp.settingsBaseline.secrets).toEqual({
			userGroups: true,
		});
		expect(JSON.stringify(stamp)).not.toContain("AdminSecret1");
	});

	it("folds game settings waiting from a running write into a write made after the stop", async () => {
		const { context, files, server } = memoryContext({
			files: configFiles(),
			running: true,
		});

		await patchServerConfig(context, {
			gameSettings: {
				enemyDamageFactor: 3,
			},
		});

		server.running = false;

		await patchServerConfig(context, {
			gameSettings: {
				playerHealthFactor: 2,
			},
		});

		expect(writtenConfig(files).gameSettings).toEqual({
			enemyDamageFactor: 3,
			playerHealthFactor: 2,
		});
		expect((await readEnshroudedStamp(context)).settingsPending).toEqual({});
	});
});

describe("the config before every start", () => {
	it("binds every address on the port the platform allocated, with the folders the driver reads", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
			ports: {
				[QUERY_PORT]: 9400,
			},
		});

		expect(await applyStartConfig(context)).toBe(true);
		expect(writtenConfig(files)).toMatchObject({
			ip: "0.0.0.0",
			logDirectory: "./logs",
			queryPort: 9400,
			saveDirectory: "./savegame",
		});
	});

	it("leaves the file untouched when it already holds those values", async () => {
		const { context, files } = memoryContext({
			files: configFiles({
				...CONFIG,
				ip: "0.0.0.0",
				logDirectory: "./logs",
				queryPort: 9400,
				saveDirectory: "./savegame",
			}),
			ports: {
				[QUERY_PORT]: 9400,
			},
		});
		const before = files.get(CONFIG_FILE);

		expect(await applyStartConfig(context)).toBe(false);
		expect(files.get(CONFIG_FILE)).toBe(before);
	});
});

describe("seeding a new server's config", () => {
	it("creates keen's four groups, each with its own random password", () => {
		const groups = seededServerConfig().userGroups ?? [];
		const passwords = groups.map((group) => group.password ?? "");

		expect(groups.map((group) => group.name)).toEqual([
			EnshroudedGroup.Admin,
			EnshroudedGroup.Friend,
			EnshroudedGroup.Guest,
			EnshroudedGroup.Visitor,
		]);
		expect(passwords.every((password) => password.length === GROUP_PASSWORD_LENGTH)).toBe(true);
		expect(new Set(passwords).size).toBe(groups.length);
	});

	it("gives only the admin group kick and ban", () => {
		const groups = seededServerConfig().userGroups ?? [];

		expect(groups.filter((group) => group.canKickBan).map((group) => group.name)).toEqual([
			EnshroudedGroup.Admin,
		]);
	});

	it("starts with sixteen slots, the default preset, chat off and proximity voice", () => {
		expect(seededServerConfig()).toMatchObject({
			enableTextChat: false,
			enableVoiceChat: false,
			gameSettingsPreset: "Default",
			ip: "0.0.0.0",
			logDirectory: "./logs",
			saveDirectory: "./savegame",
			slotCount: 16,
			voiceChatMode: "Proximity",
		});
	});

	it("never overwrites a config that already exists", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		expect(await seedServerConfig(context)).toBe(false);
		expect(writtenConfig(files).name).toBe("Embervale");
	});

	it("writes the seed when no config exists and logs no password", async () => {
		const { context, files, logged } = memoryContext();

		expect(await seedServerConfig(context)).toBe(true);

		const passwords = (
			writtenConfig(files).userGroups as {
				password: string;
			}[]
		).map((group) => group.password);

		for (const password of passwords) {
			expect(JSON.stringify(logged)).not.toContain(password);
		}
	});
});

describe("game setting durations", () => {
	it("converts minutes to the nanoseconds the file stores and back", () => {
		expect(minutesToNanoseconds(30)).toBe(1_800_000_000_000);
		expect(nanosecondsToMinutes(720_000_000_000)).toBe(12);
	});
});
