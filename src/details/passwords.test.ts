import { describe, expect, it } from "bun:test";
import { BridgeAccess, BridgeDetailFormat, BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { CONFIG_FILE } from "../shared";
import { EMPTY_STAMP, memoryContext } from "../testing";
import { joinPasswordsSection, PASSWORDS_PENDING, passwords } from "./passwords";

const GROUPS = [
	{
		canKickBan: true,
		name: "Admin",
		password: "admin-secret",
	},
	{
		canKickBan: false,
		name: "Friend",
		password: "friend-secret",
	},
	{
		name: "Guest",
		password: "guest-secret",
	},
	{
		name: "Visitor",
		password: "visitor-secret",
	},
];

const CONFIG = JSON.stringify({
	name: "Embervale",
	userGroups: GROUPS,
});

describe("the passwords card", () => {
	it("shows the four group passwords from the config file as secrets", async () => {
		const { context, logged } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
			},
		});

		const detail = await passwords.read(context);

		expect(detail?.stats).toEqual([
			{
				format: BridgeDetailFormat.Secret,
				key: "adminPassword",
				label: {
					ar: "كلمة مرور أدمن",
					en: "Admin password",
				},
				value: "admin-secret",
			},
			{
				format: BridgeDetailFormat.Secret,
				key: "friendPassword",
				label: {
					ar: "كلمة مرور صديق",
					en: "Friend password",
				},
				value: "friend-secret",
			},
			{
				format: BridgeDetailFormat.Secret,
				key: "guestPassword",
				label: {
					ar: "كلمة مرور ضيف",
					en: "Guest password",
				},
				value: "guest-secret",
			},
			{
				format: BridgeDetailFormat.Secret,
				key: "visitorPassword",
				label: {
					ar: "كلمة مرور زائر",
					en: "Visitor password",
				},
				value: "visitor-secret",
			},
		]);
		expect(detail?.badges).toEqual([]);
		expect(JSON.stringify(logged)).not.toContain("secret");
	});

	it("shows a dash for a group the file does not hold or that has no password", async () => {
		const { context } = memoryContext({
			files: {
				[CONFIG_FILE]: JSON.stringify({
					userGroups: [
						{
							name: "Admin",
							password: "",
						},
					],
				}),
			},
		});

		const stats = (await passwords.read(context))?.stats ?? [];

		expect(stats.map((stat) => stat.value)).toEqual([
			"—",
			"—",
			"—",
			"—",
		]);
		expect(stats.every((stat) => stat.format === BridgeDetailFormat.Text)).toBe(true);
	});

	it("keeps showing the passwords that work now while new ones wait for the restart", async () => {
		const { context } = memoryContext({
			files: {
				[CONFIG_FILE]: CONFIG,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					...EMPTY_STAMP,
					settingsPending: {
						userGroups: GROUPS.map((group) =>
							group.name === "Friend"
								? {
										...group,
										password: "new-friend-secret",
									}
								: group,
						),
					},
				}),
			},
			running: true,
		});

		const detail = await passwords.read(context);

		expect(detail?.stats.find((stat) => stat.key === "friendPassword")?.value).toBe("friend-secret");
		expect(detail?.badges).toEqual([
			PASSWORDS_PENDING,
		]);
	});

	it("sits on the overview only for those who may invoke the panel", () => {
		expect(joinPasswordsSection).toEqual(
			expect.objectContaining({
				access: BridgeAccess.Invoke,
				layout: BridgeLayout.Detail,
				module: "passwords",
				place: BridgePlace.Overview,
				related: expect.objectContaining({
					tab: "settings",
				}),
			}),
		);
	});
});
