import { describe, expect, it } from "bun:test";
import { BridgeKind } from "@serverkgg/bridge";
import { backup } from "./backup";

describe("the backup module", () => {
	it("pauses nothing and waits for nothing, because the game has no control channel and rewrites its world every 30 seconds", () => {
		expect(backup).toEqual({
			kind: BridgeKind.Backup,
		});
	});
});
