import type { Bridge } from "@serverkgg/bridge";
import { SLOT_COUNT_MAX } from "./enshroudedApp";
import {
	configValues,
	EnshroudedGroup,
	type EnshroudedGroupPermissions,
	type EnshroudedJsonObject,
	type EnshroudedUserGroup,
	groupPassword,
	SEEDED_GROUPS,
} from "./enshroudedConfig";

export enum EnshroudedPermission {
	KickBan = "canKickBan",
	AccessInventories = "canAccessInventories",
	EditWorld = "canEditWorld",
	EditBase = "canEditBase",
	ExtendBase = "canExtendBase",
}

export interface GroupPatch {
	password?: string;
	canKickBan?: boolean;
	canAccessInventories?: boolean;
	canEditWorld?: boolean;
	canEditBase?: boolean;
	canExtendBase?: boolean;
	reservedSlots?: number;
}

export const GROUP_ORDER: readonly EnshroudedGroup[] = Object.values(EnshroudedGroup);

export const PERMISSION_ORDER: readonly EnshroudedPermission[] = Object.values(EnshroudedPermission);

export const RESERVED_SLOTS_KEY = "reservedSlots";

export const RESERVED_SLOTS_MIN = 0;

export const RESERVED_SLOTS_MAX = SLOT_COUNT_MAX;

export const GROUP_LABELS: Readonly<Record<EnshroudedGroup, Bridge.Text>> = {
	[EnshroudedGroup.Admin]: {
		ar: "أدمن",
		en: "Admin",
	},
	[EnshroudedGroup.Friend]: {
		ar: "صديق",
		en: "Friend",
	},
	[EnshroudedGroup.Guest]: {
		ar: "ضيف",
		en: "Guest",
	},
	[EnshroudedGroup.Visitor]: {
		ar: "زائر",
		en: "Visitor",
	},
};

export const PERMISSION_LABELS: Readonly<Record<EnshroudedPermission, Bridge.Text>> = {
	[EnshroudedPermission.KickBan]: {
		ar: "الطرد والحظر",
		en: "Kick and ban",
	},
	[EnshroudedPermission.AccessInventories]: {
		ar: "الوصول إلى الحقائب",
		en: "Access inventories",
	},
	[EnshroudedPermission.EditWorld]: {
		ar: "تعديل الماب",
		en: "Edit world",
	},
	[EnshroudedPermission.EditBase]: {
		ar: "تعديل القاعدة",
		en: "Edit base",
	},
	[EnshroudedPermission.ExtendBase]: {
		ar: "توسيع القاعدة",
		en: "Extend base",
	},
};

export const RESERVED_SLOTS_LABEL: Bridge.Text = {
	ar: "الخانات المحجوزة",
	en: "Reserved slots",
};

export const groupEntryOf = (
	groups: readonly EnshroudedUserGroup[],
	group: EnshroudedGroup,
): EnshroudedUserGroup | null => {
	return groups.find((entry) => entry.name === group) ?? null;
};

export const permissionsOf = (
	groups: readonly EnshroudedUserGroup[],
	group: EnshroudedGroup,
): EnshroudedGroupPermissions => {
	const entry = groupEntryOf(groups, group);
	const seeded = SEEDED_GROUPS[group];

	return {
		canAccessInventories: entry?.canAccessInventories ?? seeded.canAccessInventories,
		canEditBase: entry?.canEditBase ?? seeded.canEditBase,
		canEditWorld: entry?.canEditWorld ?? seeded.canEditWorld,
		canExtendBase: entry?.canExtendBase ?? seeded.canExtendBase,
		canKickBan: entry?.canKickBan ?? seeded.canKickBan,
		reservedSlots: entry?.reservedSlots ?? seeded.reservedSlots,
	};
};

export const withGroup = (
	groups: readonly EnshroudedUserGroup[],
	group: EnshroudedGroup,
	patch: GroupPatch,
): EnshroudedUserGroup[] => {
	const index = groups.findIndex((entry) => entry.name === group);

	if (index < 0) {
		return [
			...groups,
			{
				name: group,
				password: groupPassword(),
				...SEEDED_GROUPS[group],
				...patch,
			},
		];
	}

	return groups.map((entry, at) => {
		return at === index
			? {
					...entry,
					...patch,
				}
			: entry;
	});
};

export const userGroupsPatchOf = (groups: readonly EnshroudedUserGroup[]): EnshroudedJsonObject => {
	return configValues({
		userGroups: [
			...groups,
		],
	});
};
