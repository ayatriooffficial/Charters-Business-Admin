const express = require('express');

const { getPermissions } = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/:chartersUserId', protect, requireAdmin, getPermissions);

module.exports = router;
