import { extname } from 'path'
import { EOL } from 'os'
import { createHash } from 'crypto'

import {
  CompilerHost,
  CompilerOptions,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  createSourceFile,
  getDefaultLibFilePath,
  FormatDiagnosticsHost,
} from 'typescript'

import { VirtualFileSystem } from '../files'
import { caseSensitivePaths } from '../utils/paths'

/* ========================================================================== *
 * CACHING - works out of the SHA256 of the contents of a file an it's shared *
 * across all instances of our hosts (expecting that "shouldCreateNewFile")   *
 * in "getSourceFile(...)" gives us the right information... Fingers crossed! *
 * ========================================================================== */

type CacheKey = string & { __cache_key: any }

const cache = new Map<CacheKey, SourceFile>()

function hashString(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

function cacheKey(data: string, languageVersion: ScriptTarget): CacheKey {
  return `${hashString(data)}/${languageVersion}` as CacheKey
}

/* ========================================================================== *
 * TYPESCRIPT HOST                                                            *
 * ========================================================================== */

/**
 * Implementation of a TypeScript compiler host wrapping our virtual file system
 */
export class TypeScriptHost implements CompilerHost, FormatDiagnosticsHost {
  #fileSystem: VirtualFileSystem

  /** Create a new `TypeScriptHost` */
  constructor(fileSystem: VirtualFileSystem) {
    this.#fileSystem = fileSystem
  }

  /* ======================================================================== */

  /** Get a source file parsing one of our virtual files */
  getSourceFile(
      fileName: string,
      languageVersion: ScriptTarget,
      onError?: (message: string) => void,
      shouldCreateNewSourceFile?: boolean,
  ): SourceFile | undefined {
    try {
      const file = this.#fileSystem.get(fileName)
      if (! file.existsSync()) return

      const data = file.contentsSync()
      const path = file.absolutePath

      // Determine the script kind from the extension
      const extension = extname(file.absolutePath).toLowerCase()
      const kind =
          extension == '.ts' ? ScriptKind.TS :
          extension == '.tsx' ? ScriptKind.TSX :
          extension == '.js' ? ScriptKind.JS :
          extension == '.jsx' ? ScriptKind.JSX :
          extension == '.json' ? ScriptKind.JSON :
          ScriptKind.Unknown

      // Don't recreate unless we have to
      const key = cacheKey(data, languageVersion)
      const cached = cache.get(key)
      if (cached && (! shouldCreateNewSourceFile)) return cached

      // Create the source file and cache it
      const source = createSourceFile(path, data, languageVersion, false, kind)
      cache.set(key, source)
      return source
    } catch (error) {
      if (! onError) throw error
      onError(error.message)
    }
  }

  /**
   * Conveniently write a file to a new virtual file system. All written files
   * can be accessed when calling `buildFileSystem()` on this instance.
   */
  writeFile(
      fileName: string,
      data: string,
      writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      sourceFiles?: readonly SourceFile[],
  ): void {
    void sourceFiles // prevent eslint from complaining
    if (onError) onError('Politely refusing to write files')
    else throw new Error('Cowardly refusing to write ' + fileName)
  }

  /** [TS] Get the default library associated with the given options */
  getDefaultLibFileName(options: CompilerOptions): string {
    return getDefaultLibFilePath(options)
  }

  /** [TS] Check for filesystem case sensitivity */
  useCaseSensitiveFileNames(): boolean {
    return caseSensitivePaths
  }

  /** [TS] Check for the existence of a given file */
  fileExists(fileName: string): boolean {
    return this.#fileSystem.get(fileName).existsSync()
  }

  /** [TS] Read the file if it exists, otherwise return undefined */
  readFile(fileName: string): string | undefined {
    const file = this.#fileSystem.get(fileName)
    if (file.existsSync()) return file.contentsSync()
  }

  /** [TS] Return the current working directory */
  getCurrentDirectory(): string {
    return this.#fileSystem.directoryPath
  }

  /** [TS] Return the canonical name for the specified file */
  getCanonicalFileName(fileName: string): string {
    return this.#fileSystem.get(fileName).canonicalPath
  }

  /** [TS] Create a hash for the given string, uses SHA256(HEX) */
  createHash(data: string): string {
    return hashString(data)
  }

  /** [TS] Return the new line sequence used by this platform */
  getNewLine(): string {
    return EOL
  }
}
