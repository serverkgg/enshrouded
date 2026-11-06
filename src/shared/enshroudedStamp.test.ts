import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { EMPTY_STAMP, memoryContext } from "../testing";
import { normalizeStamp, patchEnshroudedStamp, readEnshroudedStamp } from "./enshroudedStamp";

describe("the install stamp", () => {
	it("reads a missing stamp as empty", () => {
		expect(normalizeStamp(null)).toEqual(EMPTY_STAMP);
	});

	it("drops values a hand edit made unreadable", () => {
		expect(
			normalizeStamp({
				buildId: "",
				settingsPending: {
					name: "Embervale",
					slotCount: Number.NaN,
				},
			}),
		).toEqual({
			...EMPTY_STAMP,
			settingsPending: {
				name: "Embervale",
			},
		});
	});

	it("keeps the build id beside the waiting settings when one of them changes", async () => {
		const { context } = memoryContext({
			files: {
				[INSTALL_STAMP_FILE]: JSON.stringify({
					buildId: "20000001",
				}),
			},
		});

		await patchEnshroudedStamp(context, {
			settingsPending: {
				slotCount: 4,
			},
		});

		expect(await readEnshroudedStamp(context)).toEqual({
			...EMPTY_STAMP,
			buildId: "20000001",
			settingsPending: {
				slotCount: 4,
			},
		});
	});
});
