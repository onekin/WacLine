const FileSaver = require('file-saver')
const JSZip = require('jszip')

class ExportCXLArchiveFile {
  static export (mapString, urlFiles) {
    // Create map object
    let blob = new window.Blob([mapString], {
      type: 'text/plain;charset=utf-8'
    })
    // PVSCL:IFCOND(EvidenceAnnotations, LINE)
    let zip = new JSZip()
    zip.file(window.abwa.groupSelector.currentGroup.name.replace(' ', '') + '.cxl', blob)
    for (let i = 0; i < urlFiles.length; i++) {
      let urlFile = urlFiles[i]
      zip.file(urlFile.name.replace(' ', '') + '.url', urlFile.content)
    }
    // zip.file('Hello.txt', 'Hello World\n')
    zip.generateAsync({type: 'blob'}).then(function (zipFile) {
      // see FileSaver.js
      FileSaver.saveAs(zipFile, 'generatedMap.zip')
    })
    // PVSCL:ELSECOND
    FileSaver.saveAs(blob, 'newMap' + '.cxl')
    // PVSCL:ENDCOND
  }
}

module.exports = ExportCXLArchiveFile
