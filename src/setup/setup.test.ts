import { describe, expect, it } from "bun:test";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { BridgeSetupStepKind } from "@serverkgg/bridge/protocol";
import { setup } from "./setup";

describe("the enshrouded setup", () => {
	it("proves the server comes online, offers the server name and the admin password, then shows how to join", () => {
		expect(setup.steps.map((step) => step.id)).toEqual([
			"online",
			"server",
			"admin",
			"invite",
		]);
	});

	it("opens with a required driver step that needs the game running, so reopening a form step never resets it", () => {
		expect(setup.steps.at(0)).toEqual(
			expect.objectContaining({
				id: "online",
				kind: BridgeSetupStepKind.Driver,
				required: true,
				requiresRunning: true,
			}),
		);
	});

	it("points each form step at one existing settings section and its field, as an optional step, because install seeds both values", () => {
		expect(setup.steps.slice(1, 3)).toEqual([
			expect.objectContaining({
				fields: [
					"name",
				],
				kind: BridgeSetupStepKind.Form,
				required: false,
				section: "server",
				tab: "settings",
			}),
			expect.objectContaining({
				fields: [
					"adminPassword",
				],
				kind: BridgeSetupStepKind.Form,
				required: false,
				section: "passwords",
				tab: "settings",
			}),
		]);
	});

	it("ends with the optional invite step on the access tab, because players join by address", () => {
		expect(setup.steps.at(-1)).toEqual(
			expect.objectContaining({
				id: "invite",
				kind: BridgeSetupStepKind.Open,
				required: false,
				target: {
					tab: GuideOpenTab.Access,
				},
			}),
		);
	});
});
