import { describe, expect, it } from "bun:test";
import { BridgeLayout, BridgePlace, BridgeUserError } from "@serverkgg/bridge";
import { BRIDGE_ACTION_FIELDS_LIMIT } from "@serverkgg/bridge/protocol";
import { CONFIG_FILE, EnshroudedGroup, readEnshroudedStamp } from "../shared";
import { memoryContext } from "../testing";
import { EDIT_ROLE_ACTION, RESERVE_SLOTS_ACTION, roles, rolesSection } from "./roles";

const ADMIN = {
	canAccessInventories: true,
	canEditBase: true,
	canEditWorld: true,
	canExtendBase: true,
	canKickBan: true,
	name: "Admin",
	password: "AdminSecret1",
	reservedSlots: 1,
};

const FRIEND = {
	canAccessInventories: true,
	canEditBase: true,
	canEditWorld: true,
	canExtendBase: false,
	canKickBan: false,
	name: "Friend",
	password: "FriendSecret1",
	reservedSlots: 0,
};

const BUILDERS = {
	canEditBase: true,
	name: "Builders",
	password: "BuildersSecret1",
};

const CONFIG = {
	bannedAccounts: [],
	name: "Embervale",
	userGroups: [
		FRIEND,
		ADMIN,
		BUILDERS,
	],
};

const configFiles = () => {
	return {
		[CONFIG_FILE]: JSON.stringify(CONFIG),
	};
};

const writtenGroups = (files: Map<string, string>) => {
	return JSON.parse(files.get(CONFIG_FILE) ?? "{}").userGroups;
};

const runAction = async (
	context: Parameters<typeof roles.list>[0],
	action: string,
	group: EnshroudedGroup,
	args: Record<string, boolean | number | string>,
) => {
	const handler = roles.actions?.[action];

	if (handler === undefined) {
		throw new Error(`roles has no ${action} action`);
	}

	await handler(
		context,
		{
			id: group,
		},
		args,
	);
};

describe("the roles table", () => {
	it("lists one row per group in Keen's order, whatever order the file keeps", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});
		const rows = await roles.list(context);

		expect(rows.map((row) => row.id)).toEqual([
			"Admin",
			"Friend",
			"Guest",
			"Visitor",
		]);
	});

	it("shows a group's rights from the file and Keen's defaults where the file has no entry", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});
		const [admin, , guest] = await roles.list(context);

		expect(admin).toMatchObject({
			canKickBan: {
				en: "Allowed",
			},
			name: {
				ar: "أدمن",
				en: "Admin",
			},
			reservedSlots: 1,
		});
		expect(guest).toMatchObject({
			canAccessInventories: {
				en: "Not allowed",
			},
			canEditWorld: {
				en: "Allowed",
			},
			reservedSlots: 0,
		});
	});

	it("reads the groups while the server is stopped", () => {
		expect(roles.requiresRunning).toBe(false);
	});

	it("never shows a password", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		expect(JSON.stringify(await roles.list(context))).not.toContain("Secret1");
	});
});

describe("editing a role", () => {
	it("writes the whole userGroups array with only the edited group changed", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await runAction(context, EDIT_ROLE_ACTION, EnshroudedGroup.Friend, {
			canAccessInventories: true,
			canEditBase: false,
			canEditWorld: true,
			canExtendBase: true,
			canKickBan: false,
		});

		expect(writtenGroups(files)).toEqual([
			{
				...FRIEND,
				canEditBase: false,
				canExtendBase: true,
			},
			ADMIN,
			BUILDERS,
		]);
	});

	it("adds a group the file is missing, with Keen's rights, the edit and a fresh password", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await runAction(context, EDIT_ROLE_ACTION, EnshroudedGroup.Visitor, {
			canEditWorld: true,
		});

		const groups = writtenGroups(files);
		const visitor = groups.at(-1);

		expect(groups).toHaveLength(4);
		expect(visitor).toMatchObject({
			canEditWorld: true,
			canKickBan: false,
			name: "Visitor",
			reservedSlots: 0,
		});
		expect(visitor.password.length).toBeGreaterThan(0);
	});

	it("reserves slots for a group within 0 to 16", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});

		await runAction(context, RESERVE_SLOTS_ACTION, EnshroudedGroup.Admin, {
			reservedSlots: 2,
		});

		expect(writtenGroups(files)[1]).toEqual({
			...ADMIN,
			reservedSlots: 2,
		});
		await expect(
			runAction(context, RESERVE_SLOTS_ACTION, EnshroudedGroup.Admin, {
				reservedSlots: 17,
			}),
		).rejects.toThrow(BridgeUserError);
		await expect(
			runAction(context, RESERVE_SLOTS_ACTION, EnshroudedGroup.Admin, {
				reservedSlots: 1.5,
			}),
		).rejects.toThrow(BridgeUserError);
	});

	it("refuses a right that is neither on nor off", async () => {
		const { context } = memoryContext({
			files: configFiles(),
		});

		await expect(
			runAction(context, EDIT_ROLE_ACTION, EnshroudedGroup.Guest, {
				canKickBan: "sometimes",
			}),
		).rejects.toThrow(BridgeUserError);
	});

	it("leaves the file as it was when the edit changes nothing", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
		});
		const before = files.get(CONFIG_FILE);

		await runAction(context, EDIT_ROLE_ACTION, EnshroudedGroup.Admin, {
			canKickBan: true,
		});

		expect(files.get(CONFIG_FILE)).toBe(before);
	});

	it("parks the whole array for the next start while the server runs and writes no file", async () => {
		const { context, files } = memoryContext({
			files: configFiles(),
			running: true,
		});
		const before = files.get(CONFIG_FILE);

		await runAction(context, EDIT_ROLE_ACTION, EnshroudedGroup.Friend, {
			canKickBan: true,
		});
		await runAction(context, RESERVE_SLOTS_ACTION, EnshroudedGroup.Admin, {
			reservedSlots: 3,
		});

		const stamp = await readEnshroudedStamp(context);

		expect(files.get(CONFIG_FILE)).toBe(before);
		expect(stamp.settingsPending.userGroups).toEqual([
			{
				...FRIEND,
				canKickBan: true,
			},
			{
				...ADMIN,
				reservedSlots: 3,
			},
			BUILDERS,
		]);
		expect(JSON.stringify(stamp.settingsBaseline)).not.toContain("Secret1");
		expect((await roles.list(context))[1]).toMatchObject({
			canKickBan: {
				en: "Allowed",
			},
		});
	});
});

describe("the roles section", () => {
	it("is a table on the players page with the group, five rights and the reserved slots", () => {
		expect(rolesSection).toMatchObject({
			id: "roles",
			layout: BridgeLayout.Table,
			module: "roles",
			place: BridgePlace.Players,
		});

		if (rolesSection.layout !== BridgeLayout.Table) {
			throw new Error("roles is not a table");
		}

		expect(rolesSection.columns.map((column) => column.key)).toEqual([
			"name",
			"canKickBan",
			"canAccessInventories",
			"canEditWorld",
			"canEditBase",
			"canExtendBase",
			"reservedSlots",
		]);
		expect(rolesSection.actions?.map((action) => action.id)).toEqual([
			EDIT_ROLE_ACTION,
			RESERVE_SLOTS_ACTION,
		]);
	});

	it("keeps each row action within the bridge's field limit", () => {
		if (rolesSection.layout !== BridgeLayout.Table) {
			throw new Error("roles is not a table");
		}

		for (const action of rolesSection.actions ?? []) {
			expect(action.fields?.length ?? 0).toBeLessThanOrEqual(BRIDGE_ACTION_FIELDS_LIMIT);
		}
	});

	it("says a change waits for the restart and that kick and ban happen in the game's Social tab", () => {
		expect(rolesSection.help?.en).toContain("next restart");
		expect(rolesSection.help?.en).toContain("Social tab");
		expect(rolesSection.help?.ar).toContain("Social");
	});
});
