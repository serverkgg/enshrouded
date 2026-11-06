import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { readEnshroudedStamp } from "../shared";
import { EMPTY_STAMP, memoryContext } from "../testing";
import { install, recordBuild } from "./install";

describe("stamping the steam build", () => {
	it("records the first build without calling it an update", async () => {
		const { activities, context, emits } = memoryContext();

		await recordBuild(context, EMPTY_STAMP, "20000001");

		expect((await readEnshroudedStamp(context)).buildId).toBe("20000001");
		expect(activities).toEqual([]);
		expect(emits).toEqual([]);
	});

	it("reports a build change as an update", async () => {
		const { activities, context, emits } = memoryContext();

		await recordBuild(
			context,
			{
				...EMPTY_STAMP,
				buildId: "20000001",
			},
			"20000002",
		);

		expect(emits.map((entry) => entry.event)).toEqual([
			BridgeEventName.ServerUpdated,
		]);
		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.ServerUpdated,
		]);
	});

	it("writes nothing when steam names no build, so the stamped build stands", async () => {
		const { context, files } = memoryContext();

		await recordBuild(
			context,
			{
				...EMPTY_STAMP,
				buildId: "20000001",
			},
			null,
		);

		expect(files.has(INSTALL_STAMP_FILE)).toBe(false);
	});

	it("keeps the settings waiting in the stamp when the build moves", async () => {
		const { context } = memoryContext({
			files: {
				[INSTALL_STAMP_FILE]: JSON.stringify({
					buildId: "20000001",
					settingsPending: {
						slotCount: 4,
					},
				}),
			},
		});

		await recordBuild(context, await readEnshroudedStamp(context), "20000002");

		expect((await readEnshroudedStamp(context)).settingsPending).toEqual({
			slotCount: 4,
		});
	});

	it("describes the server by the steam build id, which update detection compares", async () => {
		const { context } = memoryContext({
			files: {
				[INSTALL_STAMP_FILE]: JSON.stringify({
					buildId: "20000001",
				}),
			},
		});

		expect(await install.describe?.(context)).toEqual({
			build: null,
			variant: null,
			version: "20000001",
		});
	});
});
