import { describe, expect, it } from "bun:test";
import { readdir } from "node:fs/promises";
import {
	BridgeAccess,
	BridgeConfirm,
	type BridgeDriver,
	BridgeFormTarget,
	BridgeKind,
	BridgeLayout,
	BridgePlace,
	BridgeSetupStepKind,
	BridgeUploadMode,
} from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { BridgeEventName, isBridgeEventName } from "@serverkgg/bridge/protocol";
import { compileGlobs, matchesAny } from "@serverkgg/bridge/utils";
import { bridgePanelSchema, bridgeSetupManifestSchema, bridgeTerminalManifestSchema } from "@serverkgg/bridge/wire";
import { driver } from "./driver";
import {
	CONFIG_FILE,
	GAME_ROOTS,
	LOGS_DIRECTORY,
	presenceOf,
	SAVE_DIRECTORY,
	SERVER_LOG,
	SERVER_READY,
	WORLD_FILE,
} from "./shared";
import { WORLD_UPLOAD_STAGING } from "./worlds";

interface Manifest {
	steam: {
		appId: number;
	};
	container: {
		ports: {
			key: string;
			containerPort: number;
			protocol: string;
			mirror?: boolean;
			hostRange: {
				default: number;
				min: number;
				max: number;
			};
		}[];
		runtime: {
			platform: string;
			shmMb: number;
		};
	};
	files: {
		protected: string[];
		notable: {
			match: string;
		}[];
	};
	backup: {
		only: string[];
		except: string[];
	};
	reset: {
		keep: string[];
	};
	presence: {
		name: string;
		id: string;
		avatar: string;
		fields: {
			key: string;
		}[];
	};
	secrets: {
		key: string;
		required: boolean;
	}[];
	guides: {
		id: string;
	}[];
}

const VALIDATE_TIMEOUT_MS = 120_000;

const SOURCE_ROOT = new URL(".", import.meta.url).pathname;

const RAISED_EVENT = /BridgeEventName\.(?<name>[A-Za-z]+)/g;

const PLATFORM_TAB_IDS = [
	"overview",
	"console",
	"files",
	"backups",
	"schedules",
	"analytics",
	"feed",
	"access",
	"integrations",
	"needs",
	"setup",
	"change-game",
];

const KEPT_ROOTS = [
	...GAME_ROOTS,
	"enshrouded_server_000.dat",
	"enshrouded_server_009.dat",
	"enshrouded_server.kfc",
	"enshrouded_server.kfc_resources",
	"enshrouded_server_readme.txt",
	"steam_api64.dll",
	"steam_appid.txt",
	"steamapps",
	"Steam",
	"_CommonRedist",
	".steamcmd",
	".steam",
	".proton",
	".serverk-wine.json",
];

const manifest = Bun.YAML.parse(await Bun.file(new URL("../serverk.yml", import.meta.url)).text()) as Manifest;

const modules = driver.modules ?? {};

const tabs = driver.panel?.tabs ?? [];

const sections = tabs.flatMap((tab) => tab.sections);

const steps = driver.setup?.steps ?? [];

const formSection = (tabId: string, sectionId: string) => {
	const section = tabs.find((tab) => tab.id === tabId)?.sections.find((entry) => entry.id === sectionId);

	return section?.layout === BridgeLayout.Form ? section : null;
};

type PanelModule = NonNullable<BridgeDriver["modules"]>[string];

const protectedActionsOf = (module: PanelModule) => {
	return "protectedActions" in module ? (module.protectedActions ?? []) : [];
};

const sourceFiles = async () => {
	const entries = await readdir(SOURCE_ROOT, {
		recursive: true,
	});

	return entries.filter(
		(entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts") && !entry.startsWith("testing/"),
	);
};

const raisedEvents = async () => {
	const names = new Set<string>();

	for (const file of await sourceFiles()) {
		if (file === "events/events.ts") {
			continue;
		}

		for (const match of (await Bun.file(`${SOURCE_ROOT}${file}`).text()).matchAll(RAISED_EVENT)) {
			names.add(match.groups?.name ?? "");
		}
	}

	return [
		...names,
	].sort();
};

describe("assembling the enshrouded driver", () => {
	it(
		"passes the same validation the platform runs at boot",
		async () => {
			const validate = Bun.spawn(
				[
					"bunx",
					"serverk-bridge",
					"validate",
				],
				{
					cwd: new URL("..", import.meta.url).pathname,
					stderr: "pipe",
					stdout: "pipe",
				},
			);
			const output = `${await new Response(validate.stdout).text()}${await new Response(validate.stderr).text()}`;

			expect(await validate.exited).toBe(0);
			expect(output).toContain("enshrouded is valid");
		},
		VALIDATE_TIMEOUT_MS,
	);

	it("fills the slots of a game without a console channel, in the bridge's order, and no announce or pending", () => {
		expect(Object.keys(driver)).toEqual([
			"install",
			"lifecycle",
			"events",
			"query",
			"backup",
			"setup",
			"terminal",
			"panel",
			"modules",
		]);
		expect(driver.announce).toBeUndefined();
		expect(driver.pending).toBeUndefined();
	});

	it("registers the settings, the roles, the roster, the two cards and the world", () => {
		expect(Object.keys(modules)).toEqual([
			"settings",
			"roles",
			"players",
			"metrics",
			"passwords",
			"world",
		]);
		expect(modules.settings?.kind).toBe(BridgeKind.Settings);
		expect(modules.roles?.kind).toBe(BridgeKind.Collection);
		expect(modules.players?.kind).toBe(BridgeKind.Collection);
		expect(modules.metrics?.kind).toBe(BridgeKind.Detail);
		expect(modules.passwords?.kind).toBe(BridgeKind.Detail);
		expect(modules.world?.kind).toBe(BridgeKind.Collection);
	});

	it("builds a panel, a terminal and a setup the agent's wire schemas accept", () => {
		const panel = bridgePanelSchema.safeParse(driver.panel);
		const setup = bridgeSetupManifestSchema.safeParse({
			steps,
		});
		const terminal = bridgeTerminalManifestSchema.safeParse({
			commands: driver.terminal?.commands ?? [],
			rules: (driver.terminal?.rules ?? []).map((rule) => {
				return {
					flags: rule.match.flags,
					level: rule.level,
					match: rule.match.source,
				};
			}),
		});

		expect(panel.success ? null : panel.error.issues).toBeNull();
		expect(setup.success ? null : setup.error.issues).toBeNull();
		expect(terminal.success ? null : terminal.error.issues).toBeNull();
	});

	it("names an exported module in every section", () => {
		for (const section of sections) {
			expect(Object.keys(modules)).toContain(section.module ?? "");
		}
	});

	it("lays out settings, difficulty, players and world, and takes the name of no platform sidebar entry", () => {
		expect(tabs.map((tab) => tab.id)).toEqual([
			"settings",
			"difficulty",
			"players",
			"world",
		]);

		for (const tab of tabs) {
			expect(PLATFORM_TAB_IDS).not.toContain(tab.id);
		}
	});

	it("places every section of the players tab on the players page", () => {
		const players = tabs.find((tab) => tab.id === "players");

		expect(players?.sections.map((section) => section.id)).toEqual([
			"online",
			"roles",
		]);

		for (const section of players?.sections ?? []) {
			expect("place" in section ? section.place : undefined).toBe(BridgePlace.Players);
		}
	});
});

describe("the panel", () => {
	it("writes the server, chat and password forms through the settings module with a normal confirm and a restart hint", () => {
		expect(tabs.find((tab) => tab.id === "settings")?.sections.map((section) => section.id)).toEqual([
			"server",
			"chat",
			"passwords",
			"metrics",
			"join-passwords",
		]);

		for (const id of [
			"server",
			"chat",
			"passwords",
		]) {
			const form = formSection("settings", id);

			expect(form?.target, id).toBe(BridgeFormTarget.Settings);
			expect(form?.module, id).toBe("settings");
			expect(form?.confirm, id).toBe(BridgeConfirm.Normal);
			expect(form?.restartHint, id).toBe(true);
		}
	});

	it("gives the difficulty its own tab, the preset first and then the six custom groups", () => {
		const difficulty = tabs.find((tab) => tab.id === "difficulty");

		expect(difficulty?.sections.map((section) => section.id)).toEqual([
			"difficulty",
			"difficulty-player",
			"difficulty-survival",
			"difficulty-world",
			"difficulty-enemies",
			"difficulty-progression",
			"difficulty-time",
		]);

		for (const section of difficulty?.sections ?? []) {
			expect(formSection("difficulty", section.id)?.module).toBe("settings");
		}
	});

	it("places the health card and the passwords card on the overview, both linked to the settings tab", () => {
		for (const id of [
			"metrics",
			"join-passwords",
		]) {
			const card = sections.find((section) => section.id === id);

			expect(card?.layout, id).toBe(BridgeLayout.Detail);
			expect(card && "place" in card ? card.place : null, id).toBe(BridgePlace.Overview);
			expect(card?.layout === BridgeLayout.Detail ? card.related?.tab : null, id).toBe("settings");
		}
	});

	it("shows the passwords card only to those who may invoke the panel", () => {
		const card = sections.find((section) => section.id === "join-passwords");

		expect(card && "access" in card ? card.access : null).toBe(BridgeAccess.Invoke);
		expect(card?.module).toBe("passwords");
	});

	it("uploads one world file into a staging folder the manifest leaves unprotected", () => {
		const table = tabs.find((tab) => tab.id === "world")?.sections.find((section) => section.id === "world");
		const upload = table?.layout === BridgeLayout.Table ? table.upload : undefined;

		expect(upload?.mode).toBe(BridgeUploadMode.File);
		expect(upload?.extensions).toEqual([
			"ksd",
		]);
		expect(upload?.staging).toBe(WORLD_UPLOAD_STAGING);
		expect(matchesAny(`${WORLD_UPLOAD_STAGING}/upload/world0.ksd`, compileGlobs(manifest.files.protected))).toBe(false);
	});

	it("serves the world download from the row's path, never from a handler", () => {
		const table = tabs.find((tab) => tab.id === "world")?.sections.find((section) => section.id === "world");
		const download = table?.layout === BridgeLayout.Table ? table.actions?.find((action) => action.download) : null;
		const world = modules.world;

		expect(download?.id).toBe("download");
		expect(world?.kind === BridgeKind.Collection ? Object.keys(world.actions ?? {}) : []).not.toContain("download");
	});
});

describe("guarding the one action nothing else brings back", () => {
	it("protects only wiping the world", () => {
		const declared = Object.fromEntries(
			Object.entries(modules).flatMap(([id, module]) => {
				const actions = protectedActionsOf(module);

				return actions.length > 0
					? [
							[
								id,
								actions,
							],
						]
					: [];
			}),
		);

		expect(declared).toEqual({
			world: [
				"wipe",
			],
		});
	});

	it("protects only a declared mutation on a module that works while the game is stopped, and says when it is unavailable", () => {
		const world = modules.world;

		expect(world?.kind).toBe(BridgeKind.Collection);
		expect(world && "requiresRunning" in world ? world.requiresRunning : null).toBe(false);
		expect(world?.kind === BridgeKind.Collection ? Object.keys(world.actions ?? {}) : []).toContain("wipe");
		expect(world && "unavailable" in world ? typeof world.unavailable : null).toBe("function");
	});

	it("confirms the wipe with the checkbox and warns that no backup is taken first", () => {
		const table = tabs.find((tab) => tab.id === "world")?.sections.find((section) => section.id === "world");
		const wipe = table?.layout === BridgeLayout.Table ? table.actions?.find((action) => action.id === "wipe") : null;

		expect(wipe?.confirm).toBe(BridgeConfirm.Strong);
		expect(wipe?.confirmText?.ar).toContain("لا نأخذ نسخة احتياطية");
		expect(wipe?.confirmText?.ar).toContain("خذ نسخة احتياطية أولًا");
		expect(wipe?.confirmText?.en).toContain("don't take a backup");
		expect(wipe?.confirmText?.en).toMatch(/take (a backup|one) first/i);
	});

	it("never asks for the checkbox on a section the platform takes a restore point for", () => {
		for (const section of sections) {
			if (section.layout === BridgeLayout.Form) {
				expect(section.confirm, section.id).not.toBe(BridgeConfirm.Strong);
			}
		}
	});
});

describe("walking the customer through the first run", () => {
	it("proves the server comes online, names the server, sets the admin password, then points at the address", () => {
		expect(steps.map((step) => step.id)).toEqual([
			"online",
			"server",
			"admin",
			"invite",
		]);
	});

	it("points every form step at a form and fields the panel declares, as an optional step the customer confirms", () => {
		for (const step of steps) {
			if (step.kind !== BridgeSetupStepKind.Form) {
				continue;
			}

			const section = formSection(step.tab, step.section);

			expect(section, step.id).not.toBeNull();
			expect(step.required, step.id).toBe(false);

			for (const key of step.fields ?? []) {
				expect((section?.fields ?? []).map((field) => field.key)).toContain(key);
			}
		}
	});

	it("proves the server comes online with a required driver step the setup module answers", () => {
		const online = steps.find((step) => step.id === "online");

		expect(online?.kind).toBe(BridgeSetupStepKind.Driver);
		expect(online?.required).toBe(true);
		expect(online?.kind === BridgeSetupStepKind.Driver && online.requiresRunning).toBe(true);
		expect(typeof driver.setup?.submit).toBe("function");
	});

	it("opens the access page for the invite, because players join by address", () => {
		const invite = steps.find((step) => step.id === "invite");

		expect(invite?.kind === BridgeSetupStepKind.Open && invite.target.tab).toBe(GuideOpenTab.Access);
		expect(invite?.required).toBe(false);
	});
});

describe("declaring the events the platform acts on", () => {
	it("names only events the platform's taxonomy knows", () => {
		for (const name of [
			...(driver.events?.patterns ?? []).map((pattern) => pattern.emit),
			...(driver.events?.emits ?? []),
		]) {
			expect(isBridgeEventName(name)).toBe(true);
		}
	});

	it("declares every event the code raises, and the ones the bridge helpers raise for it", async () => {
		const declared = [
			...(driver.events?.patterns ?? []).map((pattern) => pattern.emit),
			...(driver.events?.emits ?? []),
		];

		for (const name of [
			...(await raisedEvents()),
			BridgeEventName.PlayerJoined,
			BridgeEventName.PlayerLeft,
			BridgeEventName.SettingsApplied,
		]) {
			expect(declared, name).toContain(name);
		}
	});

	it("matches started, crashed and a busy port from the log, and never an autosave", () => {
		expect((driver.events?.patterns ?? []).map((pattern) => pattern.emit)).toEqual([
			BridgeEventName.ServerStarted,
			BridgeEventName.ServerCrashed,
			BridgeEventName.ServerCrashed,
			BridgeEventName.PortBindFailed,
		]);
	});

	it("calls the server ready on the line the world starts running with", () => {
		expect(driver.lifecycle.ready?.source).toBe(SERVER_READY.source);
		expect(driver.lifecycle.stopSignal).toBeUndefined();
		expect(driver.lifecycle.stopTimeoutSeconds).toBeLessThanOrEqual(180);
		expect(driver.lifecycle.stop).toBeDefined();
	});
});

describe("the manifest", () => {
	it("installs the dedicated server app under proton with enough shared memory", () => {
		expect(manifest.steam.appId).toBe(2_278_520);
		expect(manifest.container.runtime.platform).toBe("wine");
		expect(manifest.container.runtime.shmMb).toBeGreaterThanOrEqual(256);
	});

	it("publishes the one mirrored udp query port in its own host range", () => {
		expect(manifest.container.ports).toEqual([
			expect.objectContaining({
				containerPort: 15_637,
				hostRange: {
					default: 9400,
					max: 9499,
					min: 9400,
				},
				key: "query",
				mirror: true,
				protocol: "udp",
			}),
		]);
	});

	it("keeps the prefix, steam and every game file through a reset, and never the world, the config or the logs", () => {
		const keep = compileGlobs(manifest.reset.keep);

		for (const path of KEPT_ROOTS) {
			expect(matchesAny(path, keep), path).toBe(true);
		}

		expect(manifest.reset.keep).toContain(".proton");
		expect(manifest.reset.keep).toContain(".serverk-wine.json");
		expect(manifest.reset.keep).toContain("steamapps");

		for (const path of [
			SAVE_DIRECTORY,
			WORLD_FILE,
			CONFIG_FILE,
			LOGS_DIRECTORY,
			SERVER_LOG,
			".serverk-install.json",
		]) {
			expect(matchesAny(path, keep), path).toBe(false);
		}
	});

	it("archives the world, the config and the stamp, and skips the game's own rolling copies", () => {
		const only = compileGlobs(manifest.backup.only);
		const except = compileGlobs(manifest.backup.except);

		expect(manifest.backup.only).toEqual([
			"savegame/**",
			CONFIG_FILE,
			".serverk-install.json",
		]);
		expect(matchesAny(WORLD_FILE, only) && !matchesAny(WORLD_FILE, except)).toBe(true);
		expect(matchesAny("savegame/backup/world0.ksd.backup-3", except)).toBe(true);
		expect(matchesAny("savegame/migrated/world0.ksd", except)).toBe(true);
	});

	it("protects the install stamp, the prefix stamp and the driver's staging, and only .serverk paths", () => {
		expect(manifest.files.protected).toEqual(
			expect.arrayContaining([
				".serverk-install.json",
				".serverk-wine.json",
				".serverk-staging/**",
			]),
		);

		for (const path of manifest.files.protected) {
			expect(path.startsWith(".serverk")).toBe(true);
		}
	});

	it("points the customer at the config, the world folder and the logs", () => {
		expect(manifest.files.notable.map((entry) => entry.match)).toEqual([
			CONFIG_FILE,
			SAVE_DIRECTORY,
			LOGS_DIRECTORY,
		]);
	});

	it("ships a getting-started guide", () => {
		expect(manifest.guides.map((guide) => guide.id)).toContain("getting-started");
	});
});

describe("the manifest and the roster agreeing on the presence payload", () => {
	const presence = presenceOf({
		avatarHash: "a".repeat(40),
		joinedAt: 0,
		player: "Meslzy",
		steamId: "76561199074320149",
	});

	it("names the player and the steam id the roster rows are keyed by", () => {
		expect(manifest.presence.name).toBe("player");
		expect(manifest.presence.id).toBe("steamId");
		expect(Object.keys(presence)).toContain(manifest.presence.name);
		expect(Object.keys(presence)).toContain(manifest.presence.id);
	});

	it("declares only fields the presence payload really carries", () => {
		expect(manifest.presence.fields.map((field) => field.key)).toEqual([
			"steamId",
		]);

		for (const field of manifest.presence.fields) {
			expect(Object.keys(presence)).toContain(field.key);
		}
	});

	it("builds the avatar url out of the hash the roster resolves", () => {
		expect(manifest.presence.avatar).toBe("https://avatars.steamstatic.com/{avatarHash}_full.jpg");
		expect(Object.keys(presence)).toContain("avatarHash");
	});

	it("asks for the steam key the avatars need without ever requiring it", () => {
		const secret = manifest.secrets.find((entry) => entry.key === "STEAM_WEB_API_KEY");

		expect(secret).toBeDefined();
		expect(secret?.required).toBe(false);
	});
});
