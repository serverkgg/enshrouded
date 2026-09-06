# Enshrouded: not started

Windows-only server (Proton-GE), out of scope by decision on 2026-09-06.

## Research to keep

- Steam app 2278520, anonymous SteamCMD with the Windows platform forced; about 30 GB with update headroom, 16 GB RAM recommended. Proton-GE through `protonCommand` in `@serverkgg/bridge/wine`.
- Start `enshrouded_server.exe`; no stdout, the driver must tail `logs/enshrouded_server.log`. Ports `game` udp 15636 mirrored and `query` udp 15637 following with offset 1 (dev block 9400); A2S on the query port.
- Config `enshrouded_server.json` (name, saveDirectory, logDirectory, ip, gamePort, queryPort, slotCount up to 16, voiceChatMode, enableVoiceChat, enableTextChat, gameSettingsPreset Default/Relaxed/Hard/Survival/Custom, gameSettings, userGroups with name, password, canKickBan, canAccessInventories, canEditBase, canExtendBase, reservedSlots) through `context.codec.json`; saves under `savegame/`.
- No console, no RCON: no kick, ban or announce; roles are the `userGroups` passwords. No mods. Stop is SIGTERM (the server saves).
- `container.runtime.platform: wine`, `shmMb` 512 or more, `pidsLimit` 2048, `installBudgetMinutes` 60 or more.
