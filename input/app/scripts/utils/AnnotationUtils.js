const _ = require('lodash')
const Config = require('../Config')
const {Review, Annotation} = require('../exporter/reviewModel.js')

class AnnotationUtils {
  static getTagFromAnnotation (annotation, prefix) {
    return _.find(annotation.tags, (tag) => {
      return tag.startsWith(prefix)
    })
  }

  static getTagSubstringFromAnnotation (annotation, prefix) {
    let tag = AnnotationUtils.getTagFromAnnotation(annotation, prefix)
    if (tag) {
      return tag.replace(prefix, '')
    } else {
      return null
    }
  }

  static modifyTag (annotation, oldTag, newTag) {
    let index = _.findIndex(annotation.tags, (tag) => { return oldTag === tag })
    if (index > -1) {
      annotation.tags[index] = newTag
      return annotation
    } else {
      return null
    }
  }

  static isReplyOf (formerAnnotation, replyAnnotation) {
    if (_.has(replyAnnotation, 'references')) {
      return !!_.find(replyAnnotation.references, (ref) => { return ref === formerAnnotation.id })
    } else {
      return false
    }
  }

  static parseAnnotations (annotations) {
    const criterionTag = Config.namespace + ':' + Config.tags.grouped.relation + ':'
    const levelTag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':'
    let r = new Review()

    for (let a in annotations) {
      if (annotations.hasOwnProperty(a)) {
        let criterion = null
        let level = null
        for (let t in annotations[a].tags) {
          if (annotations[a].tags.hasOwnProperty(t)) {
            if (annotations[a].tags[t].indexOf(criterionTag) !== -1) criterion = annotations[a].tags[t].replace(criterionTag, '').trim()
            if (annotations[a].tags[t].indexOf(levelTag) !== -1) level = annotations[a].tags[t].replace(levelTag, '').trim()
          }
        }
        // if (criterion == null || level == null) continue
        let textQuoteSelector = null
        let highlightText = ''
        let pageNumber = null

        for (let k in annotations[a].target) {
          if (annotations[a].target.hasOwnProperty(k)) {
            if (annotations[a].target[k].selector.find((e) => { return e.type === 'TextQuoteSelector' }) != null) {
              textQuoteSelector = annotations[a].target[k].selector.find((e) => { return e.type === 'TextQuoteSelector' })
              highlightText = textQuoteSelector.exact
            }
            if (annotations[a].target[k].selector.find((e) => { return e.type === 'FragmentSelector' }) != null) {
              pageNumber = annotations[a].target[k].selector.find((e) => { return e.type === 'FragmentSelector' }).page
            }
          }
        }
        let annotationText = annotations[a].text !== null && annotations[a].text !== '' ? JSON.parse(annotations[a].text) : {comment: '', suggestedLiterature: []}
        let comment = annotationText.comment !== null ? annotationText.comment : null
        let suggestedLiterature = annotationText.suggestedLiterature !== null ? annotationText.suggestedLiterature : []
        r.insertAnnotation(new Annotation(annotations[a].id, criterion, level, highlightText, pageNumber, comment, suggestedLiterature))
      }
    }
    return r
  }

  static areFromSameDocument (a, b) {
    // TODO Use also DOI to identify that they are the same document
    let equalFingerprint = false
    if (a.documentMetadata && a.documentMetadata.documentFingerprint && b.documentMetadata && b.documentMetadata.documentFingerprint) {
      equalFingerprint = a.documentMetadata.documentFingerprint === b.documentMetadata.documentFingerprint
    }
    return a.uri === b.uri || equalFingerprint
  }
}

module.exports = AnnotationUtils
