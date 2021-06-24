import type { FilePath } from '../utils/paths'

import { FileSourceMap } from './file'
import { URL, fileURLToPath, pathToFileURL } from 'url'

// Lifted from "source-map-support"
const innlineSourceMapRegExp = /^data:application\/json[^,]+base64,/

/* ========================================================================== *
 * EXPORTED FUNCTIONS                                                         *
 * ========================================================================== */

// Internal types for sanity...
type ParsedSourceMappingURL = { sourceMap?: FileSourceMap, sourceMapFile?: FilePath }

/**
 * Parse a source mapping URL returning either a raw sourcemap (if inline,
 * as a base-64 data URL) or the path to an external _file_ where the sourcemap
 * can be read from.
 *
 * Any non-file URLs for source maps will be ignored
 *
 * @param path The absolute path of the file containing the source mapping url
 * @param url The source map URL to parse as a sourcemap or external file
 */
export function parseSourceMappingURL(path: FilePath, url?: string): ParsedSourceMappingURL {
  // No URL? No source map!
  if (! url) return {}

  // Decode the base64 from inline source maps
  if (innlineSourceMapRegExp.test(url)) {
    const rawData = url.slice(url.indexOf(',') + 1)
    const sourceMapData = Buffer.from(rawData, 'base64').toString('utf8')
    const sourceMapSource = JSON.parse(sourceMapData)
    return { sourceMap: FileSourceMap.for(path, sourceMapSource) }
  }

  // This is an URL (relative or whatnot) resolve it!
  const base = pathToFileURL(path)
  const resolved = new URL(url, base)

  // If the resolved URL is not a file, don't read the source map
  if (resolved.protocol !== 'file:') return {}

  // If the source map file does not exist, don't read the source map
  const sourceMapFile = fileURLToPath(resolved) as FilePath
  return { sourceMapFile }
}
