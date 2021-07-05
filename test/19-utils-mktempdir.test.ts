import { expect } from 'chai'
import { rmdirSync, statSync } from 'fs'
import { sep } from 'path'
import { basename } from 'path/posix'
import { mktempdir } from '../src/utils/mktempdir'
import { directory } from './support'

describe('Temporary Directories', () => {
  it('should create a temporary directory', async () => {
    const dir = await mktempdir({ directory } as any)
    try {
      expect(basename(dir)).to.match(/^\.plug-/)
      expect(dir.substr(0, directory.length + 1)).to.equal(directory + sep)
      expect(statSync(dir).isDirectory()).to.be.true
    } finally {
      rmdirSync(dir)
    }
  })

  it('should create a temporary directory with a prefix', async () => {
    const dir = await mktempdir({ directory } as any, 'foobar')
    try {
      expect(basename(dir)).to.match(/^foobar/)
      expect(dir.substr(0, directory.length + 1)).to.equal(directory + sep)
      expect(statSync(dir).isDirectory()).to.be.true
    } finally {
      rmdirSync(dir)
    }
  })
})
