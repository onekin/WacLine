import AnnotationServer from '../AnnotationServer'

class BrowserStorage extends AnnotationServer {
  constructor ({ group }) {
    super({ group })
  }

  getGroupId () {
    return this.group.id
  }

  getGroupUrl () {
    return 'https://localannotationsdatabase.org/group/' + this.group.id
  }
}

export default BrowserStorage
