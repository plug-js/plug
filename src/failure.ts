import { EOL } from 'os'

// istanbul ignore next - we always have stacks...
function split(message: string, stack?: string): string[] {
  return stack?.split(EOL) || [ `Failure: ${message}` ]
}

/** An `Error` representing a build failure */
export class Failure extends Error {
  constructor(message?: string) {
    super(message ? `Build Failed: ${message}` : 'Build Failed')
    this.name = 'Failure'
  }
}

/** A `Failure` with reporting capabilities */
export abstract class ReportFailure extends Failure {
  stack!: string

  constructor(message?: string) {
    super(message)

    const [ firstLine, ...stack ] = split(this.message, this.stack)
    Object.defineProperty(this, 'stack', { get() {
      const report = this.report(false).trimEnd().replace(/^/gm, '  ')
      return [ firstLine, report, ...stack ].join(EOL)
    } })
  }

  abstract report(colors: boolean): string;
}
