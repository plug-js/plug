import assert from 'assert'

import type { File, Files } from '../files'
import type { FilePath } from '../utils/paths'
import type { RawSourceMap } from 'source-map'

import { SourceMapConsumer, SourceMapGenerator } from 'source-map'
import { basename } from 'path'
import { createFilePath, getParent, getRelativeFilePath } from '../utils/paths'
import { parallelize } from '../utils/parallelize'

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
  readonly file!: FilePath

  readonly #mappings: string
  readonly #names: readonly string[]
  readonly #sources: readonly FilePath[]
  readonly #sourcesContent: (string | null)[]
  #attachedSources?: readonly (File | undefined)[]

  private constructor(file: FilePath, data: RawSourceMap) {
    Object.defineProperty(this, 'file', { enumerable: true, value: file })

    const root = data.sourceRoot ? data.sourceRoot.toString() : ''

    this.#mappings = typeof data.mappings === 'string' ? data.mappings : ''
    this.#names = Array.isArray(data.names) ?
        data.names.map((name) => {
          assert(name && (typeof name === 'string'), `Invalid name "${name}" in source map for "${file}"`)
          return name
        }) : []

    this.#sources = Array.isArray(data.sources) ?
        data.sources.map((source) => {
          assert(source && (typeof source === 'string'), `Invalid source "${source}" in source map for "${file}"`)
          return createFilePath(getParent(file), root, source)
        }) : []

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

  get sources(): FilePath[] {
    return [ ...this.#sources ]
  }

  get sourcesContent(): (string | null)[] {
    return [ ...this.#sourcesContent ]
  }

  get attachedSources(): (File | undefined)[] {
    return this.#attachedSources ? [ ...this.#attachedSources ] : []
  }

  static for(file: FilePath, data: RawSourceMap, sourceMapSources?: Files): FileSourceMap | undefined {
    if (data && (typeof data === 'object') && data.version) {
      // sometimes version is a string, and only accept version 3
      if (data.version.toString() === '3') {
        const sourceMap = new FileSourceMap(file, data)
        if (sourceMapSources) sourceMap.attachSources(sourceMapSources)
        return sourceMap
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

  #produceSourceMap(): RawSourceMap {
    return {
      version: 3,
      file: this.file,
      mappings: this.#mappings,
      names: [ ...this.#names ],
      sources: [ ...this.#sources ],
    }
  }

  async #produceSimpleSourceMap(attachSources: boolean): Promise<RawSourceMap> {
    const sourceMap = this.#produceSourceMap()
    if (attachSources) sourceMap.sourcesContent = await this.#readSourceContent()
    return sourceMap
  }

  async #produceCombinedSourceMap(attachSources: boolean): Promise<RawSourceMap> {
    // If we have no attached sources, it's pointless to even try...
    if (! this.#attachedSources) return this.#produceSimpleSourceMap(attachSources)

    // Find all source maps associated with the attached sources...
    const sourceMaps = (await parallelize(this.#attachedSources, (file) => file?.sourceMap()))
        .filter((sourceMap) => sourceMap) as FileSourceMap[]

    // If no sourcemap was found, then we can just produce a simple source map
    if (! sourceMaps.length) return this.#produceSimpleSourceMap(attachSources)

    // Start with _this_ sourcemap
    const original = this.#produceSourceMap()
    if (attachSources) original.sourcesContent = await this.#readSourceContent()
    const combined = await SourceMapConsumer.with(original, null, async (consumer) => {
      // Create a generator from this sourcemap
      const generator = SourceMapGenerator.fromSourceMap(consumer)

      // Apply all other sourcemaps to this one... The original sources (if
      // any were found) will also be _applied_ to this sourcemap
      for (const fileSourceMap of sourceMaps) {
        const sourceMap = await fileSourceMap.#produceCombinedSourceMap(attachSources)
        await SourceMapConsumer.with(sourceMap, null, (c) => generator.applySourceMap(c))
      }

      // All merged and ready to go!
      return generator.toJSON()
    })

    // All done here!
    return combined
  }

  /* ======================================================================== */

  attachSources(files: Files): void {
    // Do not attach a specific file source if we already have its content
    // from the original sourcemap that created this instance...
    this.#attachedSources = this.#sources.map((source, i) => {
      if (! this.#sourcesContent[i]) return files.get(source)
    })
  }

  produceSourceMap(options: SourceMapOptions): Promise<RawSourceMap> {
    const { attachSources = false, combineSourceMaps: combinedSourceMap = true } = options
    const promise = combinedSourceMap ?
        this.#produceCombinedSourceMap(attachSources) :
        this.#produceSimpleSourceMap(attachSources)
    return promise.then((sourceMap) => {
      sourceMap.file = basename(this.file)
      sourceMap.sources = sourceMap.sources.map((source) => {
        return getRelativeFilePath(this.file, source as FilePath)
      })
      return sourceMap
    })
  }
}
