import type { Bridge } from "@serverkgg/bridge";
import { formatByteSize, formatUtc } from "@serverkgg/bridge/utils";
import { SAVE_DIRECTORY, WORLD_FILE } from "../shared";

export const WORLD_UPLOAD_STAGING = ".serverk-uploads/world";

export const WORLD_UPLOAD_EXTENSION = "ksd";

export const WORLD_FILE_NAME = WORLD_FILE.slice(SAVE_DIRECTORY.length + 1);

export const WORLD_COPY_PATTERN = /^world0(?:[._-].*)?$/;

export const WORLD_BACKUP_DIRECTORY = `${SAVE_DIRECTORY}/backup`;

const SAVE_FILES_GLOB = `${SAVE_DIRECTORY}/*`;

const WORLD_BACKUPS_GLOB = `${WORLD_BACKUP_DIRECTORY}/**`;

export interface WorldRow extends Bridge.Row {
	id: string;
	file: string;
	size: string;
	modified: string;
	path: string;
}

export const isUnder = (path: string, directory: string) => {
	return path.startsWith(`${directory}/`);
};

export const isWorldUpload = (path: string) => {
	return path.toLowerCase().endsWith(`.${WORLD_UPLOAD_EXTENSION}`);
};

export const modifiedLabelOf = (modifiedAt: string) => {
	const at = Date.parse(modifiedAt);

	return Number.isNaN(at) ? "" : formatUtc(at);
};

export const worldFilesOf = async (context: Bridge.Context) => {
	return (await context.files.list(SAVE_FILES_GLOB)).filter(
		(entry) => !entry.directory && WORLD_COPY_PATTERN.test(entry.name),
	);
};

export const worldBackupsOf = async (context: Bridge.Context) => {
	return (await context.files.list(WORLD_BACKUPS_GLOB)).filter((entry) => !entry.directory);
};

export const worldEntryOf = async (context: Bridge.Context) => {
	return (await worldFilesOf(context)).find((entry) => entry.path === WORLD_FILE) ?? null;
};

export const worldRowOf = (entry: Bridge.FileEntry): WorldRow => {
	return {
		file: WORLD_FILE_NAME,
		id: WORLD_FILE_NAME,
		modified: modifiedLabelOf(entry.modifiedAt),
		path: WORLD_FILE,
		size: formatByteSize(entry.sizeBytes),
	};
};
