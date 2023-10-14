const { editUsername, editPassword, deleteAccount, followSomeone, unfollowSomeone, showUser, editName } = require('../controllers/user');
const { body } = require('express-validator');

const router = require('express').Router();


router.post('/editusername',
    body('new_username')
        .trim()
        .not()
        .isEmpty(),
    editUsername)

router.post('/editpassword',
    body('new_password')
        .trim()
        .isLength({ min: 8 })
        .not()
        .isEmpty(),
    body('old_password')
        .trim()
        .isLength({ min: 8 })
        .not()
        .isEmpty()

    ,
    body('number').custom((value, { req }) => {
        // this is custom validation for egyptian phone numbers

        const egyptianNumberRegex = /^(01)[0125]\d{8}$/; // Regex pattern for Egyptian phone numbers
        return egyptianNumberRegex.test(value);

    })
    ,
    editPassword)

router.delete('/deleteaccount',
    body('password')
        .trim()
        .isLength({ min: 8 })
        .not()
        .isEmpty()
    ,
    deleteAccount)

router.post('/followsomeone',
    body('username')
        .trim()
        .not()
        .isEmpty(),

    followSomeone)

router.delete('/unfollowsomeone',
    body('username')
        .trim()
        .not()
        .isEmpty(),
    unfollowSomeone)

router.post('/editname',
    body('name')
        .trim()
        .isLength({ max: 50 })
        .not()
        .isEmpty(),
    editName)



router.get('/profile/:userId', showUser)




module.exports = router