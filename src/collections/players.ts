import { type Bridge, BridgeKind, BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { formatUptime, formatUtc } from "@serverkgg/bridge/utils";
import { type EnshroudedPlayer, playerKeyOf, roster } from "../shared";

export const PLAYERS_REFRESH_SECONDS = 15;

const MILLISECONDS_PER_SECOND = 1000;

export interface PlayerRow extends Bridge.Row {
	id: string;
	player: string;
	steamId: string;
	joined: string;
	played: Bridge.Text;
}

export const playerRowOf = (player: EnshroudedPlayer, at: number): PlayerRow => {
	return {
		id: playerKeyOf(player),
		joined: formatUtc(player.joinedAt),
		played: formatUptime((at - player.joinedAt) / MILLISECONDS_PER_SECOND),
		player: player.player,
		steamId: player.steamId ?? "",
	};
};

export const players: Bridge.Collection = {
	kind: BridgeKind.Collection,
	refreshSeconds: PLAYERS_REFRESH_SECONDS,
	requiresRunning: true,
	async list() {
		const at = Date.now();

		return roster.all().map((player) => playerRowOf(player, at));
	},
};

export const onlineSection: Bridge.Section = {
	columns: [
		{
			key: "player",
			label: {
				ar: "اللاعب",
				en: "Player",
			},
		},
		{
			key: "steamId",
			label: {
				ar: "رقم Steam",
				en: "Steam ID",
			},
		},
		{
			key: "joined",
			label: {
				ar: "وقت الدخول",
				en: "Joined",
			},
		},
		{
			key: "played",
			label: {
				ar: "مدة اللعب",
				en: "Time played",
			},
		},
	],
	empty: {
		ar: "لا يوجد لاعبون متصلون الآن.",
		en: "Nobody is online right now.",
	},
	help: {
		ar: "اللاعبون المتصلون بسيرفرك الآن. نقرؤهم من سجل السيرفر، فيظهر اللاعب بعد دخوله بلحظة. أما الطرد والحظر فمن تبويب Social داخل اللعبة.",
		en: "Everyone on your server right now. We read them from the server log, so a player shows up a moment after they join. Kick and ban happen in the game's Social tab.",
	},
	id: "online",
	layout: BridgeLayout.Table,
	module: "players",
	place: BridgePlace.Players,
	title: {
		ar: "المتصلون الآن",
		en: "Online now",
	},
};
