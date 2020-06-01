
class FileUtils {
  static readTextFile (file, callback) {
    try {
      let reader = new window.FileReader()
      // Closure to capture the file information.
      reader.onload = (e) => {
        if (e && e.target && e.target.result) {
          callback(null, e.target.result)
        }
      }
      reader.readAsText(file)
    } catch (e) {
      callback(e)
    }
  }

  static readJSONFile (file, callback) {
    FileUtils.readTextFile(file, (err, text) => {
      if (err) {
        callback(err)
      } else {
        try {
          let json = JSON.parse(text)
          callback(null, json)
        } catch (err) {
          callback(err)
        }
      }
    })
  }
  // PVSCL:IFCOND(CXLImport, LINE)

  static readCXLFile (file, callback) {
    FileUtils.readTextFile(file, (err, text) => {
      if (err) {
        callback(err)
      } else {
        let extension = (file.name.substring(file.name.lastIndexOf('.'))).toLowerCase()
        if (extension === '.cxl') {
          try {
            let parser = new DOMParser()
            let xmlDoc = parser.parseFromString(text, 'text/xml')
            callback(null, xmlDoc)
          } catch (err) {
            callback(err)
          }
        } else {
          callback(new Error('The file must have .cxl extension'))
        }
      }
    })
  }
// PVSCL:ENDCOND
}

module.exports = FileUtils
