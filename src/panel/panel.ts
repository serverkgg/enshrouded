import { type Bridge, BridgeIcon } from "@serverkgg/bridge";
import { onlineSection, rolesSection } from "../collections";
import { joinPasswordsSection, metricsSection } from "../details";
import {
	chatSection,
	difficultyGroupSections,
	difficultySection,
	passwordsSection,
	SETTINGS_TAB_ID,
	SETTINGS_TITLE,
	serverSection,
} from "../settings";
import { WORLD_TAB_ID, worldSection } from "../worlds";

export const DIFFICULTY_TAB_ID = "difficulty";

export const PLAYERS_TAB_ID = "players";

const settingsTab: Bridge.Tab = {
	icon: BridgeIcon.Settings,
	id: SETTINGS_TAB_ID,
	sections: [
		serverSection,
		chatSection,
		passwordsSection,
		metricsSection,
		joinPasswordsSection,
	],
	title: SETTINGS_TITLE,
};

const difficultyTab: Bridge.Tab = {
	icon: BridgeIcon.Sword,
	id: DIFFICULTY_TAB_ID,
	sections: [
		difficultySection,
		...difficultyGroupSections,
	],
	title: {
		ar: "الصعوبة",
		en: "Difficulty",
	},
};

const playersTab: Bridge.Tab = {
	icon: BridgeIcon.Users,
	id: PLAYERS_TAB_ID,
	sections: [
		onlineSection,
		rolesSection,
	],
	title: {
		ar: "اللاعبون",
		en: "Players",
	},
};

const worldTab: Bridge.Tab = {
	icon: BridgeIcon.Map,
	id: WORLD_TAB_ID,
	sections: [
		worldSection,
	],
	title: {
		ar: "الماب",
		en: "World",
	},
};

export const panel: Bridge.Panel = {
	tabs: [
		settingsTab,
		difficultyTab,
		playersTab,
		worldTab,
	],
};
