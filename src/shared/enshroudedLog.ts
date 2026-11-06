export const SERVER_READY = /\[game_server\] Switching state from LoadEcsScene to Run/;

export const HOST_ONLINE_LINE = /\[Session\] 'HostOnline' \(up\)!/;

export const STEAM_CONNECTED_LINE = /\[online\] Server connected to Steam successfully/;

export const SHUTDOWN_LINE = /\[app\] Trigger gameflow shutdown, exit: (?<reason>\w{1,32})/;

export const JOIN_LINE = /\[server\] Player '(?<player>[^'\r\n]{1,64})' logged in with Permissions:/;

export const LEAVE_LINE = /\[server\] Remove Player '(?<player>[^'\r\n]{1,64})'/;

export const PEER_ADDED_LINE = /\[online\] Added peer (?<index>\d{1,6})\(\d{1,6}\) \(steamid:(?<steamId>\d{17})\)/;

export const PEER_REMOVED_LINE = /\[online\] Removed peer (?<index>\d{1,6})\(\d{1,6}\)/;

export const PLAYER_HANDLE_LINE = /\[server\] Machine '\d{1,6}': Player '(?<index>\d{1,6})\(\d{1,6}\)' logged in/;

export const VERSION_LINE = /Game Version \(SVN\): (?<version>\d{1,12})/;

export const PORT_BIND_FAILED_LINE =
	/\[online\] Couldn't bind dedicated server socket\. error='(?<detail>[^'\r\n]{1,80})'/;

export const STEAM_FAILURE_LINE = /Failed to (?:initialize|create) Steamworks/;

export const WINE_CRASH_LINE = /wine: Unhandled (?<detail>[^\r\n]{1,200})/;

export interface EnshroudedPlayerLine {
	player: string;
}

export interface EnshroudedPeerLine {
	index: number;
	steamId: string;
}

export interface EnshroudedHandleLine {
	index: number;
}

const playerOf = (pattern: RegExp, line: string): EnshroudedPlayerLine | null => {
	const player = pattern.exec(line)?.groups?.player;

	return player === undefined
		? null
		: {
				player,
			};
};

export const parseJoin = (line: string): EnshroudedPlayerLine | null => {
	return playerOf(JOIN_LINE, line);
};

export const parseLeave = (line: string): EnshroudedPlayerLine | null => {
	return playerOf(LEAVE_LINE, line);
};

const handleOf = (pattern: RegExp, line: string): EnshroudedHandleLine | null => {
	const index = pattern.exec(line)?.groups?.index;

	return index === undefined
		? null
		: {
				index: Number(index),
			};
};

export const parsePeerAdded = (line: string): EnshroudedPeerLine | null => {
	const groups = PEER_ADDED_LINE.exec(line)?.groups;

	if (groups?.index === undefined || groups.steamId === undefined) {
		return null;
	}

	return {
		index: Number(groups.index),
		steamId: groups.steamId,
	};
};

export const parsePeerRemoved = (line: string): EnshroudedHandleLine | null => {
	return handleOf(PEER_REMOVED_LINE, line);
};

export const parsePlayerHandle = (line: string): EnshroudedHandleLine | null => {
	return handleOf(PLAYER_HANDLE_LINE, line);
};

export const parseVersion = (line: string): string | null => {
	return VERSION_LINE.exec(line)?.groups?.version ?? null;
};
