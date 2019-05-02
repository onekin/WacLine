const _ = require('lodash')

class PDFTextUtils {
  static getFragmentSelector (range) {
    let pageContainer = range.startContainer.parentElement.closest('.page')
    if (_.isElement(pageContainer)) {
      try {
        let pageNumber = parseInt(pageContainer.dataset.pageNumber)
        return {
          'conformsTo': 'http://tools.ietf.org/rfc/rfc3778',
          'type': 'FragmentSelector',
          'page': pageNumber
        }
      } catch (e) {
        return null
      }
    } else {
      return null
    }
  }
}

module.exports = PDFTextUtils
