import { expect } from 'chai'
import { Failure } from '../src/failure'

describe('Failures', () => {
  it('should correctly create a failure', async () => {
    const failure = new class extends Failure {
      report(colors: boolean): string {
        return `report ${colors ? 'with' : 'without'} colors`
      }
    }

    expect(failure).to.be.instanceof(Error)
    expect(failure.name).to.equal('Failure')
    expect(failure.message).to.equal('Build Failed')
    expect(failure.stack).to.match(/^Failure: Build Failed\n {2}report without colors\n {4}at/m)

    expect(failure.report(false)).to.equal('report without colors')
    expect(failure.report(true)).to.equal('report with colors')
  })

  it('should correctly create a failure with a message', async () => {
    const failure = new class extends Failure {
      constructor() {
        super('A message...')
      }

      report(colors: boolean): string {
        return `report ${colors ? 'with' : 'without'} colors`
      }
    }
    expect(failure).to.be.instanceof(Error)
    expect(failure.name).to.equal('Failure')
    expect(failure.message).to.equal('Build Failed: A message...')
    expect(failure.stack).to.match(/^Failure: Build Failed: A message\.\.\.\n {2}report without colors\n {4}at/m)

    expect(failure.report(false)).to.equal('report without colors')
    expect(failure.report(true)).to.equal('report with colors')
  })
})
