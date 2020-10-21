import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sourceMapSupport from 'source-map-support'

chai.use(chaiAsPromised)
sourceMapSupport.install({ hookRequire: true })
