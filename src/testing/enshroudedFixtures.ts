import type { EnshroudedStamp } from "../shared";

export const EMPTY_STAMP: EnshroudedStamp = {
	buildId: null,
	onlineAt: null,
	settingsBaseline: {
		secrets: {},
		values: {},
	},
	settingsPending: {},
	settingsWrittenAt: null,
};

export const READY_FIXTURE = "[I 00:00:12,186] [game_server] Switching state from LoadEcsScene to Run after 489.94 ms";

export const LOADING_FIXTURE = "[I 00:00:11,696] [game_server] Switching state from Load to LoadEcsScene after 10.41 s";

export const HOST_ONLINE_FIXTURE = "[I 00:00:03,235] [Session] 'HostOnline' (up)!";

export const STEAM_CONNECTED_FIXTURE = "[I 00:00:02,877] [online] Server connected to Steam successfully";

export const SHUTDOWN_FIXTURE = "[I 00:03:16,625] [app] Trigger gameflow shutdown, exit: Ctrl_C";

export const VERSION_FIXTURE = "[I 00:00:00,941] Game Version (SVN): 1287369";

export const PORT_BUSY_FIXTURE =
	"[E 00:00:02,825] [online] Couldn't bind dedicated server socket. error='address in use'";

export const STEAM_ID_FIXTURE = "76561199074320149";

export const PEER_ADDED_FIXTURE = "[I 05:12:02,879] [online] Added peer 0(1) (steamid:76561199074320149)";

export const PLAYER_HANDLE_FIXTURE = "[I 05:12:17,593] [server] Machine '1': Player '0(0)' logged in";

export const JOIN_FIXTURE = "[I 05:12:17,598] [server] Player 'Meslzy' logged in with Permissions:";

export const LEAVE_FIXTURE = "[I 05:15:09,364] [server] Remove Player 'Meslzy'";

export const PEER_REMOVED_FIXTURE = "[I 05:15:09,449] [online] Removed peer 0(1)";

export const JOIN_LOG: readonly string[] = [
	"[I 05:12:02,879] [online] Session accepted with peer (steamid:76561199074320149)",
	PEER_ADDED_FIXTURE,
	"[E 05:12:03,467] [online] Begin auth session with peer 0(1)",
	"[I 05:12:04,842] [online] Client '76561199074320149' authenticated by steam",
	"[W 05:12:05,316] [session] Unable to find machine for peer 0(1).",
	"[W 05:12:05,316] [session] Unable to find machine for peer 0(1).",
	"[I 05:12:05,316] [session] Add remote machine index 1 (id: 25452002).",
	"[I 05:12:05,318] [SessionPlayer] started transition from 'Free' to 'Remote_InSession' (current='<invalid>')!",
	"[I 05:12:05,318] [session] Remote player added. Player handle: 0(0)",
	"[I 05:12:05,319] [SessionPlayer] 'Reserve' (up)!",
	"[I 05:12:05,319] [SessionPlayer] 'WaitForJoin' (up)!",
	"[I 05:12:05,320] [SessionPlayer] finished transition from 'Free' to 'Remote_InSession' (current='Remote_InSession')!",
	"[I 05:12:05,388] [session] Setting block mask of client 0(0) to 00000001:00000000",
	"[I 05:12:05,388] [session] Sending new communication allowed mask 00000001 to player 0(0)",
	"[I 05:12:05,495] [Server] Creating player knowledge replication state for player index 0",
	"[I 05:12:07,490] [twitch_drop] Request succeeded Player '0(0)' drops:",
	"[I 05:12:14,392] [session] Congestion baseline established for machine 1(0)",
	PLAYER_HANDLE_FIXTURE,
	JOIN_FIXTURE,
	"[I 05:12:17,598] \t - CanKickBan",
	"[I 05:12:17,598] \t - CanAccessInventories",
	"[I 05:12:17,598] \t - CanEditBase",
	"[I 05:12:17,598] \t - CanEditWorld",
	"[I 05:12:17,598] \t - CanExtendBase",
	"[I 05:12:17,598] \t - CanReceiveEXP",
	"[I 05:12:17,598] ",
	"[I 05:12:17,684] [ecss] Replication Checkpoint 1 Set for Player 0 in Tick 1,124,069",
];

export const LEAVE_LOG: readonly string[] = [
	"[I 05:15:09,290] [save2] Server sent final client save for 0(0).",
	"[I 05:15:09,361] [save2] Received final savegame ack from 0(0)",
	"[I 05:15:09,362] [server] Remove Entity for Player 'Meslzy'",
	LEAVE_FIXTURE,
	"[I 05:15:09,364] [Server] Destroying player knowledge replication state for player index 0",
	"[I 05:15:09,446] [online] Disconnecting peer 0(1)",
	PEER_REMOVED_FIXTURE,
	"[W 05:15:09,451] [session] Remove player from session. Not found in online game info. Player Handle: 0(0) ",
	"[I 05:15:09,451] [session] Player removed. Player handle: 0(0)",
];

export const AVATAR_HASH_FIXTURE = "fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb";

export const steamSummariesOf = (steamId: string, hash: string) => {
	return {
		response: {
			players: [
				{
					avatarfull: `https://avatars.steamstatic.com/${hash}_full.jpg`,
					steamid: steamId,
				},
			],
		},
	};
};
