import _ from 'lodash'
import Alerts from '../../utils/Alerts'


class GradingForm {
  /**
   *
   * @param theme theme that is involved
   * @param callback callback to execute after form is closed
   * @param addingHtml
   */
  static showGradingForm (theme, callback, addingHtml) {
    // Save status of sidebar and close it
    const sidebarStatus = window.abwa.sidebar.isOpened()
    window.abwa.sidebar.closeSidebar()
    const title = GradingForm.getFormTitle()
    const showForm = (preConfirmData = {}) => {
      // Get last call to this form theme text, not the init one
      if (_.isObject(preConfirmData) && preConfirmData.grade) {
        theme.grade = preConfirmData.grade
      }
      // Create form
      const html = GradingForm.generateGradingFormHTML()
      const swalCallback = GradingForm.generateGradingFormCallback({ theme, preConfirmData, sidebarStatus, callback })
      const preConfirm = GradingForm.generateGradingFormPreConfirm({ preConfirmData, swalCallback, showForm })
      const onBeforeOpen = GradingForm.generateOnBeforeOpen({ theme })
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        onBeforeOpen: onBeforeOpen,
        callback: swalCallback,
        preConfirm: preConfirm
      })
    }
    showForm()
  }

  static getFormTitle () {
    let title = 'Grading'
    return title
  }

  static generateGradingFormPreConfirm ({ preConfirmData }) {
    const preConfirm = () => {
      preConfirmData.grade = document.querySelector('#grade').value
      preConfirmData.weight = document.querySelector('#weight').value
    }
    return preConfirm
  }

  static generateGradingFormHTML () {
    let html = ''
    html += '<p> The note is over 10 with a weight of <span id="weight"></span> </p>'
    // Grade input
    html += '<input type="text" id="grade" max="10" name="grade" placeholder="0.0" />'
    return html
  }

  static generateGradingFormCallback ({ theme, preConfirmData, callback, sidebarStatus }) {
    // Callback
    return (err) => {
      if (!_.isUndefined(preConfirmData.grade)) { // It was pressed OK button instead of cancel, so update the theme
        if (err) {
          window.alert('Unable to load alert. Is this an annotable document?')
        } else {
          // Update theme
          theme.grade = preConfirmData.grade || '0.0'
          if (sidebarStatus) {
            window.abwa.sidebar.openSidebar()
          }
          if (_.isFunction(callback)) {
            callback(null, theme)
          }
        }
      }
    }
  }

  static generateOnBeforeOpen ({ theme }) {
    return () => { document.querySelector('#grade').value = theme.grade; document.querySelector('#weight').innerText = theme.weight }
  }
}

export default GradingForm
