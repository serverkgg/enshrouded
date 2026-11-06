import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { sameSettingValue } from "@serverkgg/bridge/utils";
import {
	type EnshroudedGroup,
	type EnshroudedJsonObject,
	type EnshroudedServerConfig,
	type EnshroudedUserGroup,
	editableServerConfig,
	effectiveServerConfig,
	GAME_SETTINGS_KEY,
	patchServerConfig,
	userGroupsPatchOf,
	withGroup,
} from "../shared";
import {
	booleanWriteOf,
	CONFIG_SETTING_BY_KEY,
	GAME_SETTING_BY_KEY,
	GROUP_BY_PASSWORD_KEY,
	NAME_KEY,
	PASSWORD_LABELS,
	passwordTaken,
	passwordWriteOf,
	serverNameWriteOf,
	settingValues,
	settingWriteOf,
	TAG_BY_FIELD_KEY,
	TAG_LABELS,
	TAGS_KEY,
	tagsWith,
	unknownSetting,
} from "./enshroudedSettings";

const passwordsPatchOf = (
	groups: readonly EnshroudedUserGroup[],
	passwords: ReadonlyMap<EnshroudedGroup, string>,
): EnshroudedJsonObject => {
	let next = [
		...groups,
	];

	for (const [group, password] of passwords) {
		next = withGroup(next, group, {
			password,
		});
	}

	for (const [group, password] of passwords) {
		const taken = next.some((entry) => entry.name !== group && entry.password === password);

		if (taken) {
			throw new BridgeUserError(passwordTaken(PASSWORD_LABELS[group]));
		}
	}

	return userGroupsPatchOf(next);
};

export const settingsPatchOf = (config: EnshroudedServerConfig, values: Bridge.Values): EnshroudedJsonObject => {
	const shown = settingValues(config);
	const patch: EnshroudedJsonObject = {};
	const gameSettings: EnshroudedJsonObject = {};
	const toggles = new Map<string, boolean>();
	const passwords = new Map<EnshroudedGroup, string>();

	for (const [key, value] of Object.entries(values)) {
		if (key === NAME_KEY) {
			const name = serverNameWriteOf(value);

			if (name !== shown[NAME_KEY]) {
				patch[NAME_KEY] = name;
			}

			continue;
		}

		const tag = TAG_BY_FIELD_KEY.get(key);

		if (tag !== undefined) {
			const on = booleanWriteOf(TAG_LABELS[tag], value);

			if (on !== shown[key]) {
				toggles.set(tag, on);
			}

			continue;
		}

		const group = GROUP_BY_PASSWORD_KEY.get(key);

		if (group !== undefined) {
			if (value === null) {
				continue;
			}

			const password = passwordWriteOf(group, value);

			if (password !== shown[key]) {
				passwords.set(group, password);
			}

			continue;
		}

		const configSpec = CONFIG_SETTING_BY_KEY.get(key);

		if (configSpec !== undefined) {
			const write = settingWriteOf(configSpec, value);

			if (!sameSettingValue(shown[key], write.shown)) {
				patch[configSpec.fileKey] = write.stored;
			}

			continue;
		}

		const gameSpec = GAME_SETTING_BY_KEY.get(key);

		if (gameSpec === undefined) {
			throw new BridgeUserError(unknownSetting(key));
		}

		const write = settingWriteOf(gameSpec, value);

		if (!sameSettingValue(shown[key], write.shown)) {
			gameSettings[gameSpec.fileKey] = write.stored;
		}
	}

	if (toggles.size > 0) {
		patch[TAGS_KEY] = tagsWith(config.tags ?? [], toggles);
	}

	if (Object.keys(gameSettings).length > 0) {
		patch[GAME_SETTINGS_KEY] = gameSettings;
	}

	if (passwords.size > 0) {
		Object.assign(patch, passwordsPatchOf(config.userGroups ?? [], passwords));
	}

	return patch;
};

export const settings: Bridge.Settings = {
	kind: BridgeKind.Settings,
	async read(context) {
		return settingValues(await effectiveServerConfig(context));
	},
	async write(context, values) {
		await patchServerConfig(context, settingsPatchOf(await editableServerConfig(context), values));
	},
};
