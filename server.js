const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// CREATE USER ROUTE
// username
// {"username":"asdfasfdasdf","_id":"Hk3sD7UqE"}
app.post('/api/exercise/new-user', (req, res) => {
})

// RETRIEVE ALL USERS ROUTE
// [{"username":"asdfasfdasdf","_id":"Hk3sD7UqE"}, {"username":"asdfasfdasdf","_id":"Hk3sD7UqE"}]
app.get('api/exercise/users', (req, res) => {
})

// CREATE EXERCISE ROUTE
// userId, description, duration, date || current date
// {"username":"phpeter","description":"blah","duration":12,"_id":"H12FHSBFg","date":"Fri Aug 09 2019"}
app.post('/api/exercise/add', (req, res) => {
})

// RETRIEVE USER EXERCISE LOG ROUTE
// userId, from & too?, limit?
// {"_id":"H12FHSBFg","username":"phpeter","count":2,
//  "log":[{"description":"test thing","duration":23,"date":"Thu Feb 16 2017"},
//  {"description":"blah","duration":12,"date":"Sat Aug 11 2012"}]}
app.get('/api/exercise/log?userId=', (req, res) => {
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
