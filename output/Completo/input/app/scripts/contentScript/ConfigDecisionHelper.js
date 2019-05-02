const Config = require('../Config')
const _ = require('lodash')

class ConfigDecisionHelper {
  static decideWhichConfigApplyToTheGroup (group, callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({group: group.id, order: 'asc', limit: 20}, (err, annotations) => {
      if (err) {
        console.error('Unable to load annotations')
      } else {
        for (let i = 0; i < annotations.length; i++) {
          // For each annotation, check if any of the tags is given a supported namespace
          let tags = annotations[i].tags
          for (let j = 0; j < tags.length; j++) {
            let tag = tags[j]
            for (let key in Config) {
              if (key && _.startsWith(tag.toLowerCase(), Config[key].namespace.toLowerCase())) {
                if (_.isFunction(callback)) {
                  callback(Config[key])
                }
                return
              }
            }
          }
        }
        if (_.isFunction(callback)) {
          callback(null)
        }
      }
    })
  }
}

module.exports = ConfigDecisionHelper
