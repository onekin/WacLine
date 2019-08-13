const _ = require('lodash')
const FileSaver = require('file-saver')
const Alerts = require('../utils/Alerts')
const AnnotationGuide = require('../definition/AnnotationGuide')

class ExportSchema {
  static exportConfigurationSchemeToJSObject (schemeAnnotations, name) {
    let guide = AnnotationGuide.fromAnnotations(schemeAnnotations)
    return guide.toObject(name)
  }

  static exportConfigurationSchemaToJSONFile (schemeAnnotations, group) {
    let object = ExportSchema.exportConfigurationSchemeToJSObject(schemeAnnotations, group.name)
    if (_.isObject(object)) {
      // Stringify JS object
      let stringifyObject = JSON.stringify(object, null, 2)
      // Download the file
      let blob = new window.Blob([stringifyObject], {
        type: 'text/plain;charset=utf-8'
      })
      FileSaver.saveAs(blob, group.name + '.json')
    } else {
      Alerts.errorAlert({text: 'An unexpected error happened when trying to retrieve review model configuration. Reload webpage and try again.'})
    }
  }
}

module.exports = ExportSchema
