const _ = require('lodash')
const Codebook = require('../../../model/Codebook')
const Alerts = require('../../../../utils/Alerts')

class GSheetParser {
  parse (callback) {
    Codebook.fromGSheetProvider((err, annotationGuide) => {
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
