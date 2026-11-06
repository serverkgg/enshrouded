import { beforeEach, describe, expect, it } from "bun:test";
import { BridgeSetupPromptKind, BridgeSetupStepState } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { readEnshroudedStamp, serverMetrics } from "../shared";
import { EMPTY_STAMP, memoryContext } from "../testing";
import { setup } from "./setup";
import { OnlinePhase, onlinePhaseOf, onlineRuntimeOf, provenOf, reportOnline, reportStarting } from "./setupOnline";

const WRITTEN_AT = "2026-11-06T12:00:00.000Z";

const BEFORE = "2026-11-06T11:00:00.000Z";

const AFTER = "2026-11-06T13:00:00.000Z";

const PENDING = {
	name: "Embervale",
};

const stampFile = (stamp: Partial<typeof EMPTY_STAMP>) => {
	return {
		[INSTALL_STAMP_FILE]: JSON.stringify({
			...EMPTY_STAMP,
			...stamp,
		}),
	};
};

const snapshotOf = (readyAt: number | null, steamConnectedAt: number | null) => {
	return {
		...serverMetrics.snapshot(),
		readyAt,
		steamConnectedAt,
	};
};

describe("proving the server comes online with its current settings", () => {
	beforeEach(() => {
		serverMetrics.clear();
	});

	it("holds the proof only when it came after the last settings write and nothing waits for a restart", () => {
		expect(provenOf(EMPTY_STAMP)).toBe(false);
		expect(
			provenOf({
				...EMPTY_STAMP,
				onlineAt: AFTER,
				settingsWrittenAt: WRITTEN_AT,
			}),
		).toBe(true);
		expect(
			provenOf({
				...EMPTY_STAMP,
				onlineAt: BEFORE,
				settingsWrittenAt: WRITTEN_AT,
			}),
		).toBe(false);
		expect(
			provenOf({
				...EMPTY_STAMP,
				onlineAt: AFTER,
				settingsPending: PENDING,
			}),
		).toBe(false);
	});

	it("reads the phase from the stamp, whether the game runs and what this run's log said", () => {
		const phaseOf = (running: boolean, stamp: typeof EMPTY_STAMP, readyAt: number | null, steamAt: number | null) => {
			return onlinePhaseOf({
				running,
				snapshot: snapshotOf(readyAt, steamAt),
				stamp,
			});
		};

		expect(phaseOf(false, EMPTY_STAMP, null, null)).toBe(OnlinePhase.Stopped);
		expect(phaseOf(true, EMPTY_STAMP, null, 1)).toBe(OnlinePhase.Starting);
		expect(phaseOf(true, EMPTY_STAMP, 2, null)).toBe(OnlinePhase.NoSteam);
		expect(phaseOf(true, EMPTY_STAMP, 2, 1)).toBe(OnlinePhase.Online);
		expect(
			phaseOf(
				true,
				{
					...EMPTY_STAMP,
					settingsPending: PENDING,
				},
				2,
				1,
			),
		).toBe(OnlinePhase.Pending);
		expect(
			phaseOf(
				false,
				{
					...EMPTY_STAMP,
					onlineAt: AFTER,
				},
				null,
				null,
			),
		).toBe(OnlinePhase.Online);
	});

	it("reports done with no prompt, and every other phase as the active step with a prompt", () => {
		expect(onlineRuntimeOf(OnlinePhase.Online)).toEqual({
			prompt: null,
			steps: [
				{
					id: "online",
					state: BridgeSetupStepState.Done,
				},
			],
		});
		expect(onlineRuntimeOf(OnlinePhase.Starting).prompt?.kind).toBe(BridgeSetupPromptKind.Wait);
		expect(onlineRuntimeOf(OnlinePhase.Stopped).prompt?.kind).toBe(BridgeSetupPromptKind.Action);
		expect(onlineRuntimeOf(OnlinePhase.Pending).prompt?.kind).toBe(BridgeSetupPromptKind.Action);
		expect(onlineRuntimeOf(OnlinePhase.NoSteam).prompt?.kind).toBe(BridgeSetupPromptKind.Failed);

		for (const phase of [
			OnlinePhase.Starting,
			OnlinePhase.Stopped,
			OnlinePhase.Pending,
		]) {
			expect(onlineRuntimeOf(phase).steps.at(0)?.state).toBe(BridgeSetupStepState.Active);
		}
	});

	it("records the proof in the stamp once this run reached the world and steam with nothing pending", async () => {
		const { context, setupReports } = memoryContext({
			files: stampFile({}),
			running: true,
		});

		serverMetrics.recordSteam(1);
		serverMetrics.markReady(2);

		expect(await reportOnline(context, true)).toBe(OnlinePhase.Online);
		expect((await readEnshroudedStamp(context)).onlineAt).not.toBeNull();
		expect(setupReports.at(-1)?.steps.at(0)?.state).toBe(BridgeSetupStepState.Done);
	});

	it("never reports the step active again on its own once the server was proven, so a settled setup stays closed", async () => {
		const { context, setupReports } = memoryContext({
			files: stampFile({
				onlineAt: BEFORE,
				settingsWrittenAt: WRITTEN_AT,
			}),
			running: true,
		});

		expect(await reportOnline(context, true)).toBe(OnlinePhase.Starting);
		expect(setupReports).toEqual([]);

		await reportStarting(context);

		expect(setupReports).toEqual([]);
		expect(await reportOnline(context)).toBe(OnlinePhase.Starting);
		expect(setupReports.at(-1)?.steps.at(0)?.state).toBe(BridgeSetupStepState.Active);
	});

	it("reports a fresh server as starting, so the platform sees the step active before it is done", async () => {
		const { context, setupReports } = memoryContext({
			files: stampFile({}),
		});

		await reportStarting(context);

		expect(setupReports.at(-1)?.prompt?.kind).toBe(BridgeSetupPromptKind.Wait);
	});

	it("answers the check button with a prompt, never a failed call", async () => {
		const { context, setupReports } = memoryContext({
			files: stampFile({}),
		});

		await setup.submit?.(context, "online", "check", {});

		expect(setupReports.at(-1)?.prompt?.kind).toBe(BridgeSetupPromptKind.Action);
	});
});
