import _ from 'lodash'
import FileSaver from 'file-saver'
import Alerts from '../../../utils/Alerts'
import Codebook from '../../model/Codebook'

class ExportCodebookJSON {
  static exportConfigurationSchemeToJSObject (schemeAnnotations, name, callback) {
    Codebook.fromAnnotations(schemeAnnotations, (err, guide) => {
      if (err) {
        Alerts.errorAlert({ text: 'The codebook scheme is not exported correctly. Error: ' + err.message })
      } else {
        if (_.isFunction(callback)) {
          callback(guide.toObjects(name))
        }
      }
    })
  }

  static exportConfigurationSchemaToJSONFile (schemeAnnotations, group) {
    ExportCodebookJSON.exportConfigurationSchemeToJSObject(schemeAnnotations, group.name, (object) => {
      if (_.isObject(object)) {
        // Stringify JS object
        const stringifyObject = JSON.stringify(object, null, 2)
        // Download the file
        const blob = new window.Blob([stringifyObject], {
          type: 'text/plain;charset=utf-8'
        })
        FileSaver.saveAs(blob, group.name + '.json')
      } else {
        Alerts.errorAlert({ text: 'An unexpected error happened when trying to retrieve review model configuration. Reload webpage and try again.' })
      }
    })
  }
}

export default ExportCodebookJSON
