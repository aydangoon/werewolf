var express = require('express')
var http = require('http')
var bp = require('body-parser')
var path = require('path')
var app = express()
var server = http.createServer(app)

var io = require('socket.io')(server)
exports.io = io

var joinRouter = require('./routes/joinRouter')
var roomRouter = require('./routes/roomRouter')

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.redirect('/join')
})
app.use('/join', joinRouter)
app.use('/room', roomRouter)

var port = process.env.PORT || 3000
app.set('port', port)

server.listen(port, () => {
    console.log('server started')
})
