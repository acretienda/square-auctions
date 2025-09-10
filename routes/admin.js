const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const auth = require('../middleware/auth');

router.post('/login', adminCtrl.login);
router.get('/', auth, adminCtrl.list);
router.post('/', auth, adminCtrl.create);
router.delete('/:id', auth, adminCtrl.remove);

module.exports = router;
