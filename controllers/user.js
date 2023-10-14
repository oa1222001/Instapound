const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const User = require('../model/user');
const { compare, genSalt, hash } = require('bcryptjs');
require('dotenv').config()


// edit jwt token and send it back
exports.editUsername = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }
    const newUsername = req.body.new_username;

    const isThereAnotherUsername = await User.findByUsername(newUsername);
    if (!!isThereAnotherUsername) {
        return res.status(400).json({ message: "user already exist" })
    }
    const relativePath = `../public/images/${req.user.username}.png`; // Relative path to the file from the current working directory
    const newFileName = `${newUsername}.png`; // Desired new file name

    fs.rename(relativePath, path.join(path.dirname(relativePath), newFileName), (err) => {
        if (err) {
            console.error('Error renaming file:', err);
        } else {
            console.log('File renamed successfully.');
        }
    });
    await User.findAndEditUsername(req.user.username, newUsername);

    const token = jwt.sign(
        { email: req.user.email, username: newUsername, name: req.user.name },
        process.env.JWT_SECRET,
        {}
    )

    return res.status(200).json({ message: 'done', token })



}
exports.editPassword = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }
    const user = await User.findByUsername(req.user.username)
    if (!user) {
        return res.status(400).json({ message: 'Validation Error' })
    }

    const oldPassword = req.body.old_password
    const isPasswordCorrect = await compare(oldPassword, user.password)
    if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Validation Error' })
    }
    const salt = await genSalt(12)
    const newPassword = await hash(req.body.new_password, salt)
    await User.changePassword(req.body.email, newPassword)
    return res.status(200).json({ message: 'done' })

}
exports.deleteAccount = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Wrong Password')
        err.statusCode = 400
        return next(err)
    }
    const user = await User.findByUsername(req.user.username)
    if (!user) {
        return res.status(400).json({ message: 'Wrong Password' })
    }

    const password = req.body.password
    const isPasswordCorrect = await compare(password, user.password)
    if (!isPasswordCorrect) {
        return res.status(400).json({ message: 'Wrong Password' })
    }

    await User.deleteAccount(req.user.email)
    return res.status(200).json({ message: "done" })

}
exports.followSomeone = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }

    const username = req.body.username
    const user = await User.findByUsername(username)
    if (username == req.user.username) {
        return res.status(400).json({ message: "there's no such a user" })
    }
    if (!user) {
        return res.status(400).json({ message: "there's no such a user" })
    }
    if (user.followers.includes(req.user.username)) {
        return res.status(200).json({ message: "done" })
    }
    await User.followSomeone(req.user.username, username)

    return res.status(200).json({ message: "done" })

}
exports.unfollowSomeone = async (req, res, next) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }

    const username = req.body.username
    const user = await User.findByUsername(username)
    if (username == req.user.username) {
        return res.status(200).json({ message: "done" })
    }
    if (!user) {
        return res.status(200).json({ message: "done" })
    }
    if (!user.followers.includes(req.user.username)) {
        return res.status(200).json({ message: "done" })
    }
    await User.unfollowSomeone(req.user.username, username)

    return res.status(200).json({ message: "done" })
}
exports.editName = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }
    await User.changeName(req.user.username, req.body.name)
    return res.status(200).json({ message: 'done' })
}

exports.profileImage = async (req, res, next) => {
    // Handle the uploaded image here
    await User.changeImage(req.user.username, req.filePath)

    // Process or save the image as needed
    res.status(200).json({ message: 'done', image: req.filePath });
}

exports.showUser = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const err = new Error('Validation Error')
        err.statusCode = 400
        return next(err)
    }
    const username = req.params['userId']
    const user = await User.findByUsername(username).catch(err => {
        let error = {}
        return next(error)
    })

    if (!user) {
        return res.status(400).json({ message: 'User not found' })
    }
    return res.status(200).json({
        username: user.username,
        image: user.image,
        name: user.name,
        stories: user.stories
    })
}
