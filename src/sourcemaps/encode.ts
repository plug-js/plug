import type { RawSourceMap } from 'source-map'

/** Encode a `RawSourceMap` into a `string` strictly adhering to the spec */
export function encodeSourceMap(sourceMap: RawSourceMap): string {
  // The sourcemap URL clearly states that "version" must come first, so we take
  // no chances here when encoding our source map... call me paranoid...
  // https://sourcemaps.info/spec.html
  const array = [ `{"version":${JSON.stringify(sourceMap.version /* istanbul ignore next */ || 3)}` ]
  // istanbul ignore else - the spec says "name" is optional, but we always have it
  if (sourceMap.file) array.push(`,"file":${JSON.stringify(sourceMap.file)}`)
  // Spec says "sourceRoot" is optional
  if (sourceMap.sourceRoot) array.push(`,"sourceRoot":${JSON.stringify(sourceMap.sourceRoot)}`)
  // Spec says "sources" must be there
  array.push(`,"sources":${JSON.stringify(sourceMap.sources /* istanbul ignore next */ || [])}`)
  // Spec says "sourcesContent" is optional
  if (sourceMap.sourcesContent) array.push(`,"sourcesContent":${JSON.stringify(sourceMap.sourcesContent)}`)
  // Spec says "names" must be there
  array.push(`,"names":${JSON.stringify(sourceMap.names /* istanbul ignore next */ || [])}`)
  // Spec says "mappings" must be there
  array.push(`,"mappings":${JSON.stringify(sourceMap.mappings || '')}`)
  // Done with the fields in the correct order
  array.push('}')

  // Encode the string... Data URIs use plain base64 (not URL-encoded)
  return array.join('')
}
