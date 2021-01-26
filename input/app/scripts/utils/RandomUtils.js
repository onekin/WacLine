import _ from 'lodash'
class RandomUtils {
  static randomString (length = 20, charSet) {
    charSet = charSet || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
    let randomString = ''
    for (let i = 0; i < length; i++) {
      const randomPoz = Math.floor(Math.random() * charSet.length)
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

  static byteToHex (val) {
    const str = val.toString(16)
    return str.length === 1 ? '0' + str : str
  }

  /**
   * Generate a random hex string of `len` chars.
   *
   * @param {number} len - An even-numbered length string to generate.
   * @return {string}
   */
  static generateHexString (len) {
    const bytes = new Uint8Array(len / 2)
    window.crypto.getRandomValues(bytes)
    return Array.from(bytes).map(RandomUtils.byteToHex).join('')
  }
}

export default RandomUtils
