import {
  CompilerOptions,
  Diagnostic,
  getDefaultCompilerOptions,
  DiagnosticCategory,
  convertCompilerOptionsFromJson,
  readConfigFile,
} from 'typescript'

import { VirtualFile, VirtualFileList } from '../files'
import { AbsolutePath, getAbsolutePath, getDirectory, getRelativePath } from '../utils/paths'

type CompilerOptionsAndDiagnostics = { options: CompilerOptions, diagnostics: readonly Diagnostic[] }

/** Load compiler options from a "tsconfig.json" file */
export function getCompilerOptions(fileSystem: VirtualFileList, fileName?: string): CompilerOptionsAndDiagnostics {
  let file = undefined as VirtualFile | undefined

  // If there's no file, we load either "tsconfig.json" or the defaults
  if (fileName) {
    file = fileSystem.get(fileName)
  } else {
    file = fileSystem.get('tsconfig.json')
    if (! file.existsSync()) {
      return { options: getDefaultCompilerOptions(), diagnostics: [] }
    }
  }

  function readFile(fileName: string): string | undefined {
    const file = fileSystem.get(fileName)
    if (file.existsSync()) return file.contentsSync()
  }

  function loadOptions(
      fileName: AbsolutePath,
      diagnostics: Diagnostic[],
      resolutionStack: AbsolutePath[] = [ fileName ],
  ): CompilerOptions {
    // istanbul ignore next - destructure "readConfigFile(...)" results in
    // compilerOptions, extendsPath and error with default values
    const {
      config: {
        compilerOptions = {} as object, // not yet a "compilerOptions"
        extends: extendsPath = undefined as string | undefined,
      } = {},
      error,
    } = readConfigFile(fileName, readFile)

    if (error) {
      diagnostics.push(error)
      return {}
    }

    // Convert "compilerOptions" parsing the JSON format and returning it with proper enums and validations
    const { options, errors } = convertCompilerOptionsFromJson(compilerOptions, fileSystem.directoryPath, fileName)

    if (errors.length) {
      diagnostics.push(...errors)
      return {}
    }

    if (extendsPath) {
      const absolutePath = getAbsolutePath(getDirectory(fileName), extendsPath)
      if (resolutionStack.indexOf(absolutePath) >= 0) {
        const directory = fileSystem.directoryPath
        const relativePath = getRelativePath(directory, absolutePath)
        const stack = resolutionStack.reverse().map((path) => getRelativePath(directory, path)).join('\n - ')
        diagnostics.push({
          messageText: `Circularity detected while resolving configuration "${relativePath}"\n - ${stack}`,
          category: DiagnosticCategory.Error,
          code: 18000, // copied from typescript internals...
          start: undefined,
          length: undefined,
          file: undefined,
        })
        return {}
      } else {
        resolutionStack.push(absolutePath)
        const extendsOptions = loadOptions(absolutePath, diagnostics, resolutionStack)
        resolutionStack.pop()
        if (diagnostics.length) return {}
        return Object.assign({}, extendsOptions, options)
      }
    }

    return options
  }

  const diagnostics: Diagnostic[] = []
  const options = loadOptions(file.absolutePath, diagnostics)
  return { options, diagnostics }
}
