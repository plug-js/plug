import { existsSync } from 'fs'
import { resolve, relative, dirname } from 'path'

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
 * but maybe a VirtualFileSystem from another directory might use a different
 * underlying file system... This is good enough for now!
 */
const __lfilename = __filename.toLowerCase()
const __ufilename = __filename.toUpperCase()

/** Indicates whether the underlying file system is case sensitive or not */
export const caseSensitivePaths = !(existsSync(__lfilename) && existsSync(__ufilename))

/** Return the absolute path resolving the given path from a directory */
export function getAbsolutePath(directory: DirectoryPath, path: string): AbsolutePath {
  return resolve(directory, path) as AbsolutePath
}

/** Return the relative path from a directory to an absolute path */
export function getRelativePath(directory: DirectoryPath, path: AbsolutePath): RelativePath {
  return relative(directory, path) as RelativePath
}

/** Return the canonical path from an absolute path, considering filesystem case sensitivity */
export function getCanonicalPath(name: AbsolutePath): CanonicalPath {
  // istanbul ignore next // dependant on underlying file system
  return (caseSensitivePaths ? name : name.toLowerCase()) as CanonicalPath
}

/** Get the current working directory as a directory path */
export function getCurrentDirectoryPath(): DirectoryPath {
  return process.cwd() as DirectoryPath
}

/** Get a directory path resolving the specified path */
export function getDirectoryPath(directory: DirectoryPath, path?: string): DirectoryPath {
  return path ? resolve(directory, path) as DirectoryPath : directory
}

/** Get the directory path for the specified absolute path */
export function getDirectory(path: AbsolutePath): DirectoryPath {
  return dirname(path) as DirectoryPath
}
