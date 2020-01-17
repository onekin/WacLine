const _ = require('lodash')
const AnnotationGuide = require('../coodebook/Coodebook')
const Alerts = require('../utils/Alerts')

class GSheetParser {
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

module.exports = GSheetParser
