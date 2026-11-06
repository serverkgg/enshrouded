import { SERVER_EXE } from "../shared";

export const WINE_LOADERS: readonly string[] = [
	"wine64-preloader",
	"wine-preloader",
	"wine64",
	"wine",
];

export const startArgs = (): string[] => {
	return [];
};

export const SERVER_PROCESS_SCRIPT = [
	"for entry in /proc/[0-9]*; do",
	'exe=$(readlink "$entry/exe" 2>/dev/null) || continue;',
	'case "$(basename "$exe")" in',
	`${WINE_LOADERS.join("|")}) ;;`,
	"*) continue ;;",
	"esac;",
	`first=$(tr '\\000' '\\n' < "$entry/cmdline" 2>/dev/null | head -n 1);`,
	'case "$first" in',
	`*'\\${SERVER_EXE}') basename "$entry" ;;`,
	"esac;",
	"done; true",
].join(" ");

export const CONTAINER_UID = 1000;

export const WINESERVER = "wineserver";

export const WINE_SYSTEM_PROCESSES: readonly string[] = [
	"services.exe",
	"explorer.exe",
	"rpcss.exe",
	"plugplay.exe",
	"svchost.exe",
	"winedevice.exe",
	"conhost.exe",
	"tabtip.exe",
];

export const WINE_PROCESS_SCRIPT = [
	"for entry in /proc/[0-9]*; do",
	`[ "$(stat -c %u "$entry" 2>/dev/null)" = ${CONTAINER_UID} ] || continue;`,
	'exe=$(readlink "$entry/exe" 2>/dev/null) || continue;',
	'case "$(basename "$exe")" in',
	`${WINESERVER}) basename "$entry"; continue ;;`,
	`${WINE_LOADERS.join("|")}) ;;`,
	"*) continue ;;",
	"esac;",
	`first=$(tr '\\000' '\\n' < "$entry/cmdline" 2>/dev/null | head -n 1);`,
	'case "$first" in',
	`${WINE_SYSTEM_PROCESSES.map((name) => `*'\\${name}'`).join("|")}) basename "$entry" ;;`,
	"esac;",
	"done; true",
].join(" ");

const PID_PATTERN = /^\d+$/;

export const serverPidsOf = (stdout: string): number[] => {
	return stdout
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => PID_PATTERN.test(line))
		.map(Number)
		.sort((left, right) => left - right);
};
