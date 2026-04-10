const express = require('express');

const { getInternalPermissions } = require('../controllers/internalPermissionsController');
const { requireInternalService, verifyRequiredActingToken } = require('../middleware/internalServiceAuth');

const router = express.Router();

router.get('/:chartersUserId', requireInternalService, verifyRequiredActingToken, getInternalPermissions);

module.exports = router;
