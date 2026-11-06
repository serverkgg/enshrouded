import { describe, expect, it } from "bun:test";
import { WINE_PREFIX_STAMP } from "@serverkgg/bridge/wine";
import { memoryContext } from "../testing";
import { endPrefixSession, PREFIX_PATH, PROTON_WINESERVER, prefixReady } from "./prefixSession";

describe("endPrefixSession", () => {
	it("kills the wineserver of the game's proton prefix, the session wineboot leaves behind", async () => {
		const { commands, context } = memoryContext();

		expect(await endPrefixSession(context)).toBe(true);
		expect(commands).toEqual([
			[
				"env",
				"WINEPREFIX=/home/container/.proton/2278520/pfx",
				PROTON_WINESERVER,
				"-k",
			],
		]);
		expect(PREFIX_PATH).toBe("/home/container/.proton/2278520/pfx");
	});

	it("warns and carries on when no session answers, because the first start still waits for one", async () => {
		const { context, logged } = memoryContext({
			exec: () => {
				return {
					code: 1,
					stderr: "",
					stdout: "",
				};
			},
		});

		expect(await endPrefixSession(context)).toBe(false);
		expect(logged.map((entry) => entry.level)).toEqual([
			"warn",
		]);
	});
});

describe("prefixReady", () => {
	it("reads the prefix stamp, so only a prefix created by this install ends its session", async () => {
		expect(await prefixReady(memoryContext().context)).toBe(false);
		expect(
			await prefixReady(
				memoryContext({
					files: {
						[WINE_PREFIX_STAMP]: JSON.stringify({
							proton: true,
							ready: true,
						}),
					},
				}).context,
			),
		).toBe(true);
	});
});
