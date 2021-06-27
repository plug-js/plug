import { EOL } from 'os'
import { expect } from 'chai'
import { Diagnostic, DiagnosticCategory, FormatDiagnosticsHost } from 'typescript'
import { checkDiagnostics, hasErrors, hasWarnings } from '../src/typescript/diagnostic'

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

  it('should throw when checking diagnostics', () => {
    let colors = false
    let report = ''
    const run = {
      log: () => ({
        write: (r: string) => void (report = r),
        colors,
      }),
      fail(message: string) {
        throw new Error(message)
      },
    } as any

    const host = {
      getCurrentDirectory: (): string => process.cwd(),
      getCanonicalFileName: (f): string => f,
      getNewLine: (): string => EOL,
    } as FormatDiagnosticsHost

    expect(() => checkDiagnostics([], host, run, 'A TypeScript failure')).not.to.throw()

    colors = true
    expect(() => checkDiagnostics([ error ], host, run, 'A TypeScript failure'))
        .to.throw('A TypeScript failure')
    expect(report).to.match(/TS0.*An error diagnostic/)
    expect(report.indexOf('\x1b')).to.be.greaterThanOrEqual(0)

    colors = false
    expect(() => checkDiagnostics([ error ], host, run, 'A TypeScript failure'))
        .to.throw('A TypeScript failure')
    expect(report).to.match(/TS0.*An error diagnostic/)
    expect(report.indexOf('\x1b')).to.be.lessThan(0)
  })
})
