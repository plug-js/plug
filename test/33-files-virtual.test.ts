import { expect } from 'chai'
import { VirtualFile } from '../src/files/virtual'
import { SOURCE_MAPPING_URL } from '../src/sourcemaps'
import { FilePath } from '../src/utils/paths'
import { mock } from './support'

describe('Virtual Files', () => {
  const { files } = mock('/foo')
  const path1 = '/foo/bar.txt' as FilePath
  const path2 = '/foo/baz.txt' as FilePath

  const b64 = Buffer.from(JSON.stringify({ version: 3, mappings: 'foo' })).toString('base64')
  const inlineSourceMap = `//# ${SOURCE_MAPPING_URL}=data:application/json;base64,${b64}\n`

  it('should create a simple file', async () => {
    const file1 = new VirtualFile(files, path1, 'hello, world!', true)

    expect(file1.contentsSync()).to.equal('hello, world!')
    expect(await file1.contents()).to.equal('hello, world!')
    expect(await file1.sourceMap()).to.be.undefined
    expect(file1.originalFile).to.be.undefined

    const file2 = new VirtualFile(files, path2, 'hello, again!', true, file1)

    expect(file2.contentsSync()).to.equal('hello, again!')
    expect(await file2.contents()).to.equal('hello, again!')
    expect(await file2.sourceMap()).to.be.undefined
    expect(file2.originalFile).to.equal(file1)
  })

  it('should create a simple file with a source map', async () => {
    const file1 = new VirtualFile(files, path1, 'hello, world!', { version: 3, mappings: 'foo' } as any)

    expect(await file1.sourceMap()).to.have.property('mappings', 'foo')
  })

  it('should create a simple file with an inline source map', async () => {
    const file1 = new VirtualFile(files, path1, `${inlineSourceMap}// barfoo`, true)

    expect(await file1.contents()).to.equal('\n// barfoo')
    expect(await file1.sourceMap()).to.have.property('mappings', 'foo')
  })

  it('should create a simple file ignoring its source map', async () => {
    const file1 = new VirtualFile(files, path1, `${inlineSourceMap}// barfoo`, false)

    expect(await file1.contents()).to.equal(`${inlineSourceMap}// barfoo`)
    expect(await file1.sourceMap()).to.be.undefined
  })

  it('should create a simple file overriding its source map', async () => {
    const file1 = new VirtualFile(files, path1, `${inlineSourceMap}// barfoo`, { version: 3, mappings: 'override' } as any)

    expect(await file1.contents()).to.equal(`${inlineSourceMap}// barfoo`)
    expect(await file1.sourceMap()).to.have.property('mappings', 'override')
  })

  it('should create a simple file with an external source map', async () => {
    const { files } = mock('/foo')
    files.add('test.map', '{"version":3,"mappings":"external"}')
    const file1 = new VirtualFile(files, path1, `//# ${SOURCE_MAPPING_URL}=test.map\n// barfoo`, true)

    expect(await file1.contents()).to.equal('\n// barfoo')
    expect(await file1.sourceMap()).to.have.property('mappings', 'external')
  })

  it('should create a simple file with a missing source map', async () => {
    const { files } = mock('/foo')
    const file1 = new VirtualFile(files, path1, `//# ${SOURCE_MAPPING_URL}=test.map\n// barfoo`, true)

    expect(await file1.contents()).to.equal('\n// barfoo') // still stripped
    expect(await file1.sourceMap()).to.be.undefined // but source map undefined
  })
})
