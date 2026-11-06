import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { ANONYMOUS_LOGIN, createSteamcmd, missingGameRoots, SteamcmdPlatform } from "@serverkgg/bridge/steam";
import { prepareWinePrefix } from "@serverkgg/bridge/wine";
import {
	type EnshroudedStamp,
	GAME_LABEL,
	GAME_ROOTS,
	LOGS_DIRECTORY,
	patchEnshroudedStamp,
	readEnshroudedStamp,
	SAVE_DIRECTORY,
	STEAM_APP_ID,
	seedServerConfig,
} from "../shared";
import { endPrefixSession, prefixReady } from "./prefixSession";

export const GAME_FILES_MISSING: Bridge.Text = {
	ar: "اكتمل التنزيل لكن ملفات اللعبة ناقصة. جرب التثبيت مرة ثانية.",
	en: "The download finished but the game files are missing. Try the install again.",
};

export const steamcmdFor = (context: Bridge.Context) => {
	return createSteamcmd(context, {
		appId: STEAM_APP_ID,
		label: GAME_LABEL,
		login: ANONYMOUS_LOGIN,
		platform: SteamcmdPlatform.Windows,
	});
};

export const requireGameFiles = async (context: Bridge.Context) => {
	const unrepaired = await missingGameRoots(context, GAME_ROOTS);

	if (unrepaired.length > 0) {
		throw new BridgeUserError(GAME_FILES_MISSING, {
			cause: new Error(`steamcmd finished but ${unrepaired.join(", ")} is missing`),
		});
	}
};

export const updatedActivity = (from: string, to: string): Bridge.Activity => {
	return {
		details: {
			from,
			to,
		},
		name: BridgeEventName.ServerUpdated,
		subject: to,
		text: {
			ar: `تم تحديث إنشراودد من البيلد ${from} إلى ${to}`,
			en: `Updated Enshrouded from build ${from} to ${to}`,
		},
	};
};

export const installedActivity = (buildId: string | null): Bridge.Activity => {
	return {
		details: {
			build: buildId,
		},
		name: BridgeEventName.GameInstalled,
		subject: GAME_LABEL,
		text: {
			ar: "تم تثبيت إنشراودد، والسيرفر جاهز للتشغيل",
			en: "Installed Enshrouded, the server is ready to start",
		},
	};
};

export const recordBuild = async (context: Bridge.Context, stamp: EnshroudedStamp, buildId: string | null) => {
	if (buildId === null) {
		context.log.warn("steam finished without naming a build, so this install keeps the build the stamp holds", {
			app: STEAM_APP_ID,
			build: stamp.buildId,
		});

		return;
	}

	if (buildId === stamp.buildId) {
		return;
	}

	await patchEnshroudedStamp(context, {
		buildId,
	});

	if (stamp.buildId === null) {
		return;
	}

	context.log("the server moved to a newer enshrouded build", {
		from: stamp.buildId,
		to: buildId,
	});
	context.emit(BridgeEventName.ServerUpdated, {
		from: stamp.buildId,
		to: buildId,
	});
	context.activity.report(updatedActivity(stamp.buildId, buildId));
};

export const install: Bridge.Install = {
	kind: BridgeKind.Install,
	async run(context) {
		const stamp = await readEnshroudedStamp(context);
		const missing = await missingGameRoots(context, GAME_ROOTS);
		const steam = steamcmdFor(context);
		const fresh = missing.length > 0;

		await steam.prepare();

		if (fresh) {
			context.log("letting steam fetch and verify the whole install, enshrouded is about 8 GB", {
				app: STEAM_APP_ID,
				missing: missing.join(", "),
			});
		} else {
			context.log("checking steam for a newer build", {
				app: STEAM_APP_ID,
			});
		}

		await steam.update({
			validate: fresh,
		});

		await requireGameFiles(context);
		await steam.linkSteamClient();

		const prefixKept = await prefixReady(context);

		await prepareWinePrefix(context, {
			appId: STEAM_APP_ID,
			proton: true,
		});

		if (!prefixKept) {
			await endPrefixSession(context);
		}

		await seedServerConfig(context);
		await context.files.ensure(SAVE_DIRECTORY, LOGS_DIRECTORY);

		const buildId = await steam.buildId();

		await recordBuild(context, stamp, buildId);

		context.log("install complete", {
			app: STEAM_APP_ID,
			build: buildId,
		});

		if (fresh && stamp.buildId === null) {
			context.activity.report(installedActivity(buildId));
		}
	},
	async describe(context) {
		const stamp = await readEnshroudedStamp(context);

		return {
			build: null,
			variant: null,
			version: stamp.buildId,
		};
	},
};
