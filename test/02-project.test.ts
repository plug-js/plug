import { AssertionError } from 'assert'
import { expect } from 'chai'
import { relative } from 'path'
import { getProjectDirectory, getTaskName, setTaskName, setProjectDirectory } from '../src/project'

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

  it('should register and return a task name', () => {
    const task = {} as any
    expect(getTaskName(task)).to.equal('unknown')
    setTaskName(task, 'foobar')
    expect(getTaskName(task)).to.equal('foobar')
  })
})
