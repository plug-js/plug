import { mkdir, writeFile } from 'fs/promises'
import { DirectoryPath } from '../src/utils/paths'
import { directory } from './support'
import { mktempdir } from '../src/utils/mktempdir'
import { rmdirs } from '../src/utils/rmdirs'
import { join } from 'path'
import { expect } from 'chai'
import { existsSync } from 'fs'

describe('Directory removal', () => {
  let dir: DirectoryPath
  let dir1: string
  let dir2: string
  let file1: string
  let file2: string
  let file3: string

  before(async () => {
    dir = await mktempdir({ directory } as any)
    await mkdir(dir1 = join(dir, 'foo', 'bar'), { recursive: true })
    await mkdir(dir2 = join(dir, 'foo', 'baz'), { recursive: true })
    await writeFile(file1 = join(dir, 'foo', 'bar', 'test.1'), 'hello, world!')
    await writeFile(file2 = join(dir, 'foo', 'baz', 'test.2'), 'hello, world!')
    await writeFile(file3 = join(dir, 'foo', 'test.3'), 'hello, world!')
  })

  it('should delete files with globs and options', async () => {
    await rmdirs(dir, '**/*.1', { pruneEmptyDirectories: false })
    expect(existsSync(dir)).to.be.true
    expect(existsSync(dir1)).to.be.true
    expect(existsSync(dir2)).to.be.true
    expect(existsSync(file1)).to.be.false
    expect(existsSync(file2)).to.be.true
    expect(existsSync(file3)).to.be.true
  })

  it('should delete files and empty directories with globs', async () => {
    await rmdirs(dir, '**/*.2')
    expect(existsSync(dir)).to.be.true
    expect(existsSync(dir1)).to.be.false
    expect(existsSync(dir2)).to.be.false
    expect(existsSync(file1)).to.be.false
    expect(existsSync(file2)).to.be.false
    expect(existsSync(file3)).to.be.true
  })

  it('should delete everything by default', async () => {
    await rmdirs(dir)
    expect(existsSync(dir)).to.be.false
    expect(existsSync(dir1)).to.be.false
    expect(existsSync(dir2)).to.be.false
    expect(existsSync(file1)).to.be.false
    expect(existsSync(file2)).to.be.false
    expect(existsSync(file3)).to.be.false
  })
})
