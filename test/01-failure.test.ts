import { expect } from 'chai'
import { Failure, ReportFailure } from '../src/failure'

describe('Failures', () => {
  it('should correctly create a failure', async () => {
    const failure1 = new Failure()
    expect(failure1).to.be.instanceof(Error)
    expect(failure1.name).to.equal('Failure')
    expect(failure1.message).to.equal('Build Failed')

    const failure2 = new Failure('A message...')
    expect(failure2).to.be.instanceof(Error)
    expect(failure2.name).to.equal('Failure')
    expect(failure2.message).to.equal('Build Failed: A message...')
  })

  it('should correctly create a reporting failure', async () => {
    const failure = new class extends ReportFailure {
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

  it('should correctly create a reporting failure with a message', async () => {
    const failure = new class extends ReportFailure {
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
