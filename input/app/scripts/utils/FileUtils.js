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
}

module.exports = FileUtils
