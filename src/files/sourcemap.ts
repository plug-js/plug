import assert from 'assert'

import { SourceMapConsumer, SourceMapGenerator } from 'source-map'
import { createFilePath, getParent, getRelativeFilePath } from '../utils/paths'

import type { File } from './file'
import type { Files } from './files'
import type { FilePath } from '../utils/paths'
import type { RawSourceMap } from 'source-map'

import { fileURLToPath, pathToFileURL, URL } from 'url'
import { basename, sep } from 'path'
import { extractSourceMappingURL, parseSourceMappingURL } from '../sourcemaps'

export interface SourceMapOptions {
  /**
   * Whether to attach the original source code to this sitemam or not.
   *
   * @default false
   */
  attachSources?: boolean
  /**
   * Whether to recursively process source maps to map to the _original_
   * source of a transformation pipeline.
   *
   * @default true
   */
  combineSourceMaps?: boolean
}

export class FileSourceMap {
  readonly #mappings: string
  readonly #names: readonly string[]
  readonly #sources: readonly URL[]
  readonly #sourcesContent: (string | null | undefined)[]
  readonly #attachedSources: readonly (File | undefined)[]

  /**
   * Construct a `FileSourceMap` from a `RawSourceMap`.
   *
   * @param path The path where the source map was read from, either the file
   *             containing an inline source map or the name of the ".map" file
   * @param data The `RawSourceMap` as parsed from the original file
   * @param files A `Files` instance where attached sources can be found
   */
  constructor(path: FilePath, files: Files, data: RawSourceMap) {
    // Normally this comes from JSON (any) so be extra careful
    assert(data && (typeof data === 'object'), `Raw source map from "${path}" is not an object`)
    assert(data.version && (data.version.toString() === '3'), `Invalid source map version in "${path}"`)

    const url = pathToFileURL(path)
    const dir = getParent(path)

    const root = data.sourceRoot ? data.sourceRoot.toString() : ''

    this.#mappings = typeof data.mappings === 'string' ? data.mappings : ''
    this.#names = Array.isArray(data.names) ?
        data.names.map((name) => {
          assert(name && (typeof name === 'string'), `Invalid name "${name}" in source map for "${path}"`)
          return name
        }) : []

    const sources: URL[] = []
    const attachedSources: (File | undefined)[] = []
    if (Array.isArray(data.sources)) {
      data.sources.forEach((string) => {
        assert(string && (typeof string === 'string'), `Invalid source "${string}" in source map for "${path}"`)
        const source = root + string // spec says it's only a concatenation...
        attachedSources.push(files.get(createFilePath(dir, source)))
        sources.push(new URL(source, url))
      })
    }
    this.#sources = sources
    this.#attachedSources = attachedSources

    this.#sourcesContent = this.#attachedSources.map((source) => {
      // "null" means we can't read, there is no content and there will be
      // no content... "undefined" means that we have a source, so we'll read
      return source === undefined ? null : undefined
    })

    // If we have some sources content from the sourcemap, we inject them
    if (Array.isArray(data.sourcesContent)) {
      data.sourcesContent.slice(0, this.#sourcesContent.length).forEach((content, i) => {
        if (typeof content === 'string') this.#sourcesContent[i] = content
      })
    }
  }

  get mappings(): string {
    return this.#mappings
  }

  get names(): string[] {
    return [ ...this.#names ]
  }

  get sources(): URL[] {
    return [ ...this.#sources ]
  }

  get attachedSources(): (File | undefined)[] {
    return [ ...this.#attachedSources ]
  }

  get sourcesContent(): (string | null | undefined)[] {
    return [ ...this.#sourcesContent ]
  }

  /* ======================================================================== */

  readSourcesContent(): Promise<string[]> {
    // note the "null as any as string" in here... those mean that the original
    // sources are not available... the spec allows it and "source-map" uses
    // them when setting source contents only a _subset_ of all mapped sources,
    // so I tend to think that that type declared by RawSourceMap is wrong
    return Promise.all(this.#sourcesContent.map(async (content, i) => {
      if (typeof content === 'string') return content
      if (content === null) return null as any as string

      // read the original file and store the contents here, too...
      return this.#sourcesContent[i] = await this.#attachedSources[i]!.contents()
    }))
  }

  /* ======================================================================== */

  // produce a simple source map with file and sources as full non-relative URLs
  async #produceSimpleSourceMap(path: FilePath, attachSources: boolean): Promise<RawSourceMap> {
    // create a new raw source map
    const sourceMap: RawSourceMap = {
      version: 3,
      file: pathToFileURL(path).href,
      mappings: this.#mappings,
      names: [ ...this.#names ],
      sources: this.#sources.map((url) => url.href),
    }

    // attach any source, if we have to
    if (attachSources) sourceMap.sourcesContent = await this.readSourcesContent()

    // done!
    return sourceMap
  }

  async #produceCombinedSourceMap(path: FilePath, attachSources: boolean): Promise<RawSourceMap> {
    // start with a raw source map with all absolute URLs
    const original = await this.#produceSimpleSourceMap(path, attachSources)

    // see if we have any attached source, and if so, get its file sourcemap
    // associated with the URL where this instance sees that source
    const rawSourceMaps: RawSourceMap[] = []
    for (let i = 0; i < this.#attachedSources.length; i ++) {
      const fileSourceMap = await this.#attachedSources[i]?.sourceMap()
      if (! fileSourceMap) continue

      const sourcePath = fileURLToPath(this.#sources[i]) as FilePath
      const rawSourceMap = fileSourceMap.#produceCombinedSourceMap(sourcePath, attachSources)
      rawSourceMaps.push(await rawSourceMap)
    }

    // check if we have any source map to process, otherwise...
    if (rawSourceMaps.length === 0) return original

    // start consuming _this_ source map and creating a generator for combining
    const combined = await SourceMapConsumer.with(original, null, async (consumer) => {
      const generator = SourceMapGenerator.fromSourceMap(consumer)

      // Apply all other sourcemaps to this one...
      for (const rawSourceMap of rawSourceMaps) {
        await SourceMapConsumer.with(rawSourceMap, null, (consumer) => {
          generator.applySourceMap(consumer)
        })
      }

      // All merged and ready to go!
      return generator.toJSON()
    })

    // All done here!
    return combined
  }

  /* ======================================================================== */

  async produceSourceMap(path: FilePath, options: SourceMapOptions = {}): Promise<RawSourceMap> {
    const { attachSources = false, combineSourceMaps: combinedSourceMap = true } = options
    const sourceMap = combinedSourceMap ?
        await this.#produceCombinedSourceMap(path, attachSources) :
        await this.#produceSimpleSourceMap(path, attachSources)

    sourceMap.file = basename(path)
    sourceMap.sources = sourceMap.sources.map((source) => {
      if (! source.startsWith('file:')) return source
      const absolutePath = fileURLToPath(source) as FilePath
      const relativePath = getRelativeFilePath(path, absolutePath)
      return relativePath.split(sep).join('/') // convert windows separators
    })

    return sourceMap
  }
}

interface ExtractedSourceMap {
  contents: string,
  sourceMap?: FileSourceMap,
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
export function extractSourceMap(path: FilePath, files: Files, code: string, wipe: boolean): ExtractedSourceMap {
  const { contents, url } = extractSourceMappingURL(code, wipe)
  const { rawSourceMap, sourceMapFile } = parseSourceMappingURL(path, url)
  const sourceMap = rawSourceMap ? new FileSourceMap(path, files, rawSourceMap) : undefined
  return { contents, sourceMap, sourceMapFile }
}
