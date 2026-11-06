import { describe, expect, it } from "bun:test";
import { type Bridge, BridgeConfirm, BridgeLayout, BridgeUploadMode, isLocalizedText } from "@serverkgg/bridge";
import { WIPE_ACTION } from "./world";
import { WORLD_UPLOAD_STAGING } from "./worldFiles";
import { DOWNLOAD_ACTION, WORLD_MODULE, WORLD_SECTION_ID, worldSection } from "./worldSection";

const PROTECTED_STAGING = ".serverk-staging/";

const textsOf = (value: unknown): Bridge.Text[] => {
	if (isLocalizedText(value)) {
		return [
			value,
		];
	}

	if (typeof value !== "object" || value === null) {
		return [];
	}

	return Object.values(value).flatMap(textsOf);
};

const tableOf = (section: Bridge.Section) => {
	if (section.layout !== BridgeLayout.Table) {
		throw new Error("the world section is not a table");
	}

	return section;
};

describe("the world section", () => {
	it("is a table on the world module with the file, size and modified columns", () => {
		const table = tableOf(worldSection);

		expect(table.id).toBe(WORLD_SECTION_ID);
		expect(table.module).toBe(WORLD_MODULE);

		expect(table.columns.map((column) => column.key)).toEqual([
			"file",
			"size",
			"modified",
		]);
	});

	it("takes ksd files into an upload folder outside the protected staging, so the platform can write there", () => {
		const table = tableOf(worldSection);

		expect(table.upload).toMatchObject({
			extensions: [
				"ksd",
			],
			mode: BridgeUploadMode.File,
			staging: WORLD_UPLOAD_STAGING,
		});

		expect(WORLD_UPLOAD_STAGING.startsWith(PROTECTED_STAGING)).toBe(false);
	});

	it("serves the download and guards the wipe with the strong acknowledgement", () => {
		const actions = tableOf(worldSection).actions ?? [];

		expect(
			actions.map((action) => [
				action.id,
				action.download ?? false,
				action.confirm ?? BridgeConfirm.None,
			]),
		).toEqual([
			[
				DOWNLOAD_ACTION,
				true,
				BridgeConfirm.None,
			],
			[
				WIPE_ACTION,
				false,
				BridgeConfirm.Strong,
			],
		]);
	});

	it("tells the player the wipe takes no backup", () => {
		const wipe = tableOf(worldSection).actions?.find((action) => action.id === WIPE_ACTION);

		expect(wipe?.confirmText?.en).toContain("We don't take a backup");
		expect(wipe?.confirmText?.ar).toContain("لا نأخذ نسخة احتياطية");
	});

	it("writes every text in Arabic and English", () => {
		const texts = textsOf(worldSection);

		expect(texts.length).toBeGreaterThan(0);

		for (const text of texts) {
			expect(text.ar.length).toBeGreaterThan(0);
			expect(text.en.length).toBeGreaterThan(0);
		}
	});
});
