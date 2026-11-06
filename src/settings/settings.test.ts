import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { CONFIG_FILE, EnshroudedGroup, readEnshroudedStamp } from "../shared";
import { memoryContext } from "../testing";
import { settings } from "./settings";

const GROUPS = [
	{
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: true,
		canKickBan: true,
		name: "Admin",
		password: "AdminSecret1",
		reservedSlots: 0,
	},
	{
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: false,
		canKickBan: false,
		name: "Friend",
		password: "FriendSecret1",
		reservedSlots: 0,
	},
	{
		canAccessInventories: false,
		canEditBase: false,
		canEditWorld: true,
		canExtendBase: false,
		canKickBan: false,
		name: "Guest",
		password: "GuestSecret1",
		reservedSlots: 0,
	},
	{
		canAccessInventories: false,
		canEditBase: false,
		canEditWorld: false,
		canExtendBase: false,
		canKickBan: false,
		name: "Visitor",
		password: "VisitorSecret1",
		reservedSlots: 0,
	},
];

const CONFIG = {
	bannedAccounts: [
		"76561190000000001",
	],
	enableTextChat: false,
	enableVoiceChat: true,
	gameSettings: {
		dayTimeDuration: 1_800_000_000_000,
		enemyDamageFactor: 1,
		fromHungerToStarving: 600_000_000_000,
		playerHealthFactor: 1,
		tombstoneMode: "AddBackpackMaterials",
	},
	gameSettingsPreset: "Default",
	name: "Embervale",
	queryPort: 9400,
	slotCount: 8,
	tags: [
		"English",
		"PvE",
	],
	userGroups: GROUPS,
	voiceChatMode: "Global",
};

const configFiles = (config: object = CONFIG) => {
	return {
		[CONFIG_FILE]: JSON.stringify(config),
	};
};

const writtenConfig = (files: Map<string, string>) => {
	return JSON.parse(files.get(CONFIG_FILE) ?? "{}");
};

const groupNamed = (
	groups: {
		name: string;
	}[],
	name: EnshroudedGroup,
): unknown => {
	return groups.find((entry) => entry.name === name);
};

describe("reading the settings", () => {
	it("turns the tags array into one switch per known tag", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});
		const values = await settings.read(context);

		expect(values.tagEnglish).toBe(true);
		expect(values.tagRoleplay).toBe(false);
		expect(values.tagPvE).toBeUndefined();
	});

	it("shows the durations in minutes and the rest as the file holds them", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		expect(await settings.read(context)).toMatchObject({
			dayTimeMinutes: 30,
			enableVoiceChat: true,
			gameSettingsPreset: "Default",
			hungerToStarvingMinutes: 10,
			name: "Embervale",
			nightTimeMinutes: 12,
			slotCount: 8,
			tombstoneMode: "AddBackpackMaterials",
			voiceChatMode: "Global",
		});
	});

	it("shows each group's password to the form, which the platform masks for viewers who cannot invoke", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		expect(await settings.read(context)).toMatchObject({
			adminPassword: "AdminSecret1",
			friendPassword: "FriendSecret1",
			guestPassword: "GuestSecret1",
			visitorPassword: "VisitorSecret1",
		});
	});

	it("shows a parked value in place of the file's", async () => {
		const { context } = memoryContext({
			files: {
				...configFiles(),
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsPending: {
						gameSettings: {
							playerHealthFactor: 2,
						},
						slotCount: 12,
					},
				}),
			},
			running: true,
		});

		expect(await settings.read(context)).toMatchObject({
			playerHealthFactor: 2,
			slotCount: 12,
		});
	});
});

describe("writing the settings while the server is stopped", () => {
	it("writes the tag switches back into the tags array and keeps a tag the panel does not know", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await settings.write?.(context, {
			tagEnglish: false,
			tagRoleplay: true,
		});

		expect(writtenConfig(files).tags).toEqual([
			"PvE",
			"Roleplay",
		]);
	});

	it("stores a duration given in minutes as nanoseconds", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await settings.write?.(context, {
			dayTimeMinutes: 45,
			hungerToStarvingMinutes: 20,
		});

		expect(writtenConfig(files).gameSettings).toMatchObject({
			dayTimeDuration: 2_700_000_000_000,
			fromHungerToStarving: 1_200_000_000_000,
		});
	});

	it("refuses a factor outside the game's range and leaves the file untouched", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});
		const before = files.get(CONFIG_FILE);

		await expect(
			settings.write?.(context, {
				enemyDamageFactor: 6,
			}),
		).rejects.toThrow(BridgeUserError);
		await expect(
			settings.write?.(context, {
				slotCount: 17,
			}),
		).rejects.toThrow(BridgeUserError);
		await expect(
			settings.write?.(context, {
				flameLevelFogRemoval: 4.5,
			}),
		).rejects.toThrow(BridgeUserError);
		expect(files.get(CONFIG_FILE)).toBe(before);
	});

	it("refuses an option the game does not have", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});
		const before = files.get(CONFIG_FILE);

		await expect(
			settings.write?.(context, {
				tombstoneMode: "KeepEverything",
			}),
		).rejects.toThrow(BridgeUserError);
		await expect(
			settings.write?.(context, {
				voiceChatMode: "Team",
			}),
		).rejects.toThrow(BridgeUserError);
		expect(files.get(CONFIG_FILE)).toBe(before);
	});

	it("refuses a key the settings do not know", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		await expect(
			settings.write?.(context, {
				queryPort: 9500,
			}),
		).rejects.toThrow(BridgeUserError);
	});

	it("never repeats the refused value in the message", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});
		const refusal = await settings
			.write?.(context, {
				enemyDamageFactor: 97.25,
			})
			.catch((error: unknown) => error);

		expect(refusal).toBeInstanceOf(BridgeUserError);
		expect(JSON.stringify(refusal)).not.toContain("97.25");
		expect(String((refusal as Error).message)).not.toContain("97.25");
	});

	it("writes custom values under a named preset, because the preset decides when they apply", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await settings.write?.(context, {
			playerHealthFactor: 2,
		});

		expect(writtenConfig(files)).toMatchObject({
			gameSettings: {
				enemyDamageFactor: 1,
				playerHealthFactor: 2,
			},
			gameSettingsPreset: "Default",
		});
	});

	it("keeps the keys the panel does not know, such as the ban list the game writes", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await settings.write?.(context, {
			name: "Black Flag",
		});

		expect(writtenConfig(files)).toMatchObject({
			bannedAccounts: [
				"76561190000000001",
			],
			name: "Black Flag",
			queryPort: 9400,
		});
	});

	it("leaves the file as it was when nothing submitted differs from it", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});
		const before = files.get(CONFIG_FILE);

		await settings.write?.(context, {
			adminPassword: "AdminSecret1",
			dayTimeMinutes: 30,
			name: "Embervale",
			tagEnglish: true,
		});

		expect(files.get(CONFIG_FILE)).toBe(before);
	});

	it("writes a full config with every group before the first write when the file is missing", async () => {
		const { context, files } = memoryContext();

		await settings.write?.(context, {
			name: "Black Flag",
		});

		const written = writtenConfig(files);

		expect(written.name).toBe("Black Flag");
		expect(written.userGroups.map((entry: { name: string }) => entry.name)).toEqual([
			"Admin",
			"Friend",
			"Guest",
			"Visitor",
		]);
	});
});

describe("the passwords", () => {
	it("changes only the named group's password and keeps every other group as it was", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await settings.write?.(context, {
			friendPassword: "EmberFriends7",
		});

		const groups = writtenConfig(files).userGroups;

		expect(groupNamed(groups, EnshroudedGroup.Friend)).toEqual({
			...GROUPS[1],
			password: "EmberFriends7",
		});
		expect(groups.filter((entry: { name: string }) => entry.name !== EnshroudedGroup.Friend)).toEqual(
			GROUPS.filter((entry) => entry.name !== EnshroudedGroup.Friend),
		);
	});

	it("skips a password sent as null, so an untouched secret changes nothing", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});
		const before = files.get(CONFIG_FILE);

		await settings.write?.(context, {
			adminPassword: null,
		});

		expect(files.get(CONFIG_FILE)).toBe(before);
	});

	it("refuses a password submitted empty, because an empty one lets anyone join with the group's rights", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		await expect(
			settings.write?.(context, {
				guestPassword: "   ",
			}),
		).rejects.toThrow(BridgeUserError);
	});

	it("refuses a password another group already uses, because the game picks the group by password", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		await expect(
			settings.write?.(context, {
				visitorPassword: "AdminSecret1",
			}),
		).rejects.toThrow(BridgeUserError);
	});
});

describe("writing the settings while the server runs", () => {
	it("parks the change for the next start and leaves the file to the game", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
			running: true,
		});
		const before = files.get(CONFIG_FILE);

		await settings.write?.(context, {
			enemyDamageFactor: 1.5,
			slotCount: 12,
			tagRoleplay: true,
		});

		expect(files.get(CONFIG_FILE)).toBe(before);
		expect((await readEnshroudedStamp(context)).settingsPending).toEqual({
			gameSettings: {
				enemyDamageFactor: 1.5,
			},
			slotCount: 12,
			tags: [
				"English",
				"PvE",
				"Roleplay",
			],
		});
	});

	it("parks a password change without keeping the old passwords in the stamp", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
			running: true,
		});
		const before = files.get(CONFIG_FILE);

		await settings.write?.(context, {
			adminPassword: "NewAdmin99",
		});

		const stamp = await readEnshroudedStamp(context);

		expect(files.get(CONFIG_FILE)).toBe(before);
		expect(stamp.settingsBaseline.secrets).toEqual({
			userGroups: true,
		});
		expect(JSON.stringify(stamp.settingsBaseline)).not.toContain("AdminSecret1");
		expect(
			groupNamed(
				stamp.settingsPending.userGroups as {
					name: string;
				}[],
				EnshroudedGroup.Admin,
			),
		).toMatchObject({
			password: "NewAdmin99",
		});
	});

	it("builds a second password change on the one already parked", async () => {
		const { context } = memoryContext({
			files: configFiles(),
			running: true,
		});

		await settings.write?.(context, {
			adminPassword: "NewAdmin99",
		});
		await settings.write?.(context, {
			guestPassword: "NewGuest99",
		});

		const parked = (await readEnshroudedStamp(context)).settingsPending.userGroups as {
			name: string;
		}[];

		expect(groupNamed(parked, EnshroudedGroup.Admin)).toMatchObject({
			password: "NewAdmin99",
		});
		expect(groupNamed(parked, EnshroudedGroup.Guest)).toMatchObject({
			password: "NewGuest99",
		});
	});
});
