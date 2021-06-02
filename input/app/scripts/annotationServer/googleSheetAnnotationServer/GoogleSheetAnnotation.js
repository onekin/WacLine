import AnnotationServer from '../AnnotationServer'

class GoogleSheetAnnotation extends AnnotationServer {
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

export default GoogleSheetAnnotation
