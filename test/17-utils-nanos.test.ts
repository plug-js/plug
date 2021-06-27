import { expect } from 'chai'
import { nanos } from '../src/utils/nanos'

describe('Nanosecond Time Formatting', () => {
  it('should format nanoseconds in a readable format', () => {
    // 1 nano scale
    expect(nanos(1n)).to.eql([ [ 0, 'ms' ] ])
    // 1 micro scale
    expect(nanos(1987n)).to.eql([ [ 0.001, 'ms' ] ])
    // 1 milli scale
    expect(nanos(1987654n)).to.eql([ [ 1.987, 'ms' ] ])
    // 1 second scale
    expect(nanos(1987654321n)).to.eql([ [ 1.987, 'sec' ] ])
    // 1 minute scale
    expect(nanos(119876543210n)).to.eql([ [ 1, 'min' ], [ 59.876, 'sec' ] ])
    // 1 hour scale
    expect(nanos(3598765432100n)).to.eql([ [ 59, 'min' ], [ 58.765, 'sec' ] ])
  })
})
