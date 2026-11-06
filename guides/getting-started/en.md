## Create your server

From the **Create a server** page, pick Enshrouded, then choose a plan. Start on 4GB of RAM with a small group, the least an Enshrouded server can have. For a full server with big bases, we recommend 8GB. The details are in the [performance guide](/games/enshrouded/guides/performance).

Once your server is created, it starts setting up. Follow its progress on the order page. There's nothing to set up yourself: your server downloads Enshrouded from Steam, gives each role a random password so nobody gets in without you knowing, then starts and creates its first world.

> [!note] The first start takes a while as the game files download and the world is created. Watch all of it from the Console tab.

@[open](console)

## The setup steps

The panel opens the **Setup** page to walk you through a few short steps: first we check that your server started and reached Steam, then your server's name as it shows in the server list, then the password of the Admin role you join with, and finally your server's address on the **Access** page to send to your friends.

@[open](setup)

## Join the game {#join}

Players join your server in one of two ways.

### From the server list in the game {#server-list}

1. Press **Join** in the Enshrouded main menu
2. Turn on **Show dedicated servers**
3. Find your server by its name and pick it
4. Type the password when the game asks for it

### From your Steam favorites {#steam-favorites}

:::when server.address
Your server's address:

@[field](server.address)

1. Open Steam, then choose **Game Servers** from the **View** menu
2. Open the **Favorites** tab and add the address exactly as shown, with the IP and the port
3. Pick your server in the list and press **Connect**, then type the password in the game
:::else
Your server is still setting up and has no address yet. The address appears here and on the **Access** page as soon as the install finishes.

@[open](access)
:::

## The four passwords {#passwords}

Enshrouded has no single server password. It has one password for each of four roles: Admin, Friend, Guest and Visitor. The password a player types when joining decides their role and what they're allowed to do.

- You'll find the current passwords on the **Passwords** card on the **Overview** page. Send each player the password of the role you want them to have.
- To change them, open the **Passwords** section of the **Settings** tab.

@[open](overview)

The details and each role's rights are in the [roles guide](/games/enshrouded/guides/roles).

## What an Enshrouded server can't do {#limits}

None of this is missing from your server. It's missing from Enshrouded itself, which gives the panel no way to control the game:

- **No kick, ban or whitelist in the panel.** Kicking and banning happen only inside the game, in the **Social** tab, by a player whose role allows it. The steps are in the [players guide](/games/enshrouded/guides/players).
- **No console commands.** Enshrouded reads nothing from the console, so the ones we answer there (`status`, `players`, `roles`, `world`, `help`) are handled by the panel rather than passed to the game.
- **No announcements.** There's no way for the server to put a message in front of players.
- **No mods.** Enshrouded has no official mod support, and the panel has nothing for mods.
- **No manual save.** Enshrouded writes the world every 30 seconds, and within a second of a normal stop, so a backup taken while the server runs may miss the last 30 seconds of play.
- **No crossplay.** Your server is for Enshrouded on PC. Players on PS5 can't join it, and servers for the PS5 version can't be hosted.

## Before you enter the Shroud {#before}

- Each player's character lives on their own PC, and the world lives on your server, so restoring a server backup never brings back a character
- Your server holds up to 16 players in the same world, and you set the number in the **Settings** tab
- Pick the world's difficulty in the **Difficulty** tab. The details are in the [settings guide](/games/enshrouded/guides/settings)
- Your world is safe: we take automatic backups, and you can take one yourself whenever you like

@[open](backups)

> [!warning] A player can join only when their game is on the same version as the server. After each game update, we update your server on our own once nobody is playing, and until then players who updated their game see **server version too old**. The details are in the [updates guide](/games/enshrouded/guides/updates).

## When your friends can't find your server {#cant-join}

1. Check that the server is running.
2. Check that **Show dedicated servers** is on in **Join**, and that they look for the **Server name** set in the **Settings** tab.
3. If your server doesn't show in the list, send them the address so they can add it to their Steam favorites as above.
4. If they see **server version too old**, the fix is in the [updates guide](/games/enshrouded/guides/updates).
