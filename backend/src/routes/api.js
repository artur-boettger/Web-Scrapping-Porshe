const express = require('express');
const ListController = require('../controller/ListController.js');

const router = express.Router();

router.get('/cars', ListController.index)

module.exports = router;