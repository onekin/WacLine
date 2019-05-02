const _ = require('lodash')

class RolesManager {
  constructor () {
    this.role = RolesManager.roles.reviewer
  }

  init (callback) {
    // The unique role working currently is reviewer
    if (_.isFunction(callback)) {
      callback()
    }
  }

  destroy () {
    this.role = null
  }
}

RolesManager.roles = {
  'reviewer': 'reviewer',
  'author': 'author'
}

module.exports = RolesManager
