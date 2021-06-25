import type { DirectoryPath } from './paths'
import type { Options } from 'fast-glob'
import type { FilterOptions, GlobOptions } from '../types/globs'

import assert from 'assert'

import { GLOB_OPTIONS_DEFAULTS } from '../types/globs'
import { stream } from 'fast-glob'

// Our defaults for "fast-glob"
const FAST_GLOB_DEFAULTS: Readonly<Required<Omit<Options, 'cwd' | 'fs'>>> = Object.freeze({
  ...GLOB_OPTIONS_DEFAULTS,
  absolute: false, // VFS always does the resolution
  markDirectories: false, // do not mark directories
  onlyDirectories: false, // no directories
  onlyFiles: true, // only files
  stats: false, // no stats
  suppressErrors: false, // report errors
  unique: false, // VFS already dedupes files
  objectMode: false, // Always paths, never objects
})


type GlobsAndOptions<O> = { globs: [ string, ...string[] ], options?: O }
export type GlobParameters<O> = [ string, ...string[] ] | [ string, ...string[], O ]

/**
 * Parse an array of at least one string, followed by an optional `Options`
 * argument.
 */
export function parseGlobOptions<Options extends FilterOptions>(
    args: GlobParameters<Options>,
): GlobsAndOptions<Options> {
  const last = args.splice(-1)[0]

  const { patterns: globs, options } = typeof last === 'string' ? {
    patterns: [ ...args as string[], last ],
    options: undefined,
  } : {
    patterns: [ ...args as string[] ],
    options: last,
  }

  assert(globs.length > 0, 'No glob patterns specified')

  return { globs: globs as [ string, ...string[] ], options }
}

/**
 * Process globs.
 */
export async function glob(
    directory: DirectoryPath,
    globs: string[],
    options: GlobOptions,
    callback: (entry: string) => void | Promise<void>,
): Promise<void> {
  // Prepare the glob options, assigning our defaults and current directory
  const opts: Options = {
    ...options,
    ...FAST_GLOB_DEFAULTS,
    cwd: directory,
  }

  // istanbul ignore else - Ignore node modules by default
  if (! options.includeNodeModules) {
    opts.ignore = options.ignore || []
    opts.ignore.push('**/node_modules')
  }

  // Invoke the callback for each of our matched files
  for await (const entry of stream(globs, opts)) {
    await callback(entry.toString())
  }
}
