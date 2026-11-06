## The Settings tab

Your server's settings sit in clear fields across three sections, **Server**, **Chat** and **Passwords**, and we write them into `enshrouded_server.json` for you in the right format, so you never need to open the file. Difficulty has a tab of its own, **Difficulty**.

@[open](panel:settings)

Change what you like, then choose:

- **Apply**: the values are saved and take effect at the next start.
- **Apply and restart**: the values are saved and we restart your server right away, so they take effect now.

> [!note] Every field in this tab and in the **Difficulty** tab needs a restart, because Enshrouded reads its settings file as it starts. If you save while the server is stopped, we write the change into the file right away. If you save while it's running, we keep the change and write it into the file before the next start.

## Server {#server}

- **Server name**: the name your friends see in the **Join** list inside the game and search for your server by.
- **Max players**: 1 to 16, and every extra player needs more RAM. The numbers are in the [performance guide](/games/enshrouded/guides/performance).
- **Tags**: a switch for each tag, such as **Looking for players**, **Base building**, **Exploration** and your players' languages, that players use to filter the server list in **Join**. Turn on each language your players speak. The game has no Arabic tag.

## Chat {#chat}

- **Voice chat**: on or off.
- **Voice chat mode**: Proximity, where a player hears only the players near them, or Global, where everyone on the server hears each other.
- **Text chat**: on or off.

> [!note] Voice chat and text chat are both off on a new server, so turn them on if you want them.

## Passwords {#passwords}

One field for each of the four roles. The password a player types when joining decides their role, and the details are in the [roles guide](/games/enshrouded/guides/roles). You can read the current passwords on the **Passwords** card on the **Overview** page.

> [!warning] After the restart, the old password of a role you changed stops working, so send the new one to your friends.

## The Difficulty tab {#difficulty}

@[open](panel:difficulty)

Its first section, **Difficulty**, has five presets:

- **Default**: the game's standard values, which the Enshrouded developers recommend for first-time players.
- **Relaxed**: fewer enemies, and more resources and loot, for players who like building and calm adventures.
- **Hard**: more enemies, and more aggressive ones.
- **Survival**: more aggressive enemies, plus extra survival rules.
- **Custom**: you set the values yourself in the sections below.

After it come six groups of values: **Player**, **Survival**, **World**, **Enemies**, **Progression** and **Day and night**.

- These values apply only while the preset is **Custom**. With any other preset, Enshrouded doesn't read them.
- You enter time values in minutes, and we convert them into the format Enshrouded reads.
- Each value shows its limits in its field, and the panel accepts no value outside them.

## Settings in other places {#elsewhere}

- **Role rights**: in the **Roles** table of the **Players** tab, with the **Set rights** and **Reserve slots** buttons. Like these settings, they apply at the next start. The details are in the [roles guide](/games/enshrouded/guides/roles).
- **World**: downloading, uploading and wiping it are in the **World** tab, and the details are in the [worlds guide](/games/enshrouded/guides/worlds).
- **Game updates**: on the **Game updates** card of the **Manage** page, and the details are in the [updates guide](/games/enshrouded/guides/updates).

## The file itself {#file}

Every setting that matters is in the panel. If you open `enshrouded_server.json` from the **Files** tab, keep these in mind:

@[open](files:enshrouded_server.json)

- Edit the file only while the server is stopped, then start it. Enshrouded reads the file and writes it back as it starts, and before that we write into it what you saved in the panel while the server was running.
- We write `ip`, `queryPort`, `saveDirectory` and `logDirectory` at every start, so any change you make to them by hand is replaced.
- If the file isn't valid JSON, the server won't start. Fix it, or delete it and we'll create a new one at the next start, with the starting settings and new random passwords for every role.
- Enshrouded brings a number that's out of range back to the nearest limit.
- Enshrouded writes the list of banned players into the same file, and we leave it as it is.
- The role passwords are written in the file as they are, so give access to your server's files only to people you trust.
