const { findChat, findChatandAddMessage } = require('../model/chat');
const { findByUsername, addUndeliveredMessage } = require('../model/user')

require('dotenv').config()

function message(senderUsername, message, receiverUsername, senderName, receiverName) {
    const d = new Date()
    return {
        senderUsername,
        senderName,
        message,
        receiverUsername,
        receiverName,
        date: {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            day: d.getDate(),
            hour: d.getHours(),
            minutes: d.getMinutes()
        },
    }
}

async function saveUndeliveredMessage(message) {
    addUndeliveredMessage(message)
}

// async function findFcmToken(receiverUsername) {
//     const user = await findByUsername(receiverUsername);
//     if (!user) {
//         return ''
//     }

//     return user.fcmToken
// }

async function saveMessage(message) {
    return findChatandAddMessage(message.senderUsername, message.receiverUsername, message)

}

async function verifyToken(receivedToken) {
    const authHeader = receivedToken
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        return false
    }
    const token = authHeader.split(' ')[1]

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        // attach the user to the routes
        return { username: payload.username, email: payload.email, name: payload.name }

    } catch (error) {
        return false
    }
}

module.exports = { message, saveUndeliveredMessage, saveMessage, verifyToken }