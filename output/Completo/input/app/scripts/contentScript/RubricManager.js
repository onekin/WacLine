const Rubric = require('../model/Rubric')
const _ = require('lodash')
const Alerts = require('../utils/Alerts')

class RubricManager {
  constructor (config) {
    this.config = config
  }

  init (callback) {
    console.debug('Initializing RubricManager')
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.links.html,
      order: 'desc'
    }, (err, annotations) => {
      if (err) {
        Alerts.warningAlert({text: 'Unable to retrieve annotations for the highlighter'}) // TODO i18n
      } else {
        let cmid = window.abwa.contentTypeManager.fileMetadata.cmid
        annotations = _.filter(annotations, (annotation) => {
          return _.find(annotation.tags, (tag) => {
            return tag === 'exam:cmid:' + cmid
          })
        })
        this.rubric = Rubric.fromAnnotations(annotations)
        console.debug('Initialized RubricManager')
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  destroy () {
    console.debug('Destroyed rubric manager')
  }
}

module.exports = RubricManager
