import { AssertionError } from 'assert'
import { Files } from '../src/files'
import { Project } from '../src/project'
import { Run } from '../src/run'
import { basename, join } from 'path'
import { expect } from 'chai'
import { FilePath, getCanonicalPath } from '../src/utils/paths'

import { directory } from './support'
import { SimpleFile } from '../src/files/simple'
import { VirtualFile } from '../src/files/virtual'
import { FileWrapper } from '../src/files/wrapper'
const testfile = join(directory, 'build.ts')

describe('File lists', () => {
  function makeFiles(directory: string): Files {
    return Files.for({ project: { directory } } as Run)
  }

  it('should create a Files instance', () => {
    const project = { directory: '/projectDir' } as Project
    const run = { project } as Run

    const runFiles = Files.for(run)
    expect(runFiles.directory).to.equal('/projectDir')
    expect(runFiles.parent).to.be.undefined

    const forkFiles = runFiles.fork()
    expect(forkFiles.directory).to.equal('/projectDir')
    expect(forkFiles.parent).to.equal(runFiles)
  })

  describe('Getting files', () => {
    it('should get a file', () => {
      const files = makeFiles(directory)
      const file = files.get(testfile)!

      expect(file).to.not.be.undefined
      expect(file).to.be.instanceOf(SimpleFile)
      expect(file.absolutePath).to.equal(testfile)
      expect(file.originalFile).to.be.undefined
      expect(file.canonicalPath).to.equal(getCanonicalPath(testfile as any))

      expect(files.get(testfile)).to.equal(file)
      expect(files.get(basename(testfile))).to.equal(file)
      expect(files.get(`../${basename(directory)}/${basename(testfile)}`)).to.equal(file)

      expect(files.list()).to.eql([])
    })

    it('should not get a non-existant file', () => {
      const files = makeFiles(directory)
      const file = files.get('this does not exist for sure')
      expect(file).to.be.undefined
    })

    it('should get a file from its parent', () => {
      const files1 = makeFiles('/foo')
      const file = files1.add('bar.txt', 'hello, world!')

      expect(files1.get('bar.txt')).to.equal(file)
      expect(files1.get('baz.txt')).to.be.undefined

      const files2 = files1.fork()

      expect(files2.get('bar.txt')).to.equal(file)
      expect(files2.get('baz.txt')).to.be.undefined
    })

    it('should get files from a Files instance with case sensitive paths', () => {
      try {
        (<any> globalThis).caseSensitivePaths = true

        const files = makeFiles('/Foo')
        const file = files.add('Bar.Txt', 'content')!

        expect(file).to.be.instanceOf(VirtualFile)
        expect(file.absolutePath).to.equal('/Foo/Bar.Txt')
        expect(file.originalFile).to.be.undefined
        expect(file.canonicalPath).to.equal('/Foo/Bar.Txt')

        // Re-get the same file
        expect(files.get('Bar.Txt')).to.equal(file)
        expect(files.get('./Bar.Txt')).to.equal(file)
        expect(files.get('Baz/../Bar.Txt')).to.equal(file)
        expect(files.get('../Foo/Bar.Txt')).to.equal(file)
        expect(files.get('/Foo/Bar.Txt')).to.equal(file)

        // Case sensitive, it should not get the same file
        expect(files.get('bar.txt')).not.to.equal(file)
        expect(files.get('./bar.txt')).not.to.equal(file)
        expect(files.get('baz/../bar.txt')).not.to.equal(file)
        expect(files.get('../foo/bar.txt')).not.to.equal(file)
        expect(files.get('/foo/bar.txt')).not.to.equal(file)
      } finally {
        delete (<any> globalThis).caseSensitivePaths
      }
    })

    it('should get files from a Files instance with case insensitive paths', () => {
      try {
        (<any> globalThis).caseSensitivePaths = false

        const files = makeFiles('/Foo')
        const file = files.add('Bar.Txt', 'content')!

        expect(file).to.be.instanceOf(VirtualFile)
        expect(file.absolutePath).to.equal('/Foo/Bar.Txt')
        expect(file.originalFile).to.be.undefined
        expect(file.canonicalPath).to.equal('/foo/bar.txt') // case insensitive

        // Re-get the same file
        expect(files.get('Bar.Txt')).to.equal(file)
        expect(files.get('./Bar.Txt')).to.equal(file)
        expect(files.get('Baz/../Bar.Txt')).to.equal(file)
        expect(files.get('../Foo/Bar.Txt')).to.equal(file)
        expect(files.get('/Foo/Bar.Txt')).to.equal(file)

        // Case sensitive, it should not get the same file
        expect(files.get('bar.txt')).to.equal(file)
        expect(files.get('./bar.txt')).to.equal(file)
        expect(files.get('baz/../bar.txt')).to.equal(file)
        expect(files.get('../foo/bar.txt')).to.equal(file)
        expect(files.get('/foo/bar.txt')).to.equal(file)
      } finally {
        delete (<any> globalThis).caseSensitivePaths
      }
    })
  })

  describe('Adding files', () => {
    it('should add a file', () => {
      const files = makeFiles(directory)
      const file = files.add(testfile)

      expect(file).to.not.be.undefined
      expect(file).to.be.instanceOf(SimpleFile)
      expect(file.absolutePath).to.equal(testfile)
      expect(file.originalFile).to.be.undefined
      expect(file.canonicalPath).to.equal(getCanonicalPath(testfile as any))

      expect(files.get(testfile)).to.equal(file)
      expect(files.get(basename(testfile))).to.equal(file)
      expect(files.get(`../${basename(directory)}/${basename(testfile)}`)).to.equal(file)

      expect(files.list()).to.eql([ file ])
      expect(files.list()[0]).to.equal(file)
    })

    it('should not add a non-existant file', () => {
      const files = makeFiles(directory)
      expect(() => files.add('this does not exist for sure'))
          .to.throw(Error, `File "${directory}/this does not exist for sure" not found`)

      expect(() => files.add('dir'))
          .to.throw(Error, `File "${directory}/dir" not found`)
    })

    it('should add a simple file with case sensitive paths', () => {
      try {
        (<any> globalThis).caseSensitivePaths = true
        const files = makeFiles('/Foo')
        const file = files.add('One.Txt', 'content')

        expect(file).to.be.instanceOf(VirtualFile)
        expect(file.absolutePath).to.equal('/Foo/One.Txt')
        expect(file.originalFile).to.be.undefined
        expect(file.canonicalPath).to.equal('/Foo/One.Txt')

        expect(files.get('One.Txt')).to.equal(file) // same instance
        expect(files.get('./One.Txt')).to.equal(file) // same instance
        expect(files.get('/Foo/One.Txt')).to.equal(file) // same instance

        expect(files.get('one.txt')).to.not.equal(file) // case sensitive
        expect(files.get('./one.txt')).to.not.equal(file) // case sensitive
        expect(files.get('/foo/one.txt')).to.not.equal(file) // case sensitive

        expect(files.has('One.Txt')).to.be.true
        expect(files.has('./One.Txt')).to.be.true
        expect(files.has('/Foo/One.Txt')).to.be.true

        expect(files.has('one.txt')).to.be.false // case sensitive
        expect(files.has('./one.txt')).to.be.false // case sensitive
        expect(files.has('/foo/one.txt')).to.be.false // case sensitive
      } finally {
        delete (<any> globalThis).caseSensitivePaths
      }
    })

    it('should add a simple path with case insensitive paths', () => {
      try {
        (<any> globalThis).caseSensitivePaths = false
        const files = makeFiles('/Foo')
        const file = files.add('One.Txt', 'content')

        expect(file).to.be.instanceOf(VirtualFile)
        expect(file.absolutePath).to.equal('/Foo/One.Txt')
        expect(file.originalFile).to.be.undefined
        expect(file.canonicalPath).to.equal('/foo/one.txt') // case insensitive

        expect(files.get('One.Txt')).to.equal(file) // same instance
        expect(files.get('./One.Txt')).to.equal(file) // same instance
        expect(files.get('/Foo/One.Txt')).to.equal(file) // same instance

        expect(files.get('one.txt')).to.equal(file) // case insensitive
        expect(files.get('./one.txt')).to.equal(file) // case insensitive
        expect(files.get('/foo/one.txt')).to.equal(file) // case insensitive

        expect(files.has('One.Txt')).to.be.true
        expect(files.has('./One.Txt')).to.be.true
        expect(files.has('/Foo/One.Txt')).to.be.true

        expect(files.has('one.txt')).to.be.true // case insensitive
        expect(files.has('./one.txt')).to.be.true // case insensitive
        expect(files.has('/foo/one.txt')).to.be.true // case insensitive
      } finally {
        delete (<any> globalThis).caseSensitivePaths
      }
    })

    it('should re-add a file', () => {
      const files = makeFiles('/foo')

      // add same file with the same path
      const file1 = files.add('bar.txt', 'content')
      expect(file1).to.be.instanceOf(VirtualFile)

      expect(files.add(file1)).to.equals(file1) // same file, just added
      expect(files.list()).to.eql([ file1 ]) // and should show in the list
      expect(files.list()[0]).to.equal(file1) // same instance check

      // add same file with an empty path
      expect(files.add('', file1)).to.equals(file1) // same file, just added
      expect(files.list()).to.eql([ file1 ]) // and should show in the list
      expect(files.list()[0]).to.equal(file1) // same instance check

      // add same file with the same (forced) path
      expect(files.add('bar.txt', file1)).to.equals(file1)
      expect(files.add('/foo/bar.txt', file1)).to.equals(file1)
      expect(files.add('../foo/bar.txt', file1)).to.equals(file1)
      expect(files.list()).to.eql([ file1 ])
      expect(files.list()[0]).to.equal(file1)

      // add same file but with a different path
      const file2 = files.add('baz.txt', file1)
      expect(file2).to.be.instanceOf(FileWrapper)

      expect(files.list()).to.eql([ file1, file2 ])
      expect(files.list()[0]).to.equal(file1)
      expect(files.list()[1]).to.equal(file2)
    })

    it('should add a file with some options', () => {
      const files = makeFiles('/foo')
      const file1 = files.add('bar.txt', {
        contents: 'hello, world 1!',
        sourceMap: { version: 3 } as any,
      })

      expect(file1).to.be.instanceOf(VirtualFile)
      expect(files.list()).to.eql([ file1 ])
      expect(files.list()[0]).to.equal(file1)

      expect(file1.absolutePath).to.equal('/foo/bar.txt')
      expect(file1.originalFile).to.be.undefined
      expect(file1.contentsSync()).to.equal('hello, world 1!')

      // overwrite file...
      const file2 = files.add('bar.txt', {
        contents: 'hello, world 2!',
        sourceMap: { version: 3 } as any,
        originalFile: file1,
      })

      expect(file2).to.be.instanceOf(VirtualFile)
      expect(files.list()).to.eql([ file2 ])
      expect(files.list()[0]).to.equal(file2)

      expect(file2.absolutePath).to.equal('/foo/bar.txt')
      expect(file2.originalFile).to.equal(file1)
      expect(file2.contentsSync()).to.equal('hello, world 2!')

      // different path, different content
      const file3 = files.add('baz.txt', {
        contents: 'hello, world 3!',
        sourceMap: { version: 3 } as any,
        originalFile: file2,
      })

      expect(file3).to.be.instanceOf(VirtualFile)
      expect(files.list().sort()).to.eql([ file2, file3 ])
      expect(files.list().sort()[1]).to.equal(file3)

      expect(file3.absolutePath).to.equal('/foo/baz.txt')
      expect(file3.originalFile).to.equal(file2)
      expect(file3.contentsSync()).to.equal('hello, world 3!')
    })

    it('should not add with an empty or invalid path', () => {
      expect(() => makeFiles('/foo').add('')).to.throw(AssertionError, 'No path for file to be added')
      expect(() => makeFiles('/foo').add('/bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
      expect(() => makeFiles('/foo').add('../bar')).to.throw(AssertionError, 'Refusing to add file "/bar" to "/foo"')
    })
  })

  describe('Files listing', () => {
    it('should list files', () => {
      const files = makeFiles('/foo')
      files.add('3.txt', 'content3')
      files.add('2.txt', 'content2')
      files.add('1.txt', 'content1')
      expect(files.length).to.equal(3)
      expect(files.list().length).to.equal(3)
    })

    it('should sort file lists', () => {
      const files = makeFiles('/foo')
      files.add('3.txt', 'content3')
      files.add('2.txt', 'content2')
      files.add('1.txt', 'content1')

      expect(files.list().sort()).to.eql([
        { absolutePath: '/foo/1.txt' },
        { absolutePath: '/foo/2.txt' },
        { absolutePath: '/foo/3.txt' },
      ])

      // force a different sort alogorithm
      expect(files.list().sort((a, b) => b.absolutePath.localeCompare(a.absolutePath))).to.eql([
        { absolutePath: '/foo/3.txt' },
        { absolutePath: '/foo/2.txt' },
        { absolutePath: '/foo/1.txt' },
      ])
    })

    it('should iterate files', () => {
      const files = makeFiles('/foo')
      files.add('3.txt', 'content3')
      files.add('2.txt', 'content2')
      files.add('1.txt', 'content1')

      const paths: FilePath[] = []
      for (const file of files) paths.push(file.absolutePath)
      expect(paths.sort()).to.eql([ '/foo/1.txt', '/foo/2.txt', '/foo/3.txt' ])
    })

    it('should iterate files with "forEach"', () => {
      const files = makeFiles('/foo')
      files.add('3.txt', 'content3')
      files.add('2.txt', 'content2')
      files.add('1.txt', 'content1')

      const paths: FilePath[] = []
      files.forEach((file) => paths.push(file.absolutePath))
      expect(paths.sort()).to.eql([ '/foo/1.txt', '/foo/2.txt', '/foo/3.txt' ])
    })

    it('should map files with "map"', () => {
      const files = makeFiles('/foo')
      files.add('3.txt', 'content3')
      files.add('2.txt', 'content2')
      files.add('1.txt', 'content1')

      const paths = files.map((file) => file.absolutePath)
      expect(paths.sort()).to.eql([ '/foo/1.txt', '/foo/2.txt', '/foo/3.txt' ])
    })
  })
})
