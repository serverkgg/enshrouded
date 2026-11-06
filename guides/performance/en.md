## RAM by player count {#memory}

We measured a test Enshrouded server of ours: with nobody on, it uses under 1GB of RAM and about 37 percent of one CPU core. We haven't measured a full server yet.

The Enshrouded developers' published guidance is that each player adds up to 100MB of RAM. Our advice rests on that figure:

- **4GB**: the least RAM an Enshrouded server can have. Start here with a small group.
- **8GB**: what we recommend for a full server with big bases.

Pick for the largest group that plays at the same time, not for all your friends.

## Disk {#disk}

Enshrouded's files take about 8GB of your server's disk. An update can need twice that for a short while as it downloads.

## CPU {#cpu}

Even with nobody on, the server uses about 37 percent of one CPU core, and Enshrouded writes the world every 30 seconds.

If the CPU is what slows your server down, lower **Max players** in the **Server** section of the **Settings** tab, then restart your server.

@[open](panel:settings)

## A daily restart at a quiet hour {#daily-restart}

If your server gets slower the longer it runs, the usual fix is a daily restart at an hour when few people play. Add one from the **Schedules** tab. The steps are in the [scheduled tasks guide](/guides/schedules).

Enshrouded can't send players a message before the restart, so tell your friends the time ahead.

> [!note] Enshrouded writes the world within a second of a normal stop, so a restart loses no play. That makes a daily restart safe to schedule, and an hour when nobody plays is still the best time for it, because the restart drops everyone online.
