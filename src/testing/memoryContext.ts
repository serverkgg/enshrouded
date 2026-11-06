import type { Bridge, BridgeExtractOptions } from "@serverkgg/bridge";
import { compileGlob } from "@serverkgg/bridge/utils";

export interface MemoryEmit {
	event: string;
	payload: Bridge.Values | undefined;
}

export interface MemoryLog {
	level: "info" | "warn" | "error";
	message: string;
	fields: Bridge.Values | undefined;
}

export interface MemoryContextOptions {
	files?: Record<string, string>;
	modified?: Record<string, string>;
	archives?: Record<string, Record<string, string>>;
	listings?: Record<string, Bridge.FileEntry[]>;
	variables?: Record<string, string>;
	secrets?: Record<string, string>;
	json?: (url: string) => unknown;
	ports?: Record<string, number>;
	running?: boolean;
	exec?: (command: string[]) => Bridge.ExecResult;
	watch?: (pattern: RegExp) => RegExpMatchArray | null;
}

export interface MemoryFollower {
	pattern: RegExp;
	onMatch: (match: RegExpMatchArray) => void;
}

export const MEMORY_MODIFIED_AT = "2026-10-27T16:00:00.000Z";

const isWithin = (path: string, directory: string) => {
	return path === directory || path.startsWith(`${directory}/`);
};

export const memoryContext = (options: MemoryContextOptions = {}) => {
	const files = new Map(Object.entries(options.files ?? {}));
	const modified = new Map(Object.entries(options.modified ?? {}));
	const archives = new Map(Object.entries(options.archives ?? {}));
	const removed: string[] = [];

	const listed = (glob: string): Bridge.FileEntry[] => {
		const pattern = compileGlob(glob);

		return [
			...files.entries(),
		]
			.filter(([path]) => pattern.test(path))
			.map(([path, content]) => {
				return {
					directory: false,
					modifiedAt: modified.get(path) ?? MEMORY_MODIFIED_AT,
					name: path.split("/").at(-1) ?? path,
					path,
					sizeBytes: content.length,
				};
			});
	};

	const moveEntry = (from: string, to: string) => {
		for (const [path, content] of [
			...files.entries(),
		]) {
			if (!isWithin(path, from)) {
				continue;
			}

			const target = `${to}${path.slice(from.length)}`;

			files.delete(path);
			files.set(target, content);

			const stamp = modified.get(path);

			if (stamp !== undefined) {
				modified.delete(path);
				modified.set(target, stamp);
			}

			const archive = archives.get(path);

			if (archive !== undefined) {
				archives.delete(path);
				archives.set(target, archive);
			}
		}
	};
	const activities: Bridge.Activity[] = [];
	const emits: MemoryEmit[] = [];
	const logged: MemoryLog[] = [];
	const commands: string[][] = [];
	const portsRead: string[] = [];
	const requests: string[] = [];
	const followers = new Set<MemoryFollower>();
	const setupReports: (Bridge.SetupRuntime | null)[] = [];

	const logLine = (line: string) => {
		for (const follower of followers) {
			const match = line.match(follower.pattern);

			if (match) {
				follower.onMatch(match);
			}
		}
	};
	const server = {
		running: options.running ?? false,
	};

	const context = {
		activity: {
			report(entry: Bridge.Activity) {
				activities.push(entry);
			},
		},
		emit(event: string, payload?: Bridge.Values) {
			emits.push({
				event,
				payload,
			});
		},
		async exec(command: string[]) {
			commands.push(command);

			return (
				options.exec?.(command) ?? {
					code: 0,
					stderr: "",
					stdout: "",
				}
			);
		},
		files: {
			async ensure() {},
			async exists(path: string) {
				return [
					...files.keys(),
				].some((entry) => isWithin(entry, path));
			},
			async extract(path: string, destination: string, extract: BridgeExtractOptions = {}) {
				const archive = archives.get(path);

				if (archive === undefined) {
					throw new Error(`archive "${path}" is not readable`);
				}

				const written: string[] = [];

				for (const [entry, content] of Object.entries(archive)) {
					if (extract.selects !== undefined && !extract.selects.includes(entry)) {
						continue;
					}

					const target = `${destination}/${entry}`;

					files.set(target, content);
					written.push(target);
				}

				return written;
			},
			async list(glob: string) {
				return options.listings?.[glob] ?? listed(glob);
			},
			async move(from: string, to: string) {
				if (
					!files.has(from)
					&& ![
						...files.keys(),
					].some((entry) => isWithin(entry, from))
				) {
					throw new Error(`"${from}" does not exist`);
				}

				if (files.has(to)) {
					throw new Error(`"${to}" already exists`);
				}

				moveEntry(from, to);
			},
			async read(path: string) {
				const content = files.get(path);

				if (content === undefined) {
					throw new Error(`ENOENT: ${path}`);
				}

				return content;
			},
			async remove(path: string) {
				removed.push(path);

				for (const entry of [
					...files.keys(),
				]) {
					if (isWithin(entry, path)) {
						files.delete(entry);
						archives.delete(entry);
					}
				}
			},
			async write(path: string, content: string) {
				files.set(path, content);
			},
		},
		log: Object.assign(
			(message: string, fields?: Bridge.Values) => {
				logged.push({
					fields,
					level: "info",
					message,
				});
			},
			{
				error: (message: string, fields?: Bridge.Values) => {
					logged.push({
						fields,
						level: "error",
						message,
					});
				},
				warn: (message: string, fields?: Bridge.Values) => {
					logged.push({
						fields,
						level: "warn",
						message,
					});
				},
			},
		),
		logs: {
			follow(pattern: RegExp, onMatch: (match: RegExpMatchArray) => void) {
				const follower = {
					onMatch,
					pattern,
				};

				followers.add(follower);

				return () => {
					followers.delete(follower);
				};
			},
			async watch(pattern: RegExp) {
				return options.watch?.(pattern) ?? null;
			},
		},
		net: {
			async json(url: string) {
				requests.push(url);

				if (options.json === undefined) {
					throw new Error(`no answer for ${url}`);
				}

				return options.json(url);
			},
		},
		port(key: string) {
			portsRead.push(key);

			const port = options.ports?.[key];

			if (port === undefined) {
				throw new Error(`port "${key}" is not active`);
			}

			return port;
		},
		server,
		setup: {
			clear() {
				setupReports.push(null);
			},
			report(runtime: Bridge.SetupRuntime) {
				setupReports.push(runtime);
			},
		},
		secret(key: string) {
			return options.secrets?.[key] ?? null;
		},
		variable(key: string) {
			return options.variables?.[key] ?? null;
		},
	} as unknown as Bridge.Context;

	return {
		activities,
		archives,
		commands,
		context,
		emits,
		files,
		followers,
		logged,
		logLine,
		modified,
		portsRead,
		removed,
		requests,
		server,
		setupReports,
	};
};
