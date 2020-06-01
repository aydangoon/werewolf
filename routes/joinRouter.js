/**
    * joinRouters.js
    * @fileoverview makes router manager for /join URIs
*/

var router = require('express').Router()
var joinController = require('../controllers/joinController')

router.get('/', joinController.index)

module.exports = router
