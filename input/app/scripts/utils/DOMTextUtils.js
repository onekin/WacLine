import DOM from './DOM'
import LanguageUtils from './LanguageUtils'
import $ from 'jquery'
import _ from 'lodash'
import domAnchorTextQuote from './dom-anchor-text-quote'
// const domAnchorTextQuote = require('dom-anchor-text-quote')
const domAnchorTextPosition = require('dom-anchor-text-position')
const xpathRange = require('xpath-range')

class DOMTextUtils {
  static getFragmentSelector (range) {
    if (range.commonAncestorContainer) {
      const parentId = DOM.getParentNodeWithId(range.commonAncestorContainer)
      if (parentId) {
        return {
          conformsTo: 'https://tools.ietf.org/html/rfc3236',
          type: 'FragmentSelector',
          value: parentId
        }
      }
    }
  }

  static getRangeSelector (range) {
    const rangeSelector = xpathRange.fromRange(range)
    LanguageUtils.renameObjectKey(rangeSelector, 'start', 'startContainer')
    LanguageUtils.renameObjectKey(rangeSelector, 'end', 'endContainer')
    rangeSelector.type = 'RangeSelector'
    return rangeSelector
  }

  static getTextPositionSelector (range, root = document.body) {
    const textPositionSelector = domAnchorTextPosition.fromRange(root, range)
    textPositionSelector.type = 'TextPositionSelector'
    return textPositionSelector
  }

  static getTextQuoteSelector (range, root = document.body) {
    const textQuoteSelector = domAnchorTextQuote.fromRange(root, range)
    textQuoteSelector.type = 'TextQuoteSelector'
    return textQuoteSelector
  }

  /**
   * Highlights the content which are pointed by the selectors in the DOM with corresponding class name, id and data
   * @param selectors
   * @param className
   * @param id
   * @param data
   * @param exhaustive Runs all the algorithms until annotation match is found. For intensive CPU webpages maybe you are interested in disable this option. When disable, the last and more CPU use algorithm tryRetrieveRangeTextSelector is not executed
   * @param format
   * @returns {NodeList}
   * @throws TypeError
   */
  static highlightContent ({ selectors, className, id, data, exhaustive = true, format }) {
    const range = this.retrieveRange({ selectors, exhaustive, format })
    if (range) {
      const nodes = DOM.getLeafNodesInRange(range)
      if (nodes.length > 0) {
        const startNode = nodes.shift()
        if (nodes.length > 0) { // start and end nodes are not the same
          const endNode = nodes.pop()
          const nodesBetween = nodes
          // Start node
          const startWrapper = document.createElement('mark')
          $(startWrapper).addClass(className)
          startWrapper.dataset.annotationId = id
          startWrapper.dataset.startNode = ''
          startWrapper.dataset.highlightClassName = className
          DOMTextUtils.wrapNodeContent(startNode, startWrapper, range.startOffset, startNode.nodeValue.length)
          // End node
          const endWrapper = document.createElement('mark')
          $(endWrapper).addClass(className)
          endWrapper.dataset.annotationId = id
          endWrapper.dataset.endNode = ''
          endWrapper.dataset.highlightClassName = className
          DOMTextUtils.wrapNodeContent(endNode, endWrapper, 0, range.endOffset)
          // Nodes between
          nodesBetween.forEach(nodeBetween => {
            const leafNodes = this.retrieveLeafNodes(nodeBetween)
            for (let i = 0; i < leafNodes.length; i++) {
              if (leafNodes[i].textContent.length > 0 && (leafNodes[i].parentNode !== endNode && leafNodes[i].parentNode !== startNode)) {
                const wrapper = document.createElement('mark')
                $(wrapper).addClass(className)
                wrapper.dataset.annotationId = id
                wrapper.dataset.endNode = ''
                wrapper.dataset.highlightClassName = className
                $(leafNodes[i]).wrap(wrapper)
              }
            }
          })
        } else {
          const wrapper = document.createElement('mark')
          $(wrapper).addClass(className)
          wrapper.dataset.highlightClassName = className
          wrapper.dataset.annotationId = id
          DOMTextUtils.wrapNodeContent(startNode, wrapper, range.startOffset, range.endOffset)
        }
      }
    }
    return document.querySelectorAll('[data-annotation-id=\'' + id + '\']')
  }

  /**
   * Wraps node content from start to end position in the wrapper
   * @param node
   * @param wrapper
   * @param startPosition
   * @param endPosition
   */
  static wrapNodeContent (node, wrapper, startPosition, endPosition) {
    if (node.nodeType === 3) {
      wrapper.textContent = node.nodeValue.slice(startPosition, endPosition)
      const nodeArray = [
        document.createTextNode(node.nodeValue.slice(0, startPosition)), // Previous to wrapper text
        wrapper.outerHTML, // Highlighted text
        document.createTextNode(node.nodeValue.slice(endPosition, node.nodeValue.length)) // After to wrapper text
      ]
      node.parentNode.insertBefore(nodeArray[0], node)
      node.parentNode.insertBefore($(nodeArray[1])[0], node)
      node.parentNode.insertBefore(nodeArray[2], node)
      node.parentNode.removeChild(node) // Remove original node
    } else {
      wrapper.innerHTML = node.nodeValue.slice(startPosition, endPosition)
      const newStringifiedContent = node.nodeValue.slice(0, startPosition) + wrapper.outerHTML + node.nodeValue.slice(endPosition, node.nodeValue.length)
      DOMTextUtils.replaceContent(node, newStringifiedContent)
    }
  }

  /**
   * Given a list of selectors and the format of the document, returns the range of selected text fragment in the document
   * @param selectors
   * @param exhaustive
   * @param format
   * @returns {null}
   */
  static retrieveRange ({ selectors, exhaustive = true, format }) {
    const fragmentSelector = _.find(selectors, (selector) => { return selector.type === 'FragmentSelector' })
    const rangeSelector = _.find(selectors, (selector) => { return selector.type === 'RangeSelector' })
    const textQuoteSelector = _.find(selectors, (selector) => { return selector.type === 'TextQuoteSelector' })
    const textPositionSelector = _.find(selectors, (selector) => { return selector.type === 'TextPositionSelector' })
    // Check whether the document is PDF, HTML or TXT
    if (format.name === 'pdf') {
      return DOMTextUtils.retrieveRangeForPDFDocument({ fragmentSelector, textPositionSelector, textQuoteSelector, exhaustive })
    } else if (format.name === 'txt') {
      return DOMTextUtils.retrieveRangeForTXTDocument({ textPositionSelector, textQuoteSelector })
    } else if (format.name === 'html') {
      return DOMTextUtils.retrieveRangeForHTMLDocument({ fragmentSelector, textPositionSelector, textQuoteSelector, rangeSelector, exhaustive })
    } else {
      console.error('Document format is not valid')
      return null
    }
  }

  static retrieveRangeForPDFDocument ({ fragmentSelector, textPositionSelector, textQuoteSelector, exhaustive }) {
    let fragmentElement
    let range
    if (fragmentSelector.page) {
      // Check only in corresponding page
      const pageElement = document.querySelector('.page[data-page-number="' + fragmentSelector.page + '"][data-loaded="true"] > div.textLayer')
      if (_.isElement(pageElement)) {
        fragmentElement = pageElement
      } else {
        console.debug('Document page is not loaded, annotation missing.')
        return null
      }
    } else {
      fragmentElement = document.body
    }
    range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(fragmentElement, textPositionSelector, textQuoteSelector.exact)
    if (!range) {
      if (exhaustive) { // Try by hard exhaustive
        range = DOMTextUtils.tryRetrieveRangeTextSelector(fragmentElement, textQuoteSelector)
      }
    }
    return range
  }

  static retrieveRangeForTXTDocument ({ textPositionSelector, textQuoteSelector }) {
    let range = null
    if (_.isObject(textPositionSelector) && _.isObject(textQuoteSelector)) {
      range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(document.body, textPositionSelector, textQuoteSelector.exact)
      if (!range) {
        range = DOMTextUtils.tryRetrieveRangeTextSelector(document.body, textQuoteSelector)
      }
    }
    return range
  }

  static retrieveRangeForHTMLDocument ({ fragmentSelector, textPositionSelector, textQuoteSelector, rangeSelector, exhaustive }) {
    let range = null
    if (_.isObject(fragmentSelector) || _.isObject(rangeSelector)) { // It is an element of DOM
      let fragmentElement = null
      if (_.has(fragmentSelector, 'value')) {
        fragmentElement = document.querySelector('#' + fragmentSelector.value)
      }
      if (_.isElement(fragmentElement)) {
        range = DOMTextUtils.tryRetrieveRangeTextSelector(fragmentElement, textQuoteSelector)
      } else {
        let startRangeElement = null
        if (_.has(rangeSelector, 'startContainer')) {
          startRangeElement = document.evaluate('.' + rangeSelector.startContainer, document, null, window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
        }
        let endRangeElement = null
        if (_.has(rangeSelector, 'endContainer')) {
          endRangeElement = document.evaluate('.' + rangeSelector.endContainer, document, null, window.XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
        }
        if (_.isElement(startRangeElement) && _.isElement(endRangeElement)) {
          range = DOMTextUtils.tryRetrieveRangeTextSelector(fragmentElement, textQuoteSelector)
        } else {
          range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(document.body, textPositionSelector, textQuoteSelector.exact)
          if (!range) {
            if (exhaustive) { // Try by hard exhaustive
              range = DOMTextUtils.tryRetrieveRangeTextSelector(document.body, textQuoteSelector)
              if (!range) {
                range = DOMTextUtils.retrieveRangeTextSelectorUsingNativeFind(textQuoteSelector.exact, textPositionSelector)
              }
            } else {
              range = DOMTextUtils.retrieveRangeTextSelectorUsingNativeFind(textQuoteSelector.exact, textPositionSelector)
            }
          }
        }
      }
    } else if (textQuoteSelector && textPositionSelector) { // It is a text of PDF
      range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(document.body, textPositionSelector, textQuoteSelector.exact)
      if (!range) {
        if (exhaustive) { // Try by hard exhaustive
          range = DOMTextUtils.tryRetrieveRangeTextSelector(document.body, textQuoteSelector)
        }
      }
    }
    return range
  }

  /**
   * Giving a text position selector retrieves the possible range if exact text is matches
   * @param fragmentElement
   * @param textPositionSelector
   * @param exactText
   * @returns {null|*}
   */
  static tryRetrieveRangeTextPositionSelector (fragmentElement, textPositionSelector, exactText) {
    try {
      const possibleRange = domAnchorTextPosition.toRange(fragmentElement, { start: textPositionSelector.start, end: textPositionSelector.end })
      if (possibleRange && possibleRange.toString() === exactText) {
        return possibleRange
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }

  static tryRetrieveRangeTextSelector (fragmentElement, textQuoteSelector) {
    if (_.isNull(fragmentElement) || document.children[0] === fragmentElement) {
      return null
    }
    let range = null
    try {
      range = domAnchorTextQuote.toRange(fragmentElement.parentNode, textQuoteSelector)
    } catch (e) {
      range = DOMTextUtils.tryRetrieveRangeTextSelector(fragmentElement.parentNode, textQuoteSelector)
    }
    if (_.isNull(range)) {
      range = DOMTextUtils.tryRetrieveRangeTextSelector(fragmentElement.parentNode, textQuoteSelector)
    }
    return range
  }

  /**
   *
   * @param str
   * @returns {*}
   */
  static findAllMatches (str) {
    // Get current selection range for set again after the algorithm
    const userSelection = window.getSelection().getRangeAt(0)
    // Find matches using window.find
    const matches = []
    let findResult = document.execCommand('FindString', true, str)
    let currentMatch = window.getSelection().getRangeAt(0).cloneRange()
    // Search forward of the current position
    while (findResult && _.isUndefined(_.find(matches, (match) => { return match.startOffset === currentMatch.startOffset || match.endOffset === currentMatch.endOffset }))) {
      matches.push(window.getSelection().getRangeAt(0).cloneRange())
      findResult = document.execCommand('FindString', true, str)
      currentMatch = window.getSelection().getRangeAt(0).cloneRange()
    }
    // Set current selection as the former one set by the user
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(userSelection)
    return _.uniq(matches)
  }

  static retrieveRangeTextSelectorUsingNativeFind (exact, textPositionSelector) {
    const matches = DOMTextUtils.findAllMatches(exact)
    if (matches.length === 0) {
      return null
    } else if (matches.length === 1) {
      return matches[0]
    } else if (matches.length > 1) {
      // Try to find by position selector
      const matchedTextPositionSelectors = _.map(matches, (match) => {
        return DOMTextUtils.getTextPositionSelector(match)
      })
      let matchedRange = _.find(matchedTextPositionSelectors, (matchedSelector) => {
        return matchedSelector.start === textPositionSelector.start && matchedSelector.end === textPositionSelector.end
      })
      if (matchedRange) {
        return matchedRange
      } else {
        const range = domAnchorTextPosition.toRange(document.body, textPositionSelector.start, textPositionSelector.end)
        matchedRange = _.find(matches, (matchRange) => {
          return range.startOffset === matchRange.startOffset && range.endOffset === matchRange.endOffset
        })
        if (matchedRange) {
          return matchedRange
        } else {
          return matches[0] // Return the first match
        }
      }
    } else {
      return null
    }
  }

  static replaceContent (oldNode, newNode) {
    // Find a better solution which not creates new elements
    const span = document.createElement('span')
    span.innerHTML = newNode
    oldNode.replaceWith(span)
    $(span.childNodes).unwrap()
  }

  static retrieveFirstTextNode (element) {
    if (element.nodeType === window.Node.TEXT_NODE) {
      return element
    } else {
      if (element.firstChild) {
        return DOMTextUtils.retrieveFirstTextNode(element.firstChild)
      }
    }
  }

  static retrieveLeafNodes (element) {
    let childNodes = []
    if (element.childNodes.length > 0) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i]
        childNodes = childNodes.concat(this.retrieveLeafNodes(childNode))
      }
    } else {
      childNodes = [element]
    }
    return childNodes
  }

  static unHighlightAllContent (className) {
    // Remove highlighted elements
    const highlightElements = document.querySelectorAll('.' + className)
    DOMTextUtils.unHighlightElements(highlightElements)
  }

  static unHighlightElements (highlightElements) {
    if (_.isArray(highlightElements)) {
      highlightElements.forEach((highlightElement) => {
        // If element content is not empty, unwrap maintaining its content
        $(highlightElement.firstChild).unwrap()
      })
    }
  }

  static unHighlightById (id) {
    const highlightElements = document.querySelectorAll('[data-annotation-id=\'' + id + '\']')
    DOMTextUtils.unHighlightElements(highlightElements)
  }
}

export default DOMTextUtils
