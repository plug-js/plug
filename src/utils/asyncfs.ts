import {
  mkdir as asyncMkdir,
  readFile as asyncReadFile,
  readdir as asyncReaddir,
  rmdir as asyncRmdir,
  stat as asyncStat,
  unlink as asyncUnlink,
  writeFile as asyncWriteFile,
} from 'fs/promises'

import type { Abortable } from 'events'
import type { FileHandle } from 'fs/promises'

import type {
  BaseEncodingOptions,
  BigIntStats,
  Dirent,
  MakeDirectoryOptions,
  Mode,
  OpenMode,
  PathLike,
  RmDirOptions,
  StatOptions,
  Stats,
} from 'fs'

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
  return asyncMkdir(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function readFile(path: PathLike | FileHandle, options?: { encoding?: null, flag?: OpenMode } & Abortable | null): Promise<Buffer>
export function readFile(path: PathLike | FileHandle, options: { encoding: BufferEncoding, flag?: OpenMode } & Abortable | BufferEncoding): Promise<string>
export function readFile(path: PathLike | FileHandle, options?: BaseEncodingOptions & Abortable & { flag?: OpenMode } | BufferEncoding | null): Promise<string | Buffer>
// implementation
export function readFile(...args: Parameters<typeof asyncReadFile>): ReturnType<typeof asyncReadFile> {
  return asyncReadFile(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function readdir(path: PathLike, options: { encoding: 'buffer'; withFileTypes?: false } | 'buffer'): Promise<Buffer[]>
export function readdir(path: PathLike, options?: BaseEncodingOptions & { withFileTypes?: false } | BufferEncoding | null): Promise<string[]>
export function readdir(path: PathLike, options?: BaseEncodingOptions & { withFileTypes?: false } | BufferEncoding | null): Promise<string[] | Buffer[]>
export function readdir(path: PathLike, options: BaseEncodingOptions & { withFileTypes: true }): Promise<Dirent[]>;
// implementation
export function readdir(path: PathLike, options?: any): Promise<any> {
  return asyncReaddir(path, options).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function stat(path: PathLike, opts?: StatOptions & { bigint?: false }): Promise<Stats>
export function stat(path: PathLike, opts: StatOptions & { bigint: true }): Promise<BigIntStats>
export function stat(path: PathLike, opts?: StatOptions): Promise<Stats | BigIntStats>
// implementation
export function stat(...args: Parameters<typeof asyncStat>): ReturnType<typeof asyncStat> {
  return asyncStat(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function writeFile(path: PathLike | FileHandle, data: string | Uint8Array, options?: BaseEncodingOptions & { mode?: Mode, flag?: OpenMode } & Abortable | BufferEncoding | null): Promise<void>
// implementation
export function writeFile(...args: Parameters<typeof asyncWriteFile>): ReturnType<typeof asyncWriteFile> {
  return asyncWriteFile(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function unlink(path: PathLike): Promise<void>
// implementation
export function unlink(...args: Parameters<typeof asyncUnlink>): ReturnType<typeof asyncUnlink> {
  return asyncUnlink(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}

// definitions
export function rmdir(path: PathLike, options?: RmDirOptions): Promise<void>
// implementation
export function rmdir(...args: Parameters<typeof asyncRmdir>): ReturnType<typeof asyncRmdir> {
  return asyncRmdir(...args).catch(/* istanbul ignore next */ (error) => {
    Error.captureStackTrace(error)
    throw error
  })
}
