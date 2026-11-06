import { type Bridge, BridgeConfirm, BridgeLayout, BridgeUploadMode } from "@serverkgg/bridge";
import { WIPE_ACTION } from "./world";
import { WORLD_UPLOAD_EXTENSION, WORLD_UPLOAD_STAGING } from "./worldFiles";

export const WORLD_TAB_ID = "world";

export const WORLD_SECTION_ID = "world";

export const WORLD_MODULE = "world";

export const DOWNLOAD_ACTION = "download";

export const worldSection: Bridge.Section = {
	actions: [
		{
			download: true,
			id: DOWNLOAD_ACTION,
			label: {
				ar: "نزّل",
				en: "Download",
			},
		},
		{
			confirm: BridgeConfirm.Strong,
			confirmText: {
				ar: "يُحذف ملف الماب نهائيًا، وينشئ إنشراودد مابًا جديدًا في التشغيل القادم. لا نأخذ نسخة احتياطية قبل الوايب، فخذ نسخة احتياطية أولًا إذا أردت الرجوع إليه. تبقى شخصيات اللاعبين كما هي، فهي على أجهزتهم.",
				en: "The world file is deleted for good, and Enshrouded creates a new world at the next start. We don't take a backup before the wipe, so take one first if you might want it back. Players keep their characters, which are on their own PCs.",
			},
			id: WIPE_ACTION,
			label: {
				ar: "نفّذ وايب للماب",
				en: "Wipe the world",
			},
		},
	],
	columns: [
		{
			key: "file",
			label: {
				ar: "الملف",
				en: "File",
			},
		},
		{
			key: "size",
			label: {
				ar: "الحجم",
				en: "Size",
			},
		},
		{
			key: "modified",
			label: {
				ar: "آخر تعديل",
				en: "Modified",
			},
		},
	],
	empty: {
		ar: "لا يوجد ماب بعد. ينشئ إنشراودد الماب في أول تشغيل، أو ارفع مابك والسيرفر متوقف.",
		en: "No world yet. Enshrouded creates one at its first start, or upload yours while the server is stopped.",
	},
	help: {
		ar: "هنا ملف مابك، أما شخصيات اللاعبين فهي على أجهزتهم. لتستبدل الماب، نفّذ له وايب ثم ارفع مابك والسيرفر متوقف.",
		en: "Your world file lives here, and players' characters stay on their own PCs. To replace the world, wipe it, then upload yours while the server is stopped.",
	},
	id: WORLD_SECTION_ID,
	layout: BridgeLayout.Table,
	module: WORLD_MODULE,
	title: {
		ar: "مابك",
		en: "Your world",
	},
	upload: {
		extensions: [
			WORLD_UPLOAD_EXTENSION,
		],
		label: {
			ar: "ارفع ماب",
			en: "Upload world",
		},
		mode: BridgeUploadMode.File,
		staging: WORLD_UPLOAD_STAGING,
	},
};
