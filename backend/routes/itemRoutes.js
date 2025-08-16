const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const scanController = require('../controllers/scanController');
const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');

router.get('/', itemController.getAllItems);
router.get('/:id', itemController.getItemById);
router.post('/', itemController.createItem);
router.put('/:id', itemController.updateItem);
router.delete('/:id', itemController.deleteItem);
router.post('/scan', upload.single('image'), scanController.scanImage);

module.exports = router;
