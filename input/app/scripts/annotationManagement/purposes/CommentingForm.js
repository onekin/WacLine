const _ = require('lodash')
const Alerts = require('../../utils/Alerts')
// PVSCL:IFCOND(MoodleProvider OR Autocomplete, LINE)
const LanguageUtils = require('../../utils/LanguageUtils')
const Theme = require('../../codebook/model/Theme')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Autocomplete,LINE)
const Awesomplete = require('awesomplete')
const Annotation = require('../Annotation')
// PVSCL:ENDCOND
const $ = require('jquery')
// PVSCL:IFCOND(SentimentAnalysis,LINE)
const axios = require('axios')
const qs = require('qs')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Commenting, LINE)
const Commenting = require('./Commenting')
// PVSCL:ENDCOND
const Config = require('../../Config')
// PVSCL:IFCOND(Assessing, LINE)
const Assessing = require('./Assessing')
// PVSCL:ENDCOND
// PVSCL:IFCOND(SuggestedLiterature, LINE)
require('components-jqueryui')
const SuggestingLiterature = require('./SuggestingLiterature')
// PVSCL:ENDCOND

class CommentingForm {
  /**
   *
   * @param annotation annotation that is involved
   * @param formCallback callback to execute after form is closed
   * @param addingHtml
   * @returns {Promise<unknown>}
   */
  static showCommentingForm (annotation, formCallback, addingHtml) {
    return new Promise((resolve, reject) => {
      // Close sidebar if opened
      let sidebarOpen = window.abwa.sidebar.isOpened()
      window.abwa.sidebar.closeSidebar()
      // PVSCL:IFCOND(PreviousAssignments,LINE)
      let previousAssignments = window.abwa.previousAssignments.retrievePreviousAssignments()
      let previousAssignmentsUI = window.abwa.previousAssignments.createPreviousAssignmentsUI(previousAssignments)
      // PVSCL:ENDCOND
      // PVSCL:IFCOND(Classifying, LINE)
      // Get the title for form (if it is a classifying annotation, annotation code or theme
      let title = ''
      // Get body for classifying
      let classifyingBody = annotation.getBodyForPurpose('classifying')
      let themeOrCode
      if (classifyingBody) {
        themeOrCode = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(classifyingBody.value.id)
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
      }
      // PVSCL:ENDCOND
      let showForm = (preConfirmData) => {
        // Get last call to this form annotation text, not the init one
        if (_.isObject(preConfirmData) && preConfirmData.comment) {
          annotation.text = preConfirmData.comment
        }
        // Create form
        let generateFormObjects = {annotation, showForm, sidebarOpen}
        // PVSCL:IFCOND(Autocomplete,LINE)
        if (themeOrCode) {
          generateFormObjects['themeOrCode'] = themeOrCode
        }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(PreviousAssignments,LINE)
        generateFormObjects['previousAssignmentsUI'] = previousAssignmentsUI
        // PVSCL:ENDCOND
        let form = CommentingForm.generateCommentFormHTML(generateFormObjects, formCallback, addingHtml)
        Alerts.multipleInputAlert({
          title: title || '',
          html: form.html,
          onBeforeOpen: form.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          preConfirm: form.preConfirm
        })
      }
      showForm()
    })
  }

  /**
   * Generates the HTML for comment form based on annotation, add reference autocomplete,...
   * @param annotation
   * @param showForm
   * @param sidebarOpen
   * @param themeOrCode
   * @param previousAssignmentsUI
   * @param formCallback
   * @param addingHtml
   * @returns {{preConfirm: preConfirm, callback: callback, html: (*|string), onBeforeOpen: onBeforeOpen}}
   */
  static generateCommentFormHTML ({annotation, showForm, sidebarOpen, themeOrCode, previousAssignmentsUI}, formCallback, addingHtml) {
    let html = addingHtml || ''
    // PVSCL:IFCOND(PreviousAssignments,LINE)
    html += previousAssignmentsUI.outerHTML
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
            content += ui.item.info.authors.author.join(', ') + ': '
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
    // Preconfirm
    let preConfirmData = {}
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
        let settings = {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          url: 'http://text-processing.com/api/sentiment/',
          data: qs.stringify({text: preConfirmData.comment})
        }
        axios(settings).then((response) => {
          if (response.data && response.data.label === 'neg' && response.data.probability.neg > 0.55) {
            // The comment is negative or offensive
            Alerts.confirmAlert({
              text: 'The message may be ofensive. Please modify it.',
              showCancelButton: true,
              cancelButtonText: 'Modify comment',
              confirmButtonText: 'Save as it is',
              reverseButtons: true,
              callback: () => {
                callback()
              },
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
    // Callback
    let callback = (err, result) => {
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
          if (_.isFunction(formCallback)) {
            formCallback(null, annotation)
          }
        }
      }
    }
    return {html: html, onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, callback: callback}
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
}

module.exports = CommentingForm
