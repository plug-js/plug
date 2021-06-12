import { URL, pathToFileURL, fileURLToPath } from 'url'
import { RawSourceMap } from 'source-map'
import { EOL } from 'os'
import { AbsolutePath } from './paths'

// Lifted from WebPack's "source-map-loader "
const innerRegex = /\s*[#@]\s*sourceMappingURL\s*=\s*([^\s'"]*)\s*/
const sourceMappingURLRegExp = RegExp(
    '(?:' +
    '/\\*' +
    '(?:\\s*\r?\n(?://)?)?' +
    '(?:' +
    innerRegex.source +
    ')' +
    '\\s*' +
    '\\*/' +
    '|' +
    '//(?:' +
    innerRegex.source +
    ')' +
    ')' +
    '\\s*',
)

// Lifted from "source-map-support"
const innlineSourceMapRegExp = /^data:application\/json[^,]+base64,/

/* ========================================================================== *
 * EXPORTED FUNCTIONS                                                         *
 * ========================================================================== */

// Internal types for sanity...
type ExtractedSourceMapURL = { contents: string, url?: string }
type ParsedSourceMap = { sourceMap?: RawSourceMap, sourceMapFile?: AbsolutePath }
type ExtractedSourceMap = ParsedSourceMap & { contents: string }

/**
 * Extract the source mapping URL from a chunk of code, optionally wiping it.
 *
 * @param contents The code where the source mapping URL is located.
 * @param wipe Whether to wipe the URL from the source or not.
 */
export function extractSourceMappingURL(contents: string, wipe: boolean): ExtractedSourceMapURL {
  // Split the code into lines
  const lines = contents.split(/^/m)

  // Match the _last_ source mapping URL
  let match
  for (let i = lines.length - 1; i >= 0; i--) {
    match = lines[i].match(sourceMappingURLRegExp)
    if (match) {
      break
    }
  }

  // No match? No URL!
  if (! match) return { contents }

  // Sanitize the URL (we have to have something)
  const url = (match[1] || match[2] || '').trim()
  if (! url) return { contents }

  // If we don't have to wipe, we're done here
  if (! wipe) return { contents, url }

  // Wipe the sourceMappingURL preserving line numbers
  const newlines = match[0].match(new RegExp(EOL, 'gm'))?.length
  const replacement = EOL.repeat(newlines || 0)
  return { contents: contents.replace(match[0], replacement), url }
}

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
export function parseSourceMappingURL(path: AbsolutePath, url?: string): ParsedSourceMap | undefined {
  // No URL? No source map!
  if (! url) return

  // Decode the base64 from inline source maps
  if (innlineSourceMapRegExp.test(url)) {
    const rawData = url.slice(url.indexOf(',') + 1)
    const sourceMapData = Buffer.from(rawData, 'base64').toString('utf8')
    return { sourceMap: JSON.parse(sourceMapData) }
  }

  // This is an URL (relative or whatnot) resolve it!
  const base = pathToFileURL(path)
  const resolved = new URL(url, base)

  // If the resolved URL is not a file, don't read the source map
  if (resolved.protocol !== 'file:') return

  // If the source map file does not exist, don't read the source map
  const sourceMapFile = fileURLToPath(resolved) as AbsolutePath
  return { sourceMapFile }
}

/**
 * Extracts, optionally wiping, a source mapping url from some code at the
 * specified path, returning either the source map or the location of the
 * external file containing it
 *
 * @param path The absolute path of the code to parse
 * @param code The code to parse for source mapping URLs
 * @param wipe Whether to wipe the source mapping URL from the file or not
 */
export function extractSourceMap(path: AbsolutePath, code: string, wipe: boolean): ExtractedSourceMap | undefined {
  const { contents, url } = extractSourceMappingURL(code, wipe)
  const parsedSourceMap = parseSourceMappingURL(path, url)
  if (parsedSourceMap) return { contents, ...parsedSourceMap }
}
