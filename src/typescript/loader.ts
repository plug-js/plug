import { FilePath } from '../utils/paths'
import { Files } from '../files'
import { extname } from 'path'
import { setupLoader } from '../utils/loader'

import {
  ModuleKind,
  ScriptTarget,
} from 'typescript'
import { CompilePlug } from '../plugs/compile'
import { Run } from '../run'
import { Project } from '../project'

/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export function loadBuildFile(project: Project, fileName: string): any {
  const files = new Files(project.directory)
  const file = files.add(fileName)

  // Not much to do when it comes to ".js" files
  if (extname(file.absolutePath) === '.js') return require(file.absolutePath)

  // Create our compiler
  const compiler = new CompilePlug({
    // Make sure we have our _own_ options enabled
    allowJs: false, // we won't read JS files
    module: ModuleKind.CommonJS, // use commonJS for now
    declaration: false, // we don't care about build's .d.ts
    target: ScriptTarget.ES2019, // best for Node 14.x?
    esModuleInterop: true, // needed for node modules
    importHelpers: false, // maybe we don't have "tslib"
    noEmit: false, // we always want our output to be gnerated
    outDir: files.directory, // our directory for the loader
  })

  // Compile our files
  const run = new Run(project)
  const output = compiler.process(files, run, run.log(compiler))

  // Build our output file list and require our build file
  const map = new Map<FilePath, string>()
  output.list().forEach((file) => {
    const contents = file.contentsSync()
    map.set(file.absolutePath, contents)
    map.set(file.originalPath, contents)
  })

  // TODO: handle source map generation from virtual files

  setupLoader(map)
  try {
    return require(file.absolutePath)
  } finally {
    setupLoader() // reset!
  }
}
