import _ from 'lodash'

class PDFTextUtils {
  static getFragmentSelector (range) {
    const pageContainer = range.startContainer.parentElement.closest('.page')
    if (_.isElement(pageContainer)) {
      try {
        const pageNumber = parseInt(pageContainer.dataset.pageNumber)
        return {
          conformsTo: 'http://tools.ietf.org/rfc/rfc3778',
          type: 'FragmentSelector',
          page: pageNumber
        }
      } catch (e) {
        return null
      }
    } else {
      return null
    }
  }
}

export default PDFTextUtils
