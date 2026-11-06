import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { formatByteSize } from "@serverkgg/bridge/utils";
import { lastSaveOf, worldFileOf } from "../details";
import { maxPlayersOf } from "../query";
import {
	CONFIG_FILE,
	type EnshroudedGroupPermissions,
	type EnshroudedPlayer,
	type EnshroudedUserGroup,
	readEnshroudedStamp,
	readServerConfig,
	roster,
	serverMetrics,
	USER_GROUPS_KEY,
	WORLD_FILE,
} from "../shared";

const SPACING = /\s+/;

const UNKNOWN = "unknown";

const UNSET = "unset";

const ROSTER_HEADER = "player,steamId,joined";

export const ROLE_PERMISSIONS: readonly (keyof EnshroudedGroupPermissions)[] = [
	"canKickBan",
	"canAccessInventories",
	"canEditWorld",
	"canEditBase",
	"canExtendBase",
	"reservedSlots",
];

const ROLES_HEADER = [
	"role",
	...ROLE_PERMISSIONS,
].join(",");

const NO_COMMAND: Bridge.Text = {
	ar: "اكتب أمرًا من قائمة الأوامر.",
	en: "Type a command from the command list.",
};

export const NO_CONSOLE: Bridge.Text = {
	ar: "لا يقرأ سيرفر إنشراودد أي أمر من الكونسول، فلا يمكن تمرير هذا الأمر إليه. الأوامر التي ننفّذها هنا في قائمة الأوامر، والطرد والحظر من تبويب Social داخل اللعبة.",
	en: "An Enshrouded server reads nothing from a console, so we can't pass that command to it. The command list holds the ones we answer here, and kick and ban happen in the game's Social tab.",
};

export const commandNameOf = (input: string) => {
	return (input.trim().split(SPACING).at(0) ?? "").toLowerCase();
};

export const rosterLines = (players: EnshroudedPlayer[]): string[] => {
	if (players.length === 0) {
		return [
			"no players online",
		];
	}

	return [
		ROSTER_HEADER,
		...players.map((player) => {
			return [
				player.player,
				player.steamId ?? UNKNOWN,
				new Date(player.joinedAt).toISOString(),
			].join(",");
		}),
	];
};

export const roleLines = (groups: EnshroudedUserGroup[], pending: boolean): string[] => {
	const lines =
		groups.length === 0
			? [
					`no roles in ${CONFIG_FILE}`,
				]
			: [
					ROLES_HEADER,
					...groups.map((group) => {
						return [
							group.name,
							...ROLE_PERMISSIONS.map((key) => String(group[key] ?? UNSET)),
						].join(",");
					}),
				];

	return pending
		? [
				...lines,
				"changes to the roles apply after a restart",
			]
		: lines;
};

export const worldLines = (entry: Bridge.FileEntry | null): string[] => {
	if (entry === null) {
		return [
			`no world yet, enshrouded creates ${WORLD_FILE} at its next start`,
		];
	}

	return [
		`world: ${WORLD_FILE}`,
		`size: ${formatByteSize(entry.sizeBytes)}`,
		`modified: ${entry.modifiedAt}`,
	];
};

type EnshroudedConsoleCommand = (context: Bridge.Context) => Promise<string[]>;

export const consoleCommands: Record<string, EnshroudedConsoleCommand> = {
	async status(context) {
		const stamp = await readEnshroudedStamp(context);
		const config = await readServerConfig(context);
		const snapshot = serverMetrics.snapshot();
		const lastSave = await lastSaveOf(context);

		return [
			`name: ${config.name ?? UNKNOWN}`,
			`version: ${snapshot.gameVersion ?? UNKNOWN}`,
			`build: ${stamp.buildId ?? UNKNOWN}`,
			`players: ${snapshot.online ?? roster.all().length}/${snapshot.max ?? maxPlayersOf(config)}`,
			`uptime: ${snapshot.uptimeSeconds === null ? UNKNOWN : `${snapshot.uptimeSeconds}s`}`,
			`last save: ${lastSave ?? UNKNOWN}`,
		];
	},

	async players() {
		return rosterLines(roster.all());
	},

	async roles(context) {
		const config = await readServerConfig(context);
		const stamp = await readEnshroudedStamp(context);

		return roleLines(config.userGroups ?? [], Object.hasOwn(stamp.settingsPending, USER_GROUPS_KEY));
	},

	async world(context) {
		return worldLines(await worldFileOf(context));
	},

	async help() {
		return [
			"status: name, version, build, players, uptime and last save",
			"players: everyone the log says is connected, with their steam id and when they joined",
			"roles: the four roles and their permissions, never their passwords",
			`world: whether ${WORLD_FILE} exists, its size and when it last changed`,
			"help: the commands we answer here",
		];
	},
};

export const consoleHandler: NonNullable<Bridge.Terminal["run"]> = async (context, input) => {
	const name = commandNameOf(input);

	if (name.length === 0) {
		throw new BridgeUserError(NO_COMMAND);
	}

	const command = Object.hasOwn(consoleCommands, name) ? consoleCommands[name] : undefined;

	if (!command) {
		throw new BridgeUserError(NO_CONSOLE);
	}

	return {
		groups: {},
		line: (await command(context)).join("\n"),
		sent: input,
	};
};
