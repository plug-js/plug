import { RawSourceMap } from 'source-map'
import { encodeSourceMap } from './encode'

/**
 * The `sourceMappingURL` constant (without any leading comment marker or
 * trailing equal sign) exposed here so that we don't end up with false
 * positives when compiling our own code
 */
export const SOURCE_MAPPING_URL = 'sourceMappingURL'

export function appendSourceMap(source: string, sourceMap: RawSourceMap, inline: true): [ string ]
export function appendSourceMap(source: string, sourceMap: RawSourceMap, inline: false): [ string, string ]
export function appendSourceMap(source: string, sourceMap: RawSourceMap, inline: boolean): string[] {
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
