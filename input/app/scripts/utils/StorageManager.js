const _ = require('lodash')

class StorageManager {
  constructor () {
    this.client = {}
    this.storageUrl = 'https://localannotationsdatabase.org'
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

  destroy (callback) {
    if (_.isFunction(callback)) {
      callback(null)
    }
  }
}

module.exports = StorageManager
