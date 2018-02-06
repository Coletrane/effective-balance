const express = require("express")
const request = require("request-promise")
const readline = require("readline")
const fs = require("fs")
const google = require("googleapis")
const OAuth2 = google.auth.OAuth2
const util = require("util")
require("dotenv").config()

const readFile = util.promisify(fs.readFile)

const tokenFile = ".token"

// Set up authentication client
const oauth2Client = new OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

// Check if we have a stored token
const getToken = async () => {
  console.log("Authenticating with Google...")
  return await readFile(tokenFile, "utf-8").then(async (tokens) => {
    if (!tokens) {
      console.log(".token file not found, requesting new from Google")
      return await requestToken()
    } else {
      console.log(".token file found!")
      return await oauth2Client.setCredentials(JSON.parse(tokens))
    }
  })
}

// Get auth token
const requestToken = () => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: "https://www.googleapis.com/auth/gmail.readonly"
  })
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  console.log(`Authorize at:\n ${url}`)

  rl.question("Enter the code from that page here: ", (code) => {
    rl.close()
    oauth2Client.getToken(code, (err, token) => {
      if (!err) {
        oauth2Client.credentials = token
        storeToken(token)
      }
    })
  })
}

// Store auth token in .token file
const storeToken = (token) => {
  fs.writeFile(tokenFile, JSON.stringify(token), (err) => {
    if (!err) {
      console.log(`Token stored to ${tokenFile}`)
    }
  })
}

const gmail = google.gmail({
  auth: oauth2Client,
  version: "v1"
})
// Promisify stuff because Google is stubborn
const listGmails = util.promisify(gmail.users.messages.list)
const getGmails = util.promisify(gmail.users.messages.get)

const getSuntrustEmails = async () => {
  console.log("Getting SunTrust emails...")
  const sunTrustQuery =
    "from:alertnotification@suntrust.com " +
    "newer_than:2d" // TODO: figure out the timing on this
  // TODO: start an event loop

  let messages = []
  return await listGmails({
    "userId": "me",
    "q": sunTrustQuery
  }, async (err, res) => {
    if (err) {
      console.log(err)
    } else {
      messages = await new Array(res.data.messages.length)
      res.data.messages.forEach(async (message, i, arr) => {
        await getGmails({
          "userId": "me",
          "id": message.id
        }, async (err, res) => {
          if (err) {
            console.log(err)
          } else {
            await messages.push(res.data)
            if (i === arr.length - 1) {
              console.log(messages)
              return messages
            }
          }
        })
      })
    }
  })
  console.log(messages)
  return messages
}

const getCitiEmails = () => {
  console.log("Getting Citi emails...")
  const citiQuery =
    "from:citicards@info6.citi.com " +
    "newer_than:2d"

  let messages = []
  gmail.users.messages.list({
    "userId": "me",
    "q": citiQuery
  }, (err, res) => {
    if (err) {
      console.log(err)
    } else {
      res.data.messages.forEach(message => {
        gmail.users.messages.get({
          "userId": "me",
          "id": message.id
        }, (err, res) => {
          if (err) {
            console.log(err)
          } else {
            messages.push(res.data)
          }
        })
      })
    }
  })
}

const scrapeMessages = (messages) => {
  console.log(messages.length)
  messages.sort((a, b) => {
    return new Date(a.headers.date) - new Date(b.headers.date)
  })
}

const main = async () => {
  await getToken()
  const sunTrustEmails = await getSuntrustEmails()
  console.log(sunTrustEmails)
  // const citiEmails = await getCitiEmails()
}
main()
// const app = express()
//
// const port = process.env.PORT || 3000
// app.listen(port, () => {
//   console.log(`Effective Balance listening on port ${port}`)
// })


