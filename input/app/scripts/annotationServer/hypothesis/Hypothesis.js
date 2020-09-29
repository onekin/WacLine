import AnnotationServer from '../AnnotationServer'

class Hypothesis extends AnnotationServer {
  constructor ({ group }) {
    super({ group })
  }

  getGroupUrl () {
    return 'https://hypothes.is/groups/' + this.group.id
  }

  getGroupId () {
    return this.group.id
  }
}

export default Hypothesis
