import { expect } from 'chai'
import { parseOptions } from '../src/utils/options'

describe('Options Parsing', () => {
  it('should parse some options', () => {
    const parsed1 = parseOptions([ 'foo' ])
    expect(parsed1).to.eql({
      globs: [ 'foo' ],
      options: undefined,
    })

    const parsed2 = parseOptions([ 'foo', 'bar', 'baz' ])
    expect(parsed2).to.eql({
      globs: [ 'foo', 'bar', 'baz' ],
      options: undefined,
    })

    const parsed3 = parseOptions([ 'foo', { foo: true } ])
    expect(parsed3).to.eql({
      globs: [ 'foo' ],
      options: { foo: true },
    })

    const parsed4 = parseOptions([ 'foo', 'bar', 'baz', { foo: true } ])
    expect(parsed4).to.eql({
      globs: [ 'foo', 'bar', 'baz' ],
      options: { foo: true },
    })
  })

  it('should parse some options with defaults', () => {
    const parsed1 = parseOptions([ 'foo' ], { foo: true })
    expect(parsed1).to.eql({
      globs: [ 'foo' ],
      options: { foo: true },
    })

    const parsed2 = parseOptions([ 'foo', 'bar', 'baz', { foo: true } ], { foo: false })
    expect(parsed2).to.eql({
      globs: [ 'foo', 'bar', 'baz' ],
      options: { foo: true },
    })

    type T = { foo?: boolean, bar?: number }
    const parsed3 = parseOptions([ 'foo', 'bar', 'baz', { foo: true, bar: 123 } as T ], { foo: false, baz: 321 })
    expect(parsed3).to.eql({
      globs: [ 'foo', 'bar', 'baz' ],
      options: { foo: true, bar: 123, baz: 321 },
    })
  })

  it('should not fail when no string arguments are specified', () => {
    // this is questionable!!!
    const parsed1 = parseOptions([ ] as any)
    const parsed2 = parseOptions([ { foo: true } ] as any)
    const parsed3 = parseOptions([ { foo: false } ] as any, { foo: true })
    expect(parsed1).to.eql({ globs: [], options: undefined })
    expect(parsed2).to.eql({ globs: [], options: { foo: true } })
    expect(parsed3).to.eql({ globs: [], options: { foo: false } })
  })
})
