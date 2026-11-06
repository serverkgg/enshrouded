## Who's on now {#online}

The **Players** tab shows every player on your server right now, by their name in the game. The table fills while the server runs, and the number of players online also shows on the **Overview** page, refreshed every 15 seconds.

@[open](panel:players)

Or type in the console:

@[command](players)

## Kick and ban inside the game {#kick-ban}

An Enshrouded server comes with no kick, no ban and no whitelist in the panel, because the game gives the panel no way to control it. Kicking and banning happen inside the game:

1. Join your server with the password of a role that has kick and ban, such as the Admin role
2. Open the **Social** tab in the game menu
3. Pick the player, then kick or ban them

Bans are managed from the same tab. To see which roles can kick and ban, or to change them, see the [roles guide](/games/enshrouded/guides/roles).

## Keep a player out with a new password {#lockout}

If a password reached someone you don't want, change it:

1. Open the **Passwords** section of the **Settings** tab, change the password of the role they join with, and press **Apply**
2. Restart your server. The restart drops everyone online, and after it only players with the new password get in with that role
3. Send the new password only to the friends you want

@[open](panel:settings)

> [!note] Anyone you give a password to can pass it on. To block one specific player, ban them from inside the game.

## Console commands {#console}

Enshrouded reads nothing from the console, so we answer only these commands from the panel: `status`, `players`, `roles`, `world` and `help`. We refuse any other command and say why, because it never reaches the game.

@[command](help)
