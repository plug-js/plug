import { existsSync } from 'fs'
import { dirname, relative, resolve, sep } from 'path'

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

// This is a bit of a hack: we determine case sensitivity on _this_ file
// but maybe a Files from another directory might use a different
// underlying filesystem... This is good enough for now!
const __lfilename = __filename.toLowerCase()
const __ufilename = __filename.toUpperCase()

const __caseSensitivePaths = !(existsSync(__lfilename) && existsSync(__ufilename))

// This computes the relative path considering the case sensitivity of the file
// system and works quite easily as both directory and path are absolute paths.
function relativePath(directory: string, path: string): string {
  if (caseSensitivePaths()) return relative(directory, path)

  // Use our lower case directory and path
  const ldirectory = directory.toLowerCase()
  const lpath = path.toLowerCase()
  if (ldirectory === lpath) return ''

  // Figure out the first position where dir and path differ case insensitive
  let position = 0
  const end = directory.length < path.length ? directory.length : path.length
  while ((position< end) && (ldirectory[position] === lpath[position])) position ++

  // Basically copy the casing for the common prefix from the path
  const from = path.substr(0, position) + directory.substr(position)
  return relative(from, path)
}

/* ========================================================================== */

/** Indicates whether the underlying filesystem is case sensitive or not */
export const caseSensitivePaths: () => boolean = (() => {
  // istanbul ignore next - always running coverage with tests
  return typeof globalThis.describe === 'function' ? () => {
    return typeof (<any> globalThis).caseSensitivePaths === 'boolean' ?
      (<any> globalThis).caseSensitivePaths as boolean : __caseSensitivePaths
  } : () => __caseSensitivePaths
})()

/** Create a `FilePath` by resolving all of its path components */
export function createFilePath(...paths: string[]): FilePath {
  return resolve(sep, ...paths) as FilePath
}

/** Create a `FilePath` by resolving all of its path components */
export function createDirectoryPath(...paths: string[]): DirectoryPath {
  return resolve(sep, ...paths) as DirectoryPath
}

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

/** Return the relative path from a directory to a file */
export function getRelativePath(directory: DirectoryPath, path: FilePath): RelativeFilePath
/** Return the relative path from a directory to a directory */
export function getRelativePath(directory: DirectoryPath, path: DirectoryPath): RelativeDirectoryPath
// overloaded methods implementation
export function getRelativePath(directory: DirectoryPath, path: string): string {
  return relativePath(directory, path)
}

/** Return the relative path from a file to another file */
export function getRelativeFilePath(from: FilePath, path: FilePath): RelativeFilePath
/** Return the relative path from a file to a directory */
export function getRelativeFilePath(from: FilePath, path: DirectoryPath): RelativeDirectoryPath
// overloaded methods implementation
export function getRelativeFilePath(from: FilePath, path: string): string {
  return relativePath(dirname(from), path)
}

/** Return the canonical path from an absolute path, considering filesystem case sensitivity */
export function getCanonicalPath(name: FilePath): CanonicalPath {
  return (caseSensitivePaths() ? name : name.toLowerCase()) as CanonicalPath
}

/** Checks whether the specified path is a child of the given directory or not */
export function isChild(directory: DirectoryPath, path: FilePath): boolean
/** Checks whether the specified path is a child of the given directory or not */
export function isChild(directory: DirectoryPath, path: RelativeFilePath): boolean
/** Checks whether the specified path is a child of the given directory or not */
export function isChild(directory: DirectoryPath, path: DirectoryPath): boolean
/** Checks whether the specified path is a child of the given directory or not */
export function isChild(directory: DirectoryPath, path: RelativeDirectoryPath): boolean
// overloaded methods implementation
export function isChild(directory: DirectoryPath, path: string): boolean {
  const resolved = resolve(directory, path)
  const relative = relativePath(directory, resolved)
  return !! (relative && (! relative.startsWith('..' + sep)))
}

/** Get the directory path for the specified absolute path */
export function getParent(path: FilePath | DirectoryPath): DirectoryPath {
  return dirname(path) as DirectoryPath
}
