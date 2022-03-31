import _ from 'lodash'

class GoogleAnalytics {
  init (callback) {
    this.injectGA()
    if (_.isFunction(callback)) {
      callback()
    }
  }

  injectGA () {
    let gtag = document.createElement('script')
    gtag.setAttribute('type', 'text/javascript')
    gtag.setAttribute('src', chrome.extension.getURL('scripts/ga.js'))
    document.head.appendChild(gtag)
  }

  destroy (callback) {
    // TODO Remove/disable google tag manager tracking scripts
    window.location.reload()
  }
}

export default GoogleAnalytics
