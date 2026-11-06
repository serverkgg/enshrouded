import type { Bridge } from "@serverkgg/bridge";
import type { PendingSettingsState } from "@serverkgg/bridge/install";
import { sameSettingValue } from "@serverkgg/bridge/utils";
import {
	applyConfigPatch,
	type EnshroudedJson,
	objectOf,
	readServerConfig,
	writeServerConfig,
} from "./enshroudedConfig";
import { markSettingsWritten, pendingSettingsFor, readEnshroudedStamp } from "./enshroudedStamp";

export const sameJson = (left: EnshroudedJson | undefined, right: EnshroudedJson | undefined): boolean => {
	if (Array.isArray(left) || Array.isArray(right)) {
		return (
			Array.isArray(left)
			&& Array.isArray(right)
			&& left.length === right.length
			&& left.every((entry, index) => sameJson(entry, right[index]))
		);
	}

	const leftObject = objectOf(left);
	const rightObject = objectOf(right);

	if (leftObject === null && rightObject === null) {
		return sameSettingValue(left as Bridge.Value | undefined, right as Bridge.Value | undefined);
	}

	if (leftObject === null || rightObject === null) {
		return false;
	}

	const keys = new Set([
		...Object.keys(leftObject),
		...Object.keys(rightObject),
	]);

	return [
		...keys,
	].every((key) => sameJson(leftObject[key], rightObject[key]));
};

const coveredBy = (before: EnshroudedJson | undefined, after: EnshroudedJson | undefined) => {
	const beforeObject = objectOf(before);
	const afterObject = objectOf(after);

	if (beforeObject === null || afterObject === null) {
		return sameJson(before, after);
	}

	return Object.entries(afterObject).every(([key, value]) => sameJson(beforeObject[key], value));
};

export const changedPendingKeys = (state: PendingSettingsState): string[] => {
	const { settingsBaseline, settingsPending } = state;

	return Object.keys(settingsPending)
		.filter((key) => {
			if (Object.hasOwn(settingsBaseline.secrets, key)) {
				return settingsBaseline.secrets[key] === true;
			}

			if (!Object.hasOwn(settingsBaseline.values, key)) {
				return true;
			}

			return !coveredBy(settingsBaseline.values[key], settingsPending[key]);
		})
		.sort();
};

export const replayPendingSettings = async (context: Bridge.Context): Promise<string[]> => {
	const stamp = await readEnshroudedStamp(context);
	const keys = Object.keys(stamp.settingsPending);

	if (keys.length === 0) {
		return [];
	}

	const pendingSettings = pendingSettingsFor(context);
	const changed = changedPendingKeys(stamp);

	await writeServerConfig(context, applyConfigPatch(await readServerConfig(context), stamp.settingsPending));
	await pendingSettings.forget(keys);
	await markSettingsWritten(context);

	context.log("wrote the settings saved while the server was running", {
		keys: keys.length,
	});

	if (changed.length > 0) {
		context.activity.report(pendingSettings.appliedActivity(changed));
	}

	return changed;
};
