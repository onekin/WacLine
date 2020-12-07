import $ from 'jquery'

class DOM {
  static searchElementByTarget (target) {
    // Check if current page corresponds to target source
    const currentLocation = location.href.replace(location.hash, '')
    if (target.source.includes(currentLocation)) {
      const selectors = target.selector
      // Use the best selector
      let element = null
      for (let i = 0; i < selectors.length && element === null; i++) {
        const selector = selectors[i]
        if (selector.type === 'FragmentSelector') {
          element = document.querySelector('#' + selector.value)
        }
        /* else if(selector.type==='RangeSelector'){
         console.log(selector.value);
         element = document.evaluate('//body'+selector.value, document, null, XPathResult.ANY_TYPE, null);
         } */
      }
      return element
    } else {
      throw new Error('Current website is not same as target source')
    }
  }

  /**
   *
   * @param callSettings
   * @param querySelector
   * @param callback
   */
  static scrapElement (callSettings, querySelector, callback) {
    $.ajax(callSettings).done((resultString) => {
      callback(null, DOM.getNodeFromHTMLStringDOM(resultString, querySelector))
    }).fail((error) => {
      callback(error)
    })
  }

  /**
   * Given a html fragment in string format and query selector, parses it and retrieves the elements that accomplish with querySelector
   * @param htmlString
   * @param querySelector
   * @returns {NodeListOf<*>}
   */
  static getNodeFromHTMLStringDOM (htmlString, querySelector) {
    const tempWrapper = document.createElement('div')
    tempWrapper.innerHTML = htmlString
    return tempWrapper.querySelectorAll(querySelector)
  }

  static getNextNode (node, skipChildren, endNode) {
    // if there are child nodes and we didn't come from a child node
    if (endNode === node) {
      return null
    }
    if (node.firstChild && !skipChildren) {
      return node.firstChild
    }
    if (!node.parentNode) {
      return null
    }
    return node.nextSibling || DOM.getNextNode(node.parentNode, true, endNode)
  }

  static getLeafNodesInRange (range) {
    let startNode = range.startContainer.childNodes[range.startOffset] || range.startContainer // it's a text node
    const endNode = range.endContainer.childNodes[range.endOffset] || range.endContainer

    if (startNode === endNode && startNode.childNodes.length === 0) {
      return [startNode]
    }
    const leafNodes = []
    do {
      // If it is a leaf node, push it
      if (startNode.childNodes.length === 0) {
        leafNodes.push(startNode)
      }
      startNode = DOM.getNextNode(startNode, false, endNode)
    } while (startNode)
    return leafNodes
  }

  static getNextSiblings (currentNode) {
    let iterator = currentNode
    const siblings = []
    while (iterator.nextSibling !== null) {
      siblings.push(iterator.nextSibling)
      iterator = iterator.nextSibling
    }
    return siblings
  }

  static getPreviousSiblings (currentNode) {
    let iterator = currentNode
    const siblings = []
    while (iterator.previousSibling !== null) {
      siblings.push(iterator.previousSibling)
      iterator = iterator.previousSibling
    }
    return siblings
  }

  static getParentNodeWithId (elem) {
    try {
      return $(elem).parents('[id]').get(0).id
    } catch (e) {
      return null
    }
  }
}

export default DOM
