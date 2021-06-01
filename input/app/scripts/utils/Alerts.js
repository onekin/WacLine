import _ from 'lodash'

let swal = null
if (document && document.head) {
  swal = require('sweetalert2').default
}

class Alerts {
  static confirmAlert ({ alertType = Alerts.alertType.info, title = '', text = '', confirmButtonText = 'OK', cancelButtonText = 'Cancel', reverseButtons, allowOutsideClick = true, allowEscapeKey = true, callback, cancelCallback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        html: text,
        type: alertType,
        confirmButtonText,
        cancelButtonText,
        reverseButtons,
        allowOutsideClick,
        allowEscapeKey,
        showCancelButton: true
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        } else {
          if (_.isFunction(cancelCallback)) {
            cancelCallback(null)
          }
        }
      })
    }
  }

  static infoAlert ({ text = chrome.i18n.getMessage('expectedInfoMessageNotFound'), title = 'Info', callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        type: Alerts.alertType.info,
        title: title,
        html: text
      })
    }
  }

  static updateableAlert ({ text = chrome.i18n.getMessage('expectedInfoMessageNotFound'), type = Alerts.alertType.info, title = 'Info', timerIntervalHandler = null, timerIntervalPeriodInSeconds = 0.1, allowOutsideClick = true, allowEscapeKey = true, callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      let fire = () => {
        let timerInterval
        swal.fire({
          type: Alerts.alertType.info,
          title: title,
          html: text,
          allowOutsideClick,
          allowEscapeKey,
          showConfirmButton: true,
          didOpen: () => {
            if (_.isFunction(timerIntervalHandler)) {
              timerInterval = setInterval(() => {
                timerIntervalHandler(swal, timerInterval)
              }, timerIntervalPeriodInSeconds * 1000)
            }
          },
          didClose: () => {
            clearInterval(timerInterval)
          }
        })
      }
      if (Alerts.isVisible()) {
        Alerts.closeAlert()
        setTimeout(fire, 1000)
      } else {
        fire()
      }
    }
  }

  static errorAlert ({ text = chrome.i18n.getMessage('unexpectedError'), title = 'Oops...', callback, onClose }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        type: Alerts.alertType.error,
        title: title,
        html: text
      }).then(() => {
        if (_.isFunction(callback)) {
          callback(null)
        }
      })
    }
  }

  static successAlert ({ text = 'Your process is correctly done', title = 'Great!', callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        type: Alerts.alertType.success,
        title: title,
        html: text
      })
    }
  }

  static temporalAlert ({ text = 'It is done', title = 'Finished', type = Alerts.alertType.info, timer = 1500, position = 'top-end', callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        position: position,
        type: type,
        title: title, // TODO i18n
        html: text,
        showConfirmButton: false,
        timer: timer
      })
    }
  }

  static loadingAlert ({ text = 'If it takes too much time, please reload the page and try again.', position = 'top-end', title = 'Working on something, please be patient', confirmButton = false, timerIntervalHandler, callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      let timerInterval
      swal.fire({
        position: position,
        title: title,
        html: text,
        showConfirmButton: confirmButton,
        willOpen: () => {
          swal.showLoading()
          if (_.isFunction(timerIntervalHandler)) {
            timerInterval = setInterval(() => {
              if (swal.isVisible()) {
                timerIntervalHandler(swal)
              } else {
                clearInterval(timerInterval)
              }
            }, 100)
          }
        },
        didClose: () => {
          clearInterval(timerInterval)
        }
      })
    }
  }

  static inputTextAlert ({ title, input = 'text', type, inputPlaceholder = '', inputValue = '', preConfirm, cancelCallback, showCancelButton = true, html = '', allowOutsideClick = true, allowEscapeKey = true, callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        input: input,
        inputPlaceholder: inputPlaceholder,
        inputValue: inputValue,
        html: html,
        type: type,
        preConfirm: preConfirm,
        allowOutsideClick,
        allowEscapeKey,
        showCancelButton: showCancelButton
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        } else {
          if (_.isFunction(cancelCallback)) {
            cancelCallback()
          }
        }
      })
    }
  }

  static multipleInputAlert ({ title = 'Input', html = '', preConfirm, position = Alerts.position.center, onBeforeOpen, showCancelButton = true, allowOutsideClick = true, allowEscapeKey = true, callback, cancelCallback, customClass }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        title: title,
        html: html,
        focusConfirm: false,
        preConfirm: preConfirm,
        position: position,
        willOpen: onBeforeOpen,
        allowOutsideClick,
        allowEscapeKey,
        customClass: customClass,
        showCancelButton: showCancelButton
      }).then((result) => {
        if (result.value) {
          if (_.isFunction(callback)) {
            callback(null, result.value)
          }
        } else {
          if (_.isFunction(cancelCallback)) {
            cancelCallback(null)
          }
        }
      })
    }
  }

  static tryToLoadSwal () {
    if (_.isNull(swal)) {
      try {
        swal = require('sweetalert2').default
      } catch (e) {
        swal = null
      }
    }
  }

  static warningAlert ({ text = 'Something that you need to worry about happened. ' + chrome.i18n.getMessage('ContactAdministrator'), title = 'Warning', callback }) {
    Alerts.tryToLoadSwal()
    if (_.isNull(swal)) {
      if (_.isFunction(callback)) {
        callback(new Error('Unable to load swal'))
      }
    } else {
      swal.fire({
        type: Alerts.alertType.warning,
        title: title,
        html: text
      })
    }
  }

  static closeAlert () {
    swal.close()
  }

  static isVisible () {
    return swal.isVisible()
  }
}

Alerts.alertType = {
  warning: 'warning',
  error: 'error',
  success: 'success',
  info: 'info',
  question: 'question'
}

Alerts.position = {
  top: 'top',
  topStart: 'top-start',
  topEnd: 'top-end',
  center: 'center',
  centerStart: 'center-start',
  centerEnd: 'center-end',
  bottom: 'bottom',
  bottomStart: 'bottom-start',
  bottomEnd: 'bottom-end'
}

export default Alerts
