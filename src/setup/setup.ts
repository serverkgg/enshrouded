import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { BridgeSetupStepKind } from "@serverkgg/bridge/protocol";
import { NAME_KEY, PASSWORD_KEYS, PASSWORDS_SECTION_ID, SERVER_SECTION_ID, SETTINGS_TAB_ID } from "../settings";
import { EnshroudedGroup } from "../shared";
import { CHECK_ACTION, ONLINE_STEP, reportOnline } from "./setupOnline";

export const ADMIN_PASSWORD_FIELD = PASSWORD_KEYS[EnshroudedGroup.Admin];

const UNKNOWN_STEP: Bridge.Text = {
	ar: "هذه الخطوة ليست من خطوات تجهيز سيرفر إنشراودد. حدّث الصفحة وجرب مرة ثانية.",
	en: "That step isn't part of the Enshrouded setup. Refresh the page and try again.",
};

const UNKNOWN_ACTION: Bridge.Text = {
	ar: "تعذّر التعرف على هذا الزر. حدّث الصفحة وجرب مرة ثانية.",
	en: "We don't know that button. Refresh the page and try again.",
};

const serverStep: Bridge.SetupStep = {
	fields: [
		NAME_KEY,
	],
	help: {
		ar: "يرى أصحابك هذا الاسم في قائمة Join داخل إنشراودد، ويبحثون به عن سيرفرك.",
		en: "Your friends see this name in Enshrouded's Join list and search for your server by it.",
	},
	id: "server",
	kind: BridgeSetupStepKind.Form,
	required: false,
	section: SERVER_SECTION_ID,
	tab: SETTINGS_TAB_ID,
	title: {
		ar: "سمِّ سيرفرك",
		en: "Name your server",
	},
};

const adminStep: Bridge.SetupStep = {
	fields: [
		ADMIN_PASSWORD_FIELD,
	],
	help: {
		ar: "من يدخل بكلمة المرور هذه يملك صلاحيات رتبة أدمن (Admin) كاملة، ومنها الطرد والحظر من تبويب Social داخل اللعبة. احتفظ بها لنفسك.",
		en: "Whoever joins with this password gets full Admin rights, including kick and ban from the game's Social tab. Keep it to yourself.",
	},
	id: "admin",
	kind: BridgeSetupStepKind.Form,
	required: false,
	section: PASSWORDS_SECTION_ID,
	tab: SETTINGS_TAB_ID,
	title: {
		ar: "اختر كلمة مرور أدمن",
		en: "Set the Admin password",
	},
};

const onlineStep: Bridge.SetupStep = {
	help: {
		ar: "نتأكد أن سيرفرك اشتغل بإعداداتك الحالية، واتصل بـ Steam ليظهر في قائمة Join، وفتح الماب.",
		en: "We check that your server started with your current settings, reached Steam so it shows in the Join list, and opened the world.",
	},
	id: ONLINE_STEP,
	kind: BridgeSetupStepKind.Driver,
	required: true,
	requiresRunning: true,
	title: {
		ar: "تأكد أن سيرفرك متصل",
		en: "Check your server is online",
	},
};

const inviteStep: Bridge.SetupStep = {
	help: {
		ar: "أرسل عنوان سيرفرك لأصحابك، ليضيفوه إلى مفضلة Steam أو يجدوا سيرفرك في قائمة Join داخل اللعبة بعد تفعيل Show dedicated servers. وأرسل لهم كلمة مرور صديق (Friend) من بطاقة كلمات المرور في صفحة نظرة عامة.",
		en: "Send your server's address to your friends. They add it to their Steam favorites, or find your server in the game's Join list with Show dedicated servers on. Then share the Friend password from the Passwords card on the Overview.",
	},
	id: "invite",
	kind: BridgeSetupStepKind.Open,
	required: false,
	target: {
		tab: GuideOpenTab.Access,
	},
	title: {
		ar: "ادعُ أصحابك",
		en: "Invite your friends",
	},
};

export const setup: Bridge.Setup = {
	kind: BridgeKind.Setup,
	steps: [
		onlineStep,
		serverStep,
		adminStep,
		inviteStep,
	],
	async submit(context, step, action) {
		if (step !== ONLINE_STEP) {
			throw new BridgeUserError(UNKNOWN_STEP);
		}

		if (action !== CHECK_ACTION) {
			throw new BridgeUserError(UNKNOWN_ACTION);
		}

		await reportOnline(context);
	},
};
