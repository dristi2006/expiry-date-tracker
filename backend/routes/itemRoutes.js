const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const scanController = require('../controllers/scanController');
const itemController = require('../controllers/itemController');

const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.get('/', requireAuth, itemController.getAllItems);
router.get('/:id', requireAuth, itemController.getItemById);
router.post('/', requireAuth, itemController.createItem);
router.put('/:id', requireAuth, itemController.updateItem);
router.delete('/:id', requireAuth, itemController.deleteItem);

router.post('/scan', requireAuth, upload.single('image'), scanController.scanImage);

module.exports = router;
