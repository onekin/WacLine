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
    // TODO Substitute by (tagId -> name) of the annotation
    const criterionTag = Config.namespace + ':' + Config.tags.grouped.group + ':'
    const levelTag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':'
    let r = new Review()

    for (let a in annotations) {
      if (annotations.hasOwnProperty(a)) {
        let criterion = null
        let annotation = annotations[a]
        annotation.tags.forEach((tag) => {
          if (tag.includes(levelTag)) {
            criterion = tag.replace(levelTag, '').trim()
          } else if (tag.includes(criterionTag)) {
            criterion = tag.replace(criterionTag, '').trim()
          }
        })
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
        let comment = annotations[a].text
        let suggestedLiterature = annotations[a].references || null // TODO When add reference feature is implemented
        let level = annotations[a].level || null // TODO When add level feature is implemented
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
