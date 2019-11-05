const AnnotationUtils = require('../utils/AnnotationUtils')
const LanguageUtils = require('../utils/LanguageUtils')
const Alerts = require('../utils/Alerts')
const Events = require('../contentScript/Events')
const Config = require('../Config')
const _ = require('lodash')
// const linkifyUrls = require('linkify-urls')

class ReplyAnnotation {
  /**
   * Creates the input form for reply with the previous replies
   */
  static createInputFormForReply ({repliesData, annotationModifying, annotation, motivation = Config.namespace + ':replying', confirmButtonColor, confirmButtonText, placeholder = 'Type your reply here...'}) {
    // Get text of annotation modifying if exist
    let inputValue = ''
    if (_.isObject(annotationModifying)) {
      inputValue = annotationModifying.text
    }
    Alerts.inputTextAlert({
      input: 'textarea',
      inputPlaceholder: inputValue || placeholder,
      inputValue: inputValue || '',
      confirmButtonText: confirmButtonText,
      confirmButtonColor: confirmButtonColor,
      html: repliesData.htmlText,
      callback: (err, result) => {
        if (err) {

        } else {
          if (_.isEmpty(inputValue)) {
            // The comment you are writing is new
            const TextAnnotator = require('../contentScript/contentAnnotators/TextAnnotator')
            let replyAnnotationData = TextAnnotator.constructAnnotation({
              motivation: motivation
            })
            // Add text
            replyAnnotationData.text = result
            // Add its reference (the annotation that replies to)
            replyAnnotationData.references = [annotation.id]
            window.abwa.storageManager.client.createNewAnnotation(replyAnnotationData, (err, replyAnnotation) => {
              if (err) {
                // Show error when creating annotation
                Alerts.errorAlert({text: 'There was an error when replying, please try again. Make sure you are logged in Hypothes.is.'})
              } else {
                // Dispatch event of new reply is created
                LanguageUtils.dispatchCustomEvent(Events.reply, {
                  replyType: 'new',
                  annotation: annotation,
                  replyAnnotation: replyAnnotation
                })
                // Add reply to reply list
                window.abwa.contentAnnotator.replyAnnotations.push(replyAnnotation)
              }
            })
          } else {
            // The comment you are writing is a modification of the annotation modifying
            window.abwa.storageManager.client.updateAnnotation(annotationModifying.id, {
              text: result
            }, (err, replyAnnotationResult) => {
              if (err) {
                // Show error when updating annotation
                Alerts.errorAlert({text: 'There was an error when editing your reply, please try again. Make sure you are logged in Hypothes.is.'})
              } else {
                LanguageUtils.dispatchCustomEvent(Events.reply, {
                  replyType: 'update',
                  annotation: annotation,
                  replyAnnotation: replyAnnotationResult,
                  originalText: inputValue
                })
                // Update reply list with the modified annotation
                let index = _.findIndex(window.abwa.contentAnnotator.replyAnnotations, (replyAnnotation) => {
                  return replyAnnotationResult.id === replyAnnotation.id
                })
                if (index >= 0) {
                  window.abwa.contentAnnotator.replyAnnotations[index] = replyAnnotationResult
                }
              }
            })
          }
          console.debug(result)
        }
      }
    })
  }

  static replyAnnotation (annotation) {
    // Get annotations replying current annotation
    let repliesData = ReplyAnnotation.createRepliesData(annotation, window.abwa.contentAnnotator.replyAnnotations)
    // Filter replies different to replying
    repliesData.replies = _.filter(repliesData.replies, (reply) => {
      return reply.motivation === Config.namespace + ':replying'
    })
    let annotationModifying
    if (_.last(repliesData.replies) && _.last(repliesData.replies).user === window.abwa.groupSelector.user.userid) {
      annotationModifying = _.last(repliesData.replies)
    }
    ReplyAnnotation.createInputFormForReply({
      annotationModifying, annotation, repliesData, motivation: Config.namespace + ':replying'
    })
  }
  // PVSCL:IFCOND( Validate, LINE )

  static validateAnnotation (annotation) {
    let repliesData = ReplyAnnotation.createRepliesData(annotation, window.abwa.contentAnnotator.replyAnnotations)
    // Get validation annotation if the current user has already validated annotation
    let annotationModifying
    let userValidationAnnotation = _.find(repliesData.replies, (reply) => {
      return reply.user === window.abwa.groupSelector.user.userid && reply.motivation === Config.namespace + ':assessing'
    })
    if (_.isObject(userValidationAnnotation)) {
      annotationModifying = userValidationAnnotation
    }
    ReplyAnnotation.createInputFormForReply({
      annotationModifying, annotation, repliesData, motivation: Config.namespace + ':assessing', placeholder: 'Type the reason to validate...', confirmButtonColor: 'rgba(100,200,100,1)', confirmButtonText: 'Validate'
    })
  }
  // PVSCL:ENDCOND

  /**
   * Returns if annotation is replied by any annotation in replies
   * @param annotation
   * @param allReplies
   */
  static hasReplies (annotation, allReplies) {
    try {
      return ReplyAnnotation.getReplies(annotation, allReplies).length > 0
    } catch (e) {
      return false
    }
  }

  /**
   * Returns all the reply annotations that reply "annotation"
   * @param annotation
   * @param allReplies
   * @returns {Array}
   */
  static getReplies (annotation, allReplies) {
    let replies = _.filter(allReplies, (replyAnnotation) => {
      return AnnotationUtils.isReplyOf(annotation, replyAnnotation)
    })
    replies = _.orderBy(replies, 'updated')
    return replies
  }

  static createRepliesData (annotation, replyAnnotations = []) {
    let htmlText = ''
    // Add feedback comment text
    htmlText += ReplyAnnotation.createReplyLog(annotation)
    htmlText += '<hr/>'
    // get replies for this annotation
    let replies = ReplyAnnotation.getReplies(annotation, replyAnnotations)
    // What and who
    for (let i = 0; i < replies.length; i++) {
      let reply = replies[i]
      htmlText += this.createReplyLog(reply)
      if (replies.length - 1 > i) {
        htmlText += '<hr/>'
      }
    }
    // If last reply is from current user, don't show it in reply chain, it will be shown as comment to be edited
    /* let lastReply = _.last(replies)
    if (lastReply) {
      if (lastReply.user !== window.abwa.groupSelector.user.userid) {
        htmlText += '<hr/>'
        htmlText += this.createReplyLog(lastReply)
      }
    } */
    return {htmlText: htmlText, replies: replies}
  }

  static createReplyLog (reply) {
    let htmlText = ''
    let userSpanClassName = 'reply_user'
    let textSpanClassName = 'reply_text'
    // PVSCL:IFCOND( Validate, LINE )
    if (reply.motivation === Config.namespace + ':assessing') {
      userSpanClassName += ' reply_validated'
      textSpanClassName += ' reply_validated'
    }
    // PVSCL:ENDCOND
    // Add user name
    if (reply.user === window.abwa.groupSelector.user.userid) {
      htmlText += '<span class="' + userSpanClassName + '">You: </span>'
    } else {
      let username = reply.user.split('acct:')[1].split('@hypothes.is')[0]
      htmlText += '<span class="' + userSpanClassName + '">' + username + ': </span>'
    }
    /* let urlizedReplyText = linkifyUrls(reply.text, {
      attributes: {
        target: '_blank'
      }
    }) */
    let urlizedReplyText = reply.text
    // Add comment
    htmlText += '<span class="' + textSpanClassName + '">' + urlizedReplyText + '</span>'
    return htmlText
  }
}

module.exports = ReplyAnnotation
