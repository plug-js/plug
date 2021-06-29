import assert from 'assert'

import { CompilePlug } from './plugs/compile'
import { Files } from './files'
import { ModuleKind, ScriptTarget } from 'typescript'
import { Project } from './project'
import { Run } from './run'
import { extname, basename } from 'path'
import { getParent } from './utils/paths'
import { log } from './utils/log'
import { parallelize } from './utils/parallelize'
import { setupLoader } from './utils/loader'
import { writeSourceMap } from './files/sourcemap'

import type { DirectoryPath, FilePath } from './utils/paths'

/* ========================================================================== *
 * BUILD FILE LOADER                                                          *
 * ========================================================================== */

/**
 * Load our build file from TypeScript (or JavaScript)
 */
export async function loadBuildFile(buildFile: FilePath): Promise<any> {
  if (extname(buildFile) !== '.ts') return require(buildFile)

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

  // Prepare a simple (empty) process for running our pipeline
  const project = new Project({}, buildFile, getParent(buildFile))
  const run = new Run(project)
  const input = Files.for(run)
  input.add(buildFile)

  // Run our pipeline to compile the build file
  const output = await compiler.process(input, run, log)

  // Build our output file list, and figure out where the original
  // typescript ended up in our compilation results
  const map = new Map<FilePath, string>()
  await parallelize(output, async (file) => {
    const outputs = await writeSourceMap(file.absolutePath, file, {
      sourceMaps: 'inline', // inline source maps, easier for node to find them
      combineSourceMaps: false, // produce simple source maps (1 level deep!)
    }) // default, inline!
    for (const [ path, contents ] of outputs) map.set(path, contents)
  })

  // Make sure we have a proper result and load our file
  const compiled = output.get(`${basename(buildFile, '.ts')}.js`)?.absolutePath
  assert(compiled, `Build file "${buildFile}" was not compiled`)
  setupLoader(map)
  try {
    return require(compiled)
  } finally {
    setupLoader() // reset!
  }
}

export async function loadProject(buildFile: FilePath, directory?: DirectoryPath): Promise<Project> {
  const build = await loadBuildFile(buildFile)
  return new Project(build, buildFile, directory)
}
