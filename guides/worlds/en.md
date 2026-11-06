## One world per server {#how}

An Enshrouded server holds one world, in the file `savegame/world0.ksd`. The server creates it at its first start, and you'll find it in the **Your world** table of the **World** tab.

@[open](panel:world)

- Enshrouded writes the world every 30 seconds, even with nobody on.
- Enshrouded keeps the last 10 copies of the world in the `savegame/backup/` folder.
- On a normal stop, Enshrouded writes the world within a second.

> [!note] The server holds the world only. Each player's character lives on their own PC, so uploading or downloading a world doesn't move it, and restoring a backup doesn't include it.

## Download your world {#download}

Press **Download** on the world's row, and you get the `world0.ksd` file exactly as it is on your server. If the server is running, the file is what Enshrouded wrote at most 30 seconds before.

## Move a world from your PC {#upload}

The world you played on your own PC is in:

```txt
%USERPROFILE%\Saved Games\keen games\Enshrouded\default
```

Each world there is a file named `world` and a number, such as `world0.ksd` or `world1.ksd`. The date the file was last changed helps you tell which world you played last.

The upload accepts only a file whose name ends in `.ksd`, into an empty slot, while the server is stopped, so an upload never writes over a world. So:

1. Close Enshrouded on your PC first
2. Take a backup of your server if its current world matters to you
3. Stop your server
4. If your server has a world, press **Wipe the world** as shown below
5. Press **Upload world** in the **World** tab and pick the `.ksd` file. We save it as `world0.ksd` whatever its name
6. Start your server, and Enshrouded opens the world you uploaded

To replace your world with another one, follow the same steps: wipe, then upload.

> [!note] If we refuse the upload, the file doesn't end in `.ksd`, your server has a world, or the server is running. The refusal says which, so fix it and upload the file again.

## Wipe: a new world from scratch {#wipe}

Press **Wipe the world** on the world's row, then confirm in the window.

- A wipe never runs on a live server: if it's running, we stop it, delete the world, then start it again, and Enshrouded creates a new world. If it's stopped, it stays stopped, and the new world is created at the next start.
- Players keep their characters, because those are on their own PCs.

> [!danger] A wipe deletes the world file for good, and we take no backup before it. Only a backup you took yourself can bring it back, so press **Back up now** before you wipe.

@[open](backups)

## The world's files {#files}

You'll find the `savegame` folder in the **Files** tab. Don't change anything in it while the server is running, because Enshrouded writes to it every 30 seconds. It's easier to move the world from the **Your world** table.

@[open](files:savegame)
