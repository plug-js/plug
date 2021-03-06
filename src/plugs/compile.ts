import { File, Files } from '../files'
import { TypeScriptHost } from '../typescript/host'
import { checkDiagnostics } from '../typescript/diagnostic'
import { createProgram, getPreEmitDiagnostics } from 'typescript'
import { extname } from 'path'
import { extractSourceMappingURL, parseSourceMappingURL } from '../sourcemaps'
import { getCompilerOptions } from '../typescript/options'
import { createDirectoryPath, createFilePath, FilePath, getRelativePath, isChild } from '../utils/paths'
import { install } from '../pipe'

import type { CompilerOptions } from 'typescript'
import type { Log } from '../utils/log'
import type { Plug } from '../pipe'
import type { Run } from '../run'
import type { RawSourceMap } from 'source-map'

declare module '../pipe' {
  interface Pipe<P extends Pipe<P>> {
    compile: PlugExtension<P, typeof CompilePlug>
  }
}

const extensions = [ '.ts', '.d.ts', '.tsx' ] as readonly string[]
// const extensionsJs = [ '.ts', '.d.ts', '.tsx', '.js' ] as readonly string[]

interface ExtendedCompilerOptions extends CompilerOptions {
  /**
   * Indicates whether non-compilable files are passed through to the next
   * step, or ignored entirely and not available in the resulting file list.
   *
   * @default true
   */
  passThrough?: boolean

  /** Source maps will always be available, use `save(...)` to write them */
  declarationMap?: undefined
  /** Source maps will always be available, use `save(...)` to write them */
  sourceMap?: undefined
  /** Source maps will always be available, use `save(...)` to write them */
  inlineSourceMap?: undefined
  /** Source maps will always be available, use `save(...)` to write them */
  inlineSources?: undefined
  /** Source maps will always be available, use `save(...)` to write them */
  mapRoot?: undefined
}

export class CompilePlug implements Plug {
  #passThrough: boolean
  #options?: CompilerOptions
  #config?: string

  /** ConstructorDoc w/ options */
  constructor(options?: ExtendedCompilerOptions)
  /** ConstructorDoc w/ config */
  constructor(config?: string, options?: ExtendedCompilerOptions)
  constructor(first: string | ExtendedCompilerOptions | undefined, extra?: ExtendedCompilerOptions) {
    const { config, options } =
      typeof first === 'string' ? { config: first, options: extra } :
      first === undefined ? { config: undefined, options: extra } :
      { config: undefined, options: first }

    this.#passThrough = options?.passThrough === undefined ? true : options.passThrough
    this.#options = options
    this.#config = config
  }

  process(input: Files, run: Run, log: Log): Files {
    const time = log.start()
    const output = input.fork()

    // Read our compiler options and fail on error
    const host = new TypeScriptHost(input)
    const { options, diagnostics } = getCompilerOptions(input, this.#config, this.#options)
    checkDiagnostics(diagnostics, host, run, 'Error in TypeScript configuration')

    // We always want inline sourcemaps
    options.declaration = !! options.declaration
    options.declarationMap = options.declaration
    options.sourceMap = true // always detached source maps
    options.inlineSourceMap = false // never inline source maps
    options.inlineSources = false // never attach sources
    options.mapRoot = undefined // never add any source map root

    // Make sure we _always_ have both `rootDir` and `outDir`...
    const rootDir = createDirectoryPath(input.directory, options.rootDir)
    const outDir = options.outDir ? createDirectoryPath(input.directory, options.outDir) : rootDir
    options.rootDir = rootDir
    options.outDir = outDir

    // Figure out what to do with our input files
    const paths = input.map((file) => {
      // Compile all ".ts", ".d.ts", ".tsx" (or ".js" with allowJs)
      const extension = extname(file.absolutePath).toLowerCase()
      if (extensions.includes(extension)) return file.absolutePath
      if (options.allowJs && (extension === '.js')) return file.absolutePath

      // We pass-through any other file child of our "rootDir" basically
      // re-creating the same structure into "outDir"
      if (options.passThrough && isChild(rootDir, file.absolutePath)) {
        const relative = getRelativePath(rootDir, file.absolutePath)
        const resolved = createFilePath(outDir, relative)
        output.add(resolved, file)
      }
    }).filter((path) => path) as string[]

    // Log what we're doing
    for (const path of paths) log.trace(`Compiling "${path}"`)
    for (const file of output) log.trace(`File "${file.absolutePath}" passed through`)

    // Get our build file and create the master program
    log('Compiling', paths.length, 'files')
    const program = createProgram(paths, options, host, undefined, diagnostics)
    checkDiagnostics(getPreEmitDiagnostics(program), host, run, 'Error compiling')

    // TypeScript always seem to write ".map" files for ".d.ts" files, whether
    // inlining or not... So, let's always use separate source maps and handle
    // the re-combination logic ourselves...
    const sourceMaps = new Map<FilePath, RawSourceMap>()
    const originalFiles = new Map<FilePath, File | undefined>()
    const emittedContents = new Map<FilePath, string>()

    // Emit all files generated by our our compilation with their _original_
    // filename.ts file name in our virtual directory... they'll be handled by
    // our extension handler hacked above
    const result = program.emit(undefined, (fileName, code, bom, oe, sources) => {
      const filePath = createFilePath(output.directory, fileName)

      // Original files for each emitted path...
      sources?.forEach(({ fileName }) => originalFiles.set(filePath, input.get(fileName)))

      // Put the file contents in the right map
      if (extname(fileName) === '.map') {
        sourceMaps.set(filePath, JSON.parse(code))
      } else {
        emittedContents.set(filePath, code)
      }
    })

    // Check for errors...
    checkDiagnostics(result.diagnostics, host, run, 'Error emitting compilation')

    // Process each file we emitted and add it to the output
    for (const [ path, code ] of emittedContents.entries()) {
      // Extract the source mapping URL from the contents and wipe it
      const { contents, url } = extractSourceMappingURL(code, true)

      // Do we have (by any chance) an inline source map? (we shouldn't)
      const { rawSourceMap, sourceMapFile } = parseSourceMappingURL(path, url)

      // Sourcemap comes first from inline (should never happen), or from
      // the source map file extracted from the url (always) or... not!
      // istanbul ignore next - we always and only have sourceMapFile
      const sourceMap = (
        rawSourceMap ? rawSourceMap :
        sourceMapFile ? sourceMaps.get(sourceMapFile) :
        false ) || false

      // Then get the original file (if any)
      const originalFile = originalFiles.get(path)

      log.trace(`Emitting "${path}" (sourceMap=${!!sourceMap})`)
      output.add(path, { contents, sourceMap, originalFile })
    }

    // Log times after everything is emitted and return
    log.debug('Compliled', paths.length, 'files in', time)
    return output
  }
}

export const compile = install('compile', CompilePlug)
