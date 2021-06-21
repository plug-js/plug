import { File } from './index'
import { Files } from './files'
import { RawSourceMap } from 'source-map'

import {
  AbsolutePath,
  CanonicalPath,
  RelativePath,
  getAbsolutePath,
  getCanonicalPath,
  getParentDirectory,
  getRelativePath,
} from '../utils/paths'

export abstract class AbstractFile implements File {
  readonly files!: Files
  readonly absolutePath!: AbsolutePath
  readonly originalPath!: AbsolutePath
  readonly relativePath!: RelativePath
  readonly canonicalPath!: CanonicalPath

  constructor(
      files: Files,
      absolutePath: AbsolutePath,
      originalPath: AbsolutePath = absolutePath,
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
    const directory = getParentDirectory(this.absolutePath)
    const absolutePath = getAbsolutePath(directory, path as RelativePath)
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
