import sha256 from 'js-sha256'

class CryptoUtils {
  static hash (string = '') {
    return sha256(string)
  }
}

export default CryptoUtils
