import type { Bridge } from "@serverkgg/bridge";
import {
	createPendingSettings,
	type PendingSettings,
	type PendingSettingsState,
	pendingSettingsOf,
	readStamp,
	writeStamp,
} from "@serverkgg/bridge/install";

export interface EnshroudedStamp extends PendingSettingsState {
	buildId: string | null;
	settingsWrittenAt: string | null;
	onlineAt: string | null;
}

const nullableString = (value: unknown) => {
	return typeof value === "string" && value.length > 0 ? value : null;
};

export const normalizeStamp = (raw: Partial<EnshroudedStamp> | null): EnshroudedStamp => {
	return {
		buildId: nullableString(raw?.buildId),
		onlineAt: nullableString(raw?.onlineAt),
		settingsWrittenAt: nullableString(raw?.settingsWrittenAt),
		...pendingSettingsOf(raw),
	};
};

export const readEnshroudedStamp = async (context: Bridge.Context): Promise<EnshroudedStamp> => {
	return normalizeStamp(await readStamp<Partial<EnshroudedStamp>>(context));
};

export const patchEnshroudedStamp = async (
	context: Bridge.Context,
	patch: Partial<EnshroudedStamp>,
): Promise<EnshroudedStamp> => {
	const stamp = normalizeStamp({
		...(await readEnshroudedStamp(context)),
		...patch,
	});

	await writeStamp(context, stamp);

	return stamp;
};

export const markSettingsWritten = async (context: Bridge.Context, at = new Date()) => {
	await patchEnshroudedStamp(context, {
		settingsWrittenAt: at.toISOString(),
	});
};

export const pendingSettingsFor = (context: Bridge.Context): PendingSettings => {
	return createPendingSettings({
		async read() {
			const stamp = await readEnshroudedStamp(context);

			return {
				settingsBaseline: stamp.settingsBaseline,
				settingsPending: stamp.settingsPending,
			};
		},
		async write(state) {
			await patchEnshroudedStamp(context, state);
		},
	});
};
