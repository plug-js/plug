import { Failure } from '../failure'

import {
  Diagnostic,
  DiagnosticCategory,
  formatDiagnostics,
  FormatDiagnosticsHost,
  formatDiagnosticsWithColorAndContext,
} from 'typescript'

export class TypeScriptFailure extends Failure {
  private _host!: FormatDiagnosticsHost

  diagnostics!: readonly Diagnostic[]

  constructor(diagnostics: readonly Diagnostic[], host: FormatDiagnosticsHost, message?: string) {
    super(message || 'TypeScript Error')

    Object.defineProperties(this, {
      diagnostics: { value: diagnostics },
      _host: { value: host },
    })
  }

  report(colors: boolean): string {
    if (! colors) return formatDiagnostics(this.diagnostics, this._host)
    return formatDiagnosticsWithColorAndContext(this.diagnostics, this._host)
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