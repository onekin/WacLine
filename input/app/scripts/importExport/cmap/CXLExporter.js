import ExportCXLArchiveFile from './ExportCXLArchiveFile'
import ExportCmapCloud from './cmapCloud/ExportCmapCloud'
import HypothesisURL from './evidenceAnnotation/HypothesisURL'
import ToolURL from './evidenceAnnotation/ToolURL'
import LanguageUtils from '../../utils/LanguageUtils'
import _ from 'lodash'

export class LinkingPhrase {
  constructor (linkingWord, id) {
    // code
    this.linkingWord = linkingWord
    this.id = id
    this.fromConcepts = []
    this.toConcepts = []
    this.evidenceAnnotations = []
  }
}

export class CXLExporter {

  static exportCXLFile (exportType/* PVSCL:IFCOND(EvidenceAnnotations) */, evidenceAnnotations/* PVSCL:ENDCOND *//* PVSCL:IFCOND(EvidenceAnnotations) */, userData/* PVSCL:ENDCOND */) {
    // Get annotations from tag manager and content annotator
    let concepts = window.abwa.mapContentManager.concepts
    // PVSCL:IFCOND(Linking, LINE)
    let relationships = window.abwa.mapContentManager.relationships
    // Prepare linking phrases for doing conections
    let linkingPhrases = []
    for (let i = 0; i < relationships.length; i++) {
      let relation = relationships[i]
      let linkingPhrase = this.findLinkingPhrase(linkingPhrases, relation)
      if (linkingPhrase) {
        if (!linkingPhrase.fromConcepts.includes(relation.fromConcept.id)) {
          linkingPhrase.fromConcepts.push(relation.fromConcept.id)
        }
        if (!linkingPhrase.toConcepts.includes(relation.toConcept.id)) {
          linkingPhrase.toConcepts.push(relation.toConcept.id)
        }
        linkingPhrase.evidenceAnnotations = linkingPhrase.evidenceAnnotations.concat(relation.evidenceAnnotations)
      } else {
        let linkingPhraseToAdd = new LinkingPhrase(relation.linkingWord, relation.id)
        linkingPhraseToAdd.fromConcepts.push(relation.fromConcept.id)
        linkingPhraseToAdd.toConcepts.push(relation.toConcept.id)
        linkingPhraseToAdd.evidenceAnnotations = linkingPhraseToAdd.evidenceAnnotations.concat(relation.evidenceAnnotations)
        linkingPhrases.push(linkingPhraseToAdd)
      }
    }

    // PVSCL:ENDCOND
    // PVSCL:IFCOND(EvidenceAnnotations, LINE)
    let urlFiles = []
    // PVSCL:ENDCOND
    let xmlDoc = document.implementation.createDocument(null, 'cmap', null)
    let cmapElement = xmlDoc.firstChild
    // Create processing instruction
    // let pi = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"')
    // xmlDoc.insertBefore(pi, xmlDoc.firstChild)

    // Create map xmlns:dcterms attribute
    let att = document.createAttribute('xmlns:dcterms')
    att.value = 'http://purl.org/dc/terms/'
    cmapElement.setAttributeNode(att)

    // Create map xmlns attribute
    let att1 = document.createAttribute('xmlns')
    att1.value = 'http://cmap.ihmc.us/xml/cmap/'
    cmapElement.setAttributeNode(att1)

    // Create map xmlns:dc attribute
    let att2 = document.createAttribute('xmlns:dc')
    att2.value = 'http://purl.org/dc/elements/1.1/'
    cmapElement.setAttributeNode(att2)

    // Create map xmlns:vcard attribute
    let att3 = document.createAttribute('xmlns:vcard')
    att3.value = 'http://www.w3.org/2001/vcard-rdf/3.0#'
    cmapElement.setAttributeNode(att3)

    // Create metadata
    let metadata = xmlDoc.createElement('res-meta')
    cmapElement.appendChild(metadata)

    // Set title
    let title = xmlDoc.createElement('dc:title')
    title.textContent = LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name)
    metadata.appendChild(title)

    // Set description
    let description = xmlDoc.createElement('dc:description')
    description.textContent = window.abwa.groupSelector.currentGroup.name
    metadata.appendChild(description)

    // Create map
    let map = xmlDoc.createElement('map')
    cmapElement.appendChild(map)

    // Concept list
    let conceptList = xmlDoc.createElement('concept-list')
    map.appendChild(conceptList)
    // PVSCL:IFCOND(Linking, LINE)

    // linking phrase list
    let linkingPhraseList = xmlDoc.createElement('linking-phrase-list')
    map.appendChild(linkingPhraseList)

    // connection list
    let connectionList = xmlDoc.createElement('connection-list')
    map.appendChild(connectionList)
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(EvidenceAnnotations and CXLExportCmapCloud, LINE)
    // resource-group-list
    let resourceGroupList = xmlDoc.createElement('resource-group-list')
    map.appendChild(resourceGroupList)
    // PVSCL:ENDCOND
    // concept appearance list
    let conceptAppearanceList = xmlDoc.createElement('concept-appearance-list')
    map.appendChild(conceptAppearanceList)
    // PVSCL:IFCOND(Linking, LINE)

    // linking appearance list
    let linkingAppearanceList = xmlDoc.createElement('linking-phrase-appearance-list')
    map.appendChild(linkingAppearanceList)

    // connection appearance list
    let connectionAppearanceList = xmlDoc.createElement('connection-appearance-list')
    map.appendChild(connectionAppearanceList)
    // PVSCL:ENDCOND
    // styleSheetList
    let styleSheetList = xmlDoc.createElement('style-sheet-list')

    let styleSheetDefault = xmlDoc.createElement('style-sheet')
    let styleSheetIdDefault = document.createAttribute('id')
    styleSheetIdDefault.value = '_Default_'
    styleSheetDefault.setAttributeNode(styleSheetIdDefault)

    let mapStyle = xmlDoc.createElement('map-style')
    let mapStyleBackgroundColor = document.createAttribute('background-color')
    mapStyleBackgroundColor.value = '255,255,255,255'
    mapStyle.setAttributeNode(mapStyleBackgroundColor)
    styleSheetDefault.appendChild(mapStyle)

    let styleSheetLatest = xmlDoc.createElement('style-sheet')
    let styleSheetIdLatest = document.createAttribute('id')
    styleSheetIdLatest.value = '_LatestChanges_'
    styleSheetLatest.setAttributeNode(styleSheetIdLatest)

    styleSheetList.appendChild(styleSheetDefault)
    styleSheetList.appendChild(styleSheetLatest)
    map.appendChild(styleSheetList)
    // Add concepts
    for (let i = 0; i < concepts.length; i++) {
      let concept = concepts[i]
      let conceptElement = xmlDoc.createElement('concept')
      let id = document.createAttribute('id')
      id.value = concept.theme.id
      conceptElement.setAttributeNode(id)
      let label = document.createAttribute('label')
      label.value = concept.theme.name
      conceptElement.setAttributeNode(label)
      conceptList.appendChild(conceptElement)
      let conceptAppearance = xmlDoc.createElement('concept-appearance')
      id = document.createAttribute('id')
      let elementID = concept.theme.id
      id.value = elementID
      conceptAppearance.setAttributeNode(id)
      conceptAppearanceList.appendChild(conceptAppearance)
      if (concept.evidenceAnnotations.length > 0) {
        for (let i = 0; i < concept.evidenceAnnotations.length; i++) {
          let annotation = concept.evidenceAnnotations[i]
          let name
          if (i === 0) {
            name = LanguageUtils.camelize(concept.theme.name)
          } else {
            name = LanguageUtils.camelize(concept.theme.name + i)
          }
          let url
          if (evidenceAnnotations === 'hypothesis') {
            url = new HypothesisURL({ elementID, name, annotation })
          } else if (evidenceAnnotations === 'tool') {
            url = new ToolURL({ elementID, name, annotation })
          }
          urlFiles.push(url)
        }
      }
    }
    // PVSCL:IFCOND(Linking, LINE)

    // Add linking phrase
    let connectionID = 1
    for (let i = 0; i < linkingPhrases.length; i++) {
      // Linking phrase
      let linkingPhrase = linkingPhrases[i]
      let linkingElement = xmlDoc.createElement('linking-phrase')
      let id = document.createAttribute('id')
      let elementID = linkingPhrase.id
      id.value = elementID
      linkingElement.setAttributeNode(id)
      let label = document.createAttribute('label')
      label.value = linkingPhrase.linkingWord
      linkingElement.setAttributeNode(label)
      linkingPhraseList.appendChild(linkingElement)
      let linkingAppearance = xmlDoc.createElement('linking-phrase-appearance')
      id = document.createAttribute('id')
      id.value = linkingPhrase.id
      linkingAppearance.setAttributeNode(id)
      linkingAppearanceList.appendChild(linkingAppearance)
      if (linkingPhrase.evidenceAnnotations.length > 0) {
        for (let j = 0; j < linkingPhrase.evidenceAnnotations.length; j++) {
          let annotation = linkingPhrase.evidenceAnnotations[j]
          if (annotation.target) {
            if (annotation.target.length > 0) {
              let name
              let fromName = annotation.tags[0].replace('from:', '')
              let toName = annotation.tags[2].replace('to:', '')
              if (i === 0) {
                name = LanguageUtils.camelize(fromName) + '_To_' + LanguageUtils.camelize(toName)
              } else {
                name = LanguageUtils.camelize(fromName) + '_To_' + LanguageUtils.camelize(toName + i)
              }
              let url
              if (evidenceAnnotations === 'hypothesis') {
                url = new HypothesisURL({ elementID, name, annotation })
              } else if (evidenceAnnotations === 'tool') {
                url = new ToolURL({ elementID, name, annotation })
              }
              urlFiles.push(url)
            }
          }
        }
      }
      // Connection
      // From
      for (let i = 0; i < linkingPhrase.fromConcepts.length; i++) {
        let fromConceptID = linkingPhrase.fromConcepts[i]
        let connectionElement = xmlDoc.createElement('connection')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionElement.setAttributeNode(id)
        let fromID = document.createAttribute('from-id')
        fromID.value = fromConceptID
        connectionElement.setAttributeNode(fromID)
        let toID = document.createAttribute('to-id')
        toID.value = linkingPhrase.id
        connectionElement.setAttributeNode(toID)
        connectionList.appendChild(connectionElement)
        let connectionAppearanceElement = xmlDoc.createElement('connection-appearance')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionAppearanceElement.setAttributeNode(id)
        let fromPos = document.createAttribute('from-pos')
        fromPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(fromPos)
        let toPos = document.createAttribute('to-pos')
        toPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(toPos)
        let arrow = document.createAttribute('arrowhead')
        arrow.value = 'yes'
        connectionAppearanceElement.setAttributeNode(arrow)
        connectionAppearanceList.appendChild(connectionAppearanceElement)
        connectionID++
      }

      for (let i = 0; i < linkingPhrase.toConcepts.length; i++) {
        let toConceptID = linkingPhrase.toConcepts[i]
        let connectionElement = xmlDoc.createElement('connection')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionElement.setAttributeNode(id)
        let fromID = document.createAttribute('from-id')
        fromID.value = linkingPhrase.id
        connectionElement.setAttributeNode(fromID)
        let toID = document.createAttribute('to-id')
        toID.value = toConceptID
        connectionElement.setAttributeNode(toID)
        connectionList.appendChild(connectionElement)
        let connectionAppearanceElement = xmlDoc.createElement('connection-appearance')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionAppearanceElement.setAttributeNode(id)
        let fromPos = document.createAttribute('from-pos')
        fromPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(fromPos)
        let toPos = document.createAttribute('to-pos')
        toPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(toPos)
        let arrow = document.createAttribute('arrowhead')
        arrow.value = 'yes'
        connectionAppearanceElement.setAttributeNode(arrow)
        connectionAppearanceList.appendChild(connectionAppearanceElement)
        connectionID++
      }
    }
    // PVSCL:ENDCOND

    // Create cmap-parts-list
    let cmapPartsList = xmlDoc.createElement('cmap-parts-list')
    // Annotations
    let annotation = xmlDoc.createElement('annotations')
    let annotationXmlns = document.createAttribute('xmlns')
    annotationXmlns.value = 'http://cmap.ihmc.us/xml/cmap/'
    annotation.setAttributeNode(annotationXmlns)
    let annotationList = xmlDoc.createElement('annotation-list')
    annotation.appendChild(annotationList)
    let annotationAppearanceList = xmlDoc.createElement('annotation-appearance-list')
    annotation.appendChild(annotationAppearanceList)
    cmapPartsList.appendChild(annotation)
    cmapElement.appendChild(cmapPartsList)

    if (exportType === 'archiveFile') {
      ExportCXLArchiveFile.export(xmlDoc, urlFiles)
    } else if (exportType === 'cmapCloud') {
      ExportCmapCloud.export(xmlDoc, urlFiles, userData)
    }
  }

  static findLinkingPhrase (linkingPhrases, relation) {
    let foundLinkingPhrase = _.find(linkingPhrases, (linkingPhrase) => {
      return (linkingPhrase.linkingWord === relation.linkingWord) && (linkingPhrase.fromConcepts.includes(relation.fromConcept.id) || linkingPhrase.toConcepts.includes(relation.toConcept.id))
    })
    return foundLinkingPhrase
  }
}
