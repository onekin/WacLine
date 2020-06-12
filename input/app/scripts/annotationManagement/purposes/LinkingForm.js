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
import Popup from '../../popup/Popup'

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
      const linksHtml = LinkingForm.generateShowLinksHtml({ annotation })
      const onBeforeOpen = LinkingForm.generateOnBeforeOpen({ linksHtml })
      const html = LinkingForm.generateLinkFormHTML({ annotation })
      // const swalCallback = LinkingForm.generateLinkFormCallback({ annotation, bAnnotation, sidebarStatus, callback })
      const preConfirm = LinkingForm.generateLinkFormPreConfirm({ annotation, preConfirmData, callback, sidebarStatus })
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        onBeforeOpen: onBeforeOpen,
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
        let bAnnotation = window.abwa.annotationManagement.annotationReader.allServerAnnotations.find(a => a.id === preConfirmData.linkAnnotation)
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

  static generateShowLinksHtml ({ annotation }) {
    let links = {}
    let html = '<div id="table-div" style="overflow:auto;" >'
    annotation.annotationlinks.forEach((link) => {
      let targetAnnotation = _.find(window.abwa.annotationManagement.annotationReader.allServerAnnotations, (a) => { return a.id === link })
      let text = ''
      targetAnnotation.target[0].selector.forEach((select) => {
        if (select.type === 'TextQuoteSelector') {
          text = select.exact
        }

      })
      if (links[targetAnnotation.target[0].source.title]) {
        links[targetAnnotation.target[0].source.title].push(targetAnnotation)
      } else {
        links[targetAnnotation.target[0].source.title] = [targetAnnotation]
      }
    })
    for (const [key, values] of Object.entries(links)) {
      const title = document.createElement('h6')
      title.innerText = key
      const ul = document.createElement('ul')
      values.forEach((an) => {
        const li = document.createElement('li')
        li.id = an.id
        // li.onclick = window.abwa.annotationManagement.goToAnnotation(an)
        li.innerText = _.find(an.target[0].selector, (s) => { return s.type === 'TextQuoteSelector' }).exact
        li.style = 'cursor: pointer; font-size:10px'
        ul.appendChild(li)
      })
      html += title.outerHTML + ul.outerHTML

    }
    html += '</div>'
    return html
  }


  static generateOnBeforeOpen ({ linksHtml }) {
    const onBefore = () => {
      let btn = document.querySelector('#buttonLinks')
      btn.addEventListener('click', () => {
        Alerts.multipleInputAlert({
          title: 'Links',
          html: linksHtml,
          onBeforeOpen: () => {
            document.getElementById('table-div').getElementsByTagName('ul').forEach((ul) => {
              ul.onclick = (e) => {
                Alerts.closeAlert()
                let targetAnnotation = window.abwa.annotationManagement.annotationReader.allServerAnnotations.find((annot) => { return annot.id === e.target.id })
                window.open((targetAnnotation.target[0].source.url || targetAnnotation.target[0].source.uri) + '#' + Config.urlParamName + ':' + targetAnnotation.id)
              }
            })

          }

        })
      })
    }
    return onBefore
  }

  static generateLinkFormHTML ({ annotation }) {
    let html = ''

    const select = document.createElement('select')
    select.id = 'categorizeDropdown'
    select.style = 'max-width=100%;'
    const button = document.createElement('button')
    button.innerText = 'Show Links'
    button.id = 'buttonLinks'


    window.abwa.annotationManagement.annotationReader.allServerAnnotations.forEach(a => {
      if (a.id !== annotation.id && !annotation.annotationlinks.includes(a.id)) {
        const option = document.createElement('option')
        let text = ''
        a.target[0].selector.forEach((select) => {
          if (select.type === 'TextQuoteSelector') {
            if (select.exact.length > 25) {
              text = select.exact.slice(0, 22) + '...'
            } else {
              text = select.exact
            }
          }
        })
        option.text = a.target[0].source.title.slice(0, 20) + '...-' + a.body[0].value.name + '-' + text
        option.value = a.id
        select.add(option)
      }
    })
    html += button.outerHTML + '<br><br>'
    html += '<span>Select one annotation to link: </span><br>'
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
