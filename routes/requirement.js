const { accessLocation, stopLocation, shareAndUpdateLocation } = require('../controllers/requirement');
const { body } = require('express-validator');
const auth = require('../middleware/auth')

const router = require('express').Router();


router.post('/shareandupdateloc',
    auth,
    body('longitude')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty()
    ,
    body('latitude')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty()
    ,
    shareAndUpdateLocation)

router.get('/accloc/:token', accessLocation)

router.get('/stoplocation', auth, stopLocation)

module.exports = router