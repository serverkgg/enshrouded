import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { CONFIG_FILE, WORLD_FILE } from "../shared";
import { memoryContext } from "../testing";
import {
	NO_WORLD,
	NOT_A_WORLD,
	STOP_BEFORE_UPLOAD,
	UPLOAD_MISSING,
	WIPE_ACTION,
	WORLD_ALREADY_HERE,
	world,
} from "./world";
import { WORLD_UPLOAD_STAGING } from "./worldFiles";

const UPLOAD = `${WORLD_UPLOAD_STAGING}/0f6c2a/MyWorld.ksd`;

const WORLD_CONTENT = "w".repeat(2048);

const MIGRATED = "savegame/migrated/3ad85aea";

const refusalOf = async (run: () => Promise<unknown>) => {
	try {
		await run();
	} catch (error) {
		if (error instanceof BridgeUserError) {
			return error.text;
		}

		throw error;
	}

	throw new Error("the action was not refused");
};

const wipe = async (context: Parameters<typeof world.list>[0]) => {
	const action = world.actions?.[WIPE_ACTION];

	if (action === undefined) {
		throw new Error("no wipe action");
	}

	await action(
		context,
		{
			id: "world0.ksd",
		},
		{},
	);
};

describe("the world table", () => {
	it("lists the one world file with its size, modified time and download path", async () => {
		const { context } = memoryContext({
			files: {
				[WORLD_FILE]: WORLD_CONTENT,
			},
			modified: {
				[WORLD_FILE]: "2026-11-05T21:07:42.000Z",
			},
		});

		expect(await world.list(context)).toEqual([
			{
				file: "world0.ksd",
				id: "world0.ksd",
				modified: "2026-11-05 21:07 UTC",
				path: WORLD_FILE,
				size: "2 KB",
			},
		]);
	});

	it("lists nothing when the server has no world yet", async () => {
		const { context } = memoryContext({
			files: {
				[CONFIG_FILE]: "{}",
				[MIGRATED]: "old world",
			},
		});

		expect(await world.list(context)).toEqual([]);
	});

	it("serves the world file itself as the download target", async () => {
		const { context } = memoryContext({
			files: {
				[WORLD_FILE]: WORLD_CONTENT,
			},
		});

		const [row] = await world.list(context);

		expect(row?.path).toBe(WORLD_FILE);
		expect(await context.files.exists(String(row?.path))).toBe(true);
	});

	it("works while the server is stopped and protects only the wipe", () => {
		expect(world.requiresRunning).toBe(false);

		expect(world.protectedActions).toEqual([
			WIPE_ACTION,
		]);

		expect(Object.keys(world.actions ?? {})).toEqual([
			WIPE_ACTION,
		]);
	});
});

describe("uploading a world", () => {
	it("places the uploaded file as the world and reports the import", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				[UPLOAD]: WORLD_CONTENT,
			},
		});

		const outcome = await world.add?.(context, UPLOAD);

		expect(files.get(WORLD_FILE)).toBe(WORLD_CONTENT);
		expect(files.has(UPLOAD)).toBe(false);
		expect(outcome?.notice.en).toBe("Uploaded your world, your server runs on it from the next start");

		expect(activities).toEqual([
			{
				details: {
					file: "MyWorld.ksd",
				},
				name: BridgeEventName.WorldImported,
				subject: "MyWorld.ksd",
				text: {
					ar: "تم رفع الماب MyWorld.ksd",
					en: "Uploaded world MyWorld.ksd",
				},
			},
		]);

		expect((await world.list(context)).map((row) => row.id)).toEqual([
			"world0.ksd",
		]);
	});

	it("refuses while the server is running and writes nothing", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				[UPLOAD]: WORLD_CONTENT,
			},
			running: true,
		});

		expect(await refusalOf(async () => await world.add?.(context, UPLOAD))).toEqual(STOP_BEFORE_UPLOAD);
		expect(files.has(WORLD_FILE)).toBe(false);
		expect(files.has(UPLOAD)).toBe(true);
		expect(activities).toEqual([]);
	});

	it("refuses while a world exists and never overwrites it", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				[UPLOAD]: "the new world",
				[WORLD_FILE]: WORLD_CONTENT,
			},
		});

		expect(await refusalOf(async () => await world.add?.(context, UPLOAD))).toEqual(WORLD_ALREADY_HERE);
		expect(files.get(WORLD_FILE)).toBe(WORLD_CONTENT);
		expect(files.has(UPLOAD)).toBe(true);
		expect(activities).toEqual([]);
	});

	it("refuses a file that is not a ksd world before writing anything", async () => {
		const upload = `${WORLD_UPLOAD_STAGING}/0f6c2a/world0.zip`;

		const { context, files } = memoryContext({
			files: {
				[upload]: "a zip",
			},
		});

		expect(await refusalOf(async () => await world.add?.(context, upload))).toEqual(NOT_A_WORLD);
		expect(files.has(WORLD_FILE)).toBe(false);
		expect(files.has(upload)).toBe(true);
	});

	it("accepts the ksd extension in any letter case", async () => {
		const upload = `${WORLD_UPLOAD_STAGING}/0f6c2a/WORLD0.KSD`;

		const { context, files } = memoryContext({
			files: {
				[upload]: WORLD_CONTENT,
			},
		});

		await world.add?.(context, upload);

		expect(files.get(WORLD_FILE)).toBe(WORLD_CONTENT);
	});

	it("refuses a path outside the upload folder, so no server file can be moved into the world", async () => {
		const { context, files } = memoryContext({
			files: {
				[CONFIG_FILE]: "{}",
				"savegame/other.ksd": WORLD_CONTENT,
			},
		});

		for (const input of [
			"savegame/other.ksd",
			`${WORLD_UPLOAD_STAGING}/../savegame/other.ksd`,
			`${WORLD_UPLOAD_STAGING}/0f6c2a/gone.ksd`,
		]) {
			expect(await refusalOf(async () => await world.add?.(context, input))).toEqual(UPLOAD_MISSING);
		}

		expect(files.has(WORLD_FILE)).toBe(false);
		expect(files.has("savegame/other.ksd")).toBe(true);
	});
});

describe("wiping the world", () => {
	it("is available only while the world file exists", async () => {
		const present = memoryContext({
			files: {
				[WORLD_FILE]: WORLD_CONTENT,
			},
		});

		const absent = memoryContext();

		const row = {
			id: "world0.ksd",
		};

		expect(await world.unavailable?.(present.context, row)).toEqual({});

		expect(await world.unavailable?.(absent.context, row)).toEqual({
			[WIPE_ACTION]: NO_WORLD,
		});
	});

	it("deletes the world, its copies and the game's rolling backups, and keeps every other save file", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				[CONFIG_FILE]: "{}",
				[MIGRATED]: "old world",
				[WORLD_FILE]: WORLD_CONTENT,
				"savegame/backup/world0.ksd.backup-0": "rolling copy",
				"savegame/backup/world0.ksd.backup-9": "rolling copy",
				"savegame/notes.txt": "kept",
				"savegame/world0.ksd-1": "copy",
				"savegame/world0.ksd.bak": "copy",
				"savegame/world1.ksd": "another slot",
			},
		});

		await wipe(context);

		expect(
			[
				...files.keys(),
			].sort(),
		).toEqual([
			CONFIG_FILE,
			MIGRATED,
			"savegame/notes.txt",
			"savegame/world1.ksd",
		]);

		expect(activities).toEqual([
			{
				details: {
					copies: 4,
					file: "world0.ksd",
				},
				name: BridgeEventName.WorldWiped,
				subject: "world0.ksd",
				text: {
					ar: "تم وايب الماب، وينشئ إنشراودد مابًا جديدًا في التشغيل القادم",
					en: "Wiped the world, Enshrouded creates a new one at the next start",
				},
			},
		]);

		expect(await world.list(context)).toEqual([]);
	});

	it("deletes the world file last, so a failed copy removal leaves the world in place", async () => {
		const { context, removed } = memoryContext({
			files: {
				[WORLD_FILE]: WORLD_CONTENT,
				"savegame/backup/world0.ksd.backup-3": "rolling copy",
				"savegame/world0.ksd-1": "copy",
			},
		});

		await wipe(context);

		expect(removed).toEqual([
			"savegame/world0.ksd-1",
			"savegame/backup/world0.ksd.backup-3",
			WORLD_FILE,
		]);
	});

	it("refuses before any write when there is no world to wipe", async () => {
		const { activities, context, removed } = memoryContext({
			files: {
				"savegame/world0.ksd-1": "copy",
			},
		});

		expect(await refusalOf(async () => await wipe(context))).toEqual(NO_WORLD);
		expect(removed).toEqual([]);
		expect(activities).toEqual([]);
	});
});
