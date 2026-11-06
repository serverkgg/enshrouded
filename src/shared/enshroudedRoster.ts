import type { Bridge } from "@serverkgg/bridge";
import { createRosterSync } from "@serverkgg/bridge/presence";
import { createSteamAvatars } from "@serverkgg/bridge/steam";
import type { EnshroudedHandleLine, EnshroudedPeerLine, EnshroudedPlayerLine } from "./enshroudedLog";

export interface EnshroudedPlayer {
	steamId: string | null;
	player: string;
	joinedAt: number;
	avatarHash: string | null;
}

export interface EnshroudedRoster {
	peer(line: EnshroudedPeerLine): void;
	handle(line: EnshroudedHandleLine): void;
	join(line: EnshroudedPlayerLine, at?: number): void;
	leave(line: EnshroudedPlayerLine): void;
	drop(line: EnshroudedHandleLine): void;
	describe(hashes: Map<string, string>): void;
	clear(): void;
	all(): EnshroudedPlayer[];
}

export interface EnshroudedPlayerIdentity {
	steamId: string | null;
	player: string;
}

export const playerKeyOf = (player: EnshroudedPlayerIdentity) => {
	return player.steamId ?? player.player;
};

export const presenceOf = (player: EnshroudedPlayer): Bridge.Values => {
	return {
		player: player.player,
		...(player.steamId === null
			? {}
			: {
					steamId: player.steamId,
				}),
		...(player.avatarHash === null
			? {}
			: {
					avatarHash: player.avatarHash,
				}),
	};
};

export const createRoster = (): EnshroudedRoster => {
	const players = new Map<string, EnshroudedPlayer>();
	const peers = new Map<number, string>();
	const seats = new Map<number, string>();

	let pending: number | null = null;

	const vacate = (key: string) => {
		players.delete(key);

		for (const [index, seated] of seats) {
			if (seated === key) {
				seats.delete(index);
			}
		}
	};

	return {
		peer(line) {
			peers.set(line.index, line.steamId);
		},

		handle(line) {
			pending = line.index;
		},

		join(line, at = Date.now()) {
			const index = pending;
			const steamId = index === null ? null : (peers.get(index) ?? null);
			const key = playerKeyOf({
				player: line.player,
				steamId,
			});
			const known = players.get(key);

			pending = null;

			players.set(key, {
				avatarHash: known?.avatarHash ?? null,
				joinedAt: known?.joinedAt ?? at,
				player: line.player,
				steamId,
			});

			if (index !== null) {
				seats.set(index, key);
			}
		},

		leave(line) {
			const named = [
				...players.values(),
			].filter((player) => player.player === line.player);
			const only = named.length === 1 ? named.at(0) : undefined;

			if (only) {
				vacate(playerKeyOf(only));
			}
		},

		drop(line) {
			const key = seats.get(line.index);

			peers.delete(line.index);
			seats.delete(line.index);

			if (pending === line.index) {
				pending = null;
			}

			if (key !== undefined) {
				vacate(key);
			}
		},

		describe(hashes) {
			for (const [key, player] of players) {
				const hash = player.steamId === null ? undefined : hashes.get(player.steamId);

				if (hash !== undefined) {
					players.set(key, {
						...player,
						avatarHash: hash,
					});
				}
			}
		},

		clear() {
			players.clear();
			peers.clear();
			seats.clear();
			pending = null;
		},

		all() {
			return [
				...players.values(),
			];
		},
	};
};

export const roster = createRoster();

export const avatars = createSteamAvatars({
	steamIdOf: (id) => id,
});

export const enrichRoster = async (context: Bridge.Context) => {
	const steamIds = roster.all().flatMap((player) =>
		player.steamId === null
			? []
			: [
					player.steamId,
				],
	);

	if (steamIds.length === 0) {
		return;
	}

	roster.describe(await avatars.resolve(context, steamIds));
};

export const rosterSync = createRosterSync<EnshroudedPlayer>({
	id: playerKeyOf,
	presenceOf,
});
