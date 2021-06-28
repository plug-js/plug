import { basename } from 'path'
import { RawSourceMap } from 'source-map'
import { encodeSourceMap } from './encode'

/**
 * The `sourceMappingURL` constant (without any leading comment marker or
 * trailing equal sign) exposed here so that we don't end up with false
 * positives when compiling our own code
 */
export const SOURCE_MAPPING_URL = 'sourceMappingURL'

export function appendSourceMap(file: string, source: string, inputSourceMap: RawSourceMap, inline: true, sourceRoot?: string): [ string ]
export function appendSourceMap(file: string, source: string, inputSourceMap: RawSourceMap, inline: false, sourceRoot?: string): [ string, string ]
export function appendSourceMap(file: string, source: string, inputSourceMap: RawSourceMap, inline: boolean, sourceRoot?: string): string[] {
  // First of all clone the source map
  const sourceMap = { ...inputSourceMap }

  // then replace the file and inject any source root
  sourceMap.file = basename(file)
  if (sourceRoot) sourceMap.sourceRoot = sourceRoot

  // we can finally get the JSON out of this sourcemap
  const encodedSourceMap = encodeSourceMap(sourceMap)

  // if we need to inline the source map, we need to encode the JSON
  if (inline) {
    // the spec says that data URIs use plain "base64", not "base64url"
    const base64 = Buffer.from(encodedSourceMap, 'utf8').toString('base64')
    const url = `data:application/json;base64,${base64}`
    return [ `${source}\n//# ${SOURCE_MAPPING_URL}=${url}` ]
  } else {
    // add the file as "file.ext.map"
    const url = `${sourceMap.file}.map`
    return [ `${source}\n//# ${SOURCE_MAPPING_URL}=${url}`, encodedSourceMap ]
  }
}
