import { existsSync } from 'fs'
import { resolve, relative, dirname, sep } from 'path'

/** An absolute file path always starts from "/" */
export type FilePath = string & {
  __brand_absolute_path: any
}

/** A path to a file relative to another file */
export type RelativeFilePath = string & {
  __brand_relative_file_path: any
}

/** An absolute path for a directory */
export type DirectoryPath = string & {
  __brand_directory_path: any
}

/** A path to a file relative to another file */
export type RelativeDirectoryPath = string & {
  __brand_relative_directory_path: any
}

/** The absolute path canonicalized depending con case sensitivity */
export type CanonicalPath = FilePath & {
  __brand_canonical_path: any
}

/*
 * This is a bit of a hack: we determine case sensitivity on _this_ file
 * but maybe a Files from another directory might use a different
 * underlying filesystem... This is good enough for now!
 */
const __lfilename = __filename.toLowerCase()
const __ufilename = __filename.toUpperCase()

const __caseSensitivePaths = !(existsSync(__lfilename) && existsSync(__ufilename))

/** Indicates whether the underlying filesystem is case sensitive or not */
export const caseSensitivePaths: () => boolean = (() => {
  // istanbul ignore next - always running coverage with tests
  return typeof globalThis.describe === 'function' ? () => {
    return typeof (<any> globalThis).caseSensitivePaths === 'boolean' ?
      (<any> globalThis).caseSensitivePaths as boolean : __caseSensitivePaths
  } : () => __caseSensitivePaths
})()

/** Resolve the specified path starting from the specified directory */
export function resolvePath(directory: DirectoryPath, path: FilePath): FilePath
/** Resolve the specified path starting from the specified directory */
export function resolvePath(directory: DirectoryPath, path: RelativeFilePath): FilePath
/** Resolve the specified path starting from the specified directory */
export function resolvePath(directory: DirectoryPath, path?: DirectoryPath): DirectoryPath
/** Resolve the specified path starting from the specified directory */
export function resolvePath(directory: DirectoryPath, path?: RelativeDirectoryPath): DirectoryPath
// overloaded methods implementation
export function resolvePath(directory: DirectoryPath, path?: string): string {
  return path ? resolve(directory, path) as DirectoryPath : directory
}

/** Resolve the specified path starting from the parent directory of the specified file */
export function resolveFilePath(from: FilePath, path: FilePath): FilePath
/** Resolve the specified path starting from the parent directory of the specified file */
export function resolveFilePath(from: FilePath, path: RelativeFilePath): FilePath
/** Resolve the specified path starting from the parent directory of the specified file */
export function resolveFilePath(from: FilePath, path?: DirectoryPath): DirectoryPath
/** Resolve the specified path starting from the parent directory of the specified file */
export function resolveFilePath(from: FilePath, path?: RelativeDirectoryPath): DirectoryPath
// overloaded methods implementation
export function resolveFilePath(from: FilePath, path?: string): string {
  const directory = dirname(from) as DirectoryPath
  return path ? resolve(directory, path) as DirectoryPath : directory
}

/** Return the relative path from a directory to an absolute path */
export function getRelativePath(directory: DirectoryPath, path: FilePath): RelativeFilePath
export function getRelativePath(directory: DirectoryPath, path: DirectoryPath): RelativeDirectoryPath
export function getRelativePath(directory: DirectoryPath, path: FilePath | DirectoryPath): any {
  if (caseSensitivePaths()) return relative(directory, path)
  return relative(directory.toLowerCase(), path.toLowerCase())
}

/** Return the canonical path from an absolute path, considering filesystem case sensitivity */
export function getCanonicalPath(name: FilePath): CanonicalPath {
  return (caseSensitivePaths() ? name : name.toLowerCase()) as CanonicalPath
}

/** Returns whether the specified path is a _child_ of the given directory */
export function isChild(directory: DirectoryPath, path: FilePath | DirectoryPath): boolean {
  const relative = getRelativePath(directory, path as any)
  return !! (relative && (! relative.startsWith('..' + sep)))
}

/** Get the directory path for the specified absolute path */
export function getParent(path: FilePath | DirectoryPath): DirectoryPath {
  return dirname(path) as DirectoryPath
}
