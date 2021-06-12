import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileSystem, AbsolutePath, RelativePath, VirtualFileSystemBuilder } from './index'
import { resolve, relative, dirname } from 'path'
import { readFileSync, existsSync, statSync, promises as fs } from 'fs'
import { extractSourceMappingURL, readSourceMap, readSourceMapSync } from '../utils/source-maps'

/*
 * This is a bit of a hack: we determine case sensitivity on _this_ file
 * but maybe a VirtualFileSystem from another directory might use a different
 * underlying file system... This is good enough for now!
 */
const __lfilename = __filename.toLowerCase()
const __ufilename = __filename.toUpperCase()
const caseSensitive = !(existsSync(__lfilename) && existsSync(__ufilename))
function canonical(name: string): string {
  // istanbul ignore next // dependant on underlying file system
  return caseSensitive ? name : name.toLowerCase()
}

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type VirtualFileData = { contents: string, lastModified: number, sourceMap?: RawSourceMap }

class VirtualFileImpl implements VirtualFile {
  readonly fileSystem!: VirtualFileSystem
  readonly absolutePath!: AbsolutePath
  readonly relativePath!: RelativePath
  readonly canonicalPath!: AbsolutePath

  #promise: Promise<VirtualFileData> | undefined
  #data: VirtualFileData | undefined

  constructor(
      fileSystem: VirtualFileSystem,
      path: string,
      contents: string | undefined = undefined,
      sourceMap: boolean | RawSourceMap = true,
  ) {
    const absolutePath = resolve(fileSystem.baseDir, path)
    const relativePath = relative(fileSystem.baseDir, absolutePath)
    const canonicalPath = canonical(absolutePath)

    Object.defineProperties(this, {
      fileSystem: { value: fileSystem },
      absolutePath: { value: absolutePath },
      relativePath: { value: relativePath },
      canonicalPath: { value: canonicalPath },
    })

    if (contents != undefined) {
      const lastModified = Date.now()
      // TODO: async sourcemap support
      if (sourceMap === true) {
        const { contents: code, url } = extractSourceMappingURL(contents, true)
        const sourceMap = readSourceMapSync(this, url)
        this.#data = { contents: code, lastModified, sourceMap }
      } else if (sourceMap) {
        this.#data = { lastModified, contents, sourceMap }
      } else {
        this.#data = { lastModified, contents }
      }
    }
  }

  get(path: string): VirtualFile {
    return this.fileSystem.get(resolve(dirname(this.absolutePath), path))
  }

  /* ======================================================================== *
   * SYNCHRONOUS IMPLEMENTATION                                               *
   * ======================================================================== */

  #readSync(): VirtualFileData {
    if (this.#data) return this.#data

    const code = readFileSync(this.absolutePath, 'utf8')
    const lastModified = statSync(this.absolutePath).mtimeMs
    const { contents, url } = extractSourceMappingURL(code, true)
    const sourceMap = readSourceMapSync(this, url)
    return { contents, lastModified, sourceMap }
  }

  existsSync(): boolean {
    try {
      this.#readSync()
      return true
    } catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
    }
  }

  lastModifiedSync(): number {
    return this.#readSync().lastModified
  }

  contentsSync(): string {
    return this.#readSync().contents
  }

  sourceMapSync(): RawSourceMap | undefined {
    return this.#readSync().sourceMap
  }

  /* ======================================================================== *
   * ASYNC IMPLEMENTATION                                                     *
   * ======================================================================== */

  #read(): Promise<VirtualFileData> {
    if (this.#promise) return this.#promise

    return this.#promise = (async (): Promise<VirtualFileData> => {
      const code = await fs.readFile(this.absolutePath, 'utf8')
      const lastModified = (await fs.stat(this.absolutePath)).mtimeMs
      const { contents, url } = extractSourceMappingURL(code, true)
      const sourceMap = await readSourceMap(this, url)
      return this.#data = { contents, lastModified, sourceMap }
    })()
  }

  async exists(): Promise<boolean> {
    if (this.#data) return true
    return this.#read().then(() => true, (error) => {
      if (error.code === 'ENOENT') return false
      throw error
    })
  }

  async lastModified(): Promise<number> {
    return this.#data ? this.#data.lastModified : (await this.#read()).lastModified
  }

  async contents(): Promise<string> {
    return this.#data ? this.#data.contents : (await this.#read()).contents
  }

  async sourceMap(): Promise<RawSourceMap | undefined> {
    return this.#data ? this.#data.sourceMap : (await this.#read()).sourceMap
  }
}

/* ========================================================================== *
 * VIRTUAL FILE SYSTEM IMPLEMENTATION                                         *
 * ========================================================================== */

export class VirtualFileSystemImpl implements VirtualFileSystem {
  #cache: Record<string, VirtualFile> = {}
  #files: VirtualFile[] = []

  readonly baseDir!: AbsolutePath
  readonly caseSensitive!: boolean

  constructor(path?: string) {
    const baseDir = path ? resolve(process.cwd(), path) : process.cwd()
    Object.defineProperties(this, {
      caseSensitive: { value: caseSensitive },
      baseDir: { value: baseDir },
    })
  }

  get(path: string): VirtualFile {
    const resolved = canonical(resolve(this.baseDir, path))
    if (resolved in this.#cache) return this.#cache[resolved]
    return this.#cache[resolved] = new VirtualFileImpl(this, path)
  }

  list(): Readonly<VirtualFile[]> {
    return [ ...this.#files ]
  }

  builder(path?: string): VirtualFileSystemBuilder {
    const baseDir = path ? resolve(this.baseDir, path) : this.baseDir
    return VirtualFileSystemImpl.builder(baseDir)
  }

  static builder(path?: string): VirtualFileSystemBuilder {
    let fileSystem = new VirtualFileSystemImpl(path) as VirtualFileSystemImpl | undefined

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      add(path: string, contents?: string, sourceMap?: boolean | RawSourceMap) {
        if (! fileSystem) throw new Error('Virtual file system already built')
        const file = new VirtualFileImpl(fileSystem, path, contents, sourceMap)
        fileSystem.#cache[file.canonicalPath] = file
        fileSystem.#files.push(file)
        return this
      },

      build(): VirtualFileSystem {
        if (! fileSystem) throw new Error('Virtual file system already built')
        const builtFileSystem = fileSystem
        fileSystem = undefined
        return builtFileSystem
      },
    }
  }
}
