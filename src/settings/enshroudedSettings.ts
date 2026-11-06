import {
	type Bridge,
	BridgeConfirm,
	BridgeControl,
	BridgeFormTarget,
	BridgeLayout,
	BridgeUserError,
} from "@serverkgg/bridge";
import {
	DEFAULT_SERVER_NAME,
	EnshroudedGroup,
	EnshroudedPreset,
	type EnshroudedServerConfig,
	EnshroudedVoiceChatMode,
	GROUP_ORDER,
	groupEntryOf,
	minutesToNanoseconds,
	nanosecondsToMinutes,
	SLOT_COUNT_DEFAULT,
	SLOT_COUNT_MAX,
	SLOT_COUNT_MIN,
} from "../shared";

export enum SettingKind {
	Boolean = "boolean",
	Number = "number",
	Select = "select",
}

export enum EnshroudedTag {
	LookingForPlayers = "LookingForPlayers",
	BaseBuilding = "BaseBuilding",
	Exploration = "Exploration",
	Roleplay = "Roleplay",
	English = "English",
	German = "German",
	French = "French",
	Italian = "Italian",
	Japanese = "Japanese",
	Korean = "Korean",
	Polish = "Polish",
	Portuguese = "Portuguese",
	Russian = "Russian",
	Spanish = "Spanish",
	Thai = "Thai",
	Turkish = "Turkish",
	Ukrainian = "Ukrainian",
	Chinese = "Chinese",
	Taiwanese = "Taiwanese",
}

export enum EnshroudedTombstoneMode {
	AddBackpackMaterials = "AddBackpackMaterials",
	Everything = "Everything",
	NoTombstone = "NoTombstone",
}

export enum EnshroudedWeatherFrequency {
	Disabled = "Disabled",
	Rare = "Rare",
	Normal = "Normal",
	Often = "Often",
}

export enum EnshroudedFishingDifficulty {
	VeryEasy = "VeryEasy",
	Easy = "Easy",
	Normal = "Normal",
	Hard = "Hard",
	VeryHard = "VeryHard",
}

export enum EnshroudedCurseModifier {
	Easy = "Easy",
	Normal = "Normal",
	Hard = "Hard",
}

export enum EnshroudedEnemyAmount {
	Few = "Few",
	Normal = "Normal",
	Many = "Many",
	Extreme = "Extreme",
	Automatic = "Automatic",
}

export enum EnshroudedTamingRepercussion {
	KeepProgress = "KeepProgress",
	LoseSomeProgress = "LoseSomeProgress",
	LoseAllProgress = "LoseAllProgress",
}

interface SettingSpecBase {
	key: string;
	fileKey: string;
	label: Bridge.Text;
	help?: Bridge.Text;
}

export interface BooleanSettingSpec extends SettingSpecBase {
	kind: SettingKind.Boolean;
	fallback: boolean;
}

export interface NumberSettingSpec extends SettingSpecBase {
	kind: SettingKind.Number;
	fallback: number;
	min: number;
	max: number;
	step: number;
	integer: boolean;
	nanoseconds: boolean;
}

export interface SelectSettingSpec extends SettingSpecBase {
	kind: SettingKind.Select;
	fallback: string;
	options: readonly Bridge.Option[];
}

export type EnshroudedSettingSpec = BooleanSettingSpec | NumberSettingSpec | SelectSettingSpec;

export interface NumberRange {
	min: number;
	max: number;
	integer: boolean;
}

export interface SettingWrite {
	shown: boolean | number | string;
	stored: boolean | number | string;
}

export interface DifficultyGroup {
	id: string;
	title: Bridge.Text;
	help: Bridge.Text;
	settings: readonly EnshroudedSettingSpec[];
}

interface LabelledSpec {
	key: string;
	label: Bridge.Text;
	help?: Bridge.Text;
}

interface ToggleSpec extends LabelledSpec {
	fallback: boolean;
}

interface ChoiceSpec extends LabelledSpec {
	fallback: string;
	options: readonly Bridge.Option[];
}

interface FactorSpec extends LabelledSpec {
	min: number;
	max: number;
	fallback?: number;
}

interface MinutesSpec extends LabelledSpec {
	fileKey: string;
	min: number;
	max: number;
	fallback: number;
}

export const SETTINGS_MODULE = "settings";

export const SETTINGS_TAB_ID = "settings";

export const SETTINGS_TITLE: Bridge.Text = {
	ar: "الإعدادات",
	en: "Settings",
};

export const SERVER_SECTION_ID = "server";

export const CHAT_SECTION_ID = "chat";

export const DIFFICULTY_SECTION_ID = "difficulty";

export const PASSWORDS_SECTION_ID = "passwords";

export const NAME_KEY = "name";

export const SLOT_COUNT_KEY = "slotCount";

export const TAGS_KEY = "tags";

export const VOICE_CHAT_KEY = "enableVoiceChat";

export const VOICE_CHAT_MODE_KEY = "voiceChatMode";

export const TEXT_CHAT_KEY = "enableTextChat";

export const PRESET_KEY = "gameSettingsPreset";

export const TAG_KEY_PREFIX = "tag";

export const SERVER_NAME_MAX_LENGTH = 64;

export const PASSWORD_MAX_LENGTH = 64;

export const TEXT_PATTERN = "^[^\\u0000-\\u001f\\u007f]*$";

export const FACTOR_STEP = 0.05;

export const FACTOR_FALLBACK = 1;

export const MINUTE_STEP = 1;

const FIRST_PRINTABLE_CODE = 32;

const DELETE_CODE = 127;

const TRUE_TEXT = "true";

const FALSE_TEXT = "false";

const ONE_LINE_HINT: Bridge.Text = {
	ar: "اكتبه في سطر واحد دون رموز مخفية.",
	en: "Write it on one line, with no hidden characters.",
};

const CONTROL_CHARACTER: Bridge.Text = {
	ar: "يحتوي النص على رموز لا يقبلها إنشراودد، احذفها وجرب مرة ثانية.",
	en: "The text has characters Enshrouded can't take. Remove them and try again.",
};

const SERVER_NAME_EMPTY: Bridge.Text = {
	ar: "اسم السيرفر فارغ، اكتب اسمًا وجرب مرة ثانية.",
	en: "The server name is empty. Write a name and try again.",
};

const SERVER_NAME_TOO_LONG: Bridge.Text = {
	ar: `اسم السيرفر أطول من ${SERVER_NAME_MAX_LENGTH} حرفًا، اختصره وجرب مرة ثانية.`,
	en: `The server name is longer than ${SERVER_NAME_MAX_LENGTH} characters. Shorten it and try again.`,
};

const CUSTOM_ONLY: Bridge.Text = {
	ar: "وتُطبَّق فقط عندما تكون الصعوبة «مخصص».",
	en: "They apply only while the difficulty preset is Custom.",
};

export const unknownSetting = (key: string): Bridge.Text => {
	return {
		ar: `${key} ليس إعدادًا يمكن تغييره من اللوحة.`,
		en: `${key} isn't a setting the panel can change.`,
	};
};

const notOnOrOff = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `«${label.ar}» إما مفعّل أو موقوف، ولا يوجد خيار ثالث.`,
		en: `${label.en} is either on or off, nothing else.`,
	};
};

const needsNumber = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `«${label.ar}» يتطلب رقمًا.`,
		en: `${label.en} needs a number.`,
	};
};

const outOfRange = (label: Bridge.Text, range: NumberRange): Bridge.Text => {
	if (range.integer) {
		return {
			ar: `«${label.ar}» يلزم أن يكون رقمًا صحيحًا من ${range.min} إلى ${range.max}.`,
			en: `${label.en} must be a whole number from ${range.min} to ${range.max}.`,
		};
	}

	return {
		ar: `«${label.ar}» يلزم أن يكون من ${range.min} إلى ${range.max}.`,
		en: `${label.en} must be from ${range.min} to ${range.max}.`,
	};
};

const notAnOption = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `اختر «${label.ar}» من القائمة.`,
		en: `Pick ${label.en} from the list.`,
	};
};

const passwordEmpty = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `«${label.ar}» فارغة، وبدونها يدخل أي لاعب بصلاحيات الرتبة. اكتب كلمة مرور وجرب مرة ثانية.`,
		en: `${label.en} is empty, and without one anyone can join with that role's rights. Write a password and try again.`,
	};
};

const passwordTooLong = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `«${label.ar}» أطول من ${PASSWORD_MAX_LENGTH} حرفًا، اختصرها وجرب مرة ثانية.`,
		en: `${label.en} is longer than ${PASSWORD_MAX_LENGTH} characters. Shorten it and try again.`,
	};
};

export const passwordTaken = (label: Bridge.Text): Bridge.Text => {
	return {
		ar: `«${label.ar}» مطابقة لكلمة مرور رتبة أخرى، واللعبة تحدد رتبة اللاعب بكلمة المرور. اختر كلمة مرور مختلفة.`,
		en: `${label.en} matches another role's password, and the game picks a player's role by password. Choose a different one.`,
	};
};

const rangeHelpOf = (spec: FactorSpec | MinutesSpec, fallback: number, minutes: boolean): Bridge.Text => {
	const range: Bridge.Text = minutes
		? {
				ar: `بالدقائق، من ${spec.min} إلى ${spec.max}، والافتراضي ${fallback}.`,
				en: `In minutes, ${spec.min} to ${spec.max}, default ${fallback}.`,
			}
		: {
				ar: `من ${spec.min} إلى ${spec.max}، والافتراضي ${fallback}.`,
				en: `${spec.min} to ${spec.max}, default ${fallback}.`,
			};

	if (spec.help === undefined) {
		return range;
	}

	return {
		ar: `${spec.help.ar} ${range.ar}`,
		en: `${spec.help.en} ${range.en}`,
	};
};

const toggle = (spec: ToggleSpec): BooleanSettingSpec => {
	return {
		fallback: spec.fallback,
		fileKey: spec.key,
		help: spec.help,
		key: spec.key,
		kind: SettingKind.Boolean,
		label: spec.label,
	};
};

const choice = (spec: ChoiceSpec): SelectSettingSpec => {
	return {
		fallback: spec.fallback,
		fileKey: spec.key,
		help: spec.help,
		key: spec.key,
		kind: SettingKind.Select,
		label: spec.label,
		options: spec.options,
	};
};

const factor = (spec: FactorSpec): NumberSettingSpec => {
	const fallback = spec.fallback ?? FACTOR_FALLBACK;

	return {
		fallback,
		fileKey: spec.key,
		help: rangeHelpOf(spec, fallback, false),
		integer: false,
		key: spec.key,
		kind: SettingKind.Number,
		label: spec.label,
		max: spec.max,
		min: spec.min,
		nanoseconds: false,
		step: FACTOR_STEP,
	};
};

const level = (spec: FactorSpec): NumberSettingSpec => {
	const fallback = spec.fallback ?? spec.min;

	return {
		fallback,
		fileKey: spec.key,
		help: rangeHelpOf(spec, fallback, false),
		integer: true,
		key: spec.key,
		kind: SettingKind.Number,
		label: spec.label,
		max: spec.max,
		min: spec.min,
		nanoseconds: false,
		step: 1,
	};
};

const minutes = (spec: MinutesSpec): NumberSettingSpec => {
	return {
		fallback: spec.fallback,
		fileKey: spec.fileKey,
		help: rangeHelpOf(spec, spec.fallback, true),
		integer: false,
		key: spec.key,
		kind: SettingKind.Number,
		label: spec.label,
		max: spec.max,
		min: spec.min,
		nanoseconds: true,
		step: MINUTE_STEP,
	};
};

const optionsOf = (labels: Readonly<Record<string, Bridge.Text>>): Bridge.Option[] => {
	return Object.entries(labels).map(([value, label]) => {
		return {
			label,
			value,
		};
	});
};

export const TAG_LABELS: Readonly<Record<EnshroudedTag, Bridge.Text>> = {
	[EnshroudedTag.LookingForPlayers]: {
		ar: "نبحث عن لاعبين",
		en: "Looking for players",
	},
	[EnshroudedTag.BaseBuilding]: {
		ar: "بناء القواعد",
		en: "Base building",
	},
	[EnshroudedTag.Exploration]: {
		ar: "الاستكشاف",
		en: "Exploration",
	},
	[EnshroudedTag.Roleplay]: {
		ar: "لعب الأدوار",
		en: "Roleplay",
	},
	[EnshroudedTag.English]: {
		ar: "الإنجليزية",
		en: "English",
	},
	[EnshroudedTag.German]: {
		ar: "الألمانية",
		en: "German",
	},
	[EnshroudedTag.French]: {
		ar: "الفرنسية",
		en: "French",
	},
	[EnshroudedTag.Italian]: {
		ar: "الإيطالية",
		en: "Italian",
	},
	[EnshroudedTag.Japanese]: {
		ar: "اليابانية",
		en: "Japanese",
	},
	[EnshroudedTag.Korean]: {
		ar: "الكورية",
		en: "Korean",
	},
	[EnshroudedTag.Polish]: {
		ar: "البولندية",
		en: "Polish",
	},
	[EnshroudedTag.Portuguese]: {
		ar: "البرتغالية",
		en: "Portuguese",
	},
	[EnshroudedTag.Russian]: {
		ar: "الروسية",
		en: "Russian",
	},
	[EnshroudedTag.Spanish]: {
		ar: "الإسبانية",
		en: "Spanish",
	},
	[EnshroudedTag.Thai]: {
		ar: "التايلاندية",
		en: "Thai",
	},
	[EnshroudedTag.Turkish]: {
		ar: "التركية",
		en: "Turkish",
	},
	[EnshroudedTag.Ukrainian]: {
		ar: "الأوكرانية",
		en: "Ukrainian",
	},
	[EnshroudedTag.Chinese]: {
		ar: "الصينية",
		en: "Chinese",
	},
	[EnshroudedTag.Taiwanese]: {
		ar: "التايوانية",
		en: "Taiwanese",
	},
};

const TAG_HELP: Partial<Record<EnshroudedTag, Bridge.Text>> = {
	[EnshroudedTag.LookingForPlayers]: {
		ar: "يظهر سيرفرك لمن يبحث عن سيرفر ينضم إليه.",
		en: "Your server shows up for players looking for a server to join.",
	},
	[EnshroudedTag.English]: {
		ar: "فعّل كل لغة يتحدث بها لاعبوك، ولا يوجد في اللعبة وسم للعربية.",
		en: "Turn on each language your players speak. The game has no Arabic tag.",
	},
};

export const TAG_ORDER: readonly EnshroudedTag[] = Object.values(EnshroudedTag);

export const tagFieldKeyOf = (tag: EnshroudedTag) => {
	return `${TAG_KEY_PREFIX}${tag}`;
};

export const TAG_BY_FIELD_KEY: ReadonlyMap<string, EnshroudedTag> = new Map(
	TAG_ORDER.map((tag) => [
		tagFieldKeyOf(tag),
		tag,
	]),
);

export const PRESET_LABELS: Readonly<Record<EnshroudedPreset, Bridge.Text>> = {
	[EnshroudedPreset.Default]: {
		ar: "افتراضي",
		en: "Default",
	},
	[EnshroudedPreset.Relaxed]: {
		ar: "مريح",
		en: "Relaxed",
	},
	[EnshroudedPreset.Hard]: {
		ar: "صعب",
		en: "Hard",
	},
	[EnshroudedPreset.Survival]: {
		ar: "نجاة",
		en: "Survival",
	},
	[EnshroudedPreset.Custom]: {
		ar: "مخصص",
		en: "Custom",
	},
};

const PRESET_HELP: Readonly<Record<EnshroudedPreset, Bridge.Text>> = {
	[EnshroudedPreset.Default]: {
		ar: "قيم اللعبة الأصلية.",
		en: "The game's standard values.",
	},
	[EnshroudedPreset.Relaxed]: {
		ar: "أعداء أقل، وموارد وغنائم أكثر، لمن يحب البناء.",
		en: "Fewer enemies, more resources and loot, for builders.",
	},
	[EnshroudedPreset.Hard]: {
		ar: "أعداء أكثر وأشرس.",
		en: "More enemies, and more aggressive ones.",
	},
	[EnshroudedPreset.Survival]: {
		ar: "أعداء أشرس، مع الجوع وتحديات النجاة.",
		en: "Aggressive enemies, plus hunger and other survival rules.",
	},
	[EnshroudedPreset.Custom]: {
		ar: "تُطبَّق القيم التي تختارها في الأقسام التالية.",
		en: "The values you set in the sections below apply.",
	},
};

const VOICE_CHAT_MODE_LABELS: Readonly<Record<EnshroudedVoiceChatMode, Bridge.Text>> = {
	[EnshroudedVoiceChatMode.Proximity]: {
		ar: "حسب القرب (Proximity)",
		en: "Proximity",
	},
	[EnshroudedVoiceChatMode.Global]: {
		ar: "عام (Global)",
		en: "Global",
	},
};

const AMOUNT_LABELS: Readonly<Record<Exclude<EnshroudedEnemyAmount, EnshroudedEnemyAmount.Automatic>, Bridge.Text>> = {
	[EnshroudedEnemyAmount.Few]: {
		ar: "قليل",
		en: "Few",
	},
	[EnshroudedEnemyAmount.Normal]: {
		ar: "عادي",
		en: "Normal",
	},
	[EnshroudedEnemyAmount.Many]: {
		ar: "كثير",
		en: "Many",
	},
	[EnshroudedEnemyAmount.Extreme]: {
		ar: "كثير جدًا",
		en: "Extreme",
	},
};

const SPAWN_AMOUNT_LABELS: Readonly<Record<EnshroudedEnemyAmount, Bridge.Text>> = {
	...AMOUNT_LABELS,
	[EnshroudedEnemyAmount.Automatic]: {
		ar: "تلقائي حسب عدد اللاعبين",
		en: "Automatic, by party size",
	},
};

const TOMBSTONE_LABELS: Readonly<Record<EnshroudedTombstoneMode, Bridge.Text>> = {
	[EnshroudedTombstoneMode.AddBackpackMaterials]: {
		ar: "المواد فقط",
		en: "Materials only",
	},
	[EnshroudedTombstoneMode.Everything]: {
		ar: "كل الحقيبة",
		en: "The whole backpack",
	},
	[EnshroudedTombstoneMode.NoTombstone]: {
		ar: "لا شيء",
		en: "Nothing",
	},
};

const WEATHER_LABELS: Readonly<Record<EnshroudedWeatherFrequency, Bridge.Text>> = {
	[EnshroudedWeatherFrequency.Disabled]: {
		ar: "موقوف",
		en: "Off",
	},
	[EnshroudedWeatherFrequency.Rare]: {
		ar: "نادر",
		en: "Rare",
	},
	[EnshroudedWeatherFrequency.Normal]: {
		ar: "عادي",
		en: "Normal",
	},
	[EnshroudedWeatherFrequency.Often]: {
		ar: "كثير",
		en: "Often",
	},
};

const FISHING_LABELS: Readonly<Record<EnshroudedFishingDifficulty, Bridge.Text>> = {
	[EnshroudedFishingDifficulty.VeryEasy]: {
		ar: "سهل جدًا",
		en: "Very easy",
	},
	[EnshroudedFishingDifficulty.Easy]: {
		ar: "سهل",
		en: "Easy",
	},
	[EnshroudedFishingDifficulty.Normal]: {
		ar: "عادي",
		en: "Normal",
	},
	[EnshroudedFishingDifficulty.Hard]: {
		ar: "صعب",
		en: "Hard",
	},
	[EnshroudedFishingDifficulty.VeryHard]: {
		ar: "صعب جدًا",
		en: "Very hard",
	},
};

const CURSE_LABELS: Readonly<Record<EnshroudedCurseModifier, Bridge.Text>> = {
	[EnshroudedCurseModifier.Easy]: {
		ar: "سهلة، دون لعنة",
		en: "Easy, no curse",
	},
	[EnshroudedCurseModifier.Normal]: {
		ar: "عادية",
		en: "Normal",
	},
	[EnshroudedCurseModifier.Hard]: {
		ar: "صعبة، بفرصة مضاعفة",
		en: "Hard, twice the chance",
	},
};

const TAMING_LABELS: Readonly<Record<EnshroudedTamingRepercussion, Bridge.Text>> = {
	[EnshroudedTamingRepercussion.KeepProgress]: {
		ar: "يبقى التقدم",
		en: "Keep progress",
	},
	[EnshroudedTamingRepercussion.LoseSomeProgress]: {
		ar: "يضيع جزء من التقدم",
		en: "Lose some progress",
	},
	[EnshroudedTamingRepercussion.LoseAllProgress]: {
		ar: "يضيع التقدم كله",
		en: "Lose all progress",
	},
};

export const PASSWORD_KEYS: Readonly<Record<EnshroudedGroup, string>> = {
	[EnshroudedGroup.Admin]: "adminPassword",
	[EnshroudedGroup.Friend]: "friendPassword",
	[EnshroudedGroup.Guest]: "guestPassword",
	[EnshroudedGroup.Visitor]: "visitorPassword",
};

export const PASSWORD_LABELS: Readonly<Record<EnshroudedGroup, Bridge.Text>> = {
	[EnshroudedGroup.Admin]: {
		ar: "كلمة مرور أدمن",
		en: "Admin password",
	},
	[EnshroudedGroup.Friend]: {
		ar: "كلمة مرور صديق",
		en: "Friend password",
	},
	[EnshroudedGroup.Guest]: {
		ar: "كلمة مرور ضيف",
		en: "Guest password",
	},
	[EnshroudedGroup.Visitor]: {
		ar: "كلمة مرور زائر",
		en: "Visitor password",
	},
};

export const GROUP_BY_PASSWORD_KEY: ReadonlyMap<string, EnshroudedGroup> = new Map(
	GROUP_ORDER.map((group) => [
		PASSWORD_KEYS[group],
		group,
	]),
);

export const SERVER_NAME_LABEL: Bridge.Text = {
	ar: "اسم السيرفر",
	en: "Server name",
};

export const SLOT_COUNT_SETTING: NumberSettingSpec = {
	fallback: SLOT_COUNT_DEFAULT,
	fileKey: SLOT_COUNT_KEY,
	help: {
		ar: `أقصى عدد من اللاعبين في السيرفر معًا، من ${SLOT_COUNT_MIN} إلى ${SLOT_COUNT_MAX}.`,
		en: `The most players on the server at once, ${SLOT_COUNT_MIN} to ${SLOT_COUNT_MAX}.`,
	},
	integer: true,
	key: SLOT_COUNT_KEY,
	kind: SettingKind.Number,
	label: {
		ar: "عدد اللاعبين",
		en: "Max players",
	},
	max: SLOT_COUNT_MAX,
	min: SLOT_COUNT_MIN,
	nanoseconds: false,
	step: 1,
};

export const CHAT_SETTINGS: readonly EnshroudedSettingSpec[] = [
	toggle({
		fallback: false,
		key: VOICE_CHAT_KEY,
		label: {
			ar: "الشات الصوتي",
			en: "Voice chat",
		},
	}),
	choice({
		fallback: EnshroudedVoiceChatMode.Proximity,
		help: {
			ar: "من يسمع اللاعب عندما يتكلم.",
			en: "Who hears a player when they talk.",
		},
		key: VOICE_CHAT_MODE_KEY,
		label: {
			ar: "نوع الشات الصوتي",
			en: "Voice chat mode",
		},
		options: optionsOf(VOICE_CHAT_MODE_LABELS),
	}),
	toggle({
		fallback: false,
		key: TEXT_CHAT_KEY,
		label: {
			ar: "الشات الكتابي",
			en: "Text chat",
		},
	}),
];

export const PRESET_SETTING: SelectSettingSpec = choice({
	fallback: EnshroudedPreset.Default,
	help: {
		ar: "الصعوبة الجاهزة تضبط كل القيم بنفسها، والقيم في الأقسام التالية تُطبَّق فقط عند اختيار «مخصص».",
		en: "A named preset sets every value itself, and the values in the sections below apply only with Custom.",
	},
	key: PRESET_KEY,
	label: {
		ar: "الصعوبة",
		en: "Difficulty preset",
	},
	options: Object.values(EnshroudedPreset).map((preset) => {
		return {
			help: PRESET_HELP[preset],
			label: PRESET_LABELS[preset],
			value: preset,
		};
	}),
});

export const CONFIG_SETTINGS: readonly EnshroudedSettingSpec[] = [
	SLOT_COUNT_SETTING,
	...CHAT_SETTINGS,
	PRESET_SETTING,
];

export const PLAYER_SETTINGS: readonly EnshroudedSettingSpec[] = [
	factor({
		key: "playerHealthFactor",
		label: {
			ar: "صحة اللاعب",
			en: "Player health",
		},
		max: 4,
		min: 0.25,
	}),
	factor({
		key: "playerManaFactor",
		label: {
			ar: "مانا اللاعب",
			en: "Player mana",
		},
		max: 4,
		min: 0.25,
	}),
	factor({
		key: "playerStaminaFactor",
		label: {
			ar: "طاقة التحمل",
			en: "Player stamina",
		},
		max: 4,
		min: 0.25,
	}),
	factor({
		help: {
			ar: "كلما زادت، صمد اللاعب أطول في المناطق الباردة.",
			en: "Higher lets players last longer in cold areas.",
		},
		key: "playerBodyHeatFactor",
		label: {
			ar: "حرارة الجسم",
			en: "Body heat",
		},
		max: 2,
		min: 0.5,
	}),
	factor({
		help: {
			ar: "الأكسجين المتاح للاعب تحت الماء.",
			en: "How much air a player has under water.",
		},
		key: "playerDivingTimeFactor",
		label: {
			ar: "مدة الغوص",
			en: "Diving time",
		},
		max: 2,
		min: 0.5,
	}),
	toggle({
		fallback: true,
		help: {
			ar: "عند إيقافه، لا تنكسر الأسلحة.",
			en: "When it's off, weapons never break.",
		},
		key: "enableDurability",
		label: {
			ar: "تلف الأسلحة",
			en: "Weapon durability",
		},
	}),
	toggle({
		fallback: false,
		help: {
			ar: "يخسر اللاعب الجائع من صحته حتى يأكل أو يشرب.",
			en: "A starving player loses health until they eat or drink.",
		},
		key: "enableStarvingDebuff",
		label: {
			ar: "الجوع",
			en: "Hunger and starvation",
		},
	}),
	factor({
		key: "foodBuffDurationFactor",
		label: {
			ar: "مدة مفعول الطعام",
			en: "Food buff duration",
		},
		max: 2,
		min: 0.5,
	}),
	minutes({
		fallback: 10,
		fileKey: "fromHungerToStarving",
		help: {
			ar: "المدة بين جوع اللاعب وبدء خسارته للصحة.",
			en: "How long a player stays hungry before starving starts.",
		},
		key: "hungerToStarvingMinutes",
		label: {
			ar: "مدة الجوع",
			en: "Hunger time",
		},
		max: 20,
		min: 5,
	}),
];

export const SURVIVAL_SETTINGS: readonly EnshroudedSettingSpec[] = [
	factor({
		key: "shroudTimeFactor",
		label: {
			ar: "مدة البقاء في الشراود",
			en: "Time in the Shroud",
		},
		max: 2,
		min: 0.5,
	}),
	choice({
		fallback: EnshroudedTombstoneMode.AddBackpackMaterials,
		help: {
			ar: "ما يخسره اللاعب عند موته يبقى في القبر حتى يستعيده.",
			en: "What a player loses on death waits in a tombstone until they get it back.",
		},
		key: "tombstoneMode",
		label: {
			ar: "ما يُفقد عند الموت",
			en: "Lost on death",
		},
		options: optionsOf(TOMBSTONE_LABELS),
	}),
	toggle({
		fallback: true,
		key: "enableGliderTurbulences",
		label: {
			ar: "تيارات الهواء أثناء الطيران الشراعي",
			en: "Glider turbulence",
		},
	}),
	choice({
		fallback: EnshroudedWeatherFrequency.Normal,
		key: "weatherFrequency",
		label: {
			ar: "تكرار ظواهر الطقس",
			en: "Weather frequency",
		},
		options: optionsOf(WEATHER_LABELS),
	}),
	choice({
		fallback: EnshroudedFishingDifficulty.Normal,
		key: "fishingDifficulty",
		label: {
			ar: "صعوبة الصيد",
			en: "Fishing difficulty",
		},
		options: optionsOf(FISHING_LABELS),
	}),
	choice({
		fallback: EnshroudedCurseModifier.Normal,
		help: {
			ar: "فرصة إصابة اللاعب باللعنة عند هجوم أعداء الشراود.",
			en: "The chance of getting cursed when Shroud enemies attack.",
		},
		key: "curseModifier",
		label: {
			ar: "لعنة الشراود",
			en: "Shroud curse",
		},
		options: optionsOf(CURSE_LABELS),
	}),
];

export const WORLD_SETTINGS: readonly EnshroudedSettingSpec[] = [
	factor({
		help: {
			ar: "كلما زادت، حفر اللاعب أكثر وجمع موارد أكثر مع كل ضربة.",
			en: "Higher digs more and yields more resources per hit.",
		},
		key: "miningDamageFactor",
		label: {
			ar: "قوة التعدين",
			en: "Mining effectiveness",
		},
		max: 2,
		min: 0.5,
	}),
	factor({
		key: "plantGrowthSpeedFactor",
		label: {
			ar: "سرعة نمو النباتات",
			en: "Plant growth speed",
		},
		max: 2,
		min: 0.25,
	}),
	factor({
		help: {
			ar: "كمية المواد في الصناديق وغنائم الأعداء.",
			en: "How much material comes in chests and enemy loot.",
		},
		key: "resourceDropStackAmountFactor",
		label: {
			ar: "كمية الموارد",
			en: "Resource yield",
		},
		max: 2,
		min: 0.25,
	}),
	factor({
		key: "factoryProductionSpeedFactor",
		label: {
			ar: "سرعة محطات العمل",
			en: "Workstation speed",
		},
		max: 2,
		min: 0.25,
	}),
	level({
		fallback: 11,
		help: {
			ar: "مستوى اللهب الذي تبدأ عنده مذابح اللهب بإبعاد الشراود.",
			en: "The Flame level at which Flame Altars start pushing back the Shroud.",
		},
		key: "flameLevelFogRemoval",
		label: {
			ar: "مستوى اللهب لإبعاد الشراود",
			en: "Flame level to clear the Shroud",
		},
		max: 20,
		min: 0,
	}),
];

export const ENEMY_SETTINGS: readonly EnshroudedSettingSpec[] = [
	choice({
		fallback: EnshroudedEnemyAmount.Automatic,
		help: {
			ar: "في الوضع التلقائي يزيد عدد الأعداء مع عدد اللاعبين القريبين.",
			en: "Automatic scales the enemies with the number of players nearby.",
		},
		key: "randomSpawnerAmount",
		label: {
			ar: "عدد الأعداء",
			en: "Enemy amount",
		},
		options: optionsOf(SPAWN_AMOUNT_LABELS),
	}),
	choice({
		fallback: EnshroudedEnemyAmount.Normal,
		key: "aggroPoolAmount",
		label: {
			ar: "الأعداء المهاجمون معًا",
			en: "Enemies attacking at once",
		},
		options: optionsOf(AMOUNT_LABELS),
	}),
	factor({
		key: "enemyDamageFactor",
		label: {
			ar: "ضرر الأعداء",
			en: "Enemy damage",
		},
		max: 5,
		min: 0.25,
	}),
	factor({
		key: "enemyHealthFactor",
		label: {
			ar: "صحة الأعداء",
			en: "Enemy health",
		},
		max: 4,
		min: 0.25,
	}),
	factor({
		help: {
			ar: "كلما زادت، صعب إرباك الأعداء.",
			en: "Higher makes enemies harder to stun.",
		},
		key: "enemyStaminaFactor",
		label: {
			ar: "تحمّل الأعداء",
			en: "Enemy stun resistance",
		},
		max: 2,
		min: 0.5,
	}),
	factor({
		help: {
			ar: "المسافة التي يرى ويسمع منها الأعداء اللاعب.",
			en: "How far enemies see and hear players.",
		},
		key: "enemyPerceptionRangeFactor",
		label: {
			ar: "مدى إدراك الأعداء",
			en: "Enemy perception",
		},
		max: 2,
		min: 0.5,
	}),
	factor({
		key: "bossDamageFactor",
		label: {
			ar: "ضرر الزعماء",
			en: "Boss damage",
		},
		max: 5,
		min: 0.2,
	}),
	factor({
		key: "bossHealthFactor",
		label: {
			ar: "صحة الزعماء",
			en: "Boss health",
		},
		max: 5,
		min: 0.2,
	}),
	factor({
		key: "threatBonus",
		label: {
			ar: "تكرار هجمات الأعداء",
			en: "Enemy attack frequency",
		},
		max: 4,
		min: 0.25,
	}),
	toggle({
		fallback: false,
		help: {
			ar: "لا يهاجم الأعداء حتى يهاجمهم اللاعب، ولا يشمل ذلك الزعماء.",
			en: "Enemies don't attack until a player attacks them. Bosses still do.",
		},
		key: "pacifyAllEnemies",
		label: {
			ar: "أعداء مسالمون",
			en: "Peaceful enemies",
		},
	}),
	choice({
		fallback: EnshroudedTamingRepercussion.LoseSomeProgress,
		help: {
			ar: "ما يحدث لتقدم الترويض عندما يُفزع اللاعب الحيوان.",
			en: "What happens to taming progress when a player startles the animal.",
		},
		key: "tamingStartleRepercussion",
		label: {
			ar: "إفزاع الحيوان أثناء الترويض",
			en: "Startled while taming",
		},
		options: optionsOf(TAMING_LABELS),
	}),
];

export const PROGRESSION_SETTINGS: readonly EnshroudedSettingSpec[] = [
	factor({
		fallback: 0.5,
		key: "perkUpgradeRecyclingFactor",
		label: {
			ar: "الرونات العائدة من تفكيك الأسلحة",
			en: "Runes back from salvaged weapons",
		},
		max: 1,
		min: 0,
	}),
	factor({
		key: "perkCostFactor",
		label: {
			ar: "تكلفة ترقية الأسلحة",
			en: "Weapon upgrade cost",
		},
		max: 2,
		min: 0.25,
	}),
	factor({
		key: "experienceCombatFactor",
		label: {
			ar: "خبرة القتال",
			en: "Combat XP",
		},
		max: 2,
		min: 0.25,
	}),
	factor({
		key: "experienceMiningFactor",
		label: {
			ar: "خبرة التعدين",
			en: "Mining XP",
		},
		max: 2,
		min: 0,
	}),
	factor({
		key: "experienceExplorationQuestsFactor",
		label: {
			ar: "خبرة الاستكشاف والمهام",
			en: "Exploration and quest XP",
		},
		max: 2,
		min: 0.25,
	}),
];

export const TIME_SETTINGS: readonly EnshroudedSettingSpec[] = [
	minutes({
		fallback: 30,
		fileKey: "dayTimeDuration",
		key: "dayTimeMinutes",
		label: {
			ar: "مدة النهار",
			en: "Day length",
		},
		max: 60,
		min: 2,
	}),
	minutes({
		fallback: 12,
		fileKey: "nightTimeDuration",
		key: "nightTimeMinutes",
		label: {
			ar: "مدة الليل",
			en: "Night length",
		},
		max: 60,
		min: 2,
	}),
];

export const DIFFICULTY_GROUPS: readonly DifficultyGroup[] = [
	{
		help: {
			ar: `صحة اللاعب وطاقته وجوعه. ${CUSTOM_ONLY.ar}`,
			en: `Player health, stamina and hunger. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-player",
		settings: PLAYER_SETTINGS,
		title: {
			ar: "اللاعب",
			en: "Player",
		},
	},
	{
		help: {
			ar: `الشراود والموت والطقس والصيد. ${CUSTOM_ONLY.ar}`,
			en: `The Shroud, death, weather and fishing. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-survival",
		settings: SURVIVAL_SETTINGS,
		title: {
			ar: "النجاة",
			en: "Survival",
		},
	},
	{
		help: {
			ar: `التعدين والموارد والزراعة ومحطات العمل. ${CUSTOM_ONLY.ar}`,
			en: `Mining, resources, farming and workstations. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-world",
		settings: WORLD_SETTINGS,
		title: {
			ar: "الماب",
			en: "World",
		},
	},
	{
		help: {
			ar: `عدد الأعداء والزعماء وقوتهم. ${CUSTOM_ONLY.ar}`,
			en: `How many enemies and bosses there are, and how strong. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-enemies",
		settings: ENEMY_SETTINGS,
		title: {
			ar: "الأعداء",
			en: "Enemies",
		},
	},
	{
		help: {
			ar: `الخبرة وترقية الأسلحة. ${CUSTOM_ONLY.ar}`,
			en: `Experience and weapon upgrades. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-progression",
		settings: PROGRESSION_SETTINGS,
		title: {
			ar: "التقدم",
			en: "Progression",
		},
	},
	{
		help: {
			ar: `مدة النهار والليل في الماب. ${CUSTOM_ONLY.ar}`,
			en: `How long day and night last in the world. ${CUSTOM_ONLY.en}`,
		},
		id: "difficulty-time",
		settings: TIME_SETTINGS,
		title: {
			ar: "النهار والليل",
			en: "Day and night",
		},
	},
];

export const GAME_SETTINGS: readonly EnshroudedSettingSpec[] = DIFFICULTY_GROUPS.flatMap((group) => group.settings);

const byKey = (specs: readonly EnshroudedSettingSpec[]): ReadonlyMap<string, EnshroudedSettingSpec> => {
	return new Map(
		specs.map((spec) => [
			spec.key,
			spec,
		]),
	);
};

export const CONFIG_SETTING_BY_KEY = byKey(CONFIG_SETTINGS);

export const GAME_SETTING_BY_KEY = byKey(GAME_SETTINGS);

const CONTROL_BY_KIND: Readonly<Record<SettingKind, BridgeControl>> = {
	[SettingKind.Boolean]: BridgeControl.Boolean,
	[SettingKind.Number]: BridgeControl.Number,
	[SettingKind.Select]: BridgeControl.Select,
};

export const fieldOf = (spec: EnshroudedSettingSpec): Bridge.Field => {
	const field: Bridge.Field = {
		control: CONTROL_BY_KIND[spec.kind],
		help: spec.help,
		key: spec.key,
		label: spec.label,
	};

	if (spec.kind === SettingKind.Number) {
		return {
			...field,
			max: spec.max,
			min: spec.min,
			step: spec.step,
		};
	}

	if (spec.kind === SettingKind.Select) {
		return {
			...field,
			options: [
				...spec.options,
			],
		};
	}

	return field;
};

export const hasControlCharacter = (text: string) => {
	return [
		...text,
	].some((character) => {
		const code = character.charCodeAt(0);

		return code < FIRST_PRINTABLE_CODE || code === DELETE_CODE;
	});
};

export const booleanWriteOf = (label: Bridge.Text, value: Bridge.Value | undefined): boolean => {
	if (typeof value === "boolean") {
		return value;
	}

	const text = typeof value === "string" ? value.trim().toLowerCase() : "";

	if (text === TRUE_TEXT || text === FALSE_TEXT) {
		return text === TRUE_TEXT;
	}

	throw new BridgeUserError(notOnOrOff(label));
};

export const numberWriteOf = (label: Bridge.Text, range: NumberRange, value: Bridge.Value | undefined): number => {
	const text = typeof value === "string" ? value.trim() : value;
	const readable = typeof text === "number" || (typeof text === "string" && text.length > 0);
	const parsed = readable ? Number(text) : Number.NaN;

	if (!Number.isFinite(parsed)) {
		throw new BridgeUserError(needsNumber(label));
	}

	if (parsed < range.min || parsed > range.max || (range.integer && !Number.isInteger(parsed))) {
		throw new BridgeUserError(outOfRange(label, range));
	}

	return parsed;
};

const choiceWriteOf = (spec: SelectSettingSpec, value: Bridge.Value | undefined): string => {
	const text = typeof value === "string" ? value : "";

	if (!spec.options.some((option) => option.value === text)) {
		throw new BridgeUserError(notAnOption(spec.label));
	}

	return text;
};

export const settingWriteOf = (spec: EnshroudedSettingSpec, value: Bridge.Value | undefined): SettingWrite => {
	if (spec.kind === SettingKind.Boolean) {
		const on = booleanWriteOf(spec.label, value);

		return {
			shown: on,
			stored: on,
		};
	}

	if (spec.kind === SettingKind.Select) {
		const picked = choiceWriteOf(spec, value);

		return {
			shown: picked,
			stored: picked,
		};
	}

	const number = numberWriteOf(spec.label, spec, value);

	return {
		shown: number,
		stored: spec.nanoseconds ? minutesToNanoseconds(number) : number,
	};
};

export const shownValueOf = (spec: EnshroudedSettingSpec, raw: unknown): Bridge.Value => {
	if (spec.kind === SettingKind.Boolean) {
		return typeof raw === "boolean" ? raw : spec.fallback;
	}

	if (spec.kind === SettingKind.Select) {
		return typeof raw === "string" && spec.options.some((option) => option.value === raw) ? raw : spec.fallback;
	}

	if (typeof raw !== "number" || !Number.isFinite(raw)) {
		return spec.fallback;
	}

	return spec.nanoseconds ? nanosecondsToMinutes(raw) : raw;
};

export const serverNameWriteOf = (value: Bridge.Value | undefined): string => {
	const name = (value === null || value === undefined ? "" : String(value)).trim();

	if (hasControlCharacter(name)) {
		throw new BridgeUserError(CONTROL_CHARACTER);
	}

	if (name.length === 0) {
		throw new BridgeUserError(SERVER_NAME_EMPTY);
	}

	if (name.length > SERVER_NAME_MAX_LENGTH) {
		throw new BridgeUserError(SERVER_NAME_TOO_LONG);
	}

	return name;
};

export const passwordWriteOf = (group: EnshroudedGroup, value: boolean | number | string): string => {
	const label = PASSWORD_LABELS[group];
	const password = String(value).trim();

	if (password.length === 0) {
		throw new BridgeUserError(passwordEmpty(label));
	}

	if (hasControlCharacter(password)) {
		throw new BridgeUserError(CONTROL_CHARACTER);
	}

	if (password.length > PASSWORD_MAX_LENGTH) {
		throw new BridgeUserError(passwordTooLong(label));
	}

	return password;
};

export const tagsWith = (tags: readonly string[], toggles: ReadonlyMap<string, boolean>): string[] => {
	const kept = tags.filter((tag) => toggles.get(tag) !== false);
	const added = TAG_ORDER.filter((tag) => toggles.get(tag) === true && !kept.includes(tag));

	return [
		...kept,
		...added,
	];
};

export const settingValues = (config: EnshroudedServerConfig): Bridge.Values => {
	const tags = config.tags ?? [];
	const gameSettings = config.gameSettings ?? {};
	const groups = config.userGroups ?? [];
	const values: Bridge.Values = {
		[NAME_KEY]: config.name ?? DEFAULT_SERVER_NAME,
	};

	for (const spec of CONFIG_SETTINGS) {
		values[spec.key] = shownValueOf(spec, config[spec.fileKey]);
	}

	for (const tag of TAG_ORDER) {
		values[tagFieldKeyOf(tag)] = tags.includes(tag);
	}

	for (const spec of GAME_SETTINGS) {
		values[spec.key] = shownValueOf(spec, gameSettings[spec.fileKey]);
	}

	for (const group of GROUP_ORDER) {
		values[PASSWORD_KEYS[group]] = groupEntryOf(groups, group)?.password ?? "";
	}

	return values;
};

const settingsSection = (id: string, title: Bridge.Text, help: Bridge.Text, fields: Bridge.Field[]): Bridge.Section => {
	return {
		confirm: BridgeConfirm.Normal,
		fields,
		help,
		id,
		layout: BridgeLayout.Form,
		module: SETTINGS_MODULE,
		restartHint: true,
		target: BridgeFormTarget.Settings,
		title,
	};
};

export const SERVER_FIELDS: Bridge.Field[] = [
	{
		control: BridgeControl.Text,
		help: {
			ar: "الاسم الذي يراه اللاعبون في قائمة السيرفرات داخل اللعبة.",
			en: "The name players see in the game's server list.",
		},
		key: NAME_KEY,
		label: SERVER_NAME_LABEL,
		maxLength: SERVER_NAME_MAX_LENGTH,
		pattern: TEXT_PATTERN,
		patternHint: ONE_LINE_HINT,
	},
	fieldOf(SLOT_COUNT_SETTING),
	...TAG_ORDER.map((tag): Bridge.Field => {
		return {
			control: BridgeControl.Boolean,
			help: TAG_HELP[tag],
			key: tagFieldKeyOf(tag),
			label: TAG_LABELS[tag],
		};
	}),
];

export const CHAT_FIELDS: Bridge.Field[] = CHAT_SETTINGS.map(fieldOf);

export const PASSWORD_FIELDS: Bridge.Field[] = GROUP_ORDER.map((group): Bridge.Field => {
	return {
		control: BridgeControl.Secret,
		key: PASSWORD_KEYS[group],
		label: PASSWORD_LABELS[group],
		maxLength: PASSWORD_MAX_LENGTH,
		pattern: TEXT_PATTERN,
		patternHint: ONE_LINE_HINT,
	};
});

export const serverSection = settingsSection(
	SERVER_SECTION_ID,
	{
		ar: "السيرفر",
		en: "Server",
	},
	{
		ar: "الاسم والوسوم التي يبحث بها اللاعبون في قائمة السيرفرات داخل اللعبة، وعدد الخانات.",
		en: "The name and tags players search for in the game's server list, and the number of slots.",
	},
	SERVER_FIELDS,
);

export const chatSection = settingsSection(
	CHAT_SECTION_ID,
	{
		ar: "الشات",
		en: "Chat",
	},
	{
		ar: "الشات الصوتي والكتابي لكل من في السيرفر.",
		en: "Voice and text chat for everyone on the server.",
	},
	CHAT_FIELDS,
);

export const difficultySection = settingsSection(
	DIFFICULTY_SECTION_ID,
	{
		ar: "الصعوبة",
		en: "Difficulty",
	},
	{
		ar: "اختر صعوبة جاهزة، أو اختر «مخصص» لتُطبَّق القيم في الأقسام التالية.",
		en: "Pick a preset, or pick Custom to apply the values in the sections below.",
	},
	[
		fieldOf(PRESET_SETTING),
	],
);

export const difficultyGroupSections: Bridge.Section[] = DIFFICULTY_GROUPS.map((group) => {
	return settingsSection(group.id, group.title, group.help, group.settings.map(fieldOf));
});

export const passwordsSection = settingsSection(
	PASSWORDS_SECTION_ID,
	{
		ar: "كلمات المرور",
		en: "Passwords",
	},
	{
		ar: "كلمة مرور الرتبة هي ما يكتبه اللاعب عند الدخول ليحصل على صلاحياتها، فشارك كلمة مرور صديق مع أصحابك واحتفظ بكلمة مرور أدمن لنفسك.",
		en: "A role's password is what a player types to join with that role's rights, so share the Friend password with your friends and keep the Admin one to yourself.",
	},
	PASSWORD_FIELDS,
);
