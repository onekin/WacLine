import TXT from '../../target/formats/TXT'

class AnnotatedFileGeneration {
  static generateAnnotatedFileForPlainTextFile (callback) {
    if (window.abwa.targetManager.documentFormat === TXT) {
      let htmlToGenerate = ''
      let cssUrl = chrome.runtime.getURL('styles/contentScript.css')
      fetch(cssUrl)
        .then(result => result.text())
        .then(css => {
          htmlToGenerate += '<html><head><style>' + css + '</style></head>' + document.body.outerHTML
          htmlToGenerate += '<script>\n' +
            'document.querySelector(\'#abwaSidebarButton\').addEventListener(\'click\', () => {\n' +
            '    let sidebarButton = document.querySelector(\'#abwaSidebarButton\')\n' +
            '    sidebarButton.dataset.toggled = sidebarButton.dataset.toggled !== \'true\'\n' +
            '    document.documentElement.dataset.sidebarShown = sidebarButton.dataset.toggled\n' +
            '    document.querySelector(\'#abwaSidebarContainer\').dataset.shown = sidebarButton.dataset.toggled\n' +
            '})\n' +
            '</script>'
          htmlToGenerate += '</html>'
          callback(null, htmlToGenerate)
        })
    } else {
      callback(new Error('Current file is not of format TXT'))
    }
  }
}

export default AnnotatedFileGeneration
