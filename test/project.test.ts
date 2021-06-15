import { AssertionError } from 'assert'
import { expect } from 'chai'
import { relative } from 'path'
import { getProjectDirectory, setProjectDirectory } from '../src'

describe('Project', () => {
  it('should set the project directory', () => {
    const old = getProjectDirectory()
    try {
      setProjectDirectory(relative(process.cwd(), __dirname))
      expect(getProjectDirectory()).to.equal(__dirname)
    } finally {
      setProjectDirectory(old)
    }
  })

  it('should not set the project directory to a wrong location', () => {
    const old = getProjectDirectory()
    try {
      expect(() => setProjectDirectory('/foo'))
          .to.throw(Error).with.property('code', 'ENOENT')
      expect(() => setProjectDirectory(__filename))
          .to.throw(AssertionError, `Not a directory: ${__filename}`)
    } finally {
      setProjectDirectory(old)
    }
  })
})
