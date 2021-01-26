import Alerts from '../utils/Alerts'
import FileUtils from '../utils/FileUtils'
import Codebook from '../codebook/model/Codebook'
import _ from 'lodash'

class AnnotationImporter {
  static askUserToImportDocumentAnnotations (callback) {
    // Ask user to upload the file
    Alerts.inputTextAlert({
      title: 'Upload this document review annotations file',
      html: 'Here you can upload your json file with the annotations for this document.',
      input: 'file',
      callback: (err, file) => {
        if (err) {
          window.alert('An unexpected error happened when trying to load the alert.')
        } else {
          // Read json file
          FileUtils.readJSONFile(file, (err, jsonObject) => {
            if (err) {
              callback(new Error('Unable to read json file: ' + err.message))
            } else {
              callback(null, jsonObject)
            }
          })
        }
      }
    })
  }

  static importReviewAnnotations () {
    AnnotationImporter.askUserToImportDocumentAnnotations((err, jsonObject) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to parse json file. Error:<br/>' + err.message })
      } else {
        Alerts.inputTextAlert({
          alertType: Alerts.alertType.warning,
          title: 'Give a name to your imported annotations',
          text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
          inputPlaceholder: 'Type here the name of your review model...',
          inputValue: jsonObject.codebook.name,
          preConfirm: (groupName) => {
            if (_.isString(groupName)) {
              if (groupName.length <= 0) {
                const swal = require('sweetalert2').default
                swal.showValidationMessage('Name cannot be empty.')
              } else if (groupName.length > 25) {
                const swal = require('sweetalert2').default
                swal.showValidationMessage('The review model name cannot be higher than 25 characters.')
              } else {
                return groupName
              }
            }
          },
          callback: (err, reviewName) => {
            if (err) {
              window.alert('Unable to load alert. Unexpected error, please contact developer.')
            } else {
              window.abwa.annotationServerManager.client.createNewGroup({ name: reviewName }, (err, newGroup) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unable to create a new annotation group. Error: ' + err.message })
                } else {
                  // Create codebook
                  const tempCodebook = Codebook.fromObjects(jsonObject.codebook)
                  Codebook.setAnnotationServer(newGroup, (annotationServer) => {
                    tempCodebook.annotationServer = annotationServer
                    const annotations = tempCodebook.toAnnotations()
                    // Send create highlighter
                    window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create new group.' })
                      } else {
                        // Parse annotations and dispatch created codebook
                        Codebook.fromAnnotations(codebookAnnotations, (err, codebook) => {
                          if (err) {
                            Alerts.errorAlert({ text: 'Unable to create a codebook. Error: ' + err.message })
                          } else {
                            // Parse annotations codes to new code ids
                            jsonObject.documentAnnotations.forEach((annotation) => {
                              const classifyingBody = annotation.body.find(body => body.purpose === 'classifying')
                              if (classifyingBody) {
                                const code = classifyingBody.value
                                const codeName = code.name
                                let theme
                                // Get the theme which is annotation classified
                                // PVSCL:IFCOND(Hierarchy, LINE)
                                if (code.theme) {
                                  const themeName = code.theme.name
                                  theme = codebook.getThemeByName(themeName)
                                } else {
                                  theme = codebook.getThemeByName(codeName)
                                }
                                // PVSCL:ELSECOND
                                theme = codebook.getThemeByName(codeName)
                                // PVSCL:ENDCOND
                                let codeOrTheme
                                // PVSCL:IFCOND(Hierarchy, LINE)
                                if (code.theme) {
                                  codeOrTheme = theme.getCodeByName(codeName)
                                } else {
                                  codeOrTheme = theme
                                }
                                // PVSCL:ELSECOND
                                codeOrTheme = theme
                                // PVSCL:ENDCOND
                                // Update annotation value
                                if (codeOrTheme) {
                                  annotation.body[annotation.body.findIndex(body => body.purpose === 'classifying')].value = codeOrTheme.toObject()
                                }
                              }
                              // Set group to annotations
                              annotation.group = newGroup.id
                              // Set permissions to annotations
                              annotation.permissions = { read: ['group:' + newGroup.id] }
                            })
                            // Create annotations for each element
                            window.abwa.annotationServerManager.client.createNewAnnotations(jsonObject.documentAnnotations, (err, annotations) => {
                              if (err) {
                                Alerts.errorAlert({ text: 'Unable to import annotations. Error: ' + err.message })
                              } else {
                                window.abwa.groupSelector.retrieveGroups(() => {
                                  window.abwa.groupSelector.setCurrentGroup(newGroup.id, () => {
                                    window.abwa.sidebar.openSidebar()
                                    // Dispatch annotations updated
                                    Alerts.closeAlert()
                                  })
                                })
                              }
                            })
                          }
                        })
                      }
                    })
                  })
                }
              })
            }
          }
        })
      }
    })
  }
}

export default AnnotationImporter
