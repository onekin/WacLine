class FileUtils {
  static readTextFile (file, callback) {
    try {
      const reader = new window.FileReader()
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

  static readBinaryFile (file, callback) {
    try {
      const reader = new window.FileReader()
      reader.onload = (e) => {
        if (e && e.target && e.target.result) {
          callback(null, e.target.result)
        }
      }
      reader.readAsBinaryString(file)
    } catch (e) {
      console.log(e)
    }
  }


  static readJSONFile (file, callback) {
    FileUtils.readTextFile(file, (err, text) => {
      if (err) {
        callback(err)
      } else {
        try {
          const json = JSON.parse(text)
          callback(null, json)
        } catch (err) {
          callback(err)
        }
      }
    })
  }
}

export default FileUtils
