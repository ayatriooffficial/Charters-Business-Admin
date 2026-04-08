const express = require('express');

const {
  login,
  getMe,
} = require('../controllers/adminAuthController');
const {
  protect,
  requireAdmin,
} = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, requireAdmin, getMe);

module.exports = router;
