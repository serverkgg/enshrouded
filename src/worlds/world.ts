import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { relativeUploadPath } from "@serverkgg/bridge/utils";
import { SAVE_DIRECTORY, WORLD_FILE } from "../shared";
import {
	isUnder,
	isWorldUpload,
	WORLD_FILE_NAME,
	WORLD_UPLOAD_STAGING,
	worldBackupsOf,
	worldEntryOf,
	worldFilesOf,
	worldRowOf,
} from "./worldFiles";

export const WIPE_ACTION = "wipe";

export const STOP_BEFORE_UPLOAD: Bridge.Text = {
	ar: "أوقف سيرفرك قبل رفع الماب، ثم جرب مرة ثانية.",
	en: "Stop your server before uploading a world, then try again.",
};

export const UPLOAD_MISSING: Bridge.Text = {
	ar: "تعذّر العثور على الملف الذي رفعته.",
	en: "We couldn't find the file you uploaded.",
};

export const NOT_A_WORLD: Bridge.Text = {
	ar: "هذا الملف ليس ماب إنشراودد. ارفع ملف الماب الذي ينتهي اسمه بـ .ksd.",
	en: "This file isn't an Enshrouded world. Upload the world file whose name ends in .ksd.",
};

export const WORLD_ALREADY_HERE: Bridge.Text = {
	ar: "يوجد ماب على سيرفرك، ولا نستبدله برفع جديد. نفّذ وايب للماب من الجدول أولًا، ثم ارفع مابك مرة ثانية.",
	en: "Your server already has a world, and we don't replace it with an upload. Wipe the world from the table first, then upload yours again.",
};

export const NO_WORLD: Bridge.Text = {
	ar: "لا يوجد ماب على سيرفرك. ينشئ إنشراودد الماب في التشغيل القادم.",
	en: "Your server has no world. Enshrouded creates one at the next start.",
};

const uploadedNameOf = (source: string) => {
	return source.split("/").at(-1) ?? source;
};

export const world: Bridge.Collection = {
	kind: BridgeKind.Collection,
	protectedActions: [
		WIPE_ACTION,
	],
	requiresRunning: false,
	async list(context) {
		const entry = await worldEntryOf(context);

		return entry === null
			? []
			: [
					worldRowOf(entry),
				];
	},
	async add(context, input) {
		if (context.server.running) {
			throw new BridgeUserError(STOP_BEFORE_UPLOAD);
		}

		const source = relativeUploadPath(input);

		if (source === null || !isUnder(source, WORLD_UPLOAD_STAGING) || !(await context.files.exists(source))) {
			throw new BridgeUserError(UPLOAD_MISSING);
		}

		if (!isWorldUpload(source)) {
			throw new BridgeUserError(NOT_A_WORLD);
		}

		if (await context.files.exists(WORLD_FILE)) {
			throw new BridgeUserError(WORLD_ALREADY_HERE);
		}

		const uploaded = uploadedNameOf(source);

		await context.files.ensure(SAVE_DIRECTORY);
		await context.files.move(source, WORLD_FILE);

		context.log("imported an uploaded world", {
			file: uploaded,
		});

		context.activity.report({
			details: {
				file: uploaded,
			},
			name: BridgeEventName.WorldImported,
			subject: uploaded,
			text: {
				ar: `تم رفع الماب ${uploaded}`,
				en: `Uploaded world ${uploaded}`,
			},
		});

		return {
			notice: {
				ar: "تم رفع مابك، ويشتغل عليه سيرفرك من التشغيل القادم",
				en: "Uploaded your world, your server runs on it from the next start",
			},
		};
	},
	actions: {
		async [WIPE_ACTION](context) {
			const files = await worldFilesOf(context);

			if (!files.some((entry) => entry.path === WORLD_FILE)) {
				throw new BridgeUserError(NO_WORLD);
			}

			const copies = [
				...files.filter((entry) => entry.path !== WORLD_FILE),
				...(await worldBackupsOf(context)),
			];

			for (const copy of copies) {
				await context.files.remove(copy.path);
			}

			await context.files.remove(WORLD_FILE);

			context.log("wiped the world", {
				copies: copies.length,
			});

			context.activity.report({
				details: {
					copies: copies.length,
					file: WORLD_FILE_NAME,
				},
				name: BridgeEventName.WorldWiped,
				subject: WORLD_FILE_NAME,
				text: {
					ar: "تم وايب الماب، وينشئ إنشراودد مابًا جديدًا في التشغيل القادم",
					en: "Wiped the world, Enshrouded creates a new one at the next start",
				},
			});
		},
	},
	async unavailable(context): Promise<Bridge.Unavailable> {
		return (await context.files.exists(WORLD_FILE))
			? {}
			: {
					[WIPE_ACTION]: NO_WORLD,
				};
	},
};
