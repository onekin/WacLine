import ChromeStorage from './utils/ChromeStorage'
import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import _ from 'lodash'
const selectedGroupNamespace = 'hypothesis.currentGroup'

console.log('Loaded hypothesis group content script')

window.addEventListener('load', () => {
  // Retrieve last saved group
  ChromeStorage.getData(selectedGroupNamespace, ChromeStorage.local, (err, savedCurrentGroup) => {
    if (err) {
      console.error('Error while retrieving default group')
    } else {
      // Parse chrome storage result
      if (!_.isEmpty(savedCurrentGroup) && savedCurrentGroup.data) {
        // Nothing to change
      } else {
        // Set hypothes.is web page group as current group
        window.abwa = {}
        window.abwa.annotationServerManager = new HypothesisClientManager()
        window.abwa.annotationServerManager.init(() => {
          window.abwa.annotationServerManager.client.getUserProfile((err, userProfile) => {
            if (err) {
              console.error('Error while retrieving user profile in hypothesis')
            } else {
              const urlSplit = window.location.href.split('/')
              const indexOfGroups = _.indexOf(urlSplit, 'groups')
              if (urlSplit[indexOfGroups + 1]) {
                const groupId = urlSplit[indexOfGroups + 1]
                // Set current group
                const group = _.find(userProfile.groups, (group) => { return group.id === groupId })
                if (group) {
                  // Save to chrome storage current group
                  ChromeStorage.setData(selectedGroupNamespace, { data: JSON.stringify(group) }, ChromeStorage.local, () => {
                    console.log('Set as group: ' + group.name)
                  })
                }
              }
            }
          })
        })
      }
    }
  })
})
