import FileSaver from 'file-saver'
import JSZip from 'jszip'
import LanguageUtils from '../../utils/LanguageUtils'

class ExportCXLArchiveFile {
  static export (xmlDoc, urlFiles) {
    let mapString = new XMLSerializer().serializeToString(xmlDoc)
    // Create map object
    let blob = new window.Blob([mapString], {
      type: 'text/plain;charset=utf-8'
    })
    // PVSCL:IFCOND(EvidenceAnnotations, LINE)
    let zip = new JSZip()
    zip.file(window.abwa.groupSelector.currentGroup.name.replace(' ', '') + '.cxl', blob)
    for (let i = 0; i < urlFiles.length; i++) {
      let urlFile = urlFiles[i]
      zip.file(urlFile.name + '.url', urlFile.content)
    }
    // zip.file('Hello.txt', 'Hello World\n')
    zip.generateAsync({ type: 'blob' }).then(function (zipFile) {
      // see FileSaver.js
      FileSaver.saveAs(zipFile, LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '.zip')
    })
    // PVSCL:ELSECOND
    FileSaver.saveAs(blob, LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '.cxl')
    // PVSCL:ENDCOND
  }
}

export default ExportCXLArchiveFile
