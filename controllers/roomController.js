/**
    * roomController.js
    * @fileoverview middleware functions for /room routes. currently only one
    * @todo modularize middleware/error handling
*/

var { Room, roomList, getRoom } = require('../game/room')

exports.get_room_access = (req, res) => {

    if (typeof req.query == 'undefined' || !req.query.hasOwnProperty('room')
        || !req.query.hasOwnProperty('name')) {

        res.render('index', {errors: [{msg: 'invalid query request.'}]})

    } else {

        let room = getRoom(req.query.room)
        let name = req.query.name

        if (name.length == 0 || req.query.room.length == 0) {
            res.render('index', {errors: [{msg: 'field empty'}]})
            return
        }

        if (room === 'none') {

            console.log('making room')
            roomList.push(new Room(req.query.room))

        } else if (room.usernameTaken(req.query.name)){

            res.render('index', {errors: [{msg: 'Username taken.'}]})
            return

        }
        res.render('room', req.query)
    }

}
