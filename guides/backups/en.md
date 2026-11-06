## How Enshrouded saves {#how-enshrouded-saves}

- The server saves the world only, in one file, `savegame/world0.ksd`, and each player's character lives on their own PC.
- Enshrouded writes the world every 30 seconds, even with nobody on, and keeps its last 10 copies in `savegame/backup/`.
- On a normal stop, Enshrouded writes the world within a second.
- Enshrouded has no manual save command, so we can't ask it to save before a backup.

The **Server health** card on the **Overview** page shows when the world was last saved.

## What a backup holds {#contents}

Your server's backup holds:

- The world, in the `savegame` folder
- The settings file `enshrouded_server.json`, which holds the role passwords, their rights and the list of banned players

It doesn't hold Enshrouded's 10 copies in `savegame/backup/`, or the players' characters, which are on their own PCs.

@[open](backups)

## Clean or mid-play {#fidelity}

- **While the server is stopped**: the backup holds what Enshrouded wrote when it stopped, and it's badged **Clean**.
- **While the server is running**: it holds the last write and is badged **Mid-play**, so the last 30 seconds of play may be missing.

> [!note] The safest backup is one taken with the server stopped. Stop it, press **Back up now**, then start it again.

## Restore a backup {#restore}

Press **Restore** on the backup you want. We take a copy of the current state first, then stop the server, roll the files back and start it again, and Enshrouded opens the world as it was when the backup was taken.

> [!warning] The settings file comes back with the backup, and with it the role passwords and their rights as they were when it was taken. If you changed a password since then, the old one comes back, so send it to your friends or change it again.

> [!note] A restore doesn't change the players' characters. Each player keeps what's on their own PC, even if it's newer than the restored world.

## Before a wipe {#before-wipe}

We take no backup before a wipe, and a wipe deletes the world file for good. Take one yourself first with **Back up now**. The details are in the [worlds guide](/games/enshrouded/guides/worlds).
