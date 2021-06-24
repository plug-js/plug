import type { Log } from '../utils/log'
import type { RawSourceMap } from 'source-map'
import type { Run } from '../run'
import type { SourceMapOptions } from '../source-maps/source-map'
import type { Plug } from '../pipe'

import { File, Files } from '../files'
import { basename } from 'path'
import { install } from '../pipe'
import { SOURCE_MAPPING_URL } from '../source-maps'
import { parallelize } from '../utils/parallelize'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    sourcemaps: PlugExtension<P, typeof SourceMapsPlug>
  }
}

export interface SourceMapsOptions {
  /**
   * How to write source maps, whether they need to be `inline`, saved as an
   * external file (`external`), or stripped entirely (`none`)
   *
   * @default 'inline'
   */
  sourceMaps?: 'inline' | 'external' | 'none'

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
function encodeSourceMap(sourceMap: RawSourceMap): string {
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
  return array.join('')
}

export class SourceMapsPlug implements Plug {
  protected readonly sourceMaps: 'inline' | 'external' | undefined

  #sourceMapOptions: SourceMapOptions
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
    this.sourceMaps = sourceMaps === 'none' ? undefined : sourceMaps
    this.#sourceRoot = sourceRoot
    this.#sourceMapOptions = { attachSources, combineSourceMaps: combineSourceMaps }
  }

  protected async processFile(file: File, log: Log, files: Files): Promise<File[]> {
    const fileSourceMap = await file.sourceMap()
    const added: File[] = []

    let url // this will be the url to inject in the content, if any
    if (this.sourceMaps && fileSourceMap) {
      // produce the _real_ sourcemap, combining, attaching, ...
      const sourceMap = await fileSourceMap.produceSourceMap(this.#sourceMapOptions)
      const encodedSourceMap = encodeSourceMap(sourceMap) // JSON!

      // attach any "sourceRoot" info to the real source map
      if (this.#sourceRoot) sourceMap.sourceRoot = this.#sourceRoot

      // if we need to inline the source map, we need to encode the JSON
      if (this.sourceMaps === 'inline') {
        log.trace(`Inlining source map to "${file.absolutePath}`)

        // the spec says that data URIs use plain "base64", not "base64url"
        const base64 = Buffer.from(encodedSourceMap, 'utf8').toString('base64')
        url = `data:application/json;base64,${base64}`

      // if we need to write an external source map, then we add a file...
      } else if (this.sourceMaps === 'external') {
        log.trace(`Adding external source map to "${file.absolutePath}`)

        // add the file as "file.ext.map"
        const path = file.absolutePath + '.map'
        url = basename(path)
        added.push(files.add(path, {
          contents: encodedSourceMap, // the JSON
          originalPath: file.absolutePath, // derived from our file
          sourceMap: false, // definitely there is no sourcemap here
        }))
      }
    }

    // reading contents will strip the original source map (if any)
    let contents = await file.contents()

    // if we have a URL to our sourcemap we'll add it to the content
    if (url) contents += `\n//# ${SOURCE_MAPPING_URL}=${url}`

    // add our file with the modified source map
    added.push(files.add(file.absolutePath, {
      contents,
      sourceMap: fileSourceMap || false,
      originalPath: file.originalPath,
    }))

    // return what we added
    return added
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = new Files(run)
    const now = Date.now()

    await parallelize(input, (file) => this.processFile(file, log, output))

    log.debug('Processed source maps for', input.length, 'files in', Date.now() - now, 'ms')
    return output
  }
}

export const sourcemaps = install('sourcemaps', SourceMapsPlug)
