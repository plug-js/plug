import assert from 'assert'
import path from 'path'

/* ========================================================================== */

export function resolve(name: string, directory: string) {
	const resolved = path.resolve(directory, name)
  assert(path.isAbsolute(resolved), `Unable to resolve "${name}" in "${directory}"`)

	const relative = path.relative(directory, resolved)
  assert(! relative.startsWith('..'), `Path "${resolved}" is not in "${directory}"`)

	return { directory, resolved, relative }
}

/* ========================================================================== *
 * ENTRY DEFINITION                                                           *
 * ========================================================================== */

export enum EntryType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY', 
}

export interface AbstractEntry<T extends EntryType> {
  readonly type: T

	readonly from: string
	readonly source: string
	readonly fromSourcePath: string

	readonly to?: string
	readonly target?: string
	readonly toTargetPath?: string
}

/* ========================================================================== *
 * ABSTRACT ENTRY                                                             *
 * ========================================================================== */

/* Define the `BaseEntry` interface so the abstract class does not have to
 * implement all the methods specified by `AbstractEntry` (TypeScript magic) */
interface BaseEntry<T extends EntryType> extends AbstractEntry<T> {}

/* The `BaseEntry` class implements all methods of `AbstractEntry` */
class BaseEntry<T extends EntryType> implements AbstractEntry<T> {
	constructor(type: T, name: string, fromdir: string, todir?: string) {
		const { directory: from, relative: source, resolved: fromSourcePath } = resolve(name, fromdir)
		const { directory: to, relative: target, resolved: toTargetPath } = todir ? resolve(name, todir) : {
			directory: undefined,
			relative: undefined,
			resolved: undefined,
		}

		Object.defineProperties(this, {
			type: { enumerable: true, value: type },

			from: { enumerable: true, value: from },
			source: { enumerable: true, value: source },
			fromSourcePath: { enumerable: true, value: fromSourcePath },
			
			to: { enumerable: true, value: to },
			target: { enumerable: true, value: target },
			toTargetPath: { enumerable: true, value: toTargetPath },
		})
	}
}

/* ========================================================================== *
 * CONCRETE ENTRIES IMPLEMENTATION                                            *
 * ========================================================================== */

export class FileEntry extends BaseEntry<EntryType.FILE> {
	constructor(name: string, from: string, to?: string) {
		super(EntryType.FILE, name, from, to)
	}
}

export class DirectoryEntry extends BaseEntry<EntryType.DIRECTORY> {
	constructor(name: string, from: string, to?: string) {
		super(EntryType.DIRECTORY, name, from, to)
	}
}

export type Entry = FileEntry | DirectoryEntry 

export const Entry = {
	isFileEntry(entry: AbstractEntry<any>): entry is FileEntry {
		return entry.type === EntryType.FILE
	},

	isDirectoryEntry(entry: AbstractEntry<any>): entry is DirectoryEntry {
		return entry.type === EntryType.DIRECTORY
	},
}
