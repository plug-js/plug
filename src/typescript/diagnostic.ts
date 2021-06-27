import {
  DiagnosticCategory,
  formatDiagnostics,
  formatDiagnosticsWithColorAndContext,
} from 'typescript'

import type { Diagnostic, FormatDiagnosticsHost } from 'typescript'
import type { Run } from '../run'

// Check for failures and throw a TypeScript failure
export function checkDiagnostics(
    diagnostics: readonly Diagnostic[],
    host: FormatDiagnosticsHost,
    run: Run,
    message?: string,
): void {
  if (! diagnostics.length) return

  const log = run.log()
  log.write((!log.colors) ? formatDiagnostics(diagnostics, host) :
      formatDiagnosticsWithColorAndContext(diagnostics, host))
  run.fail(message)
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
