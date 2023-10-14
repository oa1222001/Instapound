
const getDb = require('../util/database').getDb;
require("dotenv").config()

class User {
    constructor(name, email, password, verifyEmailToken, username, isEmailVerified = false, image = false) {
        this.name = name;
        this.email = email;
        this.username = username
        this.image = image ? image : `${process.env.AWS_LINK}/static/images/unknown.png`
        this.password = password
        this.chats = []
        //contains username of other chats
        this.following = []
        this.followers = []
        this.verifiedEmail = isEmailVerified
        this.verifyEmailToken = verifyEmailToken
        this.forgotPasswordToken = ''
        this.undeliveredMessages = []
        this.fcmToken = ''
        this.stories = []

    }

    //saves new user
    save() {
        const db = getDb();
        return db.collection('users')
            .insertOne(this)
            .catch(err => { throw {} });
    }

    static async followSomeone(followerUsername, followingUsername) {
        const db = getDb()
        await db.collection('users').updateOne(
            { username: followerUsername },
            { $push: { following: followingUsername } }
        ).then(us => { return us }).catch(err => { throw {} });
        await db.collection('users').updateOne(
            { username: followingUsername },
            { $push: { followers: followerUsername } }
        ).then(us => { return us }).catch(err => { throw {} });
    }


    static async unfollowSomeone(followerUsername, followingUsername) {
        const db = getDb()
        await db.collection('users').updateOne(
            { username: followerUsername },
            { $pull: { following: followingUsername } }
        ).then(us => { return us }).catch(err => { throw {} });
        await db.collection('users').updateOne(
            { username: followingUsername },
            { $pull: { followers: followerUsername } }
        ).then(us => { return us }).catch(err => { throw {} });
    }

    static async findAndVerifyEmail(email, username) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ email, username }, { $set: { verifiedEmail: true, verifyEmailToken: "" } }).then(us => { return us }).catch(err => { throw {} });
    }
    static async changeName(username, name) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ username }, { $set: { name } }).then(us => { return us }).catch(err => { throw {} });
    }
    static async changeImage(username, image) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ username }, { $set: { image } }).then(us => { return us }).catch(err => { throw {} });
    }

    // static async deleteContact(email, number) {
    //     const db = getDb()
    //     return db.collection('users').updateOne(
    //         { email, contacts: { $elemMatch: { number } } },
    //         { $pull: { contacts: { number } } }
    //     )
    //         .then(result => {
    //             return result
    //         })
    //         .catch(err => {
    //             throw {}
    //         })
    // }
    // static async findAndVerifyNumber(token) {
    //     const db = getDb()
    //     return db.collection('users').
    //         findOneAndUpdate({ verifyNumberToken: token }, { $set: { verifiedNumber: true, verifyNumberToken: "" } }, {
    //             returnNewDocument: true
    //         }).then(us => { return us }).catch(err => { throw {} });
    // }


    static async findByEmail(email) {
        const db = getDb()
        return db.collection('users').findOne({ email }).then(us => { return us }).catch(err => { throw {} });
    }
    static async findByUsername(username) {
        const db = getDb()
        return db.collection('users').findOne({ username }).then(us => { return us }).catch(err => { throw {} });
    }

    static async saveForgotPasswordToken(email, token) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ email }, { $set: { forgotPasswordToken: token } }).then(us => { return us }).catch(err => { throw {} });
    }

    static async findForgotPasswordTokenUser(token) {
        const db = getDb()
        return db.collection('users').findOne({ forgotPasswordToken: token }).then(us => { return us }).catch(err => { throw {} });
    }

    static async deleteForgotPasswordTokenAndSavePassword(token, email, password) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ forgotPasswordToken: token, email }, { $set: { forgotPasswordToken: '', password } }).then(us => { return us }).catch(err => { throw {} });
    }


    static async findAndDeleteUnverified(email, username) {
        const db = getDb();
        if (email) {
            await db.collection("users").deleteMany({ email, verifiedEmail: false }).catch(err => { throw {} })
        }
        if (username) {
            await db.collection("users").deleteMany({ username, verifiedEmail: false }).catch(err => { throw {} })
        }
    }


    static async changePassword(email, password) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ email }, { $set: { password } }).then(us => { return us }).catch(err => { throw {} });
    }
    static async findAndEditUsername(old_username, new_username) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ username: old_username }, { $set: { username: new_username } }).then(us => { return us }).catch(err => { throw {} });
    }

    static async findAndUpdateFcmToken(email, fcmToken) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate({ email }, { $set: { fcmToken } }).then(us => { return us }).catch(err => { throw {} });
    }

    static async deleteAccount(email) {
        const db = getDb()
        return db.collection('users').
            deleteOne({ email }).then(us => { return us }).catch(err => { throw {} });
    }

    static async addUndeliveredMessage(message) {
        const db = getDb()
        return db.collection('users').updateOne(
            { username: message.receiverUsername },
            { $push: { undeliveredMessages: message } }
        )
            .then(result => {
                return result
            })
            .catch(err => {
            })
    }
    static async addNewUserChat(user1, user2) {
        const db = getDb()
        db.collection('users').updateOne(
            { username: user1 },
            { $push: { chats: user2 } }
        )
            .then(result => {
                return result
            })
            .catch(err => {
            })
        db.collection('users').updateOne(
            { username: user2 },
            { $push: { chats: user1 } }
        )
            .then(result => {
                return result
            })
            .catch(err => {
            })
    }


}

module.exports = User;