import type { FilePath } from '../utils/paths'
import type { FileSourceMap } from './source-map'

import { extractSourceMappingURL } from './extract'
import { parseSourceMappingURL } from './parse'

export { FileSourceMap } from './source-map'

interface ExtractedSourceMap {
  contents: string,
  sourceMap?: FileSourceMap,
  sourceMapFile?: FilePath,
}

/**
 * The `sourceMappingURL` constant (without any leading comment marker or
 * trailing equal sign) exposed here so that we don't end up with false
 * positives when compiling our own code
 */
export const SOURCE_MAPPING_URL = 'sourceMappingURL'

/**
 * Extracts, optionally wiping, a source mapping url from some code at the
 * specified path, returning either the source map or the location of the
 * external file containing it
 *
 * @param path The absolute path of the code to parse
 * @param code The code to parse for source mapping URLs
 * @param wipe Whether to wipe the source mapping URL from the file or not
 */
export function extractSourceMap(path: FilePath, code: string, wipe: boolean): ExtractedSourceMap {
  const { contents, url } = extractSourceMappingURL(code, wipe)
  const { sourceMap, sourceMapFile } = parseSourceMappingURL(path, url)
  return { contents, sourceMap, sourceMapFile }
}
