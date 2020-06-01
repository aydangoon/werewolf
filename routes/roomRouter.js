/**
    * roomRouter.js
    * @fileoverview makes router manager for /room URIs
*/

var router = require('express').Router()
var roomController = require('../controllers/roomController')

router.get('/', roomController.get_room_access)

module.exports = router
