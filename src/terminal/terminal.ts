import { type Bridge, BridgeKind, BridgeTerminalLevel } from "@serverkgg/bridge";
import {
	JOIN_LINE,
	LEAVE_LINE,
	PORT_BIND_FAILED_LINE,
	SERVER_READY,
	SHUTDOWN_LINE,
	STEAM_CONNECTED_LINE,
	STEAM_FAILURE_LINE,
	VERSION_LINE,
	WINE_CRASH_LINE,
} from "../shared";
import { consoleHandler } from "./consoleHandler";

const commands: Bridge.TerminalCommand[] = [
	{
		name: "status",
		summary: {
			ar: "حالة سيرفرك: الاسم، والإصدار، والبيلد، واللاعبون، ومدة التشغيل، وآخر حفظ للماب.",
			en: "Your server's state: name, version, build, players, uptime and the last world save.",
		},
	},
	{
		name: "players",
		summary: {
			ar: "اللاعبون المتصلون الآن، ورقم Steam لكل لاعب ووقت دخوله.",
			en: "The players who are on right now, with each one's Steam ID and when they joined.",
		},
	},
	{
		name: "roles",
		summary: {
			ar: "الرتب الأربع وصلاحيات كل رتبة، دون كلمات المرور.",
			en: "The four roles and what each one may do, without their passwords.",
		},
	},
	{
		name: "world",
		summary: {
			ar: "ملف الماب world0.ksd: هل هو موجود، وحجمه، ووقت آخر تعديل عليه.",
			en: "The world file world0.ksd: whether it exists, its size and when it last changed.",
		},
	},
	{
		name: "help",
		summary: {
			ar: "الأوامر التي ننفّذها من هنا.",
			en: "The commands we answer from here.",
		},
	},
];

const ruleOf = (level: BridgeTerminalLevel, match: RegExp): Bridge.TerminalRule => {
	return {
		level,
		match,
	};
};

const rules: Bridge.TerminalRule[] = [
	ruleOf(BridgeTerminalLevel.Error, STEAM_FAILURE_LINE),
	ruleOf(BridgeTerminalLevel.Error, WINE_CRASH_LINE),
	ruleOf(BridgeTerminalLevel.Error, PORT_BIND_FAILED_LINE),
	ruleOf(BridgeTerminalLevel.Info, SERVER_READY),
	ruleOf(BridgeTerminalLevel.Info, STEAM_CONNECTED_LINE),
	ruleOf(BridgeTerminalLevel.Info, SHUTDOWN_LINE),
	ruleOf(BridgeTerminalLevel.Info, JOIN_LINE),
	ruleOf(BridgeTerminalLevel.Info, LEAVE_LINE),
	ruleOf(BridgeTerminalLevel.Info, VERSION_LINE),
];

export const terminal: Bridge.Terminal = {
	kind: BridgeKind.Terminal,
	commands,
	rules,
	run: consoleHandler,
};
