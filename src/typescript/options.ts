import {
  CompilerOptions,
  Diagnostic,
  DiagnosticCategory,
  convertCompilerOptionsFromJson,
  getDefaultCompilerOptions,
  readConfigFile,
} from 'typescript'

import {
  File,
  Files,
} from '../files'

import {
  AbsolutePath,
  getAbsolutePath,
  getDirectory,
  getDirectoryPath,
  getRelativePath,
} from '../utils/paths'

type CompilerOptionsAndDiagnostics = {
  options: CompilerOptions,
  diagnostics: readonly Diagnostic[],
  absolutePath?: AbsolutePath,
}

// Load options from a file in our filesystem
function loadOptions(
    file: File,
    files: Files,
    diagnostics: Diagnostic[],
    resolutionStack: AbsolutePath[] = [ file.absolutePath ],
): CompilerOptions | undefined {
  // A function to read files for TypeScript
  function readFile(name: string): string | undefined {
    const file = files.get(name)
    if (file.existsSync()) return file.contentsSync()
  }

  // istanbul ignore next - destructure "readConfigFile(...)" results in
  // compilerOptions, extendsPath and error with default values
  const {
    config: {
      compilerOptions = {} as object, // not yet a "compilerOptions"
      extends: extendsPath = undefined as string | undefined,
    } = {},
    error,
  } = readConfigFile(file.absolutePath, readFile)
  if (error) return void diagnostics.push(error)

  // Convert "compilerOptions" parsing the JSON format and returning it with proper enums and validations
  const { options, errors } = convertCompilerOptionsFromJson(
      compilerOptions, // the compiler options as JSON
      getDirectory(file.absolutePath), // dir of this config file
      file.absolutePath, // full path name of this config file
  )
  if (errors.length) return void diagnostics.push(...errors)

  // If we don't have a path to extend, we can return our options
  if (!extendsPath) return options

  // Check for circular extension errors
  const extendedPath = getAbsolutePath(getDirectory(file.absolutePath), extendsPath)
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
  const extendedFile = files.get(extendedPath)
  const extendsOptions = loadOptions(extendedFile, files, diagnostics, resolutionStack)
  resolutionStack.pop()
  return Object.assign({}, extendsOptions, options)
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
  let file = undefined as File | undefined
  if (fileName) {
    file = files.get(fileName)
  } else {
    file = files.get('tsconfig.json')
    if (! file.existsSync()) {
      const options = Object.assign(defaults, overrides)
      return { options, diagnostics: [] }
    }
  }

  // We have a file, so we read it...
  const diagnostics: Diagnostic[] = []
  const loaded = loadOptions(file, files, diagnostics)

  // Check if we had some issues while reading the file
  if (diagnostics.length) return { options: {}, diagnostics }

  // If we have some overrides with path, we must rewrite them
  if (overrides.outDir) overrides.outDir = getDirectoryPath(files.directory, overrides.outDir)
  if (overrides.outFile) overrides.outFile = getAbsolutePath(files.directory, overrides.outFile)
  if (overrides.rootDir) overrides.rootDir = getDirectoryPath(files.directory, overrides.rootDir)
  if (overrides.rootDirs) overrides.rootDirs = overrides.rootDirs.map((d) => getDirectoryPath(files.directory, d))

  // No issues, let's create our options...
  const options = Object.assign(defaults, loaded, overrides)
  return { options, diagnostics, absolutePath: file.absolutePath }
}
