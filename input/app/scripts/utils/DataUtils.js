'use strict'

const LanguageUtils = require('./LanguageUtils')

/**
 *
 */
class DataUtils {
  static shuffle (originalArray) {
    let array = originalArray.slice()
    let currentIndex = array.length
    let temporaryValue
    let randomIndex

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      // And swap it with the current element.
      temporaryValue = array[currentIndex]
      array[currentIndex] = array[randomIndex]
      array[randomIndex] = temporaryValue
    }

    return array
  }

  static getRandomElement (array) {
    return array[Math.floor(Math.random() * array.length)]
  }

  static removeByExample (array, props) {
    let removableObjects = DataUtils.filterArray(array, props, {index: true})
    for (let i = 0; i < removableObjects.length; i++) {
      array.splice(removableObjects[i].index, 1)
    }
  }

  static queryByExample (array, props) {
    return DataUtils.filterArray(array, props)
  }

  static queryIndexByExample (array, props) {
    return DataUtils.filterArray(array, props, {index: true})[0].index
  }

  static queryByContains (array, props, customComparison) {
    if (customComparison) {
      return DataUtils.filterArray(array, props, {contains: true, properties: {comparison: customComparison}})
    } else {
      return DataUtils.filterArray(array, props, {contains: true})
    }
  }

  static filterArray (array, props, opts) {
    let filteredArray = []
    for (let i = 0; i < array.length; i++) {
      let elem = array[i]
      let matchedElem = null
      // Filter type (contains at least one prop, or all the props)
      if (opts && opts.contains) {
        if (DataUtils.isPropertyIncluded(elem, props, opts)) {
          matchedElem = elem
        }
      } else {
        if (DataUtils.arePropertiesIncluded(elem, props)) {
          matchedElem = elem
        }
      }
      // If a result is matched, add it
      if (matchedElem) {
        if (opts && opts.index) {
          filteredArray.push({index: i, obj: elem})
        } else {
          filteredArray.push(elem)
        }
      }
    }
    return filteredArray
  }

  static arePropertiesIncluded (objectSource, properties) {
    let keys = Object.keys(properties)
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      if (objectSource[key] !== properties[key]) {
        return false
      }
    }
    return true
  }

  static isPropertyIncluded (objectSource, properties, opts) {
    let keys = Object.keys(properties)
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      // TODO FIXIT!!! Incluye texto, no texto igual
      if (opts.properties && opts.properties.comparison && LanguageUtils.isFunction(opts.properties.comparison)) {
        if (opts.properties.comparison(objectSource[key], properties[key])) {
          return true
        } else {
          if (objectSource[key] === properties[key]) {
            return true
          }
        }
      }
    }
    return false
  }

  static stringInclude (str1, str2) {
    if (str1 && str2) {
      return str1.toLowerCase().includes(str2.toLowerCase())
    }
    return false
  }

  static intersectionNonEqual (a, b, equalComparison) {
    return a.filter((n) => {
      for (let i = 0; i < b.length; i++) {
        if (equalComparison(n, b[i])) {
          return true
        }
      }
      return false
    })
  }
}

module.exports = DataUtils
