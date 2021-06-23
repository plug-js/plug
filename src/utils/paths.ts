import assert from 'assert'
import { existsSync } from 'fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'path'

/** An absolute file path always starts from "/" */
export type FilePath = string & {
  __brand_absolute_path: any
}

/** An absolute path for a directory */
export type DirectoryPath = string & {
  __brand_directory_path: any
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
export function createFilePath(root: DirectoryPath, path: string, ...paths: string[]): FilePath {
  assert(isAbsolute(root), `Not an absolute path: ${root}`)
  return resolve(root, path, ...paths) as FilePath
}

/** Create a `FilePath` by resolving all of its path components */
export function createDirectoryPath(root: DirectoryPath, path?: string): DirectoryPath
export function createDirectoryPath(root: DirectoryPath, path: string, ...paths: string[]): DirectoryPath
export function createDirectoryPath(root: DirectoryPath, path?: string | undefined, ...paths: string[]): DirectoryPath {
  assert(isAbsolute(root), `Not an absolute path: ${root}`)
  return path ? resolve(root, path, ...paths) as DirectoryPath : root
}

/** Return the relative path from a directory to a file */
export function getRelativePath(directory: DirectoryPath, path: FilePath): string
/** Return the relative path from a directory to a directory */
export function getRelativePath(directory: DirectoryPath, path: DirectoryPath): string
// overloaded methods implementation
export function getRelativePath(directory: DirectoryPath, path: string): string {
  return relativePath(directory, path)
}

/** Return the relative path from a file to another file */
export function getRelativeFilePath(from: FilePath, path: FilePath): string
/** Return the relative path from a file to a directory */
export function getRelativeFilePath(from: FilePath, path: DirectoryPath): string
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
export function isChild(directory: DirectoryPath, path: DirectoryPath): boolean
// overloaded methods implementation
export function isChild(directory: DirectoryPath, path: string): boolean {
  const resolved = resolve(directory, path)
  const relative = relativePath(directory, resolved)
  return !! (relative && (! relative.startsWith('..' + sep)))
}

/** Checks whether the specified path is a child or same of the given directory or not */
export function isChildOrSame(directory: DirectoryPath, path: DirectoryPath): boolean {
  const resolved = resolve(directory, path)
  const relative = relativePath(directory, resolved)
  return relative ? (! relative.startsWith('..' + sep)) : true
}

/** Get the directory path for the specified absolute path */
export function getParent(path: FilePath | DirectoryPath): DirectoryPath {
  return dirname(path) as DirectoryPath
}
