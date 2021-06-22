import { FilePath } from '../utils/paths'
import { SourceMapV3 } from './source-map'
import { extractSourceMappingURL } from './extract'
import { parseSourceMappingURL } from './parse'

export { SourceMapV3, FileSourceMap } from './source-map'

interface ExtractedSourceMap {
  contents: string,
  sourceMap?: SourceMapV3,
  sourceMapFile?: FilePath,
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
export function extractSourceMap(path: FilePath, code: string, wipe: boolean): ExtractedSourceMap {
  const { contents, url } = extractSourceMappingURL(code, wipe)
  const parsedSourceMap = parseSourceMappingURL(path, url)
  if (parsedSourceMap) return { contents, ...parsedSourceMap }
  return { contents: code }
}
