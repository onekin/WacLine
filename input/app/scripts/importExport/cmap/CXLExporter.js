const ExportCXLArchiveFile = require('./ExportCXLArchiveFile')
const HypothesisURL = require('./evidenceAnnotation/HypothesisURL')
const ToolURL = require('./evidenceAnnotation/ToolURL')

class CXLExporter {
  static exportCXLFile (exportType/* PVSCL:IFCOND(EvidenceAnnotations) */, evidenceAnnotations/* PVSCL:ENDCOND */) {
    // Get annotations from tag manager and content annotator
    let concepts = window.abwa.mapContentManager.concepts
    // PVSCL:IFCOND(Linking, LINE)
    let relationships = window.abwa.mapContentManager.relationships
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(EvidenceAnnotations)
    let urlFiles = []
    // PVSCL:ENDCOND
    let xmlDoc = document.implementation.createDocument(null, 'cmap', null)
    let cmapElement = xmlDoc.firstChild
    // Create processing instruction
    let pi = xmlDoc.createProcessingInstruction('xml', 'version=\'1.0\' encoding=\'UTF-8\'')
    xmlDoc.insertBefore(pi, xmlDoc.firstChild)

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
    title.textContent = window.abwa.groupSelector.currentGroup.name
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
      id.value = concept.theme.id
      conceptAppearance.setAttributeNode(id)
      conceptAppearanceList.appendChild(conceptAppearance)
      if (concept.evidenceAnnotations.length > 0) {
        for (let i = 0; i < concept.evidenceAnnotations.length; i++) {
          let annotation = concept.evidenceAnnotations[i]
          let name
          if (i === 0) {
            name = concept.theme.name
          } else {
            name = concept.theme.name + i
          }
          let url
          if (evidenceAnnotations === 'hypothesis') {
            url = new ToolURL({name, annotation})
          } else if (evidenceAnnotations === 'tool') {
            url = new ToolURL({name, annotation})
          }
          urlFiles.push(url)
        }
      }
      console.log(urlFiles)
    }
    // PVSCL:IFCOND(Linking, LINE)

    // Add linking phrase
    let connectionID = 1
    for (let i = 0; i < relationships.length; i++) {
      // Linking phrase
      let relation = relationships[i]
      let linkingElement = xmlDoc.createElement('linking-phrase')
      let id = document.createAttribute('id')
      id.value = relation.id
      linkingElement.setAttributeNode(id)
      let label = document.createAttribute('label')
      label.value = relation.linkingWord
      linkingElement.setAttributeNode(label)
      linkingPhraseList.appendChild(linkingElement)
      let linkingAppearance = xmlDoc.createElement('linking-phrase-appearance')
      id = document.createAttribute('id')
      id.value = relation.id
      linkingAppearance.setAttributeNode(id)
      linkingAppearanceList.appendChild(linkingAppearance)
      if (relation.evidenceAnnotations.length > 0) {
        for (let i = 0; i < relation.evidenceAnnotations.length; i++) {
          let annotation = relation.evidenceAnnotations[i]
          let name
          if (i === 0) {
            name = relation.fromConcept.name + 'To' + relation.toConcept.name
          } else {
            name = relation.fromConcept.name + 'To' + relation.toConcept.name + i
          }
          let url
          if (evidenceAnnotations === 'hypothesis') {
            url = new HypothesisURL({name, annotation})
          } else if (evidenceAnnotations === 'tool') {
            url = new ToolURL({name, annotation})
          }
          urlFiles.push(url)
        }
      }
      console.log(urlFiles)

      // Connection
      // From
      let connectionElement = xmlDoc.createElement('connection')
      id = document.createAttribute('id')
      id.value = connectionID.toString()
      connectionElement.setAttributeNode(id)
      let fromID = document.createAttribute('from-id')
      fromID.value = relation.fromConcept.id
      connectionElement.setAttributeNode(fromID)
      let toID = document.createAttribute('to-id')
      toID.value = relation.id
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

      // To
      connectionElement = xmlDoc.createElement('connection')
      id = document.createAttribute('id')
      id.value = connectionID.toString()
      connectionElement.setAttributeNode(id)
      fromID = document.createAttribute('from-id')
      fromID.value = relation.id
      connectionElement.setAttributeNode(fromID)
      toID = document.createAttribute('to-id')
      toID.value = relation.toConcept.id
      connectionElement.setAttributeNode(toID)
      connectionList.appendChild(connectionElement)
      connectionAppearanceElement = xmlDoc.createElement('connection-appearance')
      id = document.createAttribute('id')
      id.value = connectionID.toString()
      connectionAppearanceElement.setAttributeNode(id)
      fromPos = document.createAttribute('from-pos')
      fromPos.value = 'center'
      connectionAppearanceElement.setAttributeNode(fromPos)
      toPos = document.createAttribute('to-pos')
      toPos.value = 'center'
      connectionAppearanceElement.setAttributeNode(toPos)
      arrow = document.createAttribute('arrowhead')
      arrow.value = 'yes'
      connectionAppearanceElement.setAttributeNode(arrow)
      connectionAppearanceList.appendChild(connectionAppearanceElement)
      connectionID++
    }
    // PVSCL:ENDCOND
    let stringifyObject = new XMLSerializer().serializeToString(xmlDoc)

    if (exportType === 'archiveFile') {
      ExportCXLArchiveFile.export(stringifyObject, urlFiles)
    } else if (exportType === 'cmapCloud') {
      console.log('Export to Cmap cloud')
    }
    // let uid = '1cf684dc-1764-4e5b-8122-7235ca19c37a'
    // let user = 'highlight01x@gmail.com'
    // let pass = 'producto1'
    // let auth = token(user, pass)
    // => aGlnaGxpZ2h0MDF4QGdtYWlsLmNvbTpwcm9kdWN0bzE="
    // console.log(auth)
  }
}

module.exports = CXLExporter
