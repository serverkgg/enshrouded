import { describe, expect, it } from "bun:test";
import { BridgeFormTarget, BridgeLayout } from "@serverkgg/bridge";
import { BRIDGE_FORM_FIELDS_LIMIT } from "@serverkgg/bridge/protocol";
import {
	CONFIG_SETTINGS,
	chatSection,
	DIFFICULTY_GROUPS,
	difficultyGroupSections,
	difficultySection,
	EnshroudedEnemyAmount,
	type EnshroudedSettingSpec,
	GAME_SETTING_BY_KEY,
	GAME_SETTINGS,
	type NumberSettingSpec,
	PASSWORD_KEYS,
	passwordsSection,
	type SelectSettingSpec,
	SettingKind,
	serverSection,
	settingWriteOf,
	shownValueOf,
	TAG_ORDER,
	tagFieldKeyOf,
	tagsWith,
} from "./enshroudedSettings";

const SECTIONS = [
	serverSection,
	chatSection,
	difficultySection,
	...difficultyGroupSections,
	passwordsSection,
];

const numberSpecOf = (key: string): NumberSettingSpec => {
	const spec = GAME_SETTING_BY_KEY.get(key);

	if (spec?.kind !== SettingKind.Number) {
		throw new Error(`${key} is not a number setting`);
	}

	return spec;
};

const selectSpecOf = (key: string): SelectSettingSpec => {
	const spec = GAME_SETTING_BY_KEY.get(key);

	if (spec?.kind !== SettingKind.Select) {
		throw new Error(`${key} is not a select setting`);
	}

	return spec;
};

const optionValuesOf = (spec: SelectSettingSpec) => {
	return spec.options.map((option) => option.value);
};

const fieldKeysOf = (section: (typeof SECTIONS)[number]) => {
	return section.layout === BridgeLayout.Form ? section.fields.map((field) => field.key) : [];
};

describe("the settings table", () => {
	it("declares the 38 game settings once each, in the six difficulty groups", () => {
		expect(GAME_SETTINGS).toHaveLength(38);
		expect(new Set(GAME_SETTINGS.map((spec) => spec.fileKey)).size).toBe(38);
		expect(DIFFICULTY_GROUPS.map((group) => group.id)).toEqual([
			"difficulty-player",
			"difficulty-survival",
			"difficulty-world",
			"difficulty-enemies",
			"difficulty-progression",
			"difficulty-time",
		]);
	});

	it("gives every form field a key no other section uses, because one module reads them all", () => {
		const keys = SECTIONS.flatMap(fieldKeysOf);

		expect(new Set(keys).size).toBe(keys.length);
	});

	it("keeps every section within the bridge's field limit", () => {
		for (const section of SECTIONS) {
			expect(fieldKeysOf(section).length).toBeLessThanOrEqual(BRIDGE_FORM_FIELDS_LIMIT);
		}
	});

	it("points every section at the settings module with a restart hint and help", () => {
		for (const section of SECTIONS) {
			expect(section).toMatchObject({
				layout: BridgeLayout.Form,
				module: "settings",
				restartHint: true,
				target: BridgeFormTarget.Settings,
			});
			expect(section.help?.ar.length).toBeGreaterThan(0);
			expect(section.help?.en.length).toBeGreaterThan(0);
		}
	});

	it("says in the preset and in every difficulty group that the values apply only under Custom", () => {
		expect(difficultySection.help?.en).toContain("Custom");
		expect(difficultySection.help?.ar).toContain("مخصص");

		for (const section of difficultyGroupSections) {
			expect(section.help?.en).toContain("only while the difficulty preset is Custom");
			expect(section.help?.ar).toContain("«مخصص»");
		}
	});

	it("names a switch for every known tag and a secret for every group's password", () => {
		expect(fieldKeysOf(serverSection)).toEqual([
			"name",
			"slotCount",
			...TAG_ORDER.map(tagFieldKeyOf),
		]);
		expect(fieldKeysOf(serverSection)).toContain("tagLookingForPlayers");
		expect(fieldKeysOf(passwordsSection)).toEqual(Object.values(PASSWORD_KEYS));
	});

	it("bounds the diving, enemy damage, boss health and flame level settings as the 1.0 server readme documents", () => {
		expect(numberSpecOf("playerDivingTimeFactor")).toMatchObject({
			fallback: 1,
			max: 2,
			min: 0.5,
		});
		expect(numberSpecOf("enemyDamageFactor")).toMatchObject({
			fallback: 1,
			max: 5,
			min: 0.25,
		});
		expect(numberSpecOf("bossHealthFactor")).toMatchObject({
			fallback: 1,
			max: 5,
			min: 0.2,
		});
		expect(numberSpecOf("flameLevelFogRemoval")).toMatchObject({
			fallback: 11,
			integer: true,
			max: 20,
			min: 0,
		});
	});

	it("offers Automatic for the enemy amount, its 1.0 default, but not for how many attack at once", () => {
		expect(optionValuesOf(selectSpecOf("randomSpawnerAmount"))).toContain(EnshroudedEnemyAmount.Automatic);
		expect(selectSpecOf("randomSpawnerAmount").fallback).toBe(EnshroudedEnemyAmount.Automatic);
		expect(optionValuesOf(selectSpecOf("aggroPoolAmount"))).not.toContain(EnshroudedEnemyAmount.Automatic);
	});

	it("keeps the chat, slots and preset as top-level config keys", () => {
		expect(CONFIG_SETTINGS.map((spec: EnshroudedSettingSpec) => spec.fileKey)).toEqual([
			"slotCount",
			"enableVoiceChat",
			"voiceChatMode",
			"enableTextChat",
			"gameSettingsPreset",
		]);
	});
});

describe("the duration settings", () => {
	it("store minutes as nanoseconds", () => {
		expect(settingWriteOf(numberSpecOf("dayTimeMinutes"), 45)).toEqual({
			shown: 45,
			stored: 2_700_000_000_000,
		});
		expect(numberSpecOf("hungerToStarvingMinutes").fileKey).toBe("fromHungerToStarving");
	});

	it("show nanoseconds as minutes", () => {
		expect(shownValueOf(numberSpecOf("nightTimeMinutes"), 720_000_000_000)).toBe(12);
		expect(shownValueOf(numberSpecOf("hungerToStarvingMinutes"), 600_000_000_000)).toBe(10);
	});

	it("fall back to Keen's default when the file holds no number", () => {
		expect(shownValueOf(numberSpecOf("dayTimeMinutes"), "long")).toBe(30);
	});
});

describe("the tags array", () => {
	it("keeps a tag the panel does not know when a known one is switched off", () => {
		expect(
			tagsWith(
				[
					"English",
					"PvE",
				],
				new Map([
					[
						"English",
						false,
					],
					[
						"Roleplay",
						true,
					],
				]),
			),
		).toEqual([
			"PvE",
			"Roleplay",
		]);
	});
});
