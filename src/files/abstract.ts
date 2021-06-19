import { File } from './index'
import { Files } from './files'
import { RawSourceMap } from 'source-map'

import {
  AbsolutePath,
  CanonicalPath,
  RelativePath,
  getAbsolutePath,
  getCanonicalPath,
  getDirectory,
  getRelativePath,
} from '../utils/paths'

export abstract class AbstractFile implements File {
  files!: Files
  absolutePath!: AbsolutePath
  originalPath!: AbsolutePath

  constructor(
      files: Files,
      absolutePath: AbsolutePath,
      originalPath: AbsolutePath = absolutePath,
  ) {
    Object.defineProperties(this, {
      'files': { enumerable: false, value: files },
      'absolutePath': { enumerable: true, value: absolutePath },
      'originalPath': { enumerable: true, value: originalPath },
    })
  }

  get relativePath(): RelativePath {
    return getRelativePath(this.files.directory, this.absolutePath)
  }

  get canonicalPath(): CanonicalPath {
    return getCanonicalPath(this.absolutePath)
  }

  get(path: string): File {
    const directory = getDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path)
    return this.files.get(absolutePath)
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
