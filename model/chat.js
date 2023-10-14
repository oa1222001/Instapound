const getDb = require('../util/database').getDb;
require("dotenv").config()

class Chat {
    constructor(user1, user2) {
        this.users = [user1, user2];
        //users are array of two each with username

        this.messages = []
        //each message of chat is object of these properties: sender, time and date, and content of message

    }

    //saves new user
    save() {
        const db = getDb();
        return db.collection('chats')
            .insertOne(this)
            .catch(err => { throw {} });
    }
    static async findChat(user1, user2) {
        const db = getDb()
        return db.collection('users').
            findOne(
                {
                    users: { $all: [user1, user2] },
                }
            ).then(us => { return us }).catch(err => { throw {} });
    }
    static async findChatandAddMessage(user1, user2, newMessage) {
        const db = getDb()
        return db.collection('users').
            findOneAndUpdate(
                {
                    users: { $all: [user1, user2] },
                },
                {
                    $push: { messages: newMessage },
                }
            ).then(us => { return us }).catch(err => { throw {} });
    }

}

module.exports = Chat;