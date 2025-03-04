
const jwt = require('jsonwebtoken');
require('dotenv').config();



module.exports = (req, res, next) => {
    try {
        const authHeader = req.get('Authorization');
        if (!authHeader) {
            const err = new Error('NOT AUTHENTICATED')
            err.statusCode = 401;
            throw err;
        }
        // console.log(authHeader)
        const token = authHeader.split(' ')[1];
        // console.log(token)

        let decodedtoken;

        decodedtoken = jwt.verify(token, process.env.JWT_SECRET)
        if (!decodedtoken) {
            const error = new Error('not authoraized')
            error.statusCode = 401;
            throw error;
        }
        req.userId = decodedtoken.userId;
        req.role = decodedtoken.role;

    }
    catch (error) {
        error.statusCode = 401;
        throw error;
    }


    next();
};