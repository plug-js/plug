import { expect } from 'chai'
import { setupLoader } from '../src/utils/loader'
import { AbsolutePath } from '../src/utils/paths'

describe('Node Loader', () => {
  it('should load some files and clear caches', () => {
    try {
      const map = new Map<AbsolutePath, string>()
      map.set('/foo/bar.js' as AbsolutePath, 'module.exports = "foobar"')
      setupLoader(map)

      expect(require('/foo/bar.js')).to.equal('foobar')

      setupLoader()
      expect(() => require('/foo/bar.js')).to.throw(Error, '/foo/bar.js')
    } finally {
      setupLoader()
    }
  })

  it('should load some files with inclusions', () => {
    try {
      const map = new Map<AbsolutePath, string>()
      map.set('/abc/foo.js' as AbsolutePath, 'module.exports = require("./bar")')
      map.set('/abc/bar.js' as AbsolutePath, 'module.exports = require("../abc/baz")')
      map.set('/abc/baz/index.js' as AbsolutePath, 'module.exports = "hello, world!"')

      setupLoader(map)
      expect(require('/abc/foo.js')).to.equal('hello, world!')
    } finally {
      setupLoader()
    }
  })

  it('should fail when recursion is detected', async () => {
    const warnings: string[] = []
    const listener = (warning: Error): void => void warnings.push(warning.message)
    process.on('warning', listener)

    try {
      const map = new Map<AbsolutePath, string>()
      map.set('/abc/foo.js' as AbsolutePath, 'module.exports = "foo..." + require("./bar")')
      map.set('/abc/bar.js' as AbsolutePath, 'module.exports = "bar..." + require("./baz")')
      map.set('/abc/baz.js' as AbsolutePath, `
        // module.exports will be the string "{}" as both "desc" and "prop"
        // should be undefined... if anything pops up, we should catch it...
        const foo = require('./foo')
        module.exports = JSON.stringify({
          desc: Object.getOwnPropertyDescriptor(foo, 'foo'),
          prop: foo['foo'],
        })
      `)

      setupLoader(map)
      expect(require('/abc/foo.js')).to.eql('foo...bar...{}')

      // warnings are emitted on next tick
      await new Promise((resolve) => setTimeout(resolve, 5))
      expect(warnings.length).to.be.greaterThan(0)
      for (const warning of warnings) {
        expect(warning).to.equal('Circular dependency requiring "/abc/foo.js" from "/abc/baz.js"')
      }
    } finally {
      process.off('warning', listener)
      setupLoader()
    }
  })
})
