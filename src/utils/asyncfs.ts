// istanbul ignore file - will eventually get sorted by Node's team!

import type { Abortable } from 'events'
import type { FileHandle } from 'fs/promises'

import type {
  BaseEncodingOptions,
  MakeDirectoryOptions,
  Mode,
  OpenMode,
  PathLike,
} from 'fs'

import {
  mkdir as asyncMkdir,
  readFile as asyncReadFile,
  writeFile as asyncWriteFile,
} from 'fs/promises'

// No idea why sometimes stacks don't have a trace when coming out of
// the "fs.promises" api... There is a _stack_ property on the object
// but it simply includes the first line, no whatsoever trace???
//
// Upon further inspection, it _seems_ this is related to the
// Error.captureStackTrace(...) function. If we pass a function to it as
// second parameter in our functions below, we end up with no stacks as well!
//
// It'll get fixed, eventually, but for now keep these wrappers around!

// definitions
export function mkdir(path: PathLike, options: MakeDirectoryOptions & { recursive: true; }): Promise<string | undefined>
export function mkdir(path: PathLike, options?: Mode | (MakeDirectoryOptions & { recursive?: false; }) | null): Promise<undefined>
export function mkdir(path: PathLike, options?: Mode | MakeDirectoryOptions | null): Promise<string | undefined>
// implementation
export function mkdir(...args: Parameters<typeof asyncMkdir>): ReturnType<typeof asyncMkdir> {
  return asyncMkdir(...args).catch((error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function writeFile(path: PathLike | FileHandle, data: string | Uint8Array, options?: BaseEncodingOptions & { mode?: Mode, flag?: OpenMode } & Abortable | BufferEncoding | null): Promise<void>
// implementation
export function writeFile(...args: Parameters<typeof asyncWriteFile>): ReturnType<typeof asyncWriteFile> {
  return asyncWriteFile(...args).catch((error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function readFile(path: PathLike | FileHandle, options?: { encoding?: null, flag?: OpenMode } & Abortable | null): Promise<Buffer>;
export function readFile(path: PathLike | FileHandle, options: { encoding: BufferEncoding, flag?: OpenMode } & Abortable | BufferEncoding): Promise<string>;
export function readFile(path: PathLike | FileHandle, options?: BaseEncodingOptions & Abortable & { flag?: OpenMode } | BufferEncoding | null): Promise<string | Buffer>;
// implementation
export function readFile(...args: Parameters<typeof asyncReadFile>): ReturnType<typeof asyncReadFile> {
  return asyncReadFile(...args).catch((error) => {
    Error.captureStackTrace(error)
    throw error
  })
}
