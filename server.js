const express = require('express')
const request = require('request-promise')
const readline = require('readline')
const fs = require('fs')
const google = require('googleapis')
const OAuth2 = google.auth.OAuth2
require('dotenv').config()

const tokenFile = '.token'

// Set up readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Set up authentication client
const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

// Check if we have a stored token
fs.readFile(tokenFile, (err, token) => {
  if (err) {
    getToken()
  } else {
    oauth2Client.credentials = JSON.parse(token)
    main()
  }
})

// Get auth token
const getToken = () => {

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: "https://www.googleapis.com/auth/gmail.readonly"
  })
  console.log(`Authorize at:\n ${url}`)

  rl.question('Enter the code from that page here: ', (code) => {
    rl.close()
    oauth2Client.getToken(code, async (err, token) => {
      if (!err) {
        oauth2Client.credentials = await token
        storeToken(token)
        main()
      }
    })
  })
}

const storeToken = (token) => {
  try {
    fs.mkdirSync(tokenFile)
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(tokenFile, JSON.stringify(token), (err) => {
    if (!err) {
      console.log(`Token stored to ${tokenFile}`)
    }
  })
}

const main = () => {
  const sunTrustQuery = 'from:alertnotification@suntrust.com'
  // TODO: start an event loop

  const gmail = google.gmail({
    auth: oauth2Client,
    version: 'v1'
  })

  const me = {'userId': 'me'}
  let messages = []

  gmail.users.messages.list({
    'userId': 'me',
    'q': sunTrustQuery
  }, (err, res) => {
    if (!err) {
      console.log(res.data.messages.length)
      res.data.messages.forEach(message => {
        gmail.users.messages.get({
          'userId': 'me',
          'id': message.id
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

}

// const app = express()
//
// const port = process.env.PORT || 3000
// app.listen(port, () => {
//   console.log(`Effective Balance listening on port ${port}`)
// })
