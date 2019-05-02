const $ = require('jquery')

class DOM {
  static searchElementByTarget (target) {
    // Check if current page corresponds to target source
    let currentLocation = location.href.replace(location.hash, '')
    if (target.source.includes(currentLocation)) {
      let selectors = target.selector
      // Use the best selector
      let element = null
      for (let i = 0; i < selectors.length && element === null; i++) {
        let selector = selectors[i]
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
      let tempWrapper = document.createElement('div')
      tempWrapper.innerHTML = resultString
      callback(null, tempWrapper.querySelectorAll(querySelector))
    }).fail((error) => {
      callback(error)
    })
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
    let endNode = range.endContainer.childNodes[range.endOffset] || range.endContainer

    if (startNode === endNode && startNode.childNodes.length === 0) {
      return [startNode]
    }
    let leafNodes = []
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
    let siblings = []
    while (iterator.nextSibling !== null) {
      siblings.push(iterator.nextSibling)
      iterator = iterator.nextSibling
    }
    return siblings
  }

  static getPreviousSiblings (currentNode) {
    let iterator = currentNode
    let siblings = []
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

module.exports = DOM
