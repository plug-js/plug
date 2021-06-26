import { createDirectoryPath, createFilePath } from '../utils/paths'
import { convertCompilerOptionsFromJson, DiagnosticCategory, getDefaultCompilerOptions, readConfigFile } from 'typescript'
import { getParent, getRelativePath } from '../utils/paths'

import type { FilePath } from '../utils/paths'
import type { CompilerOptions, Diagnostic } from 'typescript'
import type { Files } from '../files'

type CompilerOptionsAndDiagnostics = {
  options: CompilerOptions,
  diagnostics: readonly Diagnostic[],
  filePath?: FilePath,
}

// Load options from a file in our filesystem
function loadOptions(
    file: FilePath,
    files: Files,
    diagnostics: Diagnostic[],
    resolutionStack: FilePath[] = [ file ],
): CompilerOptions | undefined {
  // A function to read files for TypeScript
  function readFile(name: string): string | undefined {
    return files.get(name)?.contentsSync()
  }

  // istanbul ignore next - destructure "readConfigFile(...)" results in
  // compilerOptions, extendsPath and error with default values
  const {
    config: {
      compilerOptions = {} as object, // not yet a "compilerOptions"
      extends: extendsPath,
    } = {},
    error,
  } = readConfigFile(file, readFile)
  if (error) return void diagnostics.push(error)

  // Convert "compilerOptions" parsing the JSON format and returning it with proper enums and validations
  const { options, errors } = convertCompilerOptionsFromJson(
      compilerOptions, // the compiler options as JSON
      getParent(file), // dir of this config file
      file, // full path name of this config file
  )
  if (errors.length) return void diagnostics.push(...errors)

  // If we don't have a path to extend, we can return our options
  if (!extendsPath) return options

  // Check for circular extension errors
  const directory = getParent(file)
  const extendedPath = createFilePath(directory, extendsPath)
  if (resolutionStack.indexOf(extendedPath) >= 0) {
    const directory = files.directory
    const relativePath = getRelativePath(directory, extendedPath)
    const stack = resolutionStack.reverse().map((path) => getRelativePath(directory, path)).join('\n - ')
    return void diagnostics.push({
      messageText: `Circularity detected while resolving configuration "${relativePath}"\n - ${stack}`,
      category: DiagnosticCategory.Error,
      code: 18000, // copied from typescript internals...
      start: undefined,
      length: undefined,
      file: undefined,
    })
  }

  // Push our file in the stack and load recursively
  resolutionStack.push(extendedPath)
  const extendsOptions = loadOptions(extendedPath, files, diagnostics, resolutionStack)
  resolutionStack.pop()
  return { ...extendsOptions, ...options }
}


/** Load compiler options from a "tsconfig.json" file */
export function getCompilerOptions(
    files: Files,
    fileName?: string,
    overrides: CompilerOptions = {},
): CompilerOptionsAndDiagnostics {
  // Our default options, always assigned...
  const defaults = getDefaultCompilerOptions()

  // If there's no file, we load either "tsconfig.json" or the defaults
  let path
  if (fileName) {
    path = createFilePath(files.directory, fileName)
  } else {
    path = files.get('tsconfig.json')?.absolutePath
  }

  // If we have no path, return the defaults
  if (! path) {
    const options = { ...defaults, ...overrides }
    return { options, diagnostics: [] }
  }

  // We have a file, so we read it...
  const diagnostics: Diagnostic[] = []
  const loaded = loadOptions(path, files, diagnostics)

  // Check if we had some issues while reading the file
  if (diagnostics.length) return { options: {}, diagnostics }

  // If we have some overrides with path, we must rewrite them
  if (overrides.outDir) overrides.outDir = createDirectoryPath(files.directory, overrides.outDir)
  if (overrides.outFile) overrides.outFile = createFilePath(files.directory, overrides.outFile)
  if (overrides.rootDir) overrides.rootDir = createDirectoryPath(files.directory, overrides.rootDir)
  if (overrides.declarationDir) overrides.declarationDir = createDirectoryPath(files.directory, overrides.declarationDir)
  if (overrides.rootDirs) overrides.rootDirs = overrides.rootDirs.map((d) => createDirectoryPath(files.directory, d))

  // No issues, let's create our options...
  const options = { ...defaults, ...loaded, ...overrides }
  return { options, diagnostics, filePath: path }
}
