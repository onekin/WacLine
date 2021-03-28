import Events from '../../Events'
import LanguageUtils from '../../utils/LanguageUtils'

class KeywordBasedAnnotation {

  static loadKeywords () {
    let keyword = 'e'
    let pdfDoc = window.PDFViewerApplication.pdfDocument
    let promises = []
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      promises.push(this.getPageText(i, pdfDoc))
    }
    Promise.all(promises).then(pagesText => {
      let selectors = this.getSelectorsOfKeywords(pagesText, keyword)
      let theme = window.abwa.codebookManager.codebookReader.codebook.getThemeByName('Keywords')
      LanguageUtils.dispatchCustomEvent(Events.createKeywordAnnotations, {
        purpose: 'classifying',
        codeId: theme.id,
        foundSelectors: selectors
      })
    })
  }

  /**
   * Returns the text of the page from the PDF document
   * @param {number} pageNum
   * @param {pdfDocument} pdfDoc
   * @returns {string}
   */
  static getPageText (pageNum, pdfDoc) {
    return new Promise(function (resolve) {
      pdfDoc.getPage(pageNum).then(pdfPage => {
        pdfPage.getTextContent().then(textContent => {
          let textItems = textContent.items
          let finalText = ''
          // Problema con los espacios al quitar tildes (¿y si una palabra empieza con tilde?)
          for (let i = 0; i < textItems.length; i++) {
            let item = textItems[i]
            if (item.str.trim().length !== 0) {
              finalText += item.str.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '') + ' '
            }
          }
          resolve(finalText)
        })
      })
    })
  }

  /**
   * Returns the fragment and textQuote selectors for all the matches of the keyword
   * in the pages text.
   * @param {string[]} pagesText
   * @param {string} keyword
   * @returns {[[]]}
   */
  static getSelectorsOfKeywords (pagesText, keyword) {
    let selectors = []
    pagesText.forEach((pageText, pageNum) => {
      let indexes = this.getIndexesOfKeyWords(pageText, keyword)
      let fragmentSelector = {
        type: 'FragmentSelector',
        conformsTo: 'http://tools.ietf.org/rfc/rfc3778',
        page: pageNum + 1
      }
      let selector
      indexes.forEach(index => {
        let textQuoteSelector = {
          type: 'TextQuoteSelector',
          exact: keyword
        }
        textQuoteSelector.prefix = pageText.substring(index - 32, index)
        textQuoteSelector.suffix = pageText.substring(index + keyword.length, index + keyword.length + 32)
        selector = {}
        selector.fragmentSelector = fragmentSelector
        selector.textQuoteSelector = textQuoteSelector
        selectors.push(selector)
      })
    })
    return selectors
  }

  /**
   * Finds the indexes for the matches of the given keyword in the text
   * @param {string} textFragment
   * @param {string} keyword
   * @return {number[]}
   */
  static getIndexesOfKeyWords (textFragment, keyword) {
    let indexes = []
    let startIndex = 0
    let index
    while ((index = textFragment.indexOf(keyword, startIndex)) > -1) {
      indexes.push(index)
      startIndex = index + keyword.length
    }
    return indexes
  }
}

export default KeywordBasedAnnotation
