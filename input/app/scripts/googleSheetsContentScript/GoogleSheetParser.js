const _ = require('lodash')
const AnnotationGuide = require('../definition/AnnotationGuide')
const Alerts = require('../utils/Alerts')

class GoogleSheetParser {
  parse (callback) {
    AnnotationGuide.fromGSheetProvider((err, annotationGuide) => {
      if (err) {
        console.error(err)
        Alerts.errorAlert({text: err.message})
      } else {
        if (_.isFunction(callback)) {
          callback(null, annotationGuide)
        }
      }
    })
  }
}

module.exports = GoogleSheetParser
