import assert from 'assert'

import { SourceMapConsumer, SourceMapGenerator } from 'source-map'
import { createFilePath, getParent, getRelativeFilePath } from '../utils/paths'
import { parallelize } from '../utils/parallelize'

import type { File } from './file'
import type { Files } from './files'
import type { FilePath } from '../utils/paths'
import type { RawSourceMap } from 'source-map'

import { fileURLToPath, pathToFileURL, URL } from 'url'
import { basename } from 'path/posix'
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
  readonly #sourcesContent: readonly (string | null)[]
  readonly #attachedSources: readonly (File | undefined)[]

  /**
   * Construct a `FileSourceMap` from a `RawSourceMap`.
   *
   * @param path The path where the source map was read from, either the file
   *             containing an inline source map or the name of the ".map" file
   * @param data The `RawSourceMap` as parsed from the original file
   * @param files A `Files` instance where attached sources can be found
   */
  constructor(path: FilePath, data: RawSourceMap, files: Files) {
    // Normally this comes from JSON (any) so be extra careful
    assert(data && (typeof data === 'object'), `Raw source map from "${path}" is not an object`)
    assert(data.version && (data.version.toString() === '3'), `Invalid source map version from "${path}"`)

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
        const source = root + string // spec says it's only a concatenation...
        assert(source, `Invalid source "${source}" in source map for "${path}"`)
        attachedSources.push(files.get(createFilePath(dir, source)))
        sources.push(new URL(source, url))
      })
    }
    this.#sources = sources
    this.#attachedSources = attachedSources

    const sourcesContent = Array.isArray(data.sourcesContent) ?
        data.sourcesContent.map((content) => typeof content === 'string' ? content || null : null) : []

    // Push extra "sourcesContent" in case we had less and trim any excess...
    for (let i = sourcesContent.length; i < this.#sources.length; i ++) sourcesContent.push(null)
    this.#sourcesContent = sourcesContent.slice(0, this.#sources.length)
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

  get sourcesContent(): (string | null)[] {
    return [ ...this.#sourcesContent ]
  }

  get attachedSources(): (File | undefined)[] {
    return this.#attachedSources ? [ ...this.#attachedSources ] : []
  }

  static for(path: FilePath, data: RawSourceMap, files: Files): FileSourceMap | undefined {
    if (data && (typeof data === 'object') && data.version) {
      // sometimes version is a string, and only accept version 3
      if (data.version.toString() === '3') {
        return new FileSourceMap(path, data, files)
      }
    }
  }

  /* ======================================================================== */

  #readSourceContent(): Promise<string[]> {
    // note the "null as any as string" in here... those mean that the original
    // sources are not available... the spec allows it and "source-map" uses
    // them when setting source contents only a _subset_ of all mapped sources,
    // so I tend to think that that type declared by RawSourceMap is wrong
    return Promise.all(this.#sourcesContent.map((source, i) => {
      // if the source was from the original sourceMap, just return it
      if (source !== null) return source

      // try to read the original file, if we have one...
      if (! this.#attachedSources) return null as any as string
      const file = this.#attachedSources[i]
      // istanbul ignore if - "getFile()" always returns a file but we never
      // populate it if source (above) is not null... so can't test
      if (! file) return null as any as string
      return file.contents()
    }))
  }

  #produceSourceMap(path: FilePath): RawSourceMap {
    const sources: string[] = this.#sources.map((url) => {
      if (url.protocol !== 'file:') return url.href
      const source = fileURLToPath(url) as FilePath
      return getRelativeFilePath(path, source)
    })

    return {
      version: 3,
      file: basename(path),
      mappings: this.#mappings,
      names: [ ...this.#names ],
      sources,
    }
  }

  async #produceSimpleSourceMap(path: FilePath, attachSources: boolean): Promise<RawSourceMap> {
    const sourceMap = this.#produceSourceMap(path)
    if (attachSources) sourceMap.sourcesContent = await this.#readSourceContent()
    return sourceMap
  }

  async #produceCombinedSourceMap(path: FilePath, attachSources: boolean): Promise<RawSourceMap> {
    // Find all source maps associated with the attached sources...
    const sourceMaps = (await parallelize(this.#attachedSources, (file) => file?.sourceMap()))
        .filter((sourceMap) => sourceMap) as FileSourceMap[]

    // If no sourcemap was found, then we can just produce a simple source map
    if (! sourceMaps.length) return this.#produceSimpleSourceMap(path, attachSources)

    // Start with _this_ sourcemap
    const original = this.#produceSourceMap(path)
    if (attachSources) original.sourcesContent = await this.#readSourceContent()
    const combined = await SourceMapConsumer.with(original, null, async (consumer) => {
      // Create a generator from this sourcemap
      const generator = SourceMapGenerator.fromSourceMap(consumer)

      // Apply all other sourcemaps to this one... The original sources (if
      // any were found) will also be _applied_ to this sourcemap
      for (const fileSourceMap of sourceMaps) {
        const sourceMap = await fileSourceMap.#produceCombinedSourceMap(path, attachSources)
        await SourceMapConsumer.with(sourceMap, null, (c) => generator.applySourceMap(c))
      }

      // All merged and ready to go!
      return generator.toJSON()
    })

    // All done here!
    return combined
  }

  /* ======================================================================== */

  produceSourceMap(path: FilePath, options: SourceMapOptions = {}): Promise<RawSourceMap> {
    const { attachSources = false, combineSourceMaps: combinedSourceMap = true } = options
    return combinedSourceMap ?
        this.#produceCombinedSourceMap(path, attachSources) :
        this.#produceSimpleSourceMap(path, attachSources)
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
  const sourceMap = rawSourceMap ? new FileSourceMap(path, rawSourceMap, files) : undefined
  return { contents, sourceMap, sourceMapFile }
}
