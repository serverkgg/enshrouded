import { describe, expect, it } from "bun:test";
import { WORLD_FILE } from "../shared";
import { isWorldUpload, modifiedLabelOf, WORLD_COPY_PATTERN, WORLD_FILE_NAME } from "./worldFiles";

describe("the world file layout", () => {
	it("names the world file inside the save folder", () => {
		expect(WORLD_FILE_NAME).toBe("world0.ksd");
		expect(WORLD_FILE.endsWith(`/${WORLD_FILE_NAME}`)).toBe(true);
	});

	it("counts the world file and the files named after it as the world, and nothing else", () => {
		expect(
			[
				WORLD_FILE_NAME,
				"world0.ksd-1",
				"world0.ksd.bak",
				"world0-1.ksd",
				"world0_info",
				"world1.ksd",
				"world01.ksd",
				"migrated",
				"notes.txt",
			].filter((name) => WORLD_COPY_PATTERN.test(name)),
		).toEqual([
			WORLD_FILE_NAME,
			"world0.ksd-1",
			"world0.ksd.bak",
			"world0-1.ksd",
			"world0_info",
		]);
	});

	it("takes only a ksd file as a world upload", () => {
		expect(isWorldUpload("a/b/MyWorld.ksd")).toBe(true);
		expect(isWorldUpload("a/b/MyWorld.KSD")).toBe(true);
		expect(isWorldUpload("a/b/MyWorld.ksd.zip")).toBe(false);
		expect(isWorldUpload("a/b/3ad85aea")).toBe(false);
	});

	it("shows the modified time in UTC to the minute, and nothing for an unreadable time", () => {
		expect(modifiedLabelOf("2026-11-05T21:07:42.000Z")).toBe("2026-11-05 21:07 UTC");
		expect(modifiedLabelOf("")).toBe("");
	});
});
