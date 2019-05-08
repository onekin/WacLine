const selectedGroupNamespace = 'hypothesis.currentGroup'
const ChromeStorage = require('./utils/ChromeStorage')
const HypothesisClientManager = require('./hypothesis/HypothesisClientManager')
const _ = require('lodash')

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
        window.abwa.hypothesisClientManager = new HypothesisClientManager()
        window.abwa.hypothesisClientManager.init(() => {
          window.abwa.hypothesisClientManager.hypothesisClient.getUserProfile((err, userProfile) => {
            if (err) {
              console.error('Error while retrieving user profile in hypothesis')
            } else {
              let urlSplit = window.location.href.split('/')
              let indexOfGroups = _.indexOf(urlSplit, 'groups')
              if (urlSplit[indexOfGroups + 1]) {
                let groupId = urlSplit[indexOfGroups + 1]
                // Set current group
                let group = _.find(userProfile.groups, (group) => { return group.id === groupId })
                if (group) {
                  // Save to chrome storage current group
                  ChromeStorage.setData(selectedGroupNamespace, {data: JSON.stringify(group)}, ChromeStorage.local, () => {
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
