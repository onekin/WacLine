const _ = require('lodash')
const Classifying = require('./purposes/Classifying')
const Commenting = require('./purposes/Commenting')
const LanguageUtils = require('../utils/LanguageUtils')
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
      data.documentMetadata = data.document
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
    annotation.body = annotationObject.body.map((body) => {
      if (body.purpose === 'classifying') {
        // To remove the purpose from the annotation body
        let tempBody = JSON.parse(JSON.stringify(body))
        delete tempBody.purpose
        // Create new element of type Classifying
        return new Classifying({code: tempBody.value})
      } else if (body.purpose === 'commenting') {
        return new Commenting({value: body.value})
      }
    })
    return annotation
  }
}

module.exports = Annotation
