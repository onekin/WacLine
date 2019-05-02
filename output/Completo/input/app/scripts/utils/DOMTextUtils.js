const domAnchorTextQuote = require('dom-anchor-text-quote')
const domAnchorTextPosition = require('dom-anchor-text-position')
const xpathRange = require('xpath-range')
const DOM = require('./DOM')
const LanguageUtils = require('./LanguageUtils')
const $ = require('jquery')
const _ = require('lodash')

class DOMTextUtils {
  static getFragmentSelector (range) {
    if (range.commonAncestorContainer) {
      let parentId = DOM.getParentNodeWithId(range.commonAncestorContainer)
      if (parentId) {
        return {
          'conformsTo': 'https://tools.ietf.org/html/rfc3236',
          'type': 'FragmentSelector',
          'value': parentId
        }
      }
    }
  }

  static getRangeSelector (range) {
    let rangeSelector = xpathRange.fromRange(range)
    LanguageUtils.renameObjectKey(rangeSelector, 'start', 'startContainer')
    LanguageUtils.renameObjectKey(rangeSelector, 'end', 'endContainer')
    rangeSelector['type'] = 'RangeSelector'
    return rangeSelector
  }

  static getTextPositionSelector (range) {
    let textPositionSelector = domAnchorTextPosition.fromRange(document.body, range)
    textPositionSelector['type'] = 'TextPositionSelector'
    return textPositionSelector
  }

  static getTextQuoteSelector (range) {
    let textQuoteSelector = domAnchorTextQuote.fromRange(document.body, range)
    textQuoteSelector['type'] = 'TextQuoteSelector'
    return textQuoteSelector
  }

  /**
   * Highlights the content which are pointed by the selectors in the DOM with corresponding class name, id and data
   * @param selectors
   * @param className
   * @param id
   * @param data
   * @param exhaustive Runs all the algorithms until annotation match is found. For intensive CPU webpages maybe you are interested in disable this option. When disable, the last and more CPU use algorithm tryRetrieveRangeTextSelector is not executed
   * @returns {NodeList}
   * @throws TypeError
   */
  static highlightContent (selectors, className, id, data, exhaustive = true) {
    let range = this.retrieveRange(selectors, exhaustive)
    if (range) {
      let nodes = DOM.getLeafNodesInRange(range)
      if (nodes.length > 0) {
        let startNode = nodes.shift()
        if (nodes.length > 0) { // start and end nodes are not the same
          let endNode = nodes.pop()
          let nodesBetween = nodes
          // Start node
          let startWrapper = document.createElement('mark')
          $(startWrapper).addClass(className)
          startWrapper.dataset.annotationId = id
          startWrapper.dataset.startNode = ''
          startWrapper.dataset.highlightClassName = className
          DOMTextUtils.wrapNodeContent(startNode, startWrapper, range.startOffset, startNode.nodeValue.length)
          // End node
          let endWrapper = document.createElement('mark')
          $(endWrapper).addClass(className)
          endWrapper.dataset.annotationId = id
          endWrapper.dataset.endNode = ''
          endWrapper.dataset.highlightClassName = className
          DOMTextUtils.wrapNodeContent(endNode, endWrapper, 0, range.endOffset)
          // Nodes between
          nodesBetween.forEach(nodeBetween => {
            let leafNodes = this.retrieveLeafNodes(nodeBetween)
            for (let i = 0; i < leafNodes.length; i++) {
              if (leafNodes[i].textContent.length > 0 && (leafNodes[i].parentNode !== endNode && leafNodes[i].parentNode !== startNode)) {
                let wrapper = document.createElement('mark')
                $(wrapper).addClass(className)
                wrapper.dataset.annotationId = id
                wrapper.dataset.endNode = ''
                wrapper.dataset.highlightClassName = className
                $(leafNodes[i]).wrap(wrapper)
              }
            }
          })
        } else {
          let wrapper = document.createElement('mark')
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
      let nodeArray = [
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
      let newStringifiedContent = node.nodeValue.slice(0, startPosition) + wrapper.outerHTML + node.nodeValue.slice(endPosition, node.nodeValue.length)
      DOMTextUtils.replaceContent(node, newStringifiedContent)
    }
  }

  static retrieveRange (selectors, exhaustive = true) {
    let fragmentSelector = _.find(selectors, (selector) => { return selector.type === 'FragmentSelector' })
    let rangeSelector = _.find(selectors, (selector) => { return selector.type === 'RangeSelector' })
    let textQuoteSelector = _.find(selectors, (selector) => { return selector.type === 'TextQuoteSelector' })
    let textPositionSelector = _.find(selectors, (selector) => { return selector.type === 'TextPositionSelector' })
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
          range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(textPositionSelector, textQuoteSelector.exact)
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
      range = DOMTextUtils.tryRetrieveRangeTextPositionSelector(textPositionSelector, textQuoteSelector.exact)
      if (!range) {
        if (exhaustive) { // Try by hard exhaustive
          range = DOMTextUtils.tryRetrieveRangeTextSelector(document.body, textQuoteSelector)
        }
      }
    }
    return range
  }

  static tryRetrieveRangeTextPositionSelector (textPositionSelector, exactText) {
    let possibleRange = domAnchorTextPosition.toRange(document.body, textPositionSelector.start, textPositionSelector.end)
    if (possibleRange && possibleRange.toString() === exactText) {
      return possibleRange
    } else {
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

  static findAllMatches (str) {
    // Get current selection range for set again after the algorithm
    let userSelection = window.getSelection().getRangeAt(0)
    // Find matches using window.find
    let matches = []
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
    let matches = DOMTextUtils.findAllMatches(exact)
    if (matches.length === 0) {
      return null
    } else if (matches.length === 1) {
      return matches[0]
    } else if (matches.length > 1) {
      // Try to find by position selector
      let matchedTextPositionSelectors = _.map(matches, (match) => {
        return DOMTextUtils.getTextPositionSelector(match)
      })
      let matchedRange = _.find(matchedTextPositionSelectors, (matchedSelector) => {
        return matchedSelector.start === textPositionSelector.start && matchedSelector.end === textPositionSelector.end
      })
      if (matchedRange) {
        return matchedRange
      } else {
        let range = domAnchorTextPosition.toRange(document.body, textPositionSelector.start, textPositionSelector.end)
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
    let span = document.createElement('span')
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
        let childNode = element.childNodes[i]
        childNodes = childNodes.concat(this.retrieveLeafNodes(childNode))
      }
    } else {
      childNodes = [element]
    }
    return childNodes
  }

  static unHighlightAllContent (className) {
    // Remove highlighted elements
    let highlightElements = document.querySelectorAll('.' + className)
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
    let highlightElements = document.querySelectorAll('[data-annotation-id=\'' + id + '\']')
    DOMTextUtils.unHighlightElements(highlightElements)
  }
}

module.exports = DOMTextUtils
