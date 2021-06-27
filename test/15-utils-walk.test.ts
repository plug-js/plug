import { directory } from './support'
import { expect } from 'chai'
import { walk } from '../src/utils/walk'
import { FilePath } from '../src/utils/paths'
import { extname } from 'path/posix'

describe('Directory Walking', () => {
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

  it('should ignore any "node_modules" directory if told to do so', async () => {
    const generator1 = walk(directory, '**/*.*')
    const results1 = []
    for await (const file of generator1) results1.push(file)
    expect(results1).to.have.length.greaterThan(1)
    expect(results1).not.to.include(`${directory}/node_modules/file.txt`)

    const generator2 = walk(directory, '**/*.*', { allowNodeModules: true })
    const results2 = []
    for await (const file of generator2) results2.push(file)
    expect(results2).to.have.length.greaterThan(1)
    expect(results2).to.include(`${directory}/node_modules/file.txt`)
  })

  it('should ignore any ".*" directory if told to do so', async () => {
    const generator1 = walk(directory, '**/*.*')
    const results1 = []
    for await (const file of generator1) results1.push(file)
    expect(results1).to.have.length.greaterThan(1)
    expect(results1).not.to.include(`${directory}/.hidden/file.txt`)

    const generator2 = walk(directory, '**/*.*', { dot: true })
    const results2 = []
    for await (const file of generator2) results2.push(file)
    expect(results2).to.have.length.greaterThan(1)
    expect(results2).to.include(`${directory}/.hidden/file.txt`)
  })

  it('should ignore any ".*" directory if told to do so', async () => {
    const generator1 = walk(directory, '**/*.*', { ignore: [ 'dir' ] })
    const results1 = []
    for await (const file of generator1) results1.push(file)
    expect(results1).to.have.length.greaterThan(1)
    expect(results1).not.to.include(`${directory}/.hidden/file.txt`)
    expect(results1).not.to.include(`${directory}/node_modules/file.txt`)
    expect(results1).not.to.include(`${directory}/dir/file.txt`)

    const generator2 = walk(directory, '**/*.*', { ignore: 'dir', dot: true, allowNodeModules: true })
    const results2 = []
    for await (const file of generator2) results2.push(file)
    expect(results2).to.have.length.greaterThan(1)
    expect(results2).to.include(`${directory}/.hidden/file.txt`)
    expect(results2).to.include(`${directory}/node_modules/file.txt`)
    expect(results2).not.to.include(`${directory}/dir/file.txt`)

    const generator3 = walk(directory, '**/*.*', { dot: true, allowNodeModules: true })
    const results3 = []
    for await (const file of generator3) results3.push(file)
    expect(results3).to.have.length.greaterThan(1)
    expect(results3).to.include(`${directory}/.hidden/file.txt`)
    expect(results3).to.include(`${directory}/node_modules/file.txt`)
    expect(results3).to.include(`${directory}/dir/file.txt`)
  })
})
