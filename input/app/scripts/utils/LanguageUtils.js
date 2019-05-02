'use strict'

const jQuery = require('jquery')
const _ = require('lodash')

class LanguageUtils {
  /**
   * Check if a given object is a function
   * @param func An object
   * @returns {*|boolean}
   */
  static isFunction (func) {
    return func && typeof func === 'function'
  }

  /**
   * Returns true if the object is empty, null, etc.
   * @param obj
   * @returns {*|boolean}
   */
  static isEmptyObject (obj) {
    return jQuery.isEmptyObject(obj)
  }

  /**
   * Returns true if the object is instance of a Class
   * @param obj
   * @param classReference
   * @returns {boolean}
   */
  static isInstanceOf (obj, classReference) {
    return obj instanceof classReference
  }

  /**
   * Fill the object with the properties
   * @param object
   * @param properties
   * @returns {*}
   */
  static fillObject (object, properties) {
    return Object.assign(object, properties)
  }

  /**
   * Create a custom event with the corresponding name, message and metadata
   * @param name
   * @param message
   * @param data
   * @returns {CustomEvent}
   */
  static createCustomEvent (name, message, data) {
    return (new window.CustomEvent(name, {
      detail: {
        message: message,
        data: data,
        time: new Date()
      },
      bubbles: true,
      cancelable: true
    }))
  }

  /**
   * Renames an object's key
   * @param o
   * @param oldKey
   * @param newKey
   */
  static renameObjectKey (o, oldKey, newKey) {
    if (oldKey !== newKey) {
      Object.defineProperty(o, newKey,
        Object.getOwnPropertyDescriptor(o, oldKey))
      delete o[oldKey]
    }
  }

  /**
   * Dispatches a custom event with the given name
   * @param eventName
   * @param metadata
   */
  static dispatchCustomEvent (eventName, metadata) {
    let event = new window.CustomEvent(
      eventName, {
        detail: metadata,
        bubbles: true,
        cancelable: true
      }
    )
    document.body.dispatchEvent(event)
    return event
  }

  /**
   * Run promises in serial. Taken from https://decembersoft.com/posts/promises-in-serial-with-array-reduce/
   * @param promises
   * @param callback
   */
  static runPromisesInSerial (promises, callback) {
    promises.reduce((promiseChain, currentTask) => {
      return promiseChain.then(chainResults =>
        currentTask.then(currentResult => {
          return [ ...chainResults, currentResult ]
        })
      )
    }, Promise.resolve([])).then(arrayOfResults => {
      // Do something with all results
      if (_.isFunction(callback)) {
        callback(arrayOfResults)
      }
    })
  }

  /**
   * Normalize strings removing tildes, etc.
   * @param string
   * @returns {*}
   */
  static normalizeString (string) {
    return string.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  static getStringBetween (string, previous, after) {
    let firstSplit = string.split(previous)
    if (firstSplit.length > 1) {
      let secondSplit = firstSplit.pop().split(after)
      if (secondSplit.length > 1) {
        return secondSplit[0]
      } else {
        return null
      }
    } else {
      return null
    }
  }
}

module.exports = LanguageUtils
