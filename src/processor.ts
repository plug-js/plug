import fg from 'fast-glob'
import assert from 'assert'

import { Dirent } from 'fs'
import { cwd } from 'process'

import { TaskCall, TaskContext } from './task'
import { Plugin, PluginHandler } from './plugin'
import { resolve, FileEntry, DirectoryEntry } from './entry'
import { NonEmptyArray, assertNonEmptyString, assertNonEmptyArray } from './types'
import { Pipe, pipe as makePipe } from './pipe'

/* ========================================================================== */

function assertFastGlobEntry(entry: any): asserts entry is fg.Entry {
  assert((typeof entry === 'object') && (typeof entry.path === 'string') &&
    (entry.dirent instanceof Dirent), 'Entry is not a FastGlob.Entry')
}

function direntType(entry: Dirent) {
  if (entry.isFIFO()) return 'fifo'
  if (entry.isFile()) return 'file'
  if (entry.isSocket()) return 'socket'
  if (entry.isDirectory()) return 'directory'
  if (entry.isBlockDevice()) return 'block device'
  if (entry.isSymbolicLink()) return 'symbolic link'
  if (entry.isCharacterDevice()) return 'character device'
  return 'unknown'
}

/* ========================================================================== */

/* Options we want to _force_ to fast-glob */
const forcedOptions: fg.Options = {
  objectMode: true, // always in object mode (get `Dirent`)
  unique: true, // de-dupe all paths whenever possible
  absolute: false, // never return the absolute path
  markDirectories: false, // never mark directories
  onlyDirectories: false, // never read directories
  onlyFiles: true, // only read files
}

/* Options we want to use as _defaults_ for fast-glob */
const defaultOptions: fg.Options = Object.assign({
  deep: Infinity, // infinite depth
  followSymbolicLinks: true, // follow symlinks
  ignore: [], // no extra ignores
  caseSensitiveMatch: true, // always case sensitive, it's 2020
  dot: false, // exclude .files by default
  baseNameMatch: false, // no base name matching
}, forcedOptions) // also include forced options above

/* ========================================================================== */

/**
 * Our `Options` represent a very strict _subset_ of the FastGlob options
 */
export type ProcessorOptions = {
  from?: string // our options, basically "cwd"

  // all others are inherited from fg.Options
  deep?: number
  followSymbolicLinks?: boolean
  ignore?: string[]
  caseSensitiveMatch?: boolean
  dot?: boolean
  baseNameMatch?: boolean
}

/* ========================================================================== */

/**
 * A `Processor` represents a `Task` processing a number of files **with** a
 * set of  of `Plugin`s, and finally (optionally) writing them **to** a
 * destination directory.
 */
export interface Processor extends TaskCall {
  /** Append a `Plugin` instance to the ones used by this `Processor` */
  with:
    ((plugin: Plugin) => this) |
    ((handler: PluginHandler) => this) |
    ((name: string, handler: PluginHandler) => this)

  /** This `Processor` will write processed file to the specified directory */
  to: (destination: string) => TaskCall,
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
export function process(pattern: string, options?: ProcessorOptions): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, options?: ProcessorOptions): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, options?: ProcessorOptions): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, pattern4: string, options?: ProcessorOptions): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param pattern - The _glob pattern_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(pattern: string, pattern2: string, pattern3: string, pattern4: string, pattern5: string, options?: ProcessorOptions): Processor

/**
 * Create a new `Processor` processing files matching the specified _glob
 * patterns_
 *
 * @param patterns - An array of  _glob patterns_ matching the files to process
 * @param options - The _options_ customizing how matching is performed
 */
export function process(patterns: NonEmptyArray<string>, options?: ProcessorOptions): Processor

/* Overloaded signature */
export function process(...args: any[]): Processor {
  // Process our arguments, the last one _might_ be globbing options
  const globs: string[] = args.flat() // keep the string[] type, even if we might have an object

  // Process the options, starting with defaults, and overriding with forced options
  const processorOptions: ProcessorOptions = typeof globs[globs.length - 1] === 'object' ? <any> globs.pop() : {}
  const globOptions: fg.Options = Object.assign({}, defaultOptions, processorOptions, forcedOptions)

  // Triple check everything we have is a valid string, and that we have at least one glob
  globs.forEach((glob, index) => assertNonEmptyString(glob, `Glob at position ${index} must be a non-empty string`))
  assertNonEmptyArray(globs, 'No globs specified')

  // Remember our "from" (and pass it as the "cwd" to glob) as the current "cwd" or relative "from" argument
  const from = globOptions.cwd = processorOptions.from ? resolve(processorOptions.from, cwd()).resolved : cwd()

  // Keep our destination here
  let to: string | undefined = undefined

  // Our list of plugins, in order
  const plugins: Plugin[] = []

  // Our matches, to remove duplicates
  const matches = new Map<String, Promise<void>>()

  // Create our processor
  const processor = async (context: TaskContext) => {
    const pipe = makePipe(context, plugins)
    await pipe.init()

    for await (const entry of fg.stream(globs, globOptions)) {
      assertFastGlobEntry(entry)
      const dirent: Dirent = entry.dirent

      const match =
        dirent.isFile() ? new FileEntry(entry.path, from, to) :
        dirent.isDirectory() ? new DirectoryEntry(entry.path, from, to) :
        undefined

      if (! match) {
        console.log('Cowardly refusing to process', entry.name, 'of type', direntType(entry.dirent))
        continue
      }

      if (matches.has(match.fromSourcePath)) {
        console.log('Cowardly refusing to process', entry.name, 'more than once')
        continue
      }

      matches.set(match.fromSourcePath, Promise.resolve())
      // console.log(match)
    }

    await Promise.all(matches.values())
  }

  // Append a plugin to our list of plugins
  processor.with = (pluginOrName: string | Plugin | PluginHandler, optionalHandler?: PluginHandler) => {
    const plugin =
      typeof pluginOrName === 'object' ? pluginOrName :
      typeof pluginOrName === 'function' ? Plugin.wrap(pluginOrName) :
      typeof pluginOrName === 'string' && optionalHandler ? Plugin.wrap(pluginOrName, optionalHandler) :
      assert.fail(`Invalid arguments for with(${typeof pluginOrName}, ${typeof optionalHandler})`)
    plugins.push(plugin)
    return processor
  }

  // Declare our destination folder and
  processor.to = (destination: string) => {
    console.log(destination)
    assertNonEmptyString(destination, 'Destination must be a non-empty string')
    assert.strictEqual(to, undefined, 'Destination already specified')
    to = resolve(destination, cwd()).resolved
    return (context: TaskContext) => processor(context) // this kills "with(...)"
  }

  return processor
}
