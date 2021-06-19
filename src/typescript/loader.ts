import sourceMapSupport from 'source-map-support'

import { AbsolutePath } from '../utils/paths'
import { VirtualFileList } from '../files'
import { extname } from 'path'
import { setupLoader } from '../utils/loader'

import {
  ModuleKind,
  ScriptTarget,
} from 'typescript'
import { CompilePlug } from '../plugs/compile'

// Install support for source maps, supporting dynamically compiled files
sourceMapSupport.install({ environment: 'node' })

/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export function loadBuildFile(directory: string, fileName: string, tsConfig?: string): any {
  const files = new VirtualFileList(directory)
  const file = files.add(fileName)

  // Not much to do when it comes to ".js" files
  if (extname(file.absolutePath) === '.js') return require(file.absolutePath)

  // Create our compiler and compile our files
  const output = new CompilePlug(tsConfig, {
    // Make sure we have our _own_ options enabled
    allowJs: false, // we won't read JS files
    module: ModuleKind.CommonJS, // use commonJS for now
    declaration: false, // we don't care about build's .d.ts
    sourceMap: false, // don't generate external source maps
    inlineSourceMap: true, // generate inline source maps
    inlineSources: false, // don't include sources in source maps
    target: ScriptTarget.ES2019, // best for Node 14.x?
    importHelpers: false, // maybe we don't have "tslib"
    noEmit: false, // we always want our output to be gnerated
    outDir: files.directoryPath, // our directory for the loader
  }).process(files)

  // Build our output file list and require our build file
  const map = new Map<AbsolutePath, string>()
  output.list().forEach((file) => {
    const contents = file.contentsSync()
    map.set(file.absolutePath, contents)
    map.set(file.originalPath, contents)
  })

  setupLoader(map)
  return require(file.absolutePath)
}
