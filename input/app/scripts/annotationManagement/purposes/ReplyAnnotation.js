import AnnotationUtils from '../../utils/AnnotationUtils'
import Config from '../../Config'
import moment from 'moment'
import _ from 'lodash'

class ReplyAnnotation {
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
    // Get replies for this annotation
    const replies = ReplyAnnotation.getReplies(annotation, replyAnnotations)
    // What and who
    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i]
      htmlText += this.createReplyLog(reply)
      if (replies.length - 1 > i) {
        htmlText += '<hr/>'
      }
    }
    return { htmlText: htmlText, replies: replies }
  }

  static createReplyLog (reply) {
    let htmlText = ''
    let userSpanClassName = 'reply_user'
    let textSpanClassName = 'reply_text'
    const dateSpanClassName = 'reply_date'
    // PVSCL:IFCOND( Validate, LINE )
    // TODO Refactor with the new mechanism to detect validations
    if (reply.motivation === Config.namespace + ':assessing') {
      userSpanClassName += ' reply_validated'
      textSpanClassName += ' reply_validated'
    }
    // PVSCL:ENDCOND
    // Add user name
    if (reply.creator === window.abwa.groupSelector.getCreatorData()) {
      htmlText += '<span class="' + userSpanClassName + '">You: </span>'
    } else {
      const username = reply.creator.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '')
      htmlText += '<span class="' + userSpanClassName + '">' + username + ': </span>'
    }
    // PVSCL:IFCOND(Commenting, LINE)
    const replyCommentBody = reply.body.find(body => body.purpose === 'commenting')
    let textComment = 'No comment'
    if (replyCommentBody) {
      textComment = replyCommentBody.value
    }
    htmlText += '<span class="' + textSpanClassName + '">' + textComment + '</span>'
    // PVSCL:ENDCOND
    if (reply.modified) {
      htmlText += '<span title="' + moment(reply.modified).format('MMMM Do YYYY, h:mm:ss a') + '" class="' + dateSpanClassName + '">' + moment(reply.modified).fromNow() + '</span>'
    }

    return htmlText
  }
}

export default ReplyAnnotation
