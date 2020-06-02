/**
    * room.js
    * @fileoverview all server js for room functionality
    * @todo add good documentation
*/

var { io } = require('../app.js')
var Table = require('./table.js')

function Room(name) {

    this.name = name

    // player related state
    this.players = {}
    this.numPlayers = 0
    this.capt = 'none'

    // settings state
    this.cards = []
    this.cardToggles = [] // this is a terrible solution. TODO: find a better one
    this.settings = {
        regTime: 10,
        complexTime: 20,
        discussionTime: 60,
        haplessSoloWolf: false,
        flawlessVictory: false,
        rogueMinion: true
    }

    // other state
    this.table = undefined
    this.roundTimer = undefined
    this.io = io.of('/room/'+name)

    this.update = () => {

        if (typeof this.roundTimer !== 'undefined') {
            clearTimeout(this.roundTimer)
        }

        let round = this.table.updateRound()

        if (round === 'game over') {
            this.io.emit('game-over', {players: this.table.players, winners: this.table.winners})
            //this.table = undefined //is this line necessary?
            return
        }

        this.roundTimer = setTimeout(this.update, round.time * 1000)
        this.io.emit('new-round', round, {players: this.table.players, middle: this.table.middle})

    }

    this.startGame = () => {

        this.table = new Table(this.players, this.cards, this.settings)
        this.update()

    }

    this.resetGame = () => {

        if (typeof this.roundTimer !== 'undefined') {
            clearTimeout(this.roundTimer)
        }
        this.table = undefined
        this.io.emit('reset-game')

    }

    this.usernameTaken = (name) => {
        for (let uid in this.players) {
            if (this.players[uid].name === name) {
                return true
            }
        }
        return false
    }

    // io connection handling
    this.io.on('connection', socket => {

        var id = socket.id
        console.log(id, 'connected')

        socket.on('room-connection', name => {

            console.log(id, 'joined room', this.name, 'with username', name)

            this.players[id] = {name: name, evilWinRatio: 0, goodWinRatio: 0}
            this.io.emit('player-list-change', this.players)
            if (this.numPlayers == 0) {
                this.capt = id
            }
            socket.emit('new-capt', this.players[this.capt].name)
            this.numPlayers++

            // give current settings
            for (let setting in this.settings) {
                socket.emit('settings-change-res', setting, this.settings[setting])
            }
            //give current cards
            this.cardToggles.forEach(cardIndex => {
                socket.emit('card-change-res', cardIndex, true)
            })
        })

        socket.on('card-change-req', (name, cardIndex, state) => {

            if (!state) {
                this.cards.splice(this.cards.indexOf(name), 1)
                this.cardToggles.splice(this.cardToggles.indexOf(cardIndex), 1)
            } else {
                this.cards.push(name)
                this.cardToggles.push(cardIndex)
            }
            console.log(this.cards)
            this.io.emit('card-change-res', cardIndex, state)

        })

        socket.on('settings-change-req', (settingName, state) => {
            this.settings[settingName] = state
            this.io.emit('settings-change-res', settingName, state)
        })

        socket.on('start-game', () => {
            if (this.numPlayers <= this.cards.length) {
                console.log('started game')
                this.startGame()
            } else {
                socket.emit('TOO_FEW_CARDS')
            }
        })

        socket.on('reset-game-req', () => {
            this.resetGame()
        })

        // in game handlers. this is bad OO design. add socket connection to table directly?
        socket.on('swap', ({p1, p2}) => {
            this.table.swap(p1, p2)
        })

        socket.on('switch-true-card', (name, newCard) => {
            this.table.switchTrueCard(name, newCard)
        })
        socket.on('switch-behavior', (name, newBehavior) => {
            this.table.switchBehavior(name, newBehavior)
        })
        socket.on('add-vote', ({from, to}) => {
            this.table.addVote(from, to)
        })

        socket.on('disconnect', (reason) => {

            console.log(id, 'disconnected because', reason)

            delete this.players[id]
            this.numPlayers--
            if (this.numPlayers > 0 && id == this.capt) {
                let keys = Object.keys(this.players)
                this.capt = keys[keys.length * Math.random() << 0]
                this.io.emit('new-capt', this.players[this.capt].name)
            }
            this.io.emit('player-list-change', this.players)

        })
    })
}

exports.Room = Room

// high level room functions and data
var roomList = []
exports.roomList = roomList
exports.getRoom = (name) => {
    for(let i = 0; i < roomList.length; i++) {
        if (roomList[i].name === name) {
            return roomList[i]
        }
    }
    return 'none'
}
