import { describe, expect, it } from "bun:test";
import { SERVER_EXE } from "../shared";
import {
	CONTAINER_UID,
	SERVER_PROCESS_SCRIPT,
	serverPidsOf,
	startArgs,
	WINE_PROCESS_SCRIPT,
	WINE_SYSTEM_PROCESSES,
} from "./enshroudedCommand";

describe("the enshrouded start command", () => {
	it("passes no arguments, because the server reads everything from its config", () => {
		expect(startArgs()).toEqual([]);
	});
});

describe("finding the enshrouded process to signal", () => {
	it("matches the windows path of the server binary under a wine loader, never the wrapper", () => {
		expect(SERVER_PROCESS_SCRIPT).toContain(`*'\\${SERVER_EXE}')`);
		expect(SERVER_PROCESS_SCRIPT).toContain("wine64-preloader|wine-preloader");
	});

	it("reads the pids the script prints, lowest first", () => {
		expect(serverPidsOf("308\n\n27\nnoise\n")).toEqual([
			27,
			308,
		]);
	});
});

describe("finding the previous instance's wine processes", () => {
	it("matches the prefix's wineserver and every wine system process, only for the container user", () => {
		expect(WINE_PROCESS_SCRIPT).toContain(`= ${CONTAINER_UID} ] || continue;`);
		expect(WINE_PROCESS_SCRIPT).toContain('wineserver) basename "$entry"; continue ;;');

		for (const name of WINE_SYSTEM_PROCESSES) {
			expect(WINE_PROCESS_SCRIPT).toContain(`*'\\${name}'`);
		}
	});

	it("never matches the server binary, which the stop signals and the bridge's group kill ends", () => {
		expect(WINE_PROCESS_SCRIPT).not.toContain(SERVER_EXE);
	});
});
