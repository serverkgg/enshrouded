import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import {
	type EnshroudedServerConfig,
	enrichRoster,
	QUERY_PORT,
	readServerConfig,
	roster,
	rosterSync,
	SLOT_COUNT_DEFAULT,
	SLOT_COUNT_MAX,
	SLOT_COUNT_MIN,
	serverMetrics,
} from "../shared";

export const QUERY_REFRESH_SECONDS = 15;

const unanswered = new WeakSet<Bridge.Context>();

export const maxPlayersOf = (config: EnshroudedServerConfig) => {
	const slots = Math.round(config.slotCount ?? SLOT_COUNT_DEFAULT);

	return Math.min(SLOT_COUNT_MAX, Math.max(SLOT_COUNT_MIN, slots));
};

const configuredMaxOf = async (context: Bridge.Context): Promise<number | null> => {
	try {
		return maxPlayersOf(await readServerConfig(context));
	} catch {
		return null;
	}
};

export const a2sSampleOf = async (context: Bridge.Context): Promise<Bridge.Sample | null> => {
	try {
		const info = await context.probe.a2s(context.port(QUERY_PORT));

		unanswered.delete(context);

		return {
			max: info.players.max,
			online: info.players.online,
			tick: null,
		};
	} catch (error) {
		if (!unanswered.has(context)) {
			context.log.warn("enshrouded did not answer the a2s query, counting the players from the log instead", {
				error: error instanceof Error ? error.message : String(error),
			});
		}

		unanswered.add(context);

		return null;
	}
};

export const query: Bridge.Query = {
	kind: BridgeKind.Query,
	refreshSeconds: QUERY_REFRESH_SECONDS,
	async sample(context) {
		await enrichRoster(context);

		const players = roster.all();

		rosterSync.sync(context, players);

		const sample = (await a2sSampleOf(context)) ?? {
			max: await configuredMaxOf(context),
			online: players.length,
			tick: null,
		};

		serverMetrics.recordPlayers(sample.online, sample.max);

		return sample;
	},
};
