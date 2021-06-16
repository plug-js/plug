import { expect } from 'chai'
import { EOL } from 'os'
import { Diagnostic, DiagnosticCategory, FormatDiagnosticsHost } from 'typescript'
import { Failure } from '../src/failure'
import { hasErrors, hasWarnings, TypeScriptFailure } from '../src/typescript/diagnostic'

describe('TypeScript Diagnostics', () => {
  const error = {
    category: DiagnosticCategory.Error,
    messageText: 'An error diagnostic',
    code: 0,
  } as Diagnostic

  const warning = {
    category: DiagnosticCategory.Warning,
    messageText: 'A warning diagnostic',
    code: 0,
  } as Diagnostic

  it('should report when warnings are present', () => {
    expect(hasWarnings([ error, warning ])).to.be.true
    expect(hasWarnings([ error ])).to.be.false
    expect(hasWarnings([])).to.be.false
  })

  it('should report when errors are present', () => {
    expect(hasErrors([ error, warning ])).to.be.true
    expect(hasErrors([ warning ])).to.be.false
    expect(hasErrors([])).to.be.false
  })

  it('should wrap diagnostics into a failure', () => {
    const host = {
      getCurrentDirectory: (): string => process.cwd(),
      getCanonicalFileName: (f): string => f,
      getNewLine: (): string => EOL,
    } as FormatDiagnosticsHost

    // with message and diagnostics
    const failure1 = new TypeScriptFailure([ error, warning ], host, 'A TypeScript failure')

    expect(failure1).to.be.instanceOf(Failure)
    expect(failure1.message).to.eql('Build Failed: A TypeScript failure')

    expect(failure1.report(false)).to.eql(
        'error TS0: An error diagnostic\n' +
        'warning TS0: A warning diagnostic\n')
    // only check some ansi code in color mode...
    expect(failure1.report(true).indexOf('\x1b')).to.be.greaterThanOrEqual(0)

    expect(failure1.stack).to.match(new RegExp('^' +
      'Failure: Build Failed: A TypeScript failure\n' +
      '  error TS0: An error diagnostic\n' +
      '  warning TS0: A warning diagnostic\n' +
      '    at'))

    // without message and empty diagnostics
    const failure2 = new TypeScriptFailure([], host)

    expect(failure2).to.be.instanceOf(Failure)
    expect(failure2.message).to.eql('Build Failed: TypeScript Error')

    expect(failure2.report(false)).to.eql('')
    expect(failure2.report(true)).to.eql('')
  })
})
