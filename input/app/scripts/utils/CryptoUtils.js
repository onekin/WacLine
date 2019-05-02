const sha256 = require('js-sha256')

class CryptoUtils {
  static hash (string = '') {
    return sha256(string)
  }
}

module.exports = CryptoUtils
