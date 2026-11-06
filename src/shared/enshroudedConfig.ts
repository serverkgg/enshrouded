import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import type { PendingSettingValue } from "@serverkgg/bridge/install";
import { generateToken } from "@serverkgg/bridge/utils";
import {
	CONFIG_FILE,
	CONFIG_LOG_DIRECTORY,
	CONFIG_SAVE_DIRECTORY,
	GROUP_PASSWORD_LENGTH,
	QUERY_PORT,
	SERVER_ADDRESS,
	SLOT_COUNT_DEFAULT,
} from "./enshroudedApp";
import { markSettingsWritten, pendingSettingsFor, readEnshroudedStamp } from "./enshroudedStamp";

export type EnshroudedJson = PendingSettingValue;

export type EnshroudedJsonObject = Record<string, EnshroudedJson>;

export enum EnshroudedGroup {
	Admin = "Admin",
	Friend = "Friend",
	Guest = "Guest",
	Visitor = "Visitor",
}

export enum EnshroudedPreset {
	Default = "Default",
	Relaxed = "Relaxed",
	Hard = "Hard",
	Survival = "Survival",
	Custom = "Custom",
}

export enum EnshroudedVoiceChatMode {
	Proximity = "Proximity",
	Global = "Global",
}

export interface EnshroudedUserGroup extends Partial<Record<string, EnshroudedJson>> {
	name: string;
	password?: string;
	canKickBan?: boolean;
	canAccessInventories?: boolean;
	canEditWorld?: boolean;
	canEditBase?: boolean;
	canExtendBase?: boolean;
	reservedSlots?: number;
}

export interface EnshroudedServerConfig extends Partial<Record<string, EnshroudedJson | EnshroudedUserGroup[]>> {
	name?: string;
	saveDirectory?: string;
	logDirectory?: string;
	ip?: string;
	queryPort?: number;
	slotCount?: number;
	tags?: string[];
	voiceChatMode?: string;
	enableVoiceChat?: boolean;
	enableTextChat?: boolean;
	gameSettingsPreset?: string;
	gameSettings?: EnshroudedJsonObject;
	userGroups?: EnshroudedUserGroup[];
}

export interface EnshroudedGroupPermissions {
	canKickBan: boolean;
	canAccessInventories: boolean;
	canEditWorld: boolean;
	canEditBase: boolean;
	canExtendBase: boolean;
	reservedSlots: number;
}

interface ValidEntries {
	kept: EnshroudedJsonObject;
	dropped: string[];
}

interface ReadGroup {
	group: EnshroudedUserGroup | null;
	trimmed: boolean;
}

interface ReadGroups {
	groups: EnshroudedUserGroup[] | null;
	trimmed: boolean;
}

export interface ParsedServerConfig {
	config: EnshroudedServerConfig;
	invalidKeys: string[];
}

export interface PatchServerConfigOptions {
	secrets?: readonly string[];
}

export interface PatchServerConfigResult {
	pending: boolean;
}

export const CONFIG_UNREADABLE: Bridge.Text = {
	ar: "تعذّرت قراءة ملف enshrouded_server.json لأنه ليس JSON صحيحًا. صحّحه من تبويب الملفات، أو احذفه وننشئ ملفًا جديدًا عند التشغيل القادم.",
	en: "We couldn't read enshrouded_server.json because it isn't valid JSON. Fix it in the Files tab, or delete it and we'll create a new one at the next start.",
};

export const USER_GROUPS_KEY = "userGroups";

export const GAME_SETTINGS_KEY = "gameSettings";

export const SECRET_CONFIG_KEYS: readonly string[] = [
	USER_GROUPS_KEY,
];

export const DEFAULT_SERVER_NAME = "Enshrouded Server";

export const DEFAULT_QUERY_PORT = 15_637;

export const NANOSECONDS_PER_MINUTE = 60_000_000_000;

export const SEEDED_GROUPS: Readonly<Record<EnshroudedGroup, EnshroudedGroupPermissions>> = {
	[EnshroudedGroup.Admin]: {
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: true,
		canKickBan: true,
		reservedSlots: 0,
	},
	[EnshroudedGroup.Friend]: {
		canAccessInventories: true,
		canEditBase: true,
		canEditWorld: true,
		canExtendBase: false,
		canKickBan: false,
		reservedSlots: 0,
	},
	[EnshroudedGroup.Guest]: {
		canAccessInventories: false,
		canEditBase: false,
		canEditWorld: true,
		canExtendBase: false,
		canKickBan: false,
		reservedSlots: 0,
	},
	[EnshroudedGroup.Visitor]: {
		canAccessInventories: false,
		canEditBase: false,
		canEditWorld: false,
		canExtendBase: false,
		canKickBan: false,
		reservedSlots: 0,
	},
};

const isString = (value: unknown): value is string => {
	return typeof value === "string";
};

const isBoolean = (value: unknown): value is boolean => {
	return typeof value === "boolean";
};

const isNumber = (value: unknown): value is number => {
	return typeof value === "number" && Number.isFinite(value);
};

const isStringList = (value: unknown): value is string[] => {
	return Array.isArray(value) && value.every(isString);
};

export const objectOf = (value: unknown): EnshroudedJsonObject | null => {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as EnshroudedJsonObject) : null;
};

const CONFIG_KEY_CHECKS: Readonly<Record<string, (value: unknown) => boolean>> = {
	enableTextChat: isBoolean,
	enableVoiceChat: isBoolean,
	gameSettings: (value) => objectOf(value) !== null,
	gameSettingsPreset: isString,
	ip: isString,
	logDirectory: isString,
	name: isString,
	queryPort: isNumber,
	saveDirectory: isString,
	slotCount: isNumber,
	tags: isStringList,
	voiceChatMode: isString,
};

const GROUP_KEY_CHECKS: Readonly<Record<string, (value: unknown) => boolean>> = {
	canAccessInventories: isBoolean,
	canEditBase: isBoolean,
	canEditWorld: isBoolean,
	canExtendBase: isBoolean,
	canKickBan: isBoolean,
	password: isString,
	reservedSlots: isNumber,
};

const validEntries = (
	entry: EnshroudedJsonObject,
	checks: Readonly<Record<string, (value: unknown) => boolean>>,
): ValidEntries => {
	const dropped = Object.keys(checks).filter((key) => Object.hasOwn(entry, key) && !checks[key]?.(entry[key]));

	return {
		dropped,
		kept: Object.fromEntries(Object.entries(entry).filter(([key]) => !dropped.includes(key))),
	};
};

const groupOf = (value: unknown): ReadGroup => {
	const entry = objectOf(value);

	if (entry === null || !isString(entry.name)) {
		return {
			group: null,
			trimmed: true,
		};
	}

	const { dropped, kept } = validEntries(entry, GROUP_KEY_CHECKS);

	return {
		group: {
			...kept,
			name: entry.name,
		},
		trimmed: dropped.length > 0,
	};
};

const groupsOf = (value: EnshroudedJson | undefined): ReadGroups => {
	if (!Array.isArray(value)) {
		return {
			groups: null,
			trimmed: true,
		};
	}

	const read = value.map(groupOf);

	return {
		groups: read.flatMap((entry) =>
			entry.group === null
				? []
				: [
						entry.group,
					],
		),
		trimmed: read.some((entry) => entry.trimmed),
	};
};

export const normalizeServerConfig = (document: EnshroudedJsonObject): ParsedServerConfig => {
	const { dropped, kept } = validEntries(document, CONFIG_KEY_CHECKS);
	const invalidKeys = [
		...dropped,
	];

	if (!Object.hasOwn(document, USER_GROUPS_KEY)) {
		return {
			config: kept,
			invalidKeys,
		};
	}

	const { groups, trimmed } = groupsOf(document[USER_GROUPS_KEY]);

	if (trimmed) {
		invalidKeys.push(USER_GROUPS_KEY);
	}

	const rest = Object.fromEntries(Object.entries(kept).filter(([key]) => key !== USER_GROUPS_KEY));

	return {
		config:
			groups === null
				? rest
				: {
						...rest,
						userGroups: groups,
					},
		invalidKeys,
	};
};

export const parseServerConfig = (raw: string): ParsedServerConfig => {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new BridgeUserError(CONFIG_UNREADABLE, {
			cause: new Error(`${CONFIG_FILE} is not valid json`),
		});
	}

	const document = objectOf(parsed);

	if (document === null) {
		throw new BridgeUserError(CONFIG_UNREADABLE, {
			cause: new Error(`${CONFIG_FILE} holds no json object`),
		});
	}

	return normalizeServerConfig(document);
};

export const formatServerConfig = (config: EnshroudedServerConfig) => {
	return `${JSON.stringify(config, null, 2)}\n`;
};

export const configValues = (config: EnshroudedServerConfig): EnshroudedJsonObject => {
	return JSON.parse(JSON.stringify(config)) as EnshroudedJsonObject;
};

export const readServerConfig = async (context: Bridge.Context): Promise<EnshroudedServerConfig> => {
	if (!(await context.files.exists(CONFIG_FILE))) {
		return {};
	}

	const { config, invalidKeys } = parseServerConfig(await context.files.read(CONFIG_FILE));

	if (invalidKeys.length > 0) {
		context.log.warn("ignored config keys whose type the game does not read, the game writes their defaults back", {
			keys: invalidKeys.join(", "),
		});
	}

	return config;
};

export const writeServerConfig = async (context: Bridge.Context, config: EnshroudedServerConfig) => {
	await context.files.write(CONFIG_FILE, formatServerConfig(config));
};

const mergedValue = (before: EnshroudedJson | EnshroudedUserGroup[] | undefined, after: EnshroudedJson) => {
	const existing = objectOf(before);
	const incoming = objectOf(after);

	return existing !== null && incoming !== null
		? {
				...existing,
				...incoming,
			}
		: after;
};

export const applyConfigPatch = (
	config: EnshroudedServerConfig,
	patch: EnshroudedJsonObject,
): EnshroudedServerConfig => {
	const next: EnshroudedJsonObject = configValues(config);

	for (const [key, value] of Object.entries(patch)) {
		next[key] = mergedValue(next[key], value);
	}

	return normalizeServerConfig(next).config;
};

export const effectiveServerConfig = async (context: Bridge.Context): Promise<EnshroudedServerConfig> => {
	const stamp = await readEnshroudedStamp(context);

	return applyConfigPatch(await readServerConfig(context), stamp.settingsPending);
};

const onPending = (pending: EnshroudedJsonObject, patch: EnshroudedJsonObject): EnshroudedJsonObject => {
	return Object.fromEntries(
		Object.entries(patch).map(([key, value]) => [
			key,
			mergedValue(pending[key], value),
		]),
	);
};

export const patchServerConfig = async (
	context: Bridge.Context,
	patch: EnshroudedJsonObject,
	options: PatchServerConfigOptions = {},
): Promise<PatchServerConfigResult> => {
	const keys = Object.keys(patch);
	const pendingSettings = pendingSettingsFor(context);

	if (keys.length === 0) {
		return {
			pending: context.server.running,
		};
	}

	if (context.server.running) {
		await pendingSettings.record(patch, configValues(await readServerConfig(context)), {
			secrets: [
				...SECRET_CONFIG_KEYS,
				...(options.secrets ?? []),
			],
		});

		context.log("kept the settings for the next start, enshrouded rewrites its config at start", {
			keys: keys.length,
		});

		return {
			pending: true,
		};
	}

	const values = onPending(await pendingSettings.pending(), patch);

	await writeServerConfig(context, applyConfigPatch(await readServerConfig(context), values));
	await pendingSettings.forget(keys);
	await markSettingsWritten(context);

	return {
		pending: false,
	};
};

export const startConfigPatch = (context: Bridge.Context): EnshroudedJsonObject => {
	return {
		ip: SERVER_ADDRESS,
		logDirectory: CONFIG_LOG_DIRECTORY,
		queryPort: context.port(QUERY_PORT),
		saveDirectory: CONFIG_SAVE_DIRECTORY,
	};
};

export const applyStartConfig = async (context: Bridge.Context): Promise<boolean> => {
	const config = await readServerConfig(context);
	const patch = startConfigPatch(context);
	const stale = Object.entries(patch).some(([key, value]) => config[key] !== value);

	if (!stale) {
		return false;
	}

	await writeServerConfig(context, applyConfigPatch(config, patch));

	return true;
};

export const groupPassword = () => {
	return generateToken(GROUP_PASSWORD_LENGTH);
};

export const seededServerConfig = (password: () => string = groupPassword): EnshroudedServerConfig => {
	return {
		name: DEFAULT_SERVER_NAME,
		saveDirectory: CONFIG_SAVE_DIRECTORY,
		logDirectory: CONFIG_LOG_DIRECTORY,
		ip: SERVER_ADDRESS,
		queryPort: DEFAULT_QUERY_PORT,
		slotCount: SLOT_COUNT_DEFAULT,
		tags: [],
		voiceChatMode: EnshroudedVoiceChatMode.Proximity,
		enableVoiceChat: false,
		enableTextChat: false,
		gameSettingsPreset: EnshroudedPreset.Default,
		userGroups: Object.entries(SEEDED_GROUPS).map(([name, permissions]) => {
			return {
				name,
				password: password(),
				...permissions,
			};
		}),
	};
};

export const seedServerConfig = async (context: Bridge.Context): Promise<boolean> => {
	if (await context.files.exists(CONFIG_FILE)) {
		return false;
	}

	await writeServerConfig(context, seededServerConfig());

	context.log("wrote a new enshrouded config with a random password for each group");

	return true;
};

export const editableServerConfig = async (context: Bridge.Context): Promise<EnshroudedServerConfig> => {
	await seedServerConfig(context);

	return await effectiveServerConfig(context);
};

export const minutesToNanoseconds = (minutes: number) => {
	return Math.round(minutes * NANOSECONDS_PER_MINUTE);
};

export const nanosecondsToMinutes = (nanoseconds: number) => {
	return nanoseconds / NANOSECONDS_PER_MINUTE;
};
