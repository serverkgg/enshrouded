import type { BridgeDriver } from "@serverkgg/bridge";
import { backup } from "./backup";
import { players, roles } from "./collections";
import { metrics, passwords } from "./details";
import { events } from "./events";
import { install } from "./install";
import { lifecycle } from "./lifecycle";
import { panel } from "./panel";
import { query } from "./query";
import { settings } from "./settings";
import { setup } from "./setup";
import { terminal } from "./terminal";
import { world } from "./worlds";

export const driver: BridgeDriver = {
	install,
	lifecycle,
	events,
	query,
	backup,
	setup,
	terminal,
	panel,
	modules: {
		settings,
		roles,
		players,
		metrics,
		passwords,
		world,
	},
};
