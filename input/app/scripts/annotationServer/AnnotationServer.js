class AnnotationServer {
  constructor ({ group }) {
    this.group = group
  }

  getGroupUrl () {
    return 'https://localannotationsdatabase.org/group/' + this.group.id
  }

  getGroupId () {
    return ''
  }
}

export default AnnotationServer
