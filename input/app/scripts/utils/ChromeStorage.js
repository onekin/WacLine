'use strict'

const _ = require('lodash')

class ChromeStorage {
  /**
   * Stores data on chrome storage (local or sync) given a namespace or ID
   * @param namespace A String which identify the space to store the data
   * @param data The data to save
   * @param storageArea The area to save the data (local or sync)
   * @param callback The function to execute after saving the data
   * @throws Error if it was unable to storage data
   */
  static setData (namespace, data, storageArea, callback) {
    // Create to be saved object
    let obj = {}
    obj[namespace] = data
    storageArea.set(obj, () => {
      // Execute callback and return error if happened
      if (_.isFunction(callback)) {
        callback(chrome.runtime.lastError)
      }
    })
  }

  /**
   * Retrieve data from chrome storage given a namespace or ID
   * @param namespace A String which identify the space to store the data
   * @param storageArea The area to save the data (local or sync)
   * @param callback The function to execute after saving the data
   */
  static getData (namespace, storageArea, callback) {
    storageArea.get(namespace, function (items) {
      // Execute callback and return error if happened and the data required
      if (_.isFunction(callback)) {
        callback(chrome.runtime.lastError, items[namespace])
      }
    })
  }
}

ChromeStorage.local = chrome.storage.local
ChromeStorage.sync = chrome.storage.sync

module.exports = ChromeStorage
