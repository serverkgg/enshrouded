import type { Bridge } from "@serverkgg/bridge";
import { CONTAINER_HOME, PROTON_HEADLESS_ENVIRONMENT, ProtonVerb, protonCommand } from "@serverkgg/bridge/wine";
import { STEAM_APP_ID } from "./enshroudedApp";

export const containerPathOf = (relative: string) => {
	return `${CONTAINER_HOME}/${relative}`;
};

export const enshroudedProtonCommand = async (context: Bridge.Context, relativeExe: string, args: string[]) => {
	return await protonCommand(context, {
		appId: STEAM_APP_ID,
		args,
		environment: PROTON_HEADLESS_ENVIRONMENT,
		exe: containerPathOf(relativeExe),
		verb: ProtonVerb.RunInPrefix,
	});
};
