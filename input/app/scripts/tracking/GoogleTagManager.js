import _ from 'lodash'

class GoogleTagManager {
  init (callback) {
    this.retrieveUserConsent().then((consent) => {
      if (consent === true) {
        this.injectGTM()
        if (_.isFunction(callback)) {
          callback()
        }
      } else if (consent === false) {
        // Nothing to do
        if (_.isFunction(callback)) {
          callback()
        }
      } else {
        // Ask user for consent
        this.askUserConsent().then((userResponse) => {
          // Save user response
          this.saveUserConsent(userResponse)
          if (userResponse === true) {
            this.injectGTM()
            if (_.isFunction(callback)) {
              callback()
            }
          } else {
            // Nothing to do
            if (_.isFunction(callback)) {
              callback()
            }
          }
        })
      }
    })
  }

  async askUserConsent () {
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line quotes
      let policiesURL = "PVSCL:EVAL(WebAnnotator.Tracking->pv:Attribute('trackingPoliciesURL'))"
      const Alerts = require('../utils/Alerts').default
      Alerts.confirmAlert({
        alertType: Alerts.alertType.question,
        text: chrome.i18n.getMessage('appName') + ' wants to collect anonymous user behaviour data. This data will be used to improve ' + chrome.i18n.getMessage('appName') + '\'s functionality only when the extension is activated. You have further information about <a href="' + policiesURL + '" target="_blank" class="alertLink">our tracking policy</a>. You can always change your preferences in the <a class="alertLink" target="_blank" href="' + chrome.extension.getURL('pages/options.html') + '">options page</a>.',
        title: 'Do you give us your consent to collect tracking data?',
        callback: () => {
          Alerts.infoSyncAlert({
            title: 'Thank you! Please disable ad blockers',
            text: 'Thanks for giving us your consent.<br/>To let ' + chrome.i18n.getMessage('appName') + ' capture usage data please disable any adblock extension installed in your browser, at least in websites where you are going to use ' + chrome.i18n.getMessage('appName') + '.',
            callback: () => {
              resolve(true)
            }
          })
        },
        cancelCallback: () => {
          resolve(false)
        }
      })
    })
  }

  injectGTM () {
    // eslint-disable-next-line quotes
    let gtmId = "PVSCL:EVAL(WebAnnotator.GoogleTagManager->pv:Attribute('tagManagerId'))"
    document.body.innerHTML += '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' + gtmId + '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'
    let element = document.createElement('script')
    element.setAttribute('type', 'text/javascript')
    element.appendChild(document.createTextNode('(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":    new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","' + gtmId + '");'))
    document.head.appendChild(element)
  }

  async retrieveUserConsent () {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ scope: 'tracking', cmd: 'getTrackingGTM' }, ({ userResponse }) => {
        if (_.isBoolean(userResponse)) {
          resolve(userResponse)
        } else {
          resolve(null)
        }
      })
    })
  }

  async saveUserConsent (userResponse) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        scope: 'tracking',
        cmd: 'setTrackingGTM',
        data: { userResponse: userResponse }
      }, ({ userResponse }) => {
        console.debug('Saved user response about tracking via GTM: ' + JSON.stringify(userResponse))
        resolve()
      })
    })
  }

  destroy (callback) {
    // TODO Remove/disable google tag manager tracking scripts
    window.location.reload()
  }
}

export default GoogleTagManager
