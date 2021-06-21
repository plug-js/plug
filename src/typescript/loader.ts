import { CompilePlug } from '../plugs/compile'
import { Files } from '../files'
import { Project } from '../project'
import { extname } from 'path'
import { setupLoader } from '../utils/loader'

import { DirectoryPath, FilePath, getParent } from '../utils/paths'
import { ModuleKind, ScriptTarget } from 'typescript'

/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export async function loadBuildFile(buildFile: FilePath, directory?: DirectoryPath): Promise<any> {
  if (extname(buildFile) === '.js') return require(buildFile)

  // Prepare our initial file system
  if (! directory) directory = getParent(buildFile)
  const files = new Files(directory)
  files.add(buildFile)

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
  })

  // Create a project
  const project = new Project({
    default: { run: (run) => compiler.process(files, run, run.log(compiler)) },
  }, buildFile, directory)

  // Await for the output of the compilation
  const output = await project.runTask('default')

  // Build our output file list and require our build file
  const map = new Map<FilePath, string>()
  output.list().forEach((file) => {
    const contents = file.contentsSync()
    map.set(file.absolutePath, contents)
    map.set(file.originalPath, contents)
  })

  setupLoader(map)
  try {
    return require(buildFile)
  } finally {
    setupLoader() // reset!
  }
}
