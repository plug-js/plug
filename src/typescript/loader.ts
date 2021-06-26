import assert from 'assert'

import type { DirectoryPath, FilePath } from '../utils/paths'
import type { Task } from '../task'

import { CompilePlug } from '../plugs/compile'
import { Files } from '../files'
import { ModuleKind, ScriptTarget } from 'typescript'
import { Project } from '../project'
import { extname } from 'path'
import { setupLoader } from '../utils/loader'
import { SourceMapsPlug } from '../plugs/sourcemaps'

/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export async function loadBuildFile(buildFile: FilePath, directory?: DirectoryPath): Promise<any> {
  if (extname(buildFile) === '.js') return require(buildFile)

  // Create our compiler
  const compiler = new CompilePlug({
    // Make sure we have our _own_ options enabled
    passThrough: false, // we don't care about non JS/TS files
    allowJs: false, // we won't read JS files
    module: ModuleKind.CommonJS, // use commonJS for now
    declaration: false, // we don't care about build's .d.ts
    target: ScriptTarget.ES2019, // best for Node 14.x?
    esModuleInterop: true, // needed for node modules
    importHelpers: false, // maybe we don't have "tslib"
    noEmit: false, // we always want our output to be gnerated
  })

  // Inject our source maps
  const sourcemaps = new SourceMapsPlug({ sourceMaps: 'inline' })

  // Create a project
  const init: Task = {
    run(run) {
      const files = new Files(run)
      files.add(buildFile)
      return sourcemaps.process(files, run, run.log(sourcemaps))
          .then((files) => compiler.process(files, run, run.log(compiler)))
    },
  }

  // Await for the output of the compilation
  const output = await new Project({ init }, buildFile, directory).runTask('init')

  // Build our output file list, and figure out where the original
  // typescript ended up in our compilation results
  const map = new Map<FilePath, string>()
  let compiled
  for (const file of output) {
    map.set(file.absolutePath, await file.contents())
    if (file.originalPath === buildFile) compiled = file.absolutePath
  }

  // Make sure we have a proper result and load our file
  assert(compiled, `Build file ${buildFile} was not compiled`)
  setupLoader(map)
  try {
    return require(compiled)
  } finally {
    setupLoader() // reset!
  }
}
