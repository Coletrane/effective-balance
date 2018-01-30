const express = require("express")
const request = require("request-promise")
const readline = require("readline")
const fs = require("fs")
const google = require("googleapis")
const OAuth2 = google.auth.OAuth2
const tokenManager = require('./token-manager')
require("dotenv").config()


// Set up authentication client
const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

// Initializee the token
const creds = process.env.CREDENTIALS
if (creds) {
  oauth2Client.credentials = creds
} else {
  tokenManager.initToken()
}

const sunTrustQuery = "from:alertnotification@suntrust.com"
// TODO: start an event loop

const gmail = google.gmail({
  auth: oauth2Client,
  version: "v1"
})

let messages = []
gmail.users.messages.list({
  "userId": "me",
  "q": sunTrustQuery
}, (err, res) => {
  if (!err) {
    console.log(res.data.messages.length)
    res.data.messages.forEach(message => {
      gmail.users.messages.get({
        "userId": "me",
        "id": message.id
      }, (err, res) => {
        if (!err) {
          messages.push(res.data)
        }
      })
    })
    scrapeMessages()
  }
})

const scrapeMessages = () => {
  console.log(messages[0].payload.headers)
  messages.sort((a, b) => {
    return new Date(a.headers.date) - new Date(b.headers.date)
  })
}

// const app = express()
//
// const port = process.env.PORT || 3000
// app.listen(port, () => {
//   console.log(`Effective Balance listening on port ${port}`)
// })

module.exports = {
  oauth2Client
}
