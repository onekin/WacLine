const _ = require('lodash')
const LanguageUtils = require('../utils/LanguageUtils')
// PVSCL:IFCOND(Classifying, LINE)
const Classifying = require('./purposes/Classifying')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Commenting, LINE)
const Commenting = require('./purposes/Commenting')
// PVSCL:ENDCOND
// PVSCL:IFCOND(SuggestedLiterature, LINE)
const SuggestingLiterature = require('./purposes/SuggestingLiterature')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Assessing, LINE)
const Assessing = require('./purposes/Assessing')
// PVSCL:ENDCOND
// PVSCL:IFCOND(Hypothesis,LINE)
const HypothesisClientManager = require('../annotationServer/hypothesis/HypothesisClientManager')
// PVSCL:ENDCOND

class Annotation {
  constructor ({
    id,
    body = [],
    references = [],
    group = window.abwa.groupSelector.currentGroup.id,
    permissions = {
      read: ['group:' + window.abwa.groupSelector.currentGroup.id]
    },
    target,
    tags = [],
    creator = window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
    created,
    modified
  }) {
    if (!_.isArray(target) || _.isEmpty(target[0])) {
      throw new Error('Annotation must have a non-empty target')
    }
    this.target = target
    this.id = id
    this.body = body
    this.references = references
    this.permissions = permissions
    this.tags = _.uniq(tags)
    this.creator = creator
    this.group = group
    let createdDate = Date.parse(created)
    if (_.isNumber(createdDate)) {
      this.created = new Date(created)
    }
    let modifiedDate = Date.parse(modified)
    if (_.isNumber(modifiedDate)) {
      this.modified = new Date(modified)
    }
  }

  getBodyForPurpose (purpose) {
    if (_.isString(purpose) && _.isArray(this.body)) {
      return this.body.find((body) => {
        if (body && body.purpose) {
          return body.purpose === purpose
        }
      })
    }
  }

  serialize () {
    let data = {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      group: this.group || window.abwa.groupSelector.currentGroup.id,
      creator: this.creator || window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
      document: {},
      body: this.body,
      permissions: this.permissions || {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: this.references || [],
      // PVSCL:IFCOND(SuggestedLiterature,LINE)
      suggestedLiterature: [],
      // PVSCL:ENDCOND
      tags: this.tags,
      target: this.target,
      text: '',
      uri: /* PVSCL:IFCOND(DOI) */ this.target[0].source.doi || /* PVSCL:ENDCOND */ this.target[0].source.url || this.target[0].source.urn
    }
    // PVSCL:IFCOND(Hypothesis, LINE)
    // As hypothes.is don't follow some attributes of W3C, we must adapt created annotation with its own attributes to set the target source
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
      // Add uri attribute
      data.uri = window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
      // Add document, uris, title, etc.
      let uris = window.abwa.targetManager.getDocumentURIs()
      data.document = {}
      if (uris.urn) {
        data.document.documentFingerprint = uris.urn
      }
      data.document.link = Object.values(uris).map(uri => { return {href: uri} })
      if (uris.doi) {
        data.document.dc = { identifier: [uris.doi] }
        data.document.highwire = { doi: [uris.doi] }
      }
      // If document title is retrieved
      if (_.isString(window.abwa.targetManager.documentTitle)) {
        data.document.title = window.abwa.targetManager.documentTitle
      }
      // Copy to metadata field because hypothes.is doesn't return from its API all the data that it is placed in document
      data.documentMetadata = this.target
    }
    // PVSCL:ENDCOND
    return data
  }

  static deserialize (annotationObject) {
    let annotation = new Annotation({
      id: annotationObject.id,
      group: annotationObject.group,
      creator: annotationObject.creator,
      permissions: annotationObject.permissions,
      references: annotationObject.references,
      tags: annotationObject.tags,
      target: annotationObject.target,
      created: annotationObject.created,
      modified: annotationObject.updated
    })
    if (_.isArray(annotation.body)) {
      annotation.body = annotationObject.body.map((body) => {
        // PVSCL:IFCOND(Classifying, LINE)
        if (body.purpose === Classifying.purpose) {
          // To remove the purpose from the annotation body
          let tempBody = JSON.parse(JSON.stringify(body))
          delete tempBody.purpose
          // Create new element of type Classifying
          return new Classifying({code: tempBody.value})
        }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(Commenting, LINE)
        if (body.purpose === Commenting.purpose) {
          return new Commenting({value: body.value})
        }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(SuggestedLiterature, LINE)
        if (body.purpose === SuggestingLiterature.purpose) {
          return new SuggestingLiterature({value: body.value})
        }
        // PVSCL:ENDCOND
        // PVSCL:IFCOND(Assessing, LINE)
        if (body.purpose === Assessing.purpose) {
          return new Assessing({value: body.value})
        }
        // PVSCL:ENDCOND
      })
    }
    // PVSCL:IFCOND(Hypothesis, LINE)
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
      annotation.target = annotationObject.documentMetadata || annotationObject.target
    }
    // PVSCL:ENDCOND
    return annotation
  }
}

module.exports = Annotation
