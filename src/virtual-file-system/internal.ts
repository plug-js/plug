import { RawSourceMap } from 'source-map'
import { VirtualFile, VirtualFileSystem, AbsolutePath, RelativePath, VirtualFileSystemBuilder, CanonicalPath, DirectoryPath } from './index'
import { resolve, relative, dirname } from 'path'
import { readFileSync, existsSync, statSync, promises as fs } from 'fs'
import { extractSourceMappingURL, parseSourceMappingURL } from '../utils/source-maps'

/*
 * This is a bit of a hack: we determine case sensitivity on _this_ file
 * but maybe a VirtualFileSystem from another directory might use a different
 * underlying file system... This is good enough for now!
 */
const __lfilename = __filename.toLowerCase()
const __ufilename = __filename.toUpperCase()
const caseSensitive = !(existsSync(__lfilename) && existsSync(__ufilename))

function getAbsolutePath(directory: DirectoryPath, path: string): AbsolutePath {
  return resolve(directory, path) as AbsolutePath
}

function getRelativePath(directory: DirectoryPath, path: AbsolutePath): RelativePath {
  return relative(directory, path) as RelativePath
}

function getCanonicalPath(name: AbsolutePath): CanonicalPath {
  // istanbul ignore next // dependant on underlying file system
  return (caseSensitive ? name : name.toLowerCase()) as CanonicalPath
}

/* ========================================================================== *
 * VIRTUAL FILE IMPLEMENTATION                                                *
 * ========================================================================== */

/* Internal type associating content and an (optional) source map */
type VirtualFileData = { contents: string, lastModified: number, sourceMapFile?: string }

class VirtualFileImpl implements VirtualFile {
  readonly fileSystem: VirtualFileSystem
  readonly absolutePath: AbsolutePath
  readonly relativePath: RelativePath
  readonly canonicalPath: CanonicalPath

  #promise?: Promise<VirtualFileData>
  #data?: VirtualFileData

  #sourceMap?: RawSourceMap

  constructor(
      fileSystem: VirtualFileSystem,
      path: string,
      contents: string | undefined = undefined,
      sourceMap: boolean | RawSourceMap = true,
  ) {
    const directoryPath = fileSystem.directoryPath
    const absolutePath = getAbsolutePath(directoryPath, path)
    const relativePath = getRelativePath(directoryPath, absolutePath)
    const canonicalPath = getCanonicalPath(absolutePath)

    this.fileSystem = fileSystem
    this.absolutePath = absolutePath
    this.relativePath = relativePath
    this.canonicalPath = canonicalPath

    if (contents != undefined) {
      const lastModified = Date.now()
      if (sourceMap === true) {
        const { contents: code, url } = extractSourceMappingURL(contents, true)
        const { sourceMap, sourceMapFile } = parseSourceMappingURL(this, url)
        this.#data = { contents: code, lastModified, sourceMapFile: sourceMapFile?.absolutePath }
        this.#sourceMap = sourceMap
      } else if (sourceMap) {
        this.#data = { lastModified, contents }
        this.#sourceMap = sourceMap
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
    const { sourceMap, sourceMapFile } = parseSourceMappingURL(this, url)
    this.#sourceMap = sourceMap
    return { contents, lastModified, sourceMapFile: sourceMapFile?.absolutePath }
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
    if (this.#sourceMap) return this.#sourceMap

    const sourceMapFile = this.#readSync().sourceMapFile
    if (! sourceMapFile) return

    const file = this.fileSystem.get(sourceMapFile)
    if (! file.existsSync()) return

    return this.#sourceMap = JSON.parse(file.contentsSync())
  }

  /* ======================================================================== *
   * ASYNC IMPLEMENTATION                                                     *
   * ======================================================================== */

  #read(): Promise<VirtualFileData> {
    if (this.#data) return Promise.resolve(this.#data)
    if (this.#promise) return this.#promise

    return this.#promise = (async (): Promise<VirtualFileData> => {
      const code = await fs.readFile(this.absolutePath, 'utf8')
      const lastModified = (await fs.stat(this.absolutePath)).mtimeMs
      const { contents, url } = extractSourceMappingURL(code, true)
      const { sourceMap, sourceMapFile } = parseSourceMappingURL(this, url)
      this.#sourceMap = sourceMap
      return this.#data = { contents, lastModified, sourceMapFile: sourceMapFile?.absolutePath }
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
    if (this.#sourceMap) return this.#sourceMap
    const sourceMapFile = (await this.#read()).sourceMapFile
    if (! sourceMapFile) return

    const file = this.fileSystem.get(sourceMapFile)
    if (! await file.exists()) return

    return this.#sourceMap = JSON.parse(await file.contents())
  }
}

/* ========================================================================== *
 * VIRTUAL FILE SYSTEM IMPLEMENTATION                                         *
 * ========================================================================== */

export class VirtualFileSystemImpl implements VirtualFileSystem {
  #cache = new Map<CanonicalPath, VirtualFile>()
  #files = [] as VirtualFile[]

  readonly directoryPath: DirectoryPath
  readonly caseSensitive: boolean

  constructor(path?: string) {
    this.directoryPath = (path ? resolve(process.cwd(), path) : process.cwd()) as DirectoryPath
    this.caseSensitive = caseSensitive
  }

  get(path: string): VirtualFile {
    const file = new VirtualFileImpl(this, path)

    const cached = this.#cache.get(file.canonicalPath)
    if (cached) return cached

    this.#cache.set(file.canonicalPath, file)
    return file
  }

  list(): Readonly<VirtualFile[]> {
    return [ ...this.#files ]
  }

  builder(path?: string): VirtualFileSystemBuilder {
    const baseDir = path ? resolve(this.directoryPath, path) : this.directoryPath
    return VirtualFileSystemImpl.builder(baseDir)
  }

  static builder(path?: string): VirtualFileSystemBuilder {
    let fileSystem = new VirtualFileSystemImpl(path) as VirtualFileSystemImpl | undefined

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      add(path: string, contents?: string, sourceMap?: boolean | RawSourceMap) {
        if (! fileSystem) throw new Error('Virtual file system already built')
        const file = new VirtualFileImpl(fileSystem, path, contents, sourceMap)
        fileSystem.#cache.set(file.canonicalPath, file)
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
