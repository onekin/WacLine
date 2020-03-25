import _ from 'lodash'

class URLUtils {
  /**
   * Given a url with format https://domain.org#elem:abc&elem:bcd it returns you the object {elem: 'abc', elem: 'bcd'}
   * @param url
   * @param separator
   * @returns {{}}
   */
  static extractHashParamsFromUrl (url, separator) {
    separator = separator || ':'
    const splittedUrl = url.split('#')
    let result = null
    if (splittedUrl.length > 1) {
      const hash = splittedUrl[1]
      result = hash.split('&').reduce((result, item) => {
        const parts = item.split(separator)
        result[parts[0]] = decodeURIComponent(parts[1])
        return result
      }, {})
    }
    return result
  }

  /**
   * Check if both urls are the same without hash params, protocol, and so on
   * @param url1
   * @param url2
   */
  static areSameURI (url1, url2) {
    let cleanUrl1 = decodeURI(url1)
    let cleanUrl2 = decodeURI(url2)
    cleanUrl1 = cleanUrl1.replace(/(^\w+:|^)\/\//, '').split('#')[0] // Remove protocol and hash params
    cleanUrl1 = _.replace(_.replace(cleanUrl1, /\+/g, ''), /\s/g, '') // Remove + symbols and whitespaces
    cleanUrl2 = cleanUrl2.replace(/(^\w+:|^)\/\//, '').split('#')[0]
    cleanUrl2 = _.replace(_.replace(cleanUrl2, /\+/g, ''), /\s/g, '')
    return cleanUrl1 === cleanUrl2
  }

  /**
   * From a url, it removes hash params or other extra content which is not an unique source reference URL
   */
  static retrieveMainUrl (url) {
    return url.split('#')[0] // Remove the hash
  }

  static retrieveDomainFromURL (url) {
    let hostname
    // Remove the protocol
    if (url.indexOf('://') > -1) {
      hostname = url.split('/')[2]
    } else {
      hostname = url.split('/')[0]
    }
    // Find & remove port number
    hostname = hostname.split(':')[0]
    // Find & remove "?"
    hostname = hostname.split('?')[0]
    return hostname
  }

  static isUrl (string) {
    try {
      const url = new URL(string)
      return url.href === string
    } catch (typeError) {
      return false
    }
  }

  static objectToParams (obj) {
    return Object.keys(obj).map(key => key + ':' + encodeURIComponent(obj[key])).join('&')
  }
}

export default URLUtils
