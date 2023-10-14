const express = require('express')
const dotenv = require('dotenv')
const helmet = require('helmet')
const cors = require('cors')
const xss = require('xss-clean')
const admin = require('firebase-admin');
const http = require('http')
const { Server } = require("socket.io");
const mongoConnect = require('./util/database').mongoConnect;

const multer = require('multer')



const errorHandlerMiddleware = require('./middleware/error-handler')
const auth = require('./middleware/auth')

const authRouter = require('./routes/auth')
const { message, saveUndeliveredMessage, saveMessage, verifyToken, findFcmToken } = require('./util/chat')
const { findChat } = require('./model/chat')
const Chat = require('./model/chat')
const { findByUsername, addNewUserChat } = require('./model/user')
const userRouter = require('./routes/user')


dotenv.config()

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images/'); // Set the upload directory
    },
    filename: (req, file, cb) => {
        req.filePath = `${process.env.AWS_LINK}/static/images/${req.user.username}`
        cb(null, req.user.username); // Set the file name
    },
});

const upload = multer({ storage });




const serviceAccount = require('./instapound-e1095-firebase-adminsdk-i99mu-34db380eba.json')
const { profileImage } = require('./controllers/user')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const app = express()
const server = http.createServer(app);

const io = new Server(server, { pingTimeout: 60000, cors: { origin: "*" } });

app.use(express.json())


app.set('trust proxy', 1);


// Security Middlwares
app.use(cors())
app.use(helmet())
app.use(xss())

app.use('/static', express.static('public'))



app.use('/auth', authRouter)
app.use('/user', auth, userRouter)
app.post('/user/profileimage', auth, upload.single('image'), profileImage);

// app.use('/requirement', requirementRouter)
app.get('/', (req, res, next) => {
    res.send('you can check documentation of this api at https://documenter.getpostman.com/view/26319522/2s946o3otT')
})

app.use((req, res, next) => {

    res.status(404).send('Route does not exist')
})


app.use(errorHandlerMiddleware)

//array of active sockets
let sockets = []
io.on('connection', (socket) => {
    console.log('connecteeeeeeeed');
    socket.on("online", async (data) => {
        console.log('online event');
        if (!data) {
            socket.disconnect();
            return
        }
        if (!data.token) {
            socket.disconnect();
            return
        }
        const user = await verifyToken(data.token)
        socket.user = user;
        if (!user) {
            socket.disconnect();
            return
        }
        // const fcmUserToken = await findFcmToken(user.username)

        sockets.push({ id: socket.id, username: user.username, name: user.name })
    });

    socket.on('serverReceiveMessage', async (data) => {
        if (!socket.user) {
            socket.disconnect();
            return
        }

        if (!data) {

            return
        }
        if (!data.message) {
            return
        }
        if (!data.receiver) {
            return
        }

        const receiverUser = await findByUsername(data.receiver)
        if (!receiverUser) {
            return
        }

        const newMessage = message(socket.user.username, data.message, data.receiver, socket.user.name, receiverUser.name)
        const chat = await findChat(socket.user.username, data.receiver)
        if (!chat) {
            const newChat = new Chat(socket.user.username, data.receiver)
            newChat.save()
            addNewUserChat(socket.user.username, data.receiver)
        }

        saveMessage(newMessage)

        const user = sockets.find((user) => user.username === data.receiver);

        if (user) {
            socket.to(user.id).emit("clientReceiveMessage", newMessage);
        }
        else {
            const message = {
                data: newMessage,
                token: receiverUser.fcmToken
            };

            // Send the message
            admin.messaging().send(message)
                .then((response) => {
                    console.log('Successfully sent data message:', response);
                })
                .catch((error) => {
                    console.error('Error sending data message:', error);
                });
        }
    });

    socket.on("disconnect", () => {
        sockets.filter((element) => element.id !== socket.id);
    });
});

let port = process.env.port || 8080
mongoConnect(() => {
    server.listen(port, async () => {
        console.log('ruuuuuuuuuuun');
    });
});


