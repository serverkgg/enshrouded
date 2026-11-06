import { type Bridge, BridgeConfirm, BridgeControl, BridgeKind, BridgeLayout, BridgePlace } from "@serverkgg/bridge";
import { booleanWriteOf, numberWriteOf } from "../settings";
import {
	type EnshroudedGroup,
	EnshroudedPermission,
	type EnshroudedUserGroup,
	editableServerConfig,
	effectiveServerConfig,
	GROUP_LABELS,
	GROUP_ORDER,
	type GroupPatch,
	PERMISSION_LABELS,
	PERMISSION_ORDER,
	patchServerConfig,
	permissionsOf,
	RESERVED_SLOTS_KEY,
	RESERVED_SLOTS_LABEL,
	RESERVED_SLOTS_MAX,
	RESERVED_SLOTS_MIN,
	userGroupsPatchOf,
	withGroup,
} from "../shared";

export const ROLES_MODULE = "roles";

export const ROLES_SECTION_ID = "roles";

export const EDIT_ROLE_ACTION = "edit";

export const RESERVE_SLOTS_ACTION = "slots";

export interface RoleRow extends Bridge.Row {
	id: string;
	name: Bridge.Text;
	canKickBan: Bridge.Text;
	canAccessInventories: Bridge.Text;
	canEditWorld: Bridge.Text;
	canEditBase: Bridge.Text;
	canExtendBase: Bridge.Text;
	reservedSlots: number;
}

const ALLOWED: Bridge.Text = {
	ar: "مسموح",
	en: "Allowed",
};

const NOT_ALLOWED: Bridge.Text = {
	ar: "غير مسموح",
	en: "Not allowed",
};

const RESERVED_SLOTS_RANGE = {
	integer: true,
	max: RESERVED_SLOTS_MAX,
	min: RESERVED_SLOTS_MIN,
};

const allowedOf = (allowed: boolean): Bridge.Text => {
	return allowed ? ALLOWED : NOT_ALLOWED;
};

export const roleRowOf = (groups: readonly EnshroudedUserGroup[], group: EnshroudedGroup): RoleRow => {
	const permissions = permissionsOf(groups, group);

	return {
		canAccessInventories: allowedOf(permissions.canAccessInventories),
		canEditBase: allowedOf(permissions.canEditBase),
		canEditWorld: allowedOf(permissions.canEditWorld),
		canExtendBase: allowedOf(permissions.canExtendBase),
		canKickBan: allowedOf(permissions.canKickBan),
		id: group,
		name: GROUP_LABELS[group],
		reservedSlots: permissions.reservedSlots,
	};
};

const groupOfRow = (row: Bridge.Row): EnshroudedGroup => {
	const group = GROUP_ORDER.find((entry) => entry === row.id);

	if (group === undefined) {
		throw new Error(`role row ${row.id} names no enshrouded group`);
	}

	return group;
};

const currentGroups = async (context: Bridge.Context): Promise<EnshroudedUserGroup[]> => {
	return (await editableServerConfig(context)).userGroups ?? [];
};

const writeGroup = async (
	context: Bridge.Context,
	groups: readonly EnshroudedUserGroup[],
	group: EnshroudedGroup,
	patch: GroupPatch,
) => {
	if (Object.keys(patch).length === 0) {
		return;
	}

	await patchServerConfig(context, userGroupsPatchOf(withGroup(groups, group, patch)));
};

export const roles: Bridge.Collection = {
	actions: {
		async [EDIT_ROLE_ACTION](context, row, args) {
			const group = groupOfRow(row);
			const groups = await currentGroups(context);
			const current = permissionsOf(groups, group);
			const patch: GroupPatch = {};

			for (const permission of PERMISSION_ORDER) {
				if (!Object.hasOwn(args, permission)) {
					continue;
				}

				const allowed = booleanWriteOf(PERMISSION_LABELS[permission], args[permission]);

				if (allowed !== current[permission]) {
					patch[permission] = allowed;
				}
			}

			await writeGroup(context, groups, group, patch);
		},

		async [RESERVE_SLOTS_ACTION](context, row, args) {
			const group = groupOfRow(row);
			const groups = await currentGroups(context);
			const slots = numberWriteOf(RESERVED_SLOTS_LABEL, RESERVED_SLOTS_RANGE, args[RESERVED_SLOTS_KEY]);
			const patch: GroupPatch =
				slots === permissionsOf(groups, group).reservedSlots
					? {}
					: {
							reservedSlots: slots,
						};

			await writeGroup(context, groups, group, patch);
		},
	},
	kind: BridgeKind.Collection,
	requiresRunning: false,
	async list(context) {
		const groups = (await effectiveServerConfig(context)).userGroups ?? [];

		return GROUP_ORDER.map((group) => roleRowOf(groups, group));
	},
};

const PERMISSION_HELP: Partial<Record<EnshroudedPermission, Bridge.Text>> = {
	[EnshroudedPermission.EditWorld]: {
		ar: "الحفر والبناء والتفاعل في الماب خارج القواعد.",
		en: "Dig, build and interact in the world outside bases.",
	},
	[EnshroudedPermission.KickBan]: {
		ar: "يطرد اللاعب غيره ويحظره من تبويب Social داخل اللعبة.",
		en: "The player kicks and bans others from the game's Social tab.",
	},
};

export const rolesSection: Bridge.Section = {
	actions: [
		{
			confirm: BridgeConfirm.Normal,
			confirmText: {
				ar: "فعّل كل صلاحية تريدها لهذه الرتبة، وأي صلاحية تتركها موقوفة تُسحب منها. وإذا كان السيرفر شغّالًا تُطبَّق بعد الريستارت القادم.",
				en: "Turn on every right this role should have. Any right you leave off is taken away. If the server is running, the change applies after the next restart.",
			},
			fields: PERMISSION_ORDER.map((permission): Bridge.Field => {
				return {
					control: BridgeControl.Boolean,
					help: PERMISSION_HELP[permission],
					key: permission,
					label: PERMISSION_LABELS[permission],
				};
			}),
			id: EDIT_ROLE_ACTION,
			label: {
				ar: "حدد الصلاحيات",
				en: "Set rights",
			},
		},
		{
			confirm: BridgeConfirm.Normal,
			fields: [
				{
					control: BridgeControl.Number,
					help: {
						ar: `خانات تبقى فارغة لهذه الرتبة، فإذا امتلأ الباقي رأى لاعبو الرتب الأخرى السيرفر ممتلئًا. من ${RESERVED_SLOTS_MIN} إلى ${RESERVED_SLOTS_MAX}.`,
						en: `Slots kept free for this role. Once the rest fill up, players of other roles see the server as full. ${RESERVED_SLOTS_MIN} to ${RESERVED_SLOTS_MAX}.`,
					},
					key: RESERVED_SLOTS_KEY,
					label: RESERVED_SLOTS_LABEL,
					max: RESERVED_SLOTS_MAX,
					min: RESERVED_SLOTS_MIN,
					step: 1,
				},
			],
			id: RESERVE_SLOTS_ACTION,
			label: {
				ar: "احجز خانات",
				en: "Reserve slots",
			},
		},
	],
	columns: [
		{
			key: "name",
			label: {
				ar: "الرتبة",
				en: "Role",
			},
		},
		...PERMISSION_ORDER.map((permission) => {
			return {
				key: permission,
				label: PERMISSION_LABELS[permission],
			};
		}),
		{
			key: RESERVED_SLOTS_KEY,
			label: RESERVED_SLOTS_LABEL,
		},
	],
	help: {
		ar: "يدخل كل لاعب بصلاحيات الرتبة التي كتب كلمة مرورها. وإذا كان السيرفر شغّالًا يُطبَّق التعديل بعد الريستارت القادم، والطرد والحظر يتمان من تبويب Social داخل اللعبة على يد لاعب تسمح رتبته بذلك.",
		en: "Each player joins with the rights of the role whose password they typed. While the server runs, a change applies after the next restart, and kicking and banning happen in the game's Social tab, by a player whose role can kick and ban.",
	},
	id: ROLES_SECTION_ID,
	layout: BridgeLayout.Table,
	module: ROLES_MODULE,
	place: BridgePlace.Players,
	title: {
		ar: "الرتب",
		en: "Roles",
	},
};
