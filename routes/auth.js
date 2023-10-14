const { signUp, forgotPass, login, verifyEmail, verifyForgotPass, googleAuth } = require('../controllers/auth');
const { body } = require('express-validator');

const router = require('express').Router();

router.post('/signup',
    body('password', 'Password must be Alphanumeric between 8 and 100 characters.')
        .trim()
        .isLength({ min: 8, max: 100 })
    ,
    body('email', 'Provide a valid Email.')
        .trim()
        .isEmail()
    ,
    body('name')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty()

    ,
    body('username')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty()
    ,
    signUp)

router.post('/google',
    body('token')
        .trim()
        .not()
        .isEmpty(),
    body('fcmToken')
        .trim()
        .not()
        .isEmpty(),
    googleAuth
)

router.post('/login',
    body('password', 'Password must be between 8 and 100 characters.')
        .trim()
        .isLength({ min: 8, max: 100 })
    ,
    body('username')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty(),
    body('fcmToken')
        .trim()
        .not()
        .isEmpty()

    , login)

router.get('/emailverify/:token', verifyEmail)

// router.get('/phoneverify/:token', verifyNumber)

router.post('/forgotpassword', body('email', 'Provide a valid Email.')
    .trim()
    .isEmail()
    , forgotPass)

router.post('/verifypassword', body('password', 'Password must be Alphanumeric between 8 and 100 characters.')
    .trim()
    .isLength({ min: 8, max: 100 }),
    body("token")
        .trim()
        .not()
        .isEmpty()
    , verifyForgotPass)


module.exports = router