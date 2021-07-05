import { disableLogs } from './support'
import { expect } from 'chai'
import { createFilePath } from '../src/utils/paths'
import { Files } from '../src/files'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'

import { directory as directory } from './support'
import { Run } from '../src/run'
import { SimpleFile } from '../src/files/simple'
import { mktempdir } from '../src/utils/mktempdir'
import { rmdirs } from '../src/utils/rmdirs'

describe('Simple Files', () => {
  function makeFiles(directory: string): Files {
    return Files.for({ project: { directory } } as Run)
  }

  disableLogs()

  it('should read a File from disk with a source map', async () => {
    const files = makeFiles(directory)
    const path = createFilePath(directory, 'withsourcemap.js')
    const file = new SimpleFile(files, path, true)

    const data = readFileSync(path, 'utf8')

    const contents = await file.contents()
    const sourceMap = await file.sourceMap()

    expect(contents).to.be.a('string').with.length.lessThan(data.length)
    expect(contents).to.equal(data.substr(0, contents.length))

    expect(sourceMap).to.be.an('object')
    expect(sourceMap).to.have.property('mappings').length.greaterThan(0)

    // reading sourcemap first
    const file2 = new SimpleFile(files, path, true)

    const sourceMap2 = await file2.sourceMap()

    expect(sourceMap2).to.be.an('object')
    expect(sourceMap2).to.have.property('mappings').length.greaterThan(0)

    expect(await file2.contents()).to.eql(contents)
  })

  it('should read a File from disk ignoring its source map', async () => {
    const files = makeFiles(directory)
    const path = createFilePath(directory, 'withsourcemap.js')
    const file = new SimpleFile(files, path, false)

    const data = readFileSync(path, 'utf8')

    const contents = await file.contents()
    const sourceMap = await file.sourceMap()

    expect(contents).to.equal(data)
    expect(sourceMap).to.be.undefined

    // reading sourcemap first
    const file2 = new SimpleFile(files, path, false)

    const sourceMap2 = await file2.sourceMap()

    expect(sourceMap2).to.be.undefined

    expect(await file2.contents()).to.eql(contents)
  })

  it('should read a File from disk overriding its source map', async () => {
    const files = makeFiles(directory)
    const path = createFilePath(directory, 'withsourcemap.js')
    const file = new SimpleFile(files, path, { version: 3 } as any)

    const data = readFileSync(path, 'utf8')

    const contents = await file.contents()
    const sourceMap = await file.sourceMap()

    expect(contents).to.equal(data)
    expect(sourceMap).to.have.property('mappings').length(0)

    // reading sourcemap first
    const file2 = new SimpleFile(files, path, { version: 3 } as any)

    const sourceMap2 = await file2.sourceMap()

    expect(sourceMap2).to.be.an('object')
    expect(sourceMap2).to.have.property('mappings').length(0)

    expect(await file2.contents()).to.eql(contents)
  })

  it('should read a File from disk with an external source map', async () => {
    const files = makeFiles(directory)
    const path = createFilePath(directory, 'withsourcemap.ext')
    const file = new SimpleFile(files, path, true)

    await file.contents() // read contents first
    const sourceMap = await file.sourceMap()

    expect(sourceMap).to.be.an('object')
    expect(sourceMap?.mappings).to.equal('mappings')

    const file2 = new SimpleFile(files, path, true)

    const sourceMap2 = await file2.sourceMap() // don't read contents

    expect(sourceMap2).to.be.an('object')
    expect(sourceMap2?.mappings).to.equal('mappings')
  })

  it('should read a File from disk with a missing source map', async () => {
    const files = makeFiles(directory)
    const path = createFilePath(directory, 'withsourcemap.bad')
    const file = new SimpleFile(files, path, true)

    const sourceMap = await file.sourceMap()

    expect(sourceMap).to.be.undefined // it'll log!
  })

  it('should cache or fail when a file disappears (async)', async () => {
    const dir = await mktempdir({ directory } as any)
    try {
      const path = createFilePath(dir, 'test.txt')
      writeFileSync(path, 'contents...')

      const files = makeFiles(dir)
      const file1 = new SimpleFile(files, path, false)
      const file2 = new SimpleFile(files, path, false)
      const file3 = new SimpleFile(files, path, false)

      // read file1, file2 synchronously, but _not_ file3
      expect(await file1.contents()).to.equal('contents...')
      expect(file2.contentsSync()).to.equal('contents...')

      // unlink
      unlinkSync(path)

      // file1/3 should have cached contents, file2 should fail
      expect(await file1.contents()).to.equal('contents...')
      expect(await file2.contents()).to.equal('contents...')
      await expect(file3.contents()).to.be.rejectedWith(Error)
    } finally {
      await rmdirs(dir)
    }
  })

  it('should cache or fail when a file disappears (sync)', async () => {
    const dir = await mktempdir({ directory } as any)
    try {
      const path = createFilePath(dir, 'test.txt')
      writeFileSync(path, 'contents...')

      const files = makeFiles(dir)
      const file1 = new SimpleFile(files, path, false)
      const file2 = new SimpleFile(files, path, false)
      const file3 = new SimpleFile(files, path, false)

      // read file1, file2 asynchronously but _not_ file3
      expect(file1.contentsSync()).to.equal('contents...')
      expect(await file2.contentsSync()).to.equal('contents...')

      // unkink
      unlinkSync(path)

      // file1 should have cached contents, file2 should fail
      expect(file1.contentsSync()).to.equal('contents...')
      expect(file2.contentsSync()).to.equal('contents...')
      expect(() => file3.contentsSync()).to.throw(Error)
    } finally {
      await rmdirs(dir)
    }
  })
})
