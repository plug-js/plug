import { File } from './index'
import { Files } from './files'
import { RawSourceMap } from 'source-map'

import {
  FilePath,
  CanonicalPath,
  RelativeFilePath,
  getCanonicalPath,
  getRelativePath,
  resolveFilePath,
} from '../utils/paths'

export abstract class AbstractFile implements File {
  readonly files!: Files
  readonly absolutePath!: FilePath
  readonly originalPath!: FilePath
  readonly relativePath!: RelativeFilePath
  readonly canonicalPath!: CanonicalPath

  constructor(
      files: Files,
      absolutePath: FilePath,
      originalPath: FilePath = absolutePath,
  ) {
    const relativePath = getRelativePath(files.directory, absolutePath)
    const canonicalPath = getCanonicalPath(absolutePath)
    Object.defineProperties(this, {
      'files': { enumerable: false, value: files },
      'absolutePath': { enumerable: true, value: absolutePath },
      'originalPath': { enumerable: true, value: originalPath },
      'relativePath': { enumerable: false, value: relativePath },
      'canonicalPath': { enumerable: false, value: canonicalPath },
    })
  }

  get(path: string): File {
    const resolved = resolveFilePath(this.absolutePath, path as RelativeFilePath)
    return this.files.get(resolved)
  }

  abstract exists(): Promise<boolean>
  abstract existsSync(): boolean
  abstract lastModified(): Promise<number>
  abstract lastModifiedSync(): number
  abstract contents(): Promise<string>
  abstract contentsSync(): string
  abstract sourceMap(): Promise<RawSourceMap | undefined>
  abstract sourceMapSync(): RawSourceMap | undefined
}
