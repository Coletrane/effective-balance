const readline = require("readline")
const fs = require("fs")
const oauth2Client = require("./server").oauth2Client

const tokenFile = ".token"

// Check if we have a stored token
const initToken = () => {
  fs.readFile(tokenFile, (err, token) => {
    if (err) {
      getToken()
    } else {
      oauth2Client.credentials = JSON.parse(token)
    }
  })

// Get auth token
  const requestToken = () => {
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: "https://www.googleapis.com/auth/gmail.readonly"
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

  const storeToken = (token) => {
    fs.writeFile(tokenFile, JSON.stringify(token), (err) => {
      if (!err) {
        console.log(`Token stored to ${tokenFile}`)
      }
    })
  }
}

module.exports = {
  initToken
}

