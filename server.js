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
app.post('/api/exercise/new-user', (req, res) => {
  const { username } = req.body
  const usernameTest = RegExp('^[a-z0-9]{5,}$','i')
  
  if (!usernameTest.test(username))
    return res.json({"error":"username must be 5 characters or longer and not contain any special characters"})
  new Person({
    username
  }).save((err, person) => {
    if (err) return res.json({"error":"server error"})
    return res.json({"username": person.username, "_id": person._id})
  })
})

// RETRIEVE ALL USERS ROUTE
app.get('/api/exercise/users', (req, res) => {
  Person.find({}).select('_id username').exec((err, people) => {
    if (err) return res.json({"error":"server error"})
    return res.json(people)
  })
})

// CREATE EXERCISE ROUTE
app.post('/api/exercise/add', (req, res) => {
  const { userId, description, duration } = req.body
  const date = new Date(req.body.date)
  
  if (userId.length != 24)
    return res.json({"error":"invalid userId"})
  
  if (!RegExp('^[a-z0-9]{1,}$', 'i').test(description))
    return res.json({"error":"invalid description"})
    
  if (!RegExp('^[0-9]{1,}').test(duration))
    return res.json({"error":"invalid duration"})
  
  Person.findById(userId, (err, person) => {
    
    if (err) return res.json({"error":"user not found"})
    
    if (!person) return res.json({"error":"user not found"})

    new Exercise ({
      userId,
      description,
      duration,
      date: date != 'Invalid Date' ? new Date(date) : new Date()
    }).save((err, exercise) => {
      if (err) return res.json({"error":"server error"})
      
      const { username, description, duration, _id, date } = exercise
      return res.json({
        username: person.username, 
        description, 
        duration, 
        _id, 
        date: formatDate(date)
      })
    })
  })
})

// RETRIEVE USER EXERCISE LOG ROUTE
app.get('/api/exercise/log', (req, res) => {
  const { userId, limit } = req.query
  const to = new Date(req.query.to)
  const from = new Date(req.query.from)
  
  if (userId.length != 24)
    return res.json({"error":"invalid userId"})
  
  
  Person.findById(userId).exec((err, person) => {
    const { _id, username } = person
    if (err) return res.json({"error":"user not found"})
    if (!person) return res.json({"error":"user not found"})
  
    const query = {
      userId: person._id,
      date: {
        $gte: from != 'Invalid Date' ? new Date(from) : 0,
        $lte: to != 'Invalid Date' ? to : new Date()
      }
    }
            
    Exercise
      .find(query)
      .limit(parseInt(limit))
      .sort('-date')
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