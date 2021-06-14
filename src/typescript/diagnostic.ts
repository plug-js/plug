import {
  Diagnostic,
  DiagnosticCategory,
  FormatDiagnosticsHost,
  formatDiagnosticsWithColorAndContext,
} from 'typescript'

class Failure extends Error {
  constructor() {
    super('Build failed')
    this.name = 'Failure'
    delete this.stack
  }
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  for (const diagnostic of diagnostics) {
    if (diagnostic.category == DiagnosticCategory.Error) return true
  }
  return false
}

export function hasWarnings(diagnostics: readonly Diagnostic[]): boolean {
  for (const diagnostic of diagnostics) {
    if (diagnostic.category == DiagnosticCategory.Warning) return true
  }
  return false
}

export function reportAndFail(diagnostics: readonly Diagnostic[], host: FormatDiagnosticsHost): void {
  if (diagnostics.length == 0) return
  process.stderr.write(formatDiagnosticsWithColorAndContext(diagnostics, host))
  if (hasErrors(diagnostics)) throw new Failure()
}
