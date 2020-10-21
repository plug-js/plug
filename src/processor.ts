import fg from 'fast-glob'
import assert from 'assert'

import { Dirent } from 'fs'
import nodeProcess from 'process'
import nodePath from 'path'

import { Task } from './task'
import { NonEmptyArray, assertNonEmptyString, assertNonEmptyArray } from './types'

/* ========================================================================== */

function assertFastGlobEntry(entry: any): asserts entry is fg.Entry {
  assert((typeof entry === 'object') && (typeof entry.path === 'string') &&
    (entry.dirent instanceof Dirent), 'Entry is not a FastGlob.Entry')
}

function relativePath(path: string): string {
  const relative = nodePath.relative(nodeProcess.cwd(), nodePath.resolve(path))
  assert(! nodePath.isAbsolute(relative), `Path "${path}" is absolute`)
  assert(! relative.startsWith('..'), `Path "${path}" is outside of the current working directory`)
  return relative
}

/* ========================================================================== */

/* Options we want to _force_ to fast-glob */
const forcedOptions: fg.Options = {
  cwd: nodeProcess.cwd(), // always the current process
  objectMode: true, // always in object mode (get Dirent)
  unique: true, // de-dupe all paths whenever possible
  absolute: true, // return always the absolute path
}

/* Options we want to use as _defaults_ for fast-glob */
const defaultOptions: fg.Options = Object.assign({
  deep: Infinity, // infinite depth
  followSymbolicLinks: true, // follow symlinks
  caseSensitiveMatch: true, // always case sensitive, it's 2020
  onlyFiles: true, // we _normally_ want only files
  onlyDirectories: false, // we _normally_ don't want directories
  dot: false, // exclude .files by default
  baseNameMatch: false, // no basename matching
}, forcedOptions) // also include forced options above

/* Keys we want to keep out of FastGlob's own Options */
type OptionsKeys = 'deep' | 'followSymbolicLinks' | 'ignore' | 'caseSensitiveMatch' | 'dot' | 'baseNameMatch'

/**
 * Our `Options` represent a very strict _subset_ of the FastGlob options
 */
export type Options = Partial<Pick<fg.Options, OptionsKeys>>

/* ========================================================================== */

/**
 * A `Processor` represents a `Task` processing a number of files **with** a
 * set of  of `Plugin`s, and finally (optionally) writing them **to** a
 * destination directory.
 */
export interface Processor extends Task {
  /** Append a `Plugin` instance to the ones used by this `Processor` */
  with: () => this,
  /** This `Processor` will write processed file to the specified directory */
  to: (destination: string) => Task,
}

/* ========================================================================== */

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param patterns - The _glob patterns_ matching the files to process
 */
export function process(...patterns: NonEmptyArray<string>): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, options?: Options): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, options?: Options): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, options?: Options): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, pattern4: string, options?: Options): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, pattern4: string, pattern5: string, options?: Options): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param patterns - An array of  _glob patterns_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(patterns: NonEmptyArray<string>, options?: Options): Processor

/* Overloaded signature */
export function process(...args: any[]): Processor {
  // Process our arguments, the last one _might_ be globbing options
  const globs: string[] = args.flat() // keep the string[] type, even if we might have an object

  // Process the options, starting with defaults, and overriding with forced options
  const argumentOptions: Options = typeof globs[globs.length - 1] === 'object' ? <any> globs.pop() : {}
  const options: fg.Options = Object.assign({}, defaultOptions, argumentOptions, forcedOptions)

  // Triple check everything we have is a valid string, and that we have at least one glob
  globs.forEach((glob, index) => assertNonEmptyString(glob, `Glob at position ${index} must be a non-empty string`))
  assertNonEmptyArray(globs, 'No globs specified')

  // Keep our destination here
  let to: string | undefined = undefined

  // Create our pipe...
  const pipe = async () => {
    for await (const entry of fg.stream(globs, options)) {
      assertFastGlobEntry(entry)

      const relative = relativePath(entry.path)
      console.log(relative)
    }
  }

  pipe.with = () => pipe

  pipe.to = (destination: string) => {
    assertNonEmptyString(destination, 'Destination must be a non-empty string')
    assert.strictEqual(to, undefined, 'Destination already specified')
    to = relativePath(destination)
    return () => pipe() // this kills "with(...)"
  }

  return pipe
}
