import type { Log } from '../utils/log'
import type { RawSourceMap } from 'source-map'
import type { Run } from '../run'
import type { SourceMapOptions } from '../source-maps/source-map'
import type { Plug } from '../pipe'

import { Files } from '../files'
import { basename } from 'path'
import { install } from '../pipe'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    sourcemaps: PlugExtension<P, typeof SourceMapsPlug>
  }
}

export interface SourceMapsOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`true`), or not generated at all (`false`)
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | boolean

  /**
   * The `sourceRoot` to inject in source maps
   *
   * @default undefined
   */
  sourceRoot?: string

  /**
   * Whether to combine source maps resulting from multiple transformation
   * stages or not
   *
   * @default true
   */
  combineSourceMaps?: boolean

  /**
   * Whether to attach the original sources the the source maps.
   *
   * @default false
   */
   attachSources?: boolean
}

// The sourcemap URL clearly states that "version" must come first, so we take
// no chances here when encoding our source map... call me paranoid...
// https://sourcemaps.info/spec.html
function encodeSourceMap(sourceMap: RawSourceMap, base64: boolean): string {
  // Version always comes first
  const array = [ `{"version":${JSON.stringify(sourceMap.version || 3)}` ]
  // Spec says "name" is optional
  if (sourceMap.file) array.push(`,"file":${JSON.stringify(sourceMap.file)}`)
  // Spec says "sourceRoot" is optional
  if (sourceMap.sourceRoot) array.push(`,"sourceRoot":${JSON.stringify(sourceMap.sourceRoot)}`)
  // Spec says "sources" must be there
  array.push(`,"sources":${JSON.stringify(sourceMap.sources || [])}`)
  // Spec says "sourcesContent" is optional
  if (sourceMap.sourcesContent) array.push(`,"sourcesContent":${JSON.stringify(sourceMap.sourcesContent)}`)
  // Spec says "names" must be there
  array.push(`,"names":${JSON.stringify(sourceMap.names || [])}`)
  // Spec says "mappings" must be there
  array.push(`,"mappings":${JSON.stringify(sourceMap.mappings || [])}`)
  // Done with the fields in the correct order
  array.push('}')

  // Encode the string... Data URIs use plain base64 (not URL-encoded)
  const encoded = array.join('')
  return base64 ? Buffer.from(encoded, 'utf8').toString('base64') : encoded
}

export class SourceMapsPlug implements Plug {
  // #encoding: BufferEncoding
  #sourceMapOptions: SourceMapOptions
  #sourceMaps: 'inline' | boolean
  #sourceRoot?: string

  constructor(options: SourceMapsOptions = {}) {
    // Other options with defaults...
    const {
      sourceMaps = 'inline',
      sourceRoot = undefined,
      combineSourceMaps = true,
      attachSources = false,
    } = options

    // Setup what we need
    this.#sourceMaps = sourceMaps
    this.#sourceRoot = sourceRoot
    this.#sourceMapOptions = { attachSources, combineSourceMaps: combineSourceMaps }
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = new Files(run)
    const now = Date.now()

    for (const file of input) {
      const fileSourceMap = await file.sourceMap()

      let sourceMap
      if (this.#sourceMaps) { // either "inline" or true
        sourceMap = await fileSourceMap?.produceSourceMap(this.#sourceMapOptions)
      }

      let url
      if (sourceMap && this.#sourceMaps === 'inline') {
        log.trace(`Inlining source map to "${file.absolutePath}`)
        url = `data:application/json;base64,${encodeSourceMap(sourceMap, true)}`
      } else if (sourceMap && this.#sourceMaps) {
        log.trace(`Adding external source map to "${file.absolutePath}`)
        const path = file.absolutePath + '.map'
        url = basename(path)
        const contents = encodeSourceMap(sourceMap, false)
        output.add(path, {
          contents,
          sourceMap: false,
          originalPath: file.absolutePath,
        })
      }

      let contents = await file.contents()
      if (url) contents += `\n//# sourceMappingURL=${url}`
      output.add(file.absolutePath, {
        contents,
        sourceMap: fileSourceMap || false,
        originalPath: file.originalPath,
      })
    }

    log.debug('Processed source maps for', input.length, 'files in', Date.now() - now, 'ms')
    return output
  }
}

export const sourcemaps = install('sourcemaps', SourceMapsPlug)
