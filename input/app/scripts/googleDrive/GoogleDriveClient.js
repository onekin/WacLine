import axios from 'axios'
import _ from 'lodash'
import qs from 'qs'

class GoogleDriveClient {
  constructor (token) {
    if (token) {
      this.token = token
    }
    this.baseURI = 'https://content.googleapis.com/drive/v3'
  }

  copyFile ({ originFileId, data }, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: this.baseURI + '/files/' + originFileId + '/copy',
      data: JSON.stringify(data),
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      callback(null, response.data)
    }).catch((err) => {
      callback(err)
    })
  }

  listFiles (data, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: this.baseURI + '/files/',
      params: data,
      paramsSerializer: params => {
        return qs.stringify(params)
      },
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      callback(null, response.data.files || [])
    }).catch((err) => {
      callback(err)
    })
  }

  updateFile (fileId, data, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: this.baseURI + '/files/' + fileId,
      data: JSON.stringify(data),
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      callback(null, response.data)
    }).catch((err) => {
      callback(err)
    })
  }

  trashFile (fileId, callback) {
    const settings = {
      async: true,
      crossDomain: true,
      url: this.baseURI + '/files/' + fileId,
      data: JSON.stringify({
        trashed: true
      }),
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    }
    axios(settings).then((response) => {
      callback(null, response.data)
    }).catch((err) => {
      callback(err)
    })
  }
}

export default GoogleDriveClient
