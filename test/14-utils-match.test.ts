import { expect } from 'chai'
import { match } from '../src/utils/match'

describe('Glob Matcher', () => {
  it('should honor case sensitivity of the filesystem', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      const matcher1 = match({ globs: [ '**/*.ts' ] })
      expect(matcher1('Foo.Ts')).to.be.false
      expect(matcher1('bar.ts')).to.be.true

      ;(<any> globalThis).caseSensitivePaths = false
      const matcher2 = match({ globs: [ '**/*.ts' ] })
      expect(matcher2('Foo.Ts')).to.be.true
      expect(matcher2('bar.ts')).to.be.true
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })

  it('should override case sensitivity of the filesystem', () => {
    try {
      (<any> globalThis).caseSensitivePaths = true
      const matcher1 = match({ globs: [ '**/*.ts' ], options: { nocase: true } })
      expect(matcher1('Foo.Ts')).to.be.true
      expect(matcher1('bar.ts')).to.be.true

      const matcher2 = match({ globs: [ '**/*.ts' ], options: { nocase: true } })
      expect(matcher2('Foo.Ts')).to.be.true
      expect(matcher2('bar.ts')).to.be.true

      ;(<any> globalThis).caseSensitivePaths = false
      const matcher3 = match({ globs: [ '**/*.ts' ], options: { nocase: false } })
      expect(matcher3('Foo.Ts')).to.be.false
      expect(matcher3('bar.ts')).to.be.true

      const matcher4 = match({ globs: [ '**/*.ts' ], options: { nocase: false } })
      expect(matcher4('Foo.Ts')).to.be.false
      expect(matcher4('bar.ts')).to.be.true
    } finally {
      delete (<any> globalThis).caseSensitivePaths
    }
  })
})
