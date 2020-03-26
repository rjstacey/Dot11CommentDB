/*
 * 802.11 comment database server
 *
 * Robert Stacey
 */

'use strict'

const path = require('path')
const express = require('express')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: true}))

const connection = require('./util/database')

const expressSession = require('express-session')
const MySQLStore = require('express-mysql-session')(expressSession)
const sessionStore = new MySQLStore({}, connection.pool)
app.use(expressSession({
	//name: 'id42',
	secret: 'random_string_goes_here',
	resave: false,
	saveUninitialized: true,
	//cookie: { secure: true }
	store: sessionStore
}))

app.use((req, res, next) => {
	console.log(req.method, req.url)
	next()
})

const api = require('./api/router')(connection)
app.use('/api', api)

app.use(express.static(path.join(__dirname, 'app')))
app.get('/*', (req, res) => {
	return res.sendFile(path.join(__dirname, 'app', 'index.html'))
})

// [START listen]
var PORT = process.env.PORT || 8080
app.listen(PORT, function () {
	console.log('App listening on port %s', PORT)
	console.log('Press Ctrl+C to quit.')
})
// [END listen]
// [END app]

module.exports = app;
