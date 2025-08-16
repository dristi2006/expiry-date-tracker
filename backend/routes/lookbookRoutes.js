const express = require('express');
const router = express.Router();
const lookbookController = require('../controllers/lookbookController');

router.get('/', lookbookController.getAllLookbook);
router.get('/:item_name', lookbookController.getLookbookByItemName);

module.exports = router;
