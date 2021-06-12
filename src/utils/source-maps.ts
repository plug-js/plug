import { URL, pathToFileURL, fileURLToPath } from 'url'
import { RawSourceMap } from 'source-map'
import { VirtualFile } from '../virtual-file-system'
import { EOL } from 'os'

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

/**
 * Extract the source mapping URL from a chunk of code, optionally wiping it.
 *
 * @param contents The code where the source mapping URL is located.
 * @param wipe Whether to wipe the URL from the source or not.
 */
export function extractSourceMappingURL(
    contents: string,
    wipe: boolean,
): { contents: string, url?: string } {
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

/* Parse an inline sourcemap or return the sourcemap file */
function readSourceMapInternal(
    file: VirtualFile,
    url?: string,
): { sourceMap?: RawSourceMap, sourceMapFile?: VirtualFile } {
  // No URL? No source map!
  if (! url) return {}

  // Decode the base64 from inline source maps
  if (innlineSourceMapRegExp.test(url)) {
    const rawData = url.slice(url.indexOf(',') + 1)
    const sourceMapData = Buffer.from(rawData, 'base64').toString('utf8')
    return { sourceMap: JSON.parse(sourceMapData) }
  }

  // This is an URL (relative or whatnot) resolve it!
  const base = pathToFileURL(file.absolutePath)
  const resolved = new URL(url, base)

  // If the resolved URL is not a file, don't read the source map
  if (resolved.protocol !== 'file:') return {}

  // If the source map file does not exist, don't read the source map
  const sourceMapFile = file.fileSystem.get(fileURLToPath(resolved))
  return { sourceMapFile }
}

/**
 * Read the source map identified by its URL for a virtual file.
 *
 * @param file The virtual file for which the source map is being read.
 * @param url The URL of the source map to read.
 */
export async function readSourceMap(
    file: VirtualFile,
    url?: string,
): Promise<RawSourceMap | undefined> {
  const { sourceMap, sourceMapFile } = readSourceMapInternal(file, url)

  if (sourceMap) return sourceMap
  if (sourceMapFile && await sourceMapFile.exists()) {
    return JSON.parse(await sourceMapFile.contents())
  }
}

/**
 * Read the source map identified by its URL for a virtual file.
 *
 * @param file The virtual file for which the source map is being read.
 * @param url The URL of the source map to read.
 */
export function readSourceMapSync(
    file: VirtualFile,
    url?: string,
): RawSourceMap | undefined {
  const { sourceMap, sourceMapFile } = readSourceMapInternal(file, url)

  if (sourceMap) return sourceMap
  if (sourceMapFile && sourceMapFile.existsSync()) {
    return JSON.parse(sourceMapFile.contentsSync())
  }
}
