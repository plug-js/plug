import sourceMapSupport from 'source-map-support'

import {
  createProgram,
  Diagnostic,
  getPreEmitDiagnostics,
  ModuleKind,
  ScriptTarget,
} from 'typescript'

import { TypeScriptFailure } from './diagnostic'
import { getCompilerOptions } from './options'
import { VirtualFileList } from '../files'
import { TypeScriptHost } from './host'
import { extname } from 'path'
import { getAbsolutePath, getCurrentDirectoryPath } from '../utils/paths'

// Install support for source maps, supporting dynamically compiled files
sourceMapSupport.install({ environment: 'node' })

// HACK ZONE - intercept requests for ".ts" files in Node's loader. Note that
// files _must exist_ on disk in order for this to work, so we'll just present
// the compiled ".js" as ".ts" via our virtual file list interface
let loaderFileList = undefined as VirtualFileList | undefined

const plugTsHandler = Symbol()
type ModuleCompiler = { _compile: (content: string, fileName: string ) => void }
type ModuleExtensions = { _extensions: Record<string, ModuleExtensionHandler> }
type ModuleExtensionHandler = ((module: ModuleCompiler, fileName: string) => void) & {
  [plugTsHandler]?: true
}

const cjs: ModuleExtensions = require('module')
const handler = cjs._extensions['.ts']

// istanbul ignore next - can't test this to 100%
if (! handler?.[plugTsHandler]) {
  cjs._extensions['.ts'] = function(compiler, fileName): void {
    const file = loaderFileList?.get(fileName)
    if (file?.existsSync()) return compiler._compile(file.contentsSync(), fileName)
    handler?.(compiler, fileName)
  }
  cjs._extensions['.ts'][plugTsHandler] = true
}

// Check for failures and throw a TypeScript failure
export function reportAndFail(diagnostics: readonly Diagnostic[], host: TypeScriptHost, message: string): void {
  if (diagnostics.length) throw new TypeScriptFailure(diagnostics, host, message)
}


/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export function loadBuildFile(directory: string, fileName: string, tsConfig?: string): any {
  const directoryPath = getCurrentDirectoryPath(directory)
  const absolutePath = getAbsolutePath(directoryPath, fileName)
  if (extname(absolutePath) === '.js') return require(absolutePath)

  // Create our host (compiler / reporter / ...)
  const files = new VirtualFileList(directoryPath)
  const host = new TypeScriptHost(files)

  // Read our compiler options and fail on error
  const { options, diagnostics } = getCompilerOptions(files, tsConfig)
  reportAndFail(diagnostics, host, 'Error in TypeScript configuration')

  // Make sure we have our _own_ options enabled in the options
  options.allowJs = false // we won't read JS files
  options.module = ModuleKind.CommonJS // use commonJS for now
  options.declaration = false // we don't care about build's .d.ts
  options.sourceMap = false // don't generate external source maps
  options.inlineSourceMap = true // generate inline source maps
  options.inlineSources = false // don't include sources in source maps
  options.target = ScriptTarget.ES2019 // best for Node 14.x?
  options.importHelpers = false // maybe we don't have "tslib"
  options.listEmittedFiles = true

  // Our directories here for the loader
  options.outDir = directoryPath
  options.rootDir = directoryPath
  options.rootDirs = undefined
  options.noEmit = false

  // Get our build file and create the master program
  const program = createProgram([ fileName ], options, host, undefined, diagnostics)
  reportAndFail(getPreEmitDiagnostics(program), host, 'Error compiling build file')

  // Create a virtual file list builder for our output
  const builder = files.builder()

  // Emit all files generated by our our compilation with their _original_
  // filename.ts file name in our virtual directory... they'll be handled by
  // our extension handler hacked above
  const result = program.emit(undefined, (f, contents, bom, oe, sourceFiles) => {
    // istanbul ignore else
    if (sourceFiles) sourceFiles.forEach((sf) => builder.add(sf.fileName, contents))
  })
  reportAndFail(result.diagnostics, host, 'Error emitting build file compilation')

  // Build our output file list and require our build file
  loaderFileList = builder.build()
  return require(absolutePath)
}
