import _ from 'lodash'
import Alerts from '../../utils/Alerts'
// PVSCL:IFCOND(MoodleProvider OR Autocomplete, LINE)
import LanguageUtils from '../../utils/LanguageUtils'
import Theme from '../../codebook/model/Theme'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Autocomplete,LINE)
import Awesomplete from 'awesomplete'
import Annotation from '../Annotation'
// PVSCL:ENDCOND
import $ from 'jquery'
// PVSCL:IFCOND(SentimentAnalysis,LINE)
import axios from 'axios'
import qs from 'qs'
// PVSCL:ENDCOND
// PVSCL:IFCOND(Commenting, LINE)
import Commenting from './Commenting'
// PVSCL:ENDCOND
import Config from '../../Config'
// PVSCL:IFCOND(Assessing, LINE)
import Assessing from './Assessing'
// PVSCL:ENDCOND

require('components-jqueryui')



class LinkingForm {

  static showLinkingForm (annotation, callback) {
    // Save satatus of sidebar and close it
    const sidebarStatus = window.abwa.sidebar.isOpened()
    window.abwa.sidebar.closeSidebar()

    const title = LinkingForm.getFormTitle(annotation)
    const showForm = (preConfirmData = {}) => {
      if (_.isObject(preConfirmData) && preConfirmData.linkAnnotation) {
        // annotation.links.push(preConfirmData.linkAnnotation)
      }
      const generateFormObjects = { annotation, showForm, sidebarStatus }
      const html = LinkingForm.generateLinkFormHTML({ annotation })
      const swalCallback = LinkingForm.generateLinkFormCallback({ annotation, preConfirmData, sidebarStatus, callback })
      const preConfirm = LinkingForm.generateLinkFormPreConfirm({ preConfirmData, swalCallback, showForm })
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        callback: swalCallback,
        preConfirm: preConfirm
      })
    }
    showForm()

  }

  static getFormTitle (annotation) {
    let title = 'Linking'
    // let themeOrCode = CommentingForm.getCodeOrThemeForAnnotation(annotation)

    // if (themeOrCode) {
    //   title = themeOrCode.name
    // }

    return title

  }

  static generateLinkFormPreConfirm ({ preConfirmData, callback, showForm }) {
    const preConfirm = () => {
      preConfirmData.linkAnnotation = document.querySelector('#categorizeDropdown').value
      return preConfirm
    }
  }

  static generateLinkFormHTML ({ annotation }) {
    let html = ''
    const select = document.createElement('select')
    select.id = 'categorizeDropdown'
    window.abwa.annotationManagement.annotationReader.allAnnotations.forEach(a => {
      const option = document.createElement('option')
      option.text = a.id
      option.value = a.id
      select.add(option)
    })
    html += select.outerHTML

    return html
  }

  // PVSCL:IFCOND(Classifying, LINE)
  static getCodeOrThemeForAnnotation (annotation) {
    const classifyingBody = annotation.getBodyForPurpose('classifying')
    let themeOrCode
    if (classifyingBody) {
      themeOrCode = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(classifyingBody.value.id)
    }
    return themeOrCode
  }
  // PVSCL:ENDCOND

  static generateLinkFormCallback ({ annotation, preConfirmData, callback, sidebarStatus }) {
    // Callback
    return (err, result) => {
      if (!_.isUndefined(preConfirmData.linkAnnotation)) {
        if (err) {
          window.alert('Unable to load alert.')
        } else {
          annotation.links.push(preConfirmData.linkAnnotation)
          let bAnnotation = window.abwa.annotationManagement.annotationReader.allAnnotations.find(a => a.id === preConfirmData.linkAnnotation)
          bAnnotation.links.push(annotation.id)
          if (sidebarStatus) {
            window.abwa.sidebar.openSidebar()
          }
          if (_.isFunction(callback)) {
            callback(null, annotation)
          }
        }
      }
    }
  }
}
export default LinkingForm
