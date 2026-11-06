## Four roles, one password each {#how}

Enshrouded sorts players into four fixed roles: Admin, Friend, Guest and Visitor. Each role has its own password, and the password a player types when joining decides their role and what they're allowed to do on your server.

- Send each player only the password of the role you want them to have.
- Give every role a different password, because the password alone is what tells the roles apart.

The four roles are fixed, so you can't add or remove one, and you decide what each of them is allowed to do.

## The rights {#rights}

Every role has these rights, and you'll find them in the **Roles** table of the **Players** tab:

- **Kick and ban**: the player kicks or bans others from the game's **Social** tab.
- **Access inventories**: opening chests, workstations and other containers inside bases. It doesn't cover treasure chests in the open world.
- **Edit world**: digging and changing the open world outside bases. Turning it off protects the world from griefing.
- **Edit base**: building, digging and removing inside bases, including adding and removing water.
- **Extend base**: adding, removing and upgrading Flame Altars.
- **Reserved slots**: how many slots stay free for this role. Once the rest of the server fills up, players of other roles see it as full, and this role still has room.

### The rights on a new server {#defaults}

- **Admin**: every right.
- **Friend**: access inventories, edit world and edit base, without extend base and without kick and ban.
- **Guest**: edit world only.
- **Visitor**: none of the rights in this list.

No role has reserved slots at the start.

## The passwords {#passwords}

Your server gives each role a random password at install, so nobody gets in without you knowing.

- **To read them**: open the **Passwords** card on the **Overview** page.
- **To change them**: open the **Passwords** section of the **Settings** tab, type the new password in the role's field, then press **Apply** or **Apply and restart**.

@[open](panel:settings)

## Edit a role's rights {#edit}

Every row of the **Roles** table has two buttons:

- **Set rights**: turn on every right this role should have. Any right you leave off is taken away.
- **Reserve slots**: type the number of **Reserved slots** for this role, from 0 to 16.

@[open](panel:players)

## When a change applies {#apply}

If your server is stopped, we write the change into the settings file right away. If it's running, we keep the change and write it before the next start, because Enshrouded reads its settings file as it starts. Restart your server to apply the change.

> [!warning] Changing a role's password affects every player who joins with it. After the restart the old password stops working, so send the new one to everyone you want in that role.

## Kick and ban {#kick-ban}

Kicking and banning happen only inside the game, in the **Social** tab, by any player whose role has kick and ban. On a new server that's the Admin role alone. The panel has no kick or ban, because Enshrouded gives it no way to control the game. The details are in the [players guide](/games/enshrouded/guides/players).
