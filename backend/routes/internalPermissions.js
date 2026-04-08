const express = require('express');

const { getInternalPermissions } = require('../controllers/internalPermissionsController');
const { requireInternalService, verifyOptionalActingToken } = require('../middleware/internalServiceAuth');

const router = express.Router();

router.get('/:chartersUserId', requireInternalService, verifyOptionalActingToken, getInternalPermissions);

module.exports = router;
