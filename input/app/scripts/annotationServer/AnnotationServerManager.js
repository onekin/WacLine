const _ = require('lodash')

class AnnotationServerManager {
  constructor () {
    this.client = {}
    this.annotationServerMetadata = {
      annotationUrl: 'https://localannotationsdatabase.org/annotation/',
      groupUrl: 'https://localannotationsdatabase.org/group/',
      userUrl: 'https://localannotationsdatabase.org/user/',
      annotationServerUrl: 'https://localannotationsdatabase.org'
    }
  }

  isLoggedIn () {
    return true
  }

  logIn (callback) {
    if (_.isFunction(callback)) {
      callback(null)
    }
  }

  reloadClient (callback) {
    if (_.isFunction(callback)) {
      callback(null)
    }
  }

  constructSearchUrl ({
    groupId
  }) {
    return this.annotationServerMetadata + groupId
  }

  destroy (callback) {
    if (_.isFunction(callback)) {
      callback(null)
    }
  }
}

module.exports = AnnotationServerManager
