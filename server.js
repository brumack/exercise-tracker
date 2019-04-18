const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')



// --------------------------------------------------------

const mongoose = require('mongoose')
const { Schema } = mongoose
const { ObjectId } = Schema

mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

const personSchema = new Schema({
  username: String,
})

const exerciseSchema = new Schema({
  userId: ObjectId,
  description: String,
  duration: Number,
  date: {
    type: Date,
    default: new Date()
  }
})

const Person = mongoose.model('Person', personSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// --------------------------------------------------------




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
  const { username } = req.body
  new Person({
    username
  }).save((err, person) => {
    if (err) return res.json({"error":"server error"})
    return res.json({"username": person.username, "_id": person._id})
  })
})

// RETRIEVE ALL USERS ROUTE
// [{"username":"asdfasfdasdf","_id":"Hk3sD7UqE"}, {"username":"asdfasfdasdf","_id":"Hk3sD7UqE"}]
app.get('/api/exercise/users', (req, res) => {
  Person.find({}).select('_id username').exec((err, people) => {
    if (err) return res.json({"error":"server error"})
    return res.json(people)
  })
})

// CREATE EXERCISE ROUTE
// userId, description, duration, date || current date
// {"username":"phpeter","description":"blah","duration":12,"_id":"H12FHSBFg","date":"Fri Aug 09 2019"}
app.post('/api/exercise/add', (req, res) => {
  const { userId, description, duration, date } = req.body
  
  Person.findById(userId, (err, person) => {
    if (err) return res.json({"error":"server error"})
    if (!person) return res.json({"error":"user not found"})

    new Exercise ({
      userId,
      description,
      duration,
      date: isNaN(new Date(date)) ? new Date() : new Date(date)
    }).save((err, exercise) => {
      if (err) return res.json({"error":"server error"})
      const { username, description, duration, _id, date } = exercise
      return res.json({username: person.username, description, duration, _id, date: formatDate(date)})
    })
  })
})

// 5cb8c17e0765b11b71bb366e

// RETRIEVE USER EXERCISE LOG ROUTE
// userId, from & too?, limit?
// {"_id":"H12FHSBFg","username":"phpeter","count":2,
//  "log":[{"description":"test thing","duration":23,"date":"Thu Feb 16 2017"},
//  {"description":"blah","duration":12,"date":"Sat Aug 11 2012"}]}

app.get('/api/exercise/log', (req, res) => {
  const { userId, limit, from, to } = req.query
  
  
  Person.findById(userId).exec((err, person) => {
    const { _id, username } = person
    if (err) return res.json({"error":"server error"})
    if (!person) return res.json({"error":"user not found"})
    
    const options = {}
    
    if (limit) {
      options.limit = limit
    }
    
    if (to && !isNaN(new Date(to))) {
      options. = {$gt: new Date(to)}
    }
    
    const query = {
      userId: person._id
    }
    
    if (to && !isNaN(new Date(to))) {
      query.date = {$gt: new Date(to)}
    }
    
//     if (from && !isNaN(new Date(from))) {
//       query.date = {$gt: new Date(from)}
//     }
    
    if (limit) {
      query.limit = limit
    }
    
    console.log(query)
    
    Exercise
      .find(query)
      .exec((err, exercises) => {
        if (err) return res.json({"error":err})
        const log = exercises.map(exercise => {
          return {
            description: exercise.description,
            duration: exercise.duration,
            date: formatDate(exercise.date)
          }
        })
        person.count = exercises.length
        return res.json({_id, username, count: log.length, log})
      })
  })
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


function formatDate(date) {
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'}
  return date.toLocaleDateString('en-US', options)
}