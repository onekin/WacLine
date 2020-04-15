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
        // bAnnotation = preConfirmData
      }
      const generateFormObjects = { annotation, showForm, sidebarStatus }
      const html = LinkingForm.generateLinkFormHTML({ annotation })
      // const swalCallback = LinkingForm.generateLinkFormCallback({ annotation, bAnnotation, sidebarStatus, callback })
      const preConfirm = LinkingForm.generateLinkFormPreConfirm({ annotation, preConfirmData, callback, sidebarStatus })
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
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

  static generateLinkFormPreConfirm ({ annotation, preConfirmData, callback, sidebarStatus }) {
    const preConfirm = () => {
      preConfirmData.linkAnnotation = document.querySelector('#categorizeDropdown').value
      if (preConfirmData.linkAnnotation != null) {
        console.log('Haciendo link')
        annotation.annotationlinks.push(preConfirmData.linkAnnotation)
        let bAnnotation = window.abwa.annotationManagement.annotationReader.allAnnotations.find(a => a.id === preConfirmData.linkAnnotation)
        bAnnotation.annotationlinks.push(annotation.id)
        console.log('links ' + annotation.id + ': ' + annotation.annotationlinks.length + ' links ' + bAnnotation.id + ': ' + bAnnotation.annotationlinks.length)

        if (sidebarStatus) {
          window.abwa.sidebar.openSidebar()
        }
        if (_.isFunction(callback)) {
          console.log('UPDATING ANNOTATIONS')
          callback(null, annotation, bAnnotation)
        }
      }
    }
    return preConfirm
  }



  static generateLinkFormHTML ({ annotation }) {
    let html = ''
    const select = document.createElement('select')
    select.id = 'categorizeDropdown'
    window.abwa.annotationManagement.annotationReader.allAnnotations.forEach(a => {
      if (a.id !== annotation.id) {
        const option = document.createElement('option')
        option.text = a.id
        option.value = a.id
        select.add(option)
      }
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

  static generateLinkFormCallback ({ annotation, bAnnotation, callback, sidebarStatus }) {
    // Callback
    return (_err, result) => {
      console.log('UPDATING ANNOTATIONS')
      if (sidebarStatus) {
        window.abwa.sidebar.openSidebar()
      }
      if (_.isFunction(callback)) {
        callback(null, annotation, bAnnotation)
      }
    }
  }
}


export default LinkingForm
