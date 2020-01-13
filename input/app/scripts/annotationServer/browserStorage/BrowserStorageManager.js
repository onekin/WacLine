const Chrome = require('../../utils/ChromeStorage')
const BrowserStorageClient = require('./BrowserStorageClient')
const AnnotationServerManager = require('../AnnotationServerManager')
// const mockDatabase = require('./mockDatabase')
const EmptyDatabase = require('./EmptyDatabase')
const _ = require('lodash')

class BrowserStorageManager extends AnnotationServerManager {
  constructor () {
    super()
    this.browserStorageClient = this.client
    this.annotationsDatabase = {}
  }

  init (callback) {
    // Retrieve database of annotations
    ChromeStorage.getData('db.annotations', ChromeStorage.local, (err, data) => {
      if (err) {
        callback(err)
      } else {
        if (_.isString(data)) {
          // Parse
          try {
            this.annotationsDatabase = JSON.parse(data)
          } catch (e) {
            this.annotationsDatabase = EmptyDatabase
          } finally {
            this.client = new BrowserStorageClient(this.annotationsDatabase, this)
          }
        } else {
          // Load empty database
          this.annotationsDatabase = EmptyDatabase
          this.client = new BrowserStorageClient(this.annotationsDatabase, this)
        }
        // Callback
        callback()
      }
    })
  }

  saveDatabase (database, callback) {
    let stringifiedDatabase = JSON.stringify(database)
    ChromeStorage.setData('db.annotations', stringifiedDatabase, ChromeStorage.local, (err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (_.isFunction(callback)) {
          callback(null, database)
        }
      }
    })
  }

  cleanDatabase (callback) {
    ChromeStorage.setData('db.annotations', 1, ChromeStorage.local, (err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback(null)
        }
      }
    })
  }
}

module.exports = BrowserStorageManager
