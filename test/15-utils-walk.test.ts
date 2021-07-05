import { directory } from './support'
import { expect } from 'chai'
import { walk } from '../src/utils/walk'
import { DirectoryPath, FilePath } from '../src/utils/paths'
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

  it('should ignore any specific directory if told to do so', async () => {
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

  it('should ignore any directory according to a callback', async () => {
    const dirs1: DirectoryPath[] = []
    function onDir1(dir: DirectoryPath): void {
      dirs1.push(dir)
    }
    const generator1 = walk(directory, '**/*.*', { dot: true, allowNodeModules: true, onDirectory: onDir1 })
    const results1 = []

    for await (const file of generator1) results1.push(file)
    expect(results1).to.have.length.greaterThan(1)
    expect(results1).to.include(`${directory}/.hidden/file.txt`)
    expect(results1).to.include(`${directory}/dir/file.txt`)
    expect(results1).to.include(`${directory}/linkdir/file.txt`)
    expect(results1).to.include(`${directory}/node_modules/file.txt`)

    expect(dirs1).to.have.length.greaterThan(1)
    expect(dirs1).to.include(`${directory}/.hidden`)
    expect(dirs1).to.include(`${directory}/dir`)
    expect(dirs1).to.include(`${directory}/linkdir`)
    expect(dirs1).to.include(`${directory}/node_modules`)

    // "true" is default
    const dir2: DirectoryPath[] = []
    function onDir2(dir: DirectoryPath): boolean {
      dir2.push(dir)
      return true
    }
    const generator2 = walk(directory, '**/*.*', { dot: true, allowNodeModules: true, onDirectory: onDir2 })
    const results2 = []

    for await (const file of generator2) results2.push(file)
    expect(results2).to.have.length.greaterThan(1)
    expect(results2).to.include(`${directory}/.hidden/file.txt`)
    expect(results2).to.include(`${directory}/dir/file.txt`)
    expect(results2).to.include(`${directory}/linkdir/file.txt`)
    expect(results2).to.include(`${directory}/node_modules/file.txt`)

    expect(dir2).to.have.length.greaterThan(1)
    expect(dir2).to.include(`${directory}/.hidden`)
    expect(dir2).to.include(`${directory}/dir`)
    expect(dir2).to.include(`${directory}/linkdir`)
    expect(dir2).to.include(`${directory}/node_modules`)

    // strip out "dir" from our callback
    const dirs3: DirectoryPath[] = []
    function onDir3(dir: DirectoryPath): boolean | void {
      if (dir === `${directory}/dir`) return false
      dirs3.push(dir)
    }
    const generator3 = walk(directory, '**/*.*', { dot: true, allowNodeModules: true, onDirectory: onDir3 })
    const results3 = []

    for await (const file of generator3) results3.push(file)
    expect(results3).to.have.length.greaterThan(1)
    expect(results3).to.include(`${directory}/.hidden/file.txt`)
    expect(results3).to.include(`${directory}/linkdir/file.txt`)
    expect(results3).to.include(`${directory}/node_modules/file.txt`)
    expect(results3).not.to.include(`${directory}/dir/file.txt`)

    expect(dirs3).to.have.length.greaterThan(1)
    expect(dirs3).to.include(`${directory}/.hidden`)
    expect(dirs3).to.include(`${directory}/linkdir`)
    expect(dirs3).to.include(`${directory}/node_modules`)
    expect(dirs3).not.to.include(`${directory}/dir`)
  })
})
