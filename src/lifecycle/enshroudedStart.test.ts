import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOGS_DIRECTORY, PREVIOUS_SERVER_LOG, SERVER_LOG } from "../shared";

const WRAPPER = new URL("../../image/enshrouded-start", import.meta.url);

const TAIL_LINE = /^tail /;

const prepareLogs = async (home: string) => {
	const lines = (await Bun.file(WRAPPER).text()).split("\n");
	const shell = Bun.spawn(
		[
			"bash",
			"-c",
			lines
				.slice(
					0,
					lines.findIndex((line) => TAIL_LINE.test(line)),
				)
				.join("\n"),
			"enshrouded-start",
			home,
		],
		{
			cwd: tmpdir(),
		},
	);

	return await shell.exited;
};

describe("the start wrapper", () => {
	it("keeps the pipeline in the process group and ends in exec", async () => {
		const wrapper = await Bun.file(WRAPPER).text();

		expect(wrapper).not.toMatch(/setsid|nohup/);
		expect(wrapper.trimEnd().split("\n").at(-1)).toBe(
			`exec xvfb-run -a "$@" > /dev/null 2> >(sed -u -E "\${WINE_NOISE[@]}" >&2)`,
		);
	});

	it("follows the new run's log from its end, so no earlier line replays", async () => {
		const wrapper = await Bun.file(WRAPPER).text();

		expect(wrapper).toContain(`tail -n 0 -F ${SERVER_LOG}`);
	});
});

describe("the start wrapper's log rotation", () => {
	let home = "";

	const write = (path: string, content: string) => {
		mkdirSync(join(home, LOGS_DIRECTORY), {
			recursive: true,
		});
		writeFileSync(join(home, path), content);
	};

	const read = (path: string) => {
		return readFileSync(join(home, path), "utf8");
	};

	beforeEach(() => {
		home = mkdtempSync(join(tmpdir(), "enshrouded-start-"));
	});

	afterEach(() => {
		rmSync(home, {
			force: true,
			recursive: true,
		});
	});

	it("keeps the last run's log as the previous log and starts the new run on an empty log", async () => {
		write(SERVER_LOG, "[app] Trigger gameflow shutdown\n");
		write(PREVIOUS_SERVER_LOG, "an older run\n");

		expect(await prepareLogs(home)).toBe(0);
		expect(read(PREVIOUS_SERVER_LOG)).toBe("[app] Trigger gameflow shutdown\n");
		expect(read(SERVER_LOG)).toBe("");
	});

	it("keeps the older log when the last run wrote nothing", async () => {
		write(SERVER_LOG, "");
		write(PREVIOUS_SERVER_LOG, "an older run\n");

		expect(await prepareLogs(home)).toBe(0);
		expect(read(PREVIOUS_SERVER_LOG)).toBe("an older run\n");
		expect(read(SERVER_LOG)).toBe("");
	});

	it("creates the log folder and an empty log in the install root on the first start", async () => {
		expect(await prepareLogs(home)).toBe(0);
		expect(read(SERVER_LOG)).toBe("");
		expect(existsSync(join(home, PREVIOUS_SERVER_LOG))).toBe(false);
	});
});

const SESSION_BLOCK = [
	"[I 00:00:01,007] -------------- Session ----------------",
	"[I 00:00:01,007] Machines:",
	"[I 00:00:01,007]   m#0(128): up 0 (0), down 0 (0), remote 0 (0), limit 256, lost 0, ping 0 ms, EstablishingBaseline",
	"[I 00:00:01,007]   m#1(42): up 12 (3), down 9 (2), remote 0 (0), limit 256, lost 0, ping 41 ms, Connected",
	"[I 00:00:01,007] ---------------------------------------",
];

const KEPT_LINES = [
	"[I 00:00:00,990] [Session] 'PrepareGame' (up)!",
	"[I 00:00:03,091] [Session] 'HostOnline' (up)!",
	"[I 00:00:02,877] [online] Server connected to Steam successfully",
	"[I 00:00:12,186] [game_server] Switching state from LoadEcsScene to Run after 489.94 ms",
	"[server] Player 'Mohammed' logged in with Permissions:",
];

const filterConsole = async (lines: string[]) => {
	const wrapper = (await Bun.file(WRAPPER).text()).split("\n");
	const start = wrapper.findIndex((line) => line.startsWith("SESSION_NOISE=("));
	const end = wrapper.findIndex((line, index) => index > start && line === ")");
	const shell = Bun.spawn(
		[
			"bash",
			"-c",
			[
				...wrapper.slice(start, end + 1),
				`sed -u -E "\${SESSION_NOISE[@]}"`,
			].join("\n"),
		],
		{
			stdin: new Blob([
				`${lines.join("\n")}\n`,
			]),
			stdout: "pipe",
		},
	);
	const output = await new Response(shell.stdout).text();

	expect(await shell.exited).toBe(0);

	return output.split("\n").filter((line) => line.length > 0);
};

describe("the start wrapper's console filter", () => {
	it("drops the session block the game prints every 30 seconds", async () => {
		expect(await filterConsole(SESSION_BLOCK)).toEqual([]);
	});

	it("keeps every other line, the session state lines and the ready line included", async () => {
		expect(
			await filterConsole([
				...KEPT_LINES.slice(0, 2),
				...SESSION_BLOCK,
				...KEPT_LINES.slice(2),
			]),
		).toEqual(KEPT_LINES);
	});

	it("pipes the followed log through the filter in the background", async () => {
		const wrapper = await Bun.file(WRAPPER).text();

		expect(wrapper).toContain(`tail -n 0 -F ${SERVER_LOG} 2>/dev/null | sed -u -E "\${SESSION_NOISE[@]}" &`);
	});
});
