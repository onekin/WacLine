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
// PVSCL:IFCOND(SuggestedLiterature, LINE)
import SuggestingLiterature from './SuggestingLiterature'
require('components-jqueryui')
// PVSCL:ENDCOND

class CommentingForm {
  /**
   *
   * @param annotation annotation that is involved
   * @param callback callback to execute after form is closed
   * @param addingHtml
   */
  static showCommentingForm (annotation, callback, addingHtml) {
    // Save status of sidebar and close it
    let sidebarStatus = window.abwa.sidebar.isOpened()
    window.abwa.sidebar.closeSidebar()
    // PVSCL:IFCOND(PreviousAssignments,LINE)
    let previousAssignmentsUI = CommentingForm.getPreviousAssignmentsUI()
    // PVSCL:ENDCOND
    let title = CommentingForm.getFormTitle(annotation)
    let showForm = (preConfirmData) => {
      // Get last call to this form annotation text, not the init one
      if (_.isObject(preConfirmData) && preConfirmData.comment) {
        annotation.text = preConfirmData.comment
      }
      // Create form
      let generateFormObjects = {annotation, showForm, sidebarStatus}
      // PVSCL:IFCOND(Autocomplete,LINE)
      let themeOrCode = CommentingForm.getCodeOrThemeForAnnotation(annotation)
      if (themeOrCode) {
        generateFormObjects['themeOrCode'] = themeOrCode
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(PreviousAssignments,LINE)
      generateFormObjects['previousAssignmentsUI'] = previousAssignmentsUI
      // PVSCL:ENDCOND
      let html = CommentingForm.generateCommentFormHTML({annotation, addingHtml})
      let swalCallback = CommentingForm.generateCommentFormCallback({annotation, preConfirmData, sidebarStatus, callback})
      let preConfirm = CommentingForm.generateCommentFormPreConfirm({preConfirmData, swalCallback, showForm})
      let onBeforeOpen = CommentingForm.generateOnBeforeOpenForm({annotation})
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        onBeforeOpen: onBeforeOpen,
        // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
        callback: swalCallback,
        preConfirm: preConfirm
      })
    }
    showForm()
  }

  static getFormTitle (annotation) {
    let title = 'Commenting'
    // PVSCL:IFCOND(Classifying, LINE)
    // Get the title for form (if it is a classifying annotation, annotation code or theme
    // Get body for classifying
    let themeOrCode = CommentingForm.getCodeOrThemeForAnnotation(annotation)
    // PVSCL:IFCOND(MoodleProvider,LINE)
    if (themeOrCode && LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
      title = themeOrCode.name
    } else {
      title = themeOrCode.theme.name + ': ' + themeOrCode.name + ' - ' + themeOrCode.description
    }
    // PVSCL:ELSECOND
    if (themeOrCode) {
      title = themeOrCode.name
    }
    // PVSCL:ENDCOND
    // PVSCL:ENDCOND
    return title
  }

  // PVSCL:IFCOND(Classifying, LINE)
  static getCodeOrThemeForAnnotation (annotation) {
    let classifyingBody = annotation.getBodyForPurpose('classifying')
    let themeOrCode
    if (classifyingBody) {
      themeOrCode = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(classifyingBody.value.id)
    }
    return themeOrCode
  }
  // PVSCL:ENDCOND

  // PVSCL:IFCOND(PreviousAssignments,LINE)
  static getPreviousAssignmentsUI () {
    let previousAssignments = window.abwa.previousAssignments.retrievePreviousAssignments()
    return window.abwa.previousAssignments.createPreviousAssignmentsUI(previousAssignments)
  }
  // PVSCL:ENDCOND

  static generateCommentFormPreConfirm ({preConfirmData, callback, showForm}) {
    let preConfirm = () => {
      preConfirmData.comment = document.querySelector('#comment').value
      // PVSCL:IFCOND(SuggestedLiterature, LINE)
      preConfirmData.literature = Array.from($('#literatureList li span')).map((e) => { return $(e).attr('title') })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Categorize, LINE)
      preConfirmData.categorizeData = document.querySelector('#categorizeDropdown').value
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(SentimentAnalysis, LINE)
      if (preConfirmData.comment !== null && preConfirmData.comment !== '') {
        CommentingForm.isOffensive(preConfirmData.comment)
          .then((isOffensive) => {
            if (isOffensive) {
              // The comment is negative or offensive
              Alerts.confirmAlert({
                text: 'The message may be ofensive. Please modify it.',
                showCancelButton: true,
                cancelButtonText: 'Modify comment',
                confirmButtonText: 'Save as it is',
                reverseButtons: true,
                callback: callback,
                cancelCallback: () => {
                  showForm(preConfirmData)
                }
              })
            } else {
              callback()
            }
          })
      } else {
        // Update annotation
        callback()
      }
      // PVSCL:ENDCOND
    }
    return preConfirm
  }

  static async isOffensive (text) {
    let settings = {
      method: 'post',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      url: 'http://text-processing.com/api/sentiment/',
      data: qs.stringify({text: text})
    }
    axios(settings).then((response) => {
      return response.data && response.data.label === 'neg' && response.data.probability.neg > 0.55
    })
  }

  static generateCommentFormHTML ({annotation, addingHtml}) {
    let html = addingHtml || ''
    // PVSCL:IFCOND(PreviousAssignments,LINE)
    html += CommentingForm.getPreviousAssignmentsUI().outerHTML
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(Categorize, LINE)
    let select = document.createElement('select')
    select.id = 'categorizeDropdown'
    let option = document.createElement('option')
    // Empty option
    option.text = ''
    option.value = ''
    select.add(option)
    Config.assessmentCategories.forEach(category => {
      let option = document.createElement('option')
      option.text = category.name
      option.value = category.name
      select.add(option)
    })
    html += select.outerHTML
    // PVSCL:ENDCOND
    let purposeCommentingBody
    if (_.isArray(annotation.body)) {
      purposeCommentingBody = annotation.body.find(body => body.purpose === 'commenting')
    }
    let commentText = purposeCommentingBody ? purposeCommentingBody.value : ''
    html += '<textarea class="swal2-textarea" data-minchars="1" data-multiple id="comment" rows="6" autofocus>' + commentText + '</textarea>'
    // PVSCL:IFCOND(SuggestedLiterature,LINE)
    let suggestedLiteratureHtml = (annotation) => {
      let litBody = annotation.getBodyForPurpose(SuggestingLiterature.purpose)
      if (litBody && _.isArray(litBody.value)) {
        let lit = litBody.value
        let html = ''
        lit.forEach((paper) => {
          html += '<li><a class="removeReference"></a><span title="' + paper + '">' + paper + '</span></li>'
        })
        return html
      } else {
        return ''
      }
    }
    html += '<input placeholder="Suggest literature from DBLP" id="swal-input1" class="swal2-input"><ul id="literatureList">' + suggestedLiteratureHtml(annotation) + '</ul>'
    // PVSCL:ENDCOND
    return html
  }

  static generateOnBeforeOpenForm ({annotation}) {
    // On before open
    let onBeforeOpen
    // PVSCL:IFCOND(Autocomplete or SuggestedLiterature or PreviousAssignments,LINE)
    onBeforeOpen = () => {
      // PVSCL:IFCOND(Categorize, LINE)
      // Get if annotation has a previous category
      let assessingBody = annotation.getBodyForPurpose(Assessing.purpose)
      // Change value to previously selected one
      if (assessingBody) {
        document.querySelector('#categorizeDropdown').value = assessingBody.value
      }
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(PreviousAssignments,LINE)
      let previousAssignmentAppendElements = document.querySelectorAll('.previousAssignmentAppendButton')
      previousAssignmentAppendElements.forEach((previousAssignmentAppendElement) => {
        previousAssignmentAppendElement.addEventListener('click', () => {
          // Append url to comment
          let commentTextarea = document.querySelector('#comment')
          commentTextarea.value = commentTextarea.value + previousAssignmentAppendElement.dataset.studentUrl
        })
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Autocomplete,LINE)
      // Load datalist with previously used texts
      let themeOrCode = CommentingForm.getCodeOrThemeForAnnotation(annotation)
      CommentingForm.retrievePreviouslyUsedComments(themeOrCode).then((previousComments) => {
        let awesomeplete = new Awesomplete(document.querySelector('#comment'), {
          list: previousComments,
          minChars: 0
        })
        // On double click on comment, open the awesomeplete
        document.querySelector('#comment').addEventListener('dblclick', () => {
          awesomeplete.evaluate()
          awesomeplete.open()
        })
      })
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(SuggestedLiterature, LINE)
      // Add the option to delete a suggestedLiterature from the comment
      $('.removeReference').on('click', function () {
        $(this).closest('li').remove()
      })
      // Autocomplete the suggestedLiteratures
      $('#swal-input1').autocomplete({
        source: function (request, response) {
          $.ajax({
            url: 'http://dblp.org/search/publ/api',
            data: {
              q: request.term,
              format: 'json',
              h: 5
            },
            success: function (data) {
              response(data.result.hits.hit.map((e) => { return {label: e.info.title + ' (' + e.info.year + ')', value: e.info.title + ' (' + e.info.year + ')', info: e.info} }))
            }
          })
        },
        minLength: 3,
        delay: 500,
        select: function (event, ui) {
          let content = ''
          if (ui.item.info.authors !== null && Array.isArray(ui.item.info.authors.author)) {
            if (_.isObject(ui.item.info.authors.author[0])) {
              content += ui.item.info.authors.author.map(a => a.text).join(', ') + ': '
            } else {
              content += ui.item.info.authors.author.join(', ') + ': '
            }
          } else if (ui.item.info.authors !== null) {
            content += ui.item.info.authors.author + ': '
          }
          if (ui.item.info.title !== null) {
            content += ui.item.info.title
          }
          if (ui.item.info.year !== null) {
            content += ' (' + ui.item.info.year + ')'
          }
          let a = document.createElement('a')
          a.className = 'removeReference'
          a.addEventListener('click', function (e) {
            $(e.target).closest('li').remove()
          })
          let li = document.createElement('li')
          $(li).append(a, '<span title="' + content + '">' + content + '</span>')
          $('#literatureList').append(li)
          setTimeout(function () {
            $('#swal-input1').val('')
          }, 10)
        },
        appendTo: '.swal2-container',
        create: function () {
          $('.ui-autocomplete').css('max-width', $('.swal2-textarea').width())
        }
      })
      // PVSCL:ENDCOND
    }
    // PVSCL:ELSECOND
    onBeforeOpen = () => {}
    // PVSCL:ENDCOND
    return onBeforeOpen
  }

  // PVSCL:IFCOND(Autocomplete,LINE)
  static retrievePreviouslyUsedComments (themeOrCode) {
    let tag = ''
    if (themeOrCode) {
      if (LanguageUtils.isInstanceOf(themeOrCode, Theme)) {
        tag = Config.namespace + ':' + Config.tags.grouped.group + ':' + themeOrCode.name
      } else {
        tag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + themeOrCode.name
      }
    }
    return new Promise((resolve, reject) => {
      window.abwa.annotationServerManager.client.searchAnnotations({
        tag: tag
      }, (err, annotationsRetrieved) => {
        if (err) {
          reject(err)
        } else {
          // Remove those which are from the classification scheme
          let annotationsRetrievedFiltered = annotationsRetrieved.filter(a => a.motivation !== 'codebookDevelopment')
          // Deserialize annotations
          let annotations = annotationsRetrievedFiltered.map(a => Annotation.deserialize(a))
          // Filter by purpose classifying
          annotations = _.filter(annotations, (annotation) => {
            return annotation.getBodyForPurpose('classifying') && annotation.getBodyForPurpose('commenting')
          })
          // Get texts from annotations and send them in callback
          resolve(_.uniq(_.reject(_.map(annotations, (annotation) => {
            // Remove other students moodle urls
            let text = annotation.getBodyForPurpose('commenting').value
            // PVSCL:IFCOND(PreviousAssignments, LINE)
            let regex = /\b(?:https?:\/\/)?[^/:]+\/.*?mod\/assign\/view.php\?id=[0-9]+/g
            text = text.replace(regex, '')
            // PVSCL:ENDCOND
            if (text.replace(/ /g, '') !== '') {
              return text
            }
          }), _.isEmpty)))
        }
      })
      return true
    })
  }
  // PVSCL:ENDCOND

  static generateCommentFormCallback ({annotation, preConfirmData, callback, sidebarStatus}) {
    // Callback
    return (err, result) => {
      if (!_.isUndefined(preConfirmData.comment)) { // It was pressed OK button instead of cancel, so update the annotation
        if (err) {
          window.alert('Unable to load alert. Is this an annotable document?')
        } else {
          let bodyToUpdate = []
          bodyToUpdate.push(new Commenting({value: preConfirmData.comment}))
          // Update annotation
          annotation.text = preConfirmData.comment || ''
          // PVSCL:IFCOND(SuggestedLiterature,LINE)
          let litBody = annotation.getBodyForPurpose(SuggestingLiterature.purpose)
          if (litBody) {
            litBody.value = preConfirmData.literature || []
          } else {
            annotation.body.push(new SuggestingLiterature({value: preConfirmData.literature}))
          }
          // PVSCL:ENDCOND
          // PVSCL:IFCOND(Assessing, LINE)
          // Assessment category support
          let assessmentBody = annotation.getBodyForPurpose(Assessing.purpose)
          if (assessmentBody) {
            assessmentBody.value = preConfirmData.categorizeData
          } else {
            annotation.body.push(new Assessing({value: preConfirmData.categorizeData}))
          }
          // PVSCL:ENDCOND
          // Update annotation's body
          annotation.body = _.uniqBy(_.concat(bodyToUpdate, annotation.body), a => a.purpose)
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

export default CommentingForm
