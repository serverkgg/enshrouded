import { describe, expect, it } from "bun:test";
import { BridgeDetailFormat, BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { serverMetrics, WORLD_FILE, watchServerLog } from "../shared";
import { EMPTY_STAMP, memoryContext, VERSION_FIXTURE } from "../testing";
import { lastSaveOf, metrics, metricsSection, playerCountOf } from "./metrics";

const WORLD_SAVED_AT = "2026-11-06T15:40:00.000Z";

const statOf = async (context: Parameters<typeof metrics.read>[0], key: string) => {
	return (await metrics.read(context))?.stats.find((stat) => stat.key === key);
};

describe("the server health card", () => {
	it("shows the uptime from the ready line, the players from the last sample and the build from the stamp", async () => {
		const { context } = memoryContext({
			files: {
				[INSTALL_STAMP_FILE]: JSON.stringify({
					...EMPTY_STAMP,
					buildId: "20581234",
				}),
			},
			running: true,
		});

		serverMetrics.clear();
		serverMetrics.markReady(Date.now() - 90 * 60 * 1000);
		serverMetrics.recordPlayers(2, 16);

		const detail = await metrics.read(context);

		expect(detail?.stale).toBe(false);
		expect(detail?.stats.find((stat) => stat.key === "uptime")?.value).toEqual({
			ar: "ساعة و30 دقيقة",
			en: "1h 30m",
		});
		expect(detail?.stats.find((stat) => stat.key === "players")?.value).toBe("2/16");
		expect(detail?.stats.find((stat) => stat.key === "build")?.value).toBe("20581234");

		serverMetrics.clear();
	});

	it("shows the world file's time as the last save and the game version the log printed", async () => {
		const { context, logLine } = memoryContext({
			files: {
				[WORLD_FILE]: "ksd",
			},
			modified: {
				[WORLD_FILE]: WORLD_SAVED_AT,
			},
			running: true,
		});

		serverMetrics.clear();
		watchServerLog(context);
		logLine(VERSION_FIXTURE);

		const lastSave = await statOf(context, "lastSave");

		expect(lastSave?.format).toBe(BridgeDetailFormat.Date);
		expect(lastSave?.value).toBe(WORLD_SAVED_AT);
		expect((await statOf(context, "version"))?.value).toBe("1287369");

		serverMetrics.clear();
	});

	it("reads the last save from the world file, which the game rewrites every 30 seconds", async () => {
		const { context } = memoryContext({
			files: {
				[WORLD_FILE]: "ksd",
			},
			modified: {
				[WORLD_FILE]: WORLD_SAVED_AT,
			},
		});

		expect(await lastSaveOf(context)).toBe(WORLD_SAVED_AT);
		expect(await lastSaveOf(memoryContext().context)).toBeNull();
	});

	it("marks itself stale while the server is stopped, forgetting the run but not the last save", async () => {
		const { context } = memoryContext({
			files: {
				[WORLD_FILE]: "ksd",
			},
			modified: {
				[WORLD_FILE]: "2026-11-06T16:02:00.000Z",
			},
		});

		serverMetrics.markReady();
		serverMetrics.recordPlayers(2, 16);
		serverMetrics.recordVersion("812345");
		serverMetrics.clear();

		const detail = await metrics.read(context);
		const statValueOf = (key: string) => {
			return detail?.stats.find((stat) => stat.key === key)?.value;
		};

		expect(detail?.stale).toBe(true);
		expect(statValueOf("players")).toBe("—");
		expect(statValueOf("uptime")).toBe("—");
		expect(statValueOf("version")).toBe("—");
		expect(statValueOf("build")).toBe("—");
		expect(statValueOf("lastSave")).toBe("2026-11-06T16:02:00.000Z");
	});

	it("counts the players with or without a known limit", () => {
		const snapshot = serverMetrics.snapshot();

		expect(
			playerCountOf({
				...snapshot,
				max: null,
				online: 3,
			}),
		).toBe("3");
		expect(
			playerCountOf({
				...snapshot,
				max: null,
				online: null,
			}),
		).toBe("—");
	});

	it("sits on the overview as a detail section", () => {
		expect(metricsSection).toEqual(
			expect.objectContaining({
				id: "metrics",
				layout: BridgeLayout.Detail,
				module: "metrics",
				place: BridgePlace.Overview,
			}),
		);
	});
});
