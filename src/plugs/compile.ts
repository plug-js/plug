import { Files } from '../files'
import { Log } from '../utils/log'
import { Run } from '../run'
import { TypeScriptHost } from '../typescript/host'
import { checkDiagnostics } from '../typescript/diagnostic'
import { extname } from 'path'
import { getCompilerOptions } from '../typescript/options'

import { CompilerOptions, createProgram, getPreEmitDiagnostics } from 'typescript'
import { FilePath, RelativeDirectoryPath, getRelativePath, isChild, resolvePath } from '../utils/paths'
import { Plug, install } from '../pipe'

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
   * @default: false
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
  #options?: ExtendedCompilerOptions
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

    this.#options = options
    this.#config = config
  }

  process(input: Files, run: Run, log: Log): Files {
    const now = Date.now()
    const output = new Files(input.directory)

    // Read our compiler options and fail on error
    const host = new TypeScriptHost(input)
    const { options, diagnostics } = getCompilerOptions(input, this.#config, this.#options)
    checkDiagnostics(diagnostics, host, 'Error in TypeScript configuration')

    // We always want inline sourcemaps
    options.declaration = !! options.declaration
    options.declarationMap = options.declaration
    options.sourceMap = false
    options.inlineSourceMap = true
    options.inlineSources = false
    options.mapRoot = undefined

    // Make sure we _always_ have both `rootDir` and `outDir`...
    const rootDir = resolvePath(input.directory, options.rootDir as RelativeDirectoryPath)
    const outDir = resolvePath(input.directory, options.outDir as RelativeDirectoryPath)
    options.rootDir = rootDir
    options.outDir = outDir

    // Figure out what to do with our input files
    const paths = input.list().map((file) => {
      // Compile all ".ts", ".d.ts", ".tsx" (or ".js" with allowJs)
      const extension = extname(file.absolutePath).toLowerCase()
      if (extensions.includes(extension)) return file.relativePath
      if (options.allowJs && (extension === '.js')) return file.relativePath

      // We pass-through any other file child of our "rootDir" basically
      // re-creating the same structure into "outDir"
      if (options.passThrough && isChild(rootDir, file.absolutePath)) {
        const relative = getRelativePath(rootDir, file.absolutePath)
        const resolved = resolvePath(outDir, relative)
        output.add(resolved, file)
      }
    }).filter((path) => path) as string[]

    log.debug('Compiling', paths.length, 'files:', paths)

    // Get our build file and create the master program
    const program = createProgram(paths, options, host, undefined, diagnostics)
    checkDiagnostics(getPreEmitDiagnostics(program), host, 'Error compiling')

    // Emit all files generated by our our compilation with their _original_
    // filename.ts file name in our virtual directory... they'll be handled by
    // our extension handler hacked above
    const result = program.emit(undefined, (fileName, contents, bom, oe, sources) => {
      let originalPath = undefined as FilePath | undefined

      // For JS files, figure out the _original_ path of the ".ts" file by looking
      // into the source files associated with this output
      // istanbul ignore next - we only emit js, and always have source files
      if (extname(fileName) === '.js') {
        sources?.forEach(({ fileName }) => originalPath = input.get(fileName).absolutePath)
      }

      // Add the result of the compilation to our output files
      output.add(fileName, { contents, sourceMap: true, originalPath, sourceMapSources: input })
    })

    // Ceck errors and log times after everything is emitted
    checkDiagnostics(result.diagnostics, host, 'Error emitting compilation')
    log.debug('Compliled', paths.length, 'in', Date.now() - now, 'ms')
    return output
  }
}

export const compile = install('compile', CompilePlug)
