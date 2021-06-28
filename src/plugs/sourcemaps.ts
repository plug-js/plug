import type { File } from '../files'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { RawSourceMap } from 'source-map'
import type { Run } from '../run'
import type { SourceMapOptions } from '../sourcemaps'

import { Files } from '../files'
import { SOURCE_MAPPING_URL } from '../sourcemaps'
import { basename, sep } from 'path'
import { createFilePath, FilePath, getParent, getRelativeFilePath } from '../utils/paths'
import { install } from '../pipe'
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

  protected async processFile(from: File, to: FilePath, files: Files, log: Log): Promise<File[]> {
    const fileSourceMap = await from.sourceMap()
    const added: File[] = []

    let url // this will be the url to inject in the content, if any
    if (this.sourceMaps && fileSourceMap) {
      // produce the _real_ sourcemap, combining, attaching, ...
      const sourceMap = await fileSourceMap.produceSourceMap(this.#sourceMapOptions)

      // re-relativize all our paths before writing: "sources" is relative to
      // the _source_ file, and we remap them relative to the _target_ file...
      const sourceDirectory = getParent(from.absolutePath)
      sourceMap.sources = sourceMap.sources.map((source) => {
        const absoluteSource = createFilePath(sourceDirectory, source)
        const relativeSource = getRelativeFilePath(to, absoluteSource)
        if (relativeSource.startsWith('..' + sep)) return relativeSource
        return `.${sep}${relativeSource}`
      })

      // then replace the file and inject any source root
      sourceMap.file = basename(to)
      if (this.#sourceRoot) sourceMap.sourceRoot = this.#sourceRoot

      // we can finally get the JSON out of this sourcemap
      const encodedSourceMap = encodeSourceMap(sourceMap)

      // if we need to inline the source map, we need to encode the JSON
      if (this.sourceMaps === 'inline') {
        log.trace(`Inlining source map into "${to}`)

        // the spec says that data URIs use plain "base64", not "base64url"
        const base64 = Buffer.from(encodedSourceMap, 'utf8').toString('base64')
        url = `data:application/json;base64,${base64}`
      } else {
        // if we need to write an external source map, then we add a file...
        log.trace(`Adding external source map to "${to}`)

        // add the file as "file.ext.map"
        const path = to + '.map'
        url = basename(path)
        added.push(files.add(path, {
          contents: encodedSourceMap, // the JSON
          originalPath: from.absolutePath, // derived from our file
          sourceMap: false, // definitely there is no sourcemap here
        }))
      }
    }

    // reading contents will strip the original source map (if any)
    let contents = await from.contents()

    // if we have a URL to our sourcemap we'll add it to the content
    if (url) contents += `\n//# ${SOURCE_MAPPING_URL}=${url}`

    // add our file with the modified source map
    added.push(files.add(to, {
      contents,
      sourceMap: fileSourceMap || false,
      originalPath: from.originalPath,
    }))

    // return what we added
    return added
  }

  async process(input: Files, run: Run, log: Log): Promise<Files> {
    const output = input.fork()
    const time = log.start()

    await parallelize(input, (file) =>
      this.processFile(file, file.absolutePath, output, log))

    log.debug('Processed source maps for', input.length, 'files in', time)
    return output
  }
}

export const sourcemaps = install('sourcemaps', SourceMapsPlug)
