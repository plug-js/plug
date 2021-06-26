import { directory } from './support'
import { expect } from 'chai'
import { walk } from '../src/utils/walk'
import { FilePath } from '../src/utils/paths'
import { extname } from 'path/posix'

describe.only('Directory Walking', () => {
  it('should walk a directory', async () => {
    const generator = walk(directory, '**/*.*')

    const files: FilePath[] = []
    for await (const file of generator) files.push(file)

    expect(files).to.have.length.greaterThan(1)
    expect(files).to.include(`${directory}/build.ts`)
    // by default it should follow symlinks...
    expect(files).to.include(`${directory}/linkfile.txt`)
    expect(files).to.include(`${directory}/linkfiledir.txt`)
    expect(files).to.include(`${directory}/linkjavascript.js`)
    expect(files).to.include(`${directory}/linktypescript.ts`)
  })

  it('should walk a directory ignoring some files', async () => {
    const generator = walk(directory, '**/*.*', { ignore: '**/*.ts' })

    const files: FilePath[] = []
    for await (const file of generator) {
      expect(extname(file)).not.to.equals('.ts')
      files.push(file)
    }

    expect(files).to.have.length.greaterThan(1)
  })

  it('should walk a directory ignoring some files', async () => {
    const generator = walk(directory, '**/*.*', { followSymlinks: false })

    const files: FilePath[] = []
    for await (const file of generator) files.push(file)

    expect(files).to.have.length.greaterThan(1)
    // we said not to follow symlinks...
    expect(files).not.to.include(`${directory}/linkfile.txt`)
    expect(files).not.to.include(`${directory}/linkfiledir.txt`)
    expect(files).not.to.include(`${directory}/linkjavascript.js`)
    expect(files).not.to.include(`${directory}/linktypescript.ts`)
  })

  it('should walk a directory up to a certain depth', async () => {
    const generator = walk(directory, '**/*.*', { maxDepth: 0 })

    const files: FilePath[] = []
    for await (const file of generator) {
      expect(file.substr(0, directory.length)).to.equal(directory)
      expect(file.substr(directory.length + 1).indexOf('/')).to.be.lessThan(0)
      files.push(file)
    }

    expect(files).to.have.length.greaterThan(1)
  })
})
