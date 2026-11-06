import { type Bridge, BridgeDetailFormat, BridgeKind, BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { formatUptime } from "@serverkgg/bridge/utils";
import { SETTINGS_TAB_ID, SETTINGS_TITLE } from "../settings";
import { type EnshroudedMetricsSnapshot, readEnshroudedStamp, serverMetrics, WORLD_FILE } from "../shared";

export const METRICS_DETAIL_ID = "metrics";

export const METRICS_REFRESH_SECONDS = 15;

const MISSING = "—";

export const worldFileOf = async (context: Bridge.Context): Promise<Bridge.FileEntry | null> => {
	try {
		const entries = await context.files.list(WORLD_FILE);

		return entries.find((entry) => entry.path === WORLD_FILE && !entry.directory) ?? null;
	} catch {
		return null;
	}
};

export const lastSaveOf = async (context: Bridge.Context): Promise<string | null> => {
	return (await worldFileOf(context))?.modifiedAt ?? null;
};

export const playerCountOf = (snapshot: EnshroudedMetricsSnapshot) => {
	if (snapshot.online === null) {
		return MISSING;
	}

	if (snapshot.max === null) {
		return String(snapshot.online);
	}

	return `${snapshot.online}/${snapshot.max}`;
};

export const metrics: Bridge.Detail = {
	kind: BridgeKind.Detail,
	refreshSeconds: METRICS_REFRESH_SECONDS,
	async read(context) {
		const stamp = await readEnshroudedStamp(context);
		const snapshot = serverMetrics.snapshot();
		const lastSave = await lastSaveOf(context);

		return {
			actions: [],
			badges: [],
			description: null,
			id: METRICS_DETAIL_ID,
			image: null,
			links: [],
			stale: !context.server.running,
			stats: [
				{
					format: BridgeDetailFormat.Text,
					key: "players",
					label: {
						ar: "اللاعبون",
						en: "Players",
					},
					value: playerCountOf(snapshot),
				},
				{
					format: BridgeDetailFormat.Text,
					key: "uptime",
					label: {
						ar: "مدة التشغيل",
						en: "Up for",
					},
					value: snapshot.uptimeSeconds === null ? MISSING : formatUptime(snapshot.uptimeSeconds),
				},
				{
					format: lastSave === null ? BridgeDetailFormat.Text : BridgeDetailFormat.Date,
					key: "lastSave",
					label: {
						ar: "آخر حفظ للماب",
						en: "Last world save",
					},
					value: lastSave ?? MISSING,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "version",
					label: {
						ar: "إصدار اللعبة",
						en: "Game version",
					},
					value: snapshot.gameVersion ?? MISSING,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "build",
					label: {
						ar: "بيلد Steam",
						en: "Steam build",
					},
					value: stamp.buildId ?? MISSING,
				},
			],
			subtitle: {
				ar: "هذه الأرقام صادرة من سيرفرك مباشرة، وليست تقديرًا.",
				en: "These numbers come straight from your own server, not an estimate.",
			},
			title: {
				ar: "حالة السيرفر",
				en: "Server health",
			},
		};
	},
};

export const metricsSection: Bridge.Section = {
	help: {
		ar: `اللاعبون ومدة التشغيل وآخر حفظ للماب وإصدار اللعبة في نظرة واحدة، وتتحدث كل ${METRICS_REFRESH_SECONDS} ثانية.`,
		en: `Players, uptime, the last world save and the game version at a glance, refreshed every ${METRICS_REFRESH_SECONDS} seconds.`,
	},
	id: "metrics",
	layout: BridgeLayout.Detail,
	module: "metrics",
	place: BridgePlace.Overview,
	related: {
		label: SETTINGS_TITLE,
		tab: SETTINGS_TAB_ID,
	},
	title: {
		ar: "حالة السيرفر",
		en: "Server health",
	},
};
