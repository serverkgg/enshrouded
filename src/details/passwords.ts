import {
	type Bridge,
	BridgeAccess,
	BridgeDetailFormat,
	BridgeDetailTone,
	BridgeKind,
	BridgeLayout,
	BridgePlace,
} from "@serverkgg/bridge";
import { PASSWORD_LABELS, SETTINGS_TAB_ID, SETTINGS_TITLE } from "../settings";
import {
	applyConfigPatch,
	EnshroudedGroup,
	type EnshroudedServerConfig,
	readEnshroudedStamp,
	readServerConfig,
} from "../shared";

export const PASSWORDS_DETAIL_ID = "passwords";

export const JOIN_PASSWORDS_SECTION_ID = "join-passwords";

export const PASSWORDS_REFRESH_SECONDS = 30;

const MISSING = "—";

const PASSWORD_KEY_SUFFIX = "Password";

export const PASSWORDS_PENDING: Bridge.DetailBadge = {
	label: {
		ar: "كلمات المرور الجديدة تُطبَّق بعد الريستارت",
		en: "New passwords apply after restart",
	},
	tone: BridgeDetailTone.Warning,
};

export const passwordKeyOf = (group: EnshroudedGroup) => {
	return `${group.toLowerCase()}${PASSWORD_KEY_SUFFIX}`;
};

export const groupPasswordOf = (config: EnshroudedServerConfig, group: EnshroudedGroup) => {
	const password = (config.userGroups ?? []).find((entry) => entry.name === group)?.password;

	return typeof password === "string" && password.length > 0 ? password : null;
};

export const passwordStatsOf = (config: EnshroudedServerConfig): Bridge.DetailStat[] => {
	return Object.values(EnshroudedGroup).map((group) => {
		const password = groupPasswordOf(config, group);

		return {
			format: password === null ? BridgeDetailFormat.Text : BridgeDetailFormat.Secret,
			key: passwordKeyOf(group),
			label: PASSWORD_LABELS[group],
			value: password ?? MISSING,
		};
	});
};

export const passwordsPending = (current: EnshroudedServerConfig, next: EnshroudedServerConfig) => {
	return Object.values(EnshroudedGroup).some(
		(group) => groupPasswordOf(current, group) !== groupPasswordOf(next, group),
	);
};

export const passwords: Bridge.Detail = {
	kind: BridgeKind.Detail,
	refreshSeconds: PASSWORDS_REFRESH_SECONDS,
	async read(context) {
		const config = await readServerConfig(context);
		const stamp = await readEnshroudedStamp(context);
		const next = applyConfigPatch(config, stamp.settingsPending);

		return {
			actions: [],
			badges: passwordsPending(config, next)
				? [
						PASSWORDS_PENDING,
					]
				: [],
			description: {
				ar: "أرسل كلمة مرور صديق (Friend) لأصحابك، واحتفظ بكلمة مرور أدمن (Admin) لنفسك. يكتب اللاعب كلمة المرور عند دخول السيرفر، فيدخل بالصلاحيات المرتبطة بها.",
				en: "Share the Friend password with your friends and keep the Admin password to yourself. A player types a password when they join the server and gets the rights that go with it.",
			},
			id: PASSWORDS_DETAIL_ID,
			image: null,
			links: [],
			stale: false,
			stats: passwordStatsOf(config),
			subtitle: {
				ar: "كلمات المرور التي يدخل بها اللاعبون سيرفرك",
				en: "The passwords players join your server with",
			},
			title: {
				ar: "كلمات المرور",
				en: "Passwords",
			},
		};
	},
};

export const joinPasswordsSection: Bridge.Section = {
	access: BridgeAccess.Invoke,
	help: {
		ar: "يدخل كل لاعب سيرفرك بإحدى كلمات المرور هذه، وهي التي تحدد صلاحياته. غيّرها من الإعدادات.",
		en: "Every player joins your server with one of these passwords, and the password sets what they may do. Change them in Settings.",
	},
	id: JOIN_PASSWORDS_SECTION_ID,
	layout: BridgeLayout.Detail,
	module: "passwords",
	place: BridgePlace.Overview,
	related: {
		label: SETTINGS_TITLE,
		tab: SETTINGS_TAB_ID,
	},
	title: {
		ar: "كلمات المرور",
		en: "Passwords",
	},
};
