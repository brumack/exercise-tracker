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
  log: {
    type: Array,
    of: ObjectId
  }
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
      username: person.username,
      description,
      duration,
      date: isNaN(new Date(date)) ? new Date() : new Date(date)
    }).save((err, exercise) => {
      if (err) return res.json({"error":"server error"})
      const { username, description, duration, _id, date } = exercise
      
      Person.findByIdAndUpdate(userId, {$push: {log: exercise}}, {new: true}, (err, updatedPerson) => {
        if (err) return res.json({"error":"server error"})
        return res.json({ username: updatedPerson.username, description, duration, _id, date: formatDate(date) })
      })
    })
  })
})

// 5cb8b76631089507258ec366

// RETRIEVE USER EXERCISE LOG ROUTE
// userId, from & too?, limit?
// {"_id":"H12FHSBFg","username":"phpeter","count":2,
//  "log":[{"description":"test thing","duration":23,"date":"Thu Feb 16 2017"},
//  {"description":"blah","duration":12,"date":"Sat Aug 11 2012"}]}

app.get('/api/exercise/log', (req, res) => {
  Person.findById(req.query.userId).select('_id username log').exec((err, person) => {
    if (err) return res.json({"error":"server error"})
    if (!person) return res.json({"error":"user not found"})
    Exercise.find({username: person.username}).select('description duration date').exec((err, exercises) => {
      if (err) return res.json({"error":"server error"})
      console.log(exercises)
      person.log = exercises
      person.count = person.log.length
      return res.json(person)
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