const _ = require('lodash')
class RandomUtils {
  static randomString (length = 20, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
    let randomString = ''
    for (let i = 0; i < length; i++) {
      let randomPoz = Math.floor(Math.random() * charSet.length)
      randomString += charSet.substring(randomPoz, randomPoz + 1)
    }
    return randomString
  }

  static randomUnique (arrayOfIds = [], length, charset) {
    let unique = false
    let randomString = ''
    while (!unique) {
      randomString = RandomUtils.randomString(length, charset)
      if (!_.find(arrayOfIds, randomString)) {
        unique = true
      }
    }
    return randomString
  }
}

module.exports = RandomUtils
