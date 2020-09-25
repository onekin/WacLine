import AnnotationServer from '../AnnotationServer'

class BrowserStorage extends AnnotationServer {
  constructor ({ group }) {
    super({ group })
  }

  getGroupId () {
    return this.group
  }
}

export default BrowserStorage
