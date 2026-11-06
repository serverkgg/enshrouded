import type { Bridge } from "@serverkgg/bridge";
import { readStamp } from "@serverkgg/bridge/install";
import { execDetail } from "@serverkgg/bridge/utils";
import {
	CONTAINER_HOME,
	PROTON_DIRECTORY,
	protonCompatPath,
	WINE_PREFIX_STAMP,
	type WinePrefixStamp,
} from "@serverkgg/bridge/wine";
import { STEAM_APP_ID } from "../shared";

export const PROTON_WINESERVER = `${PROTON_DIRECTORY}/files/bin/wineserver`;

export const PREFIX_PATH = `${CONTAINER_HOME}/${protonCompatPath(STEAM_APP_ID)}/pfx`;

const END_SESSION_TIMEOUT_MS = 30_000;

export const prefixReady = async (context: Bridge.Context) => {
	return (await readStamp<WinePrefixStamp>(context, WINE_PREFIX_STAMP))?.ready === true;
};

export const endPrefixSession = async (context: Bridge.Context) => {
	const ended = await context.exec(
		[
			"env",
			`WINEPREFIX=${PREFIX_PATH}`,
			PROTON_WINESERVER,
			"-k",
		],
		{
			timeoutMs: END_SESSION_TIMEOUT_MS,
		},
	);

	if (ended.code !== 0) {
		context.log.warn("could not end the wine session the new prefix left, so the first start waits for it", {
			detail: execDetail(ended),
		});

		return false;
	}

	context.log("ended the wine session the new prefix left, so the first start launches at once");

	return true;
};
