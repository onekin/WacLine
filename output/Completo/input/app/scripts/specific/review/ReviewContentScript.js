const _ = require('lodash')
const ReviewGenerator = require('./ReviewGenerator')
const CustomCriteriasManager = require('./CustomCriteriasManager')

class ReviewContentScript {
  constructor (config) {
    this.config = config
  }

  init (callback) {
    window.abwa.specific = window.abwa.specific || {}
    window.abwa.specific.reviewGenerator = new ReviewGenerator()
    window.abwa.specific.reviewGenerator.init(() => {

    })
    window.abwa.specific.customCriteriasManager = new CustomCriteriasManager()
    window.abwa.specific.customCriteriasManager.init(() => {

    })
    if (_.isFunction(callback)) {
      callback()
    }
  }

  destroy () {

  }
}

module.exports = ReviewContentScript
