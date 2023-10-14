const jwt = require('jsonwebtoken')

const auth = (req, res, next) => {
    // check header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer')) {
        const err = new Error('not authorized, maybe a bad token')
        err.statusCode = 401;
        return next(err)
    }
    const token = authHeader.split(' ')[1]

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        // attach the user to the routes
        req.user = { username: payload.username, email: payload.email, name: payload.name }
        return next()
    } catch (error) {
        const err = new Error('not authorized, maybe a bad token')
        err.statusCode = 401;
        return next(err)
    }
}

module.exports = auth
