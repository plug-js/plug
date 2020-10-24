import { Log } from '../src/log'

describe.only('Logger', () => {
  const log = new Log({ debug: true, quiet: false, color: true })

  it('Should log', () => {
    log.log(null, null, 'A simple message', 1, true, { hello: 'world' })
    log.debug(null, null, 'A debug message', 1, true, { hello: 'world' })
    log.alert(null, null, 'An alert message', 1, true, { hello: 'world' })
    log.error(null, null, 'An error message', 1, true, { hello: 'world' })
    log.error(null, null, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
  })

  it('Should log from a task', () => {
    log.log(<any> { name: 'theTask' }, null, 'A simple message', 1, true, { hello: 'world' })
    log.debug(<any> { name: 'theTask' }, null, 'A debug message', 1, true, { hello: 'world' })
    log.alert(<any> { name: 'theTask' }, null, 'An alert message', 1, true, { hello: 'world' })
    log.error(<any> { name: 'theTask' }, null, 'An error message', 1, true, { hello: 'world' })
    log.error(<any> { name: 'theTask' }, null, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
  })

  it('Should log from a task / plugin', () => {
    log.log(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'A simple message', 1, true, { hello: 'world' })
    log.debug(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'A debug message', 1, true, { hello: 'world' })
    log.alert(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An alert message', 1, true, { hello: 'world' })
    log.error(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An error message', 1, true, { hello: 'world' })
    log.error(<any> { name: 'theTask' }, <any> { name: 'thePlugin' }, 'An error message', 1, true, { hello: 'world' }, new Error('This is an error'))
  })
})
