import { describe, expect, it } from "bun:test";
import { PROTON_HEADLESS_ENVIRONMENT } from "@serverkgg/bridge/wine";
import { memoryContext } from "../testing";
import { containerPathOf, enshroudedProtonCommand } from "./enshroudedProton";

describe("running the server under proton", () => {
	it("runs the program with the headless proton environment", async () => {
		const argv = await enshroudedProtonCommand(memoryContext().context, "enshrouded_server.exe", []);

		expect(argv).toEqual(
			expect.arrayContaining(Object.entries(PROTON_HEADLESS_ENVIRONMENT).map(([key, value]) => `${key}=${value}`)),
		);
	});

	it("runs the program inside the existing prefix by its path in the container", async () => {
		const argv = await enshroudedProtonCommand(memoryContext().context, "enshrouded_server.exe", []);

		expect(argv).toContain("runinprefix");
		expect(argv.at(-1)).toBe(containerPathOf("enshrouded_server.exe"));
	});
});
