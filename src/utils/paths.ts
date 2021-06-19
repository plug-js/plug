import { existsSync } from 'fs'
import { resolve, relative, dirname, sep } from 'path'

/** An absolute path always starts from "/" */
export type AbsolutePath = string & {
  __brand_absolute_path: any
}

/** The path relative to the base directory */
export type RelativePath = string & {
  __brand_relative_path: any
}

/** The absolute path canonicalized depending con case sensitivity */
export type CanonicalPath = AbsolutePath & {
  __brand_canonical_path: any
}

/** An absolute path for a directory */
export type DirectoryPath = AbsolutePath & {
  __brand_directory_path: any
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

/** Return the absolute path resolving the given path from a directory */
export function getAbsolutePath(directory: DirectoryPath, path: string): AbsolutePath {
  return resolve(directory, path) as AbsolutePath
}

/** Return the relative path from a directory to an absolute path */
export function getRelativePath(directory: DirectoryPath, path: AbsolutePath): RelativePath {
  if (caseSensitivePaths()) return relative(directory, path) as RelativePath
  return relative(directory.toLowerCase(), path.toLowerCase()) as RelativePath
}

/** Returns whether the specified path is a _child_ of the given directory */
export function isChild(directory: DirectoryPath, path: AbsolutePath): boolean {
  const relative = getRelativePath(directory, path)
  return !! (relative && (! relative.startsWith('..' + sep)))
}

/** Return the canonical path from an absolute path, considering filesystem case sensitivity */
export function getCanonicalPath(name: AbsolutePath): CanonicalPath {
  return (caseSensitivePaths() ? name : name.toLowerCase()) as CanonicalPath
}

/** Get a directory path resolving the specified path */
export function getDirectoryPath(directory: DirectoryPath, path?: string): DirectoryPath {
  return path ? resolve(directory, path) as DirectoryPath : directory
}

/** Get the directory path for the specified absolute path */
export function getDirectory(path: AbsolutePath): DirectoryPath {
  return dirname(path) as DirectoryPath
}
