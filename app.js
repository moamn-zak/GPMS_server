const express = require("express");
const mongoose = require("mongoose");
require('dotenv').config();
const path = require('path');




const SupervisorRoutes = require('./routes/Supervisor');
const Subject_CoordinatorRoutes = require('./routes/Subject_Coordinator');
const StudentRoutes = require('./routes/Student');
const commonRoutes = require('./routes/common');


const app = express();


app.use(express.json());
app.use('/files', express.static(path.join(__dirname, 'files')));

// app.use('/images', express.static(path.join(__dirname, 'images')));
// app.use('/documents', express.static(path.join(__dirname, 'documents')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-type , Authorization')
    next();
});





app.use('/Subject_Coordinator', Subject_CoordinatorRoutes);
app.use('/Supervisor', SupervisorRoutes);
app.use('/Student', StudentRoutes);
app.use('/common', commonRoutes);




app.use((error, req, res, next) => {

    const status = error.statusCode || 500;
    const message = error.message;
    res.status(status).json({ message: message });
})

const MONGODB_URI =
    `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.ixzvkhf.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority&appName=Cluster0`;




mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB Atlas');

        const server = app.listen(process.env.PORT || 8080, () => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        });

        // تشغيل Socket.IO بعد التأكد من تشغيل السيرفر
        setImmediate(() => {
            require('./middleware/socketIO').init(server);
            console.log('Socket.IO initialized');

        });
    })
    .catch(err => {
        console.error('Error connecting :', err);
    });













// mongoose.connect(MONGODB_URI)
//     .then(res => {

//         const server = app.listen(process.env.PORT || 8000, () => {
//             console.log(`Server is running on port ${process.env.PORT} || 8000`);
//             console.log('Connected to MongoDB Atlas');
//         }).then(() => {
//             require('./middleware/socketIO').init(server);
//             console.log('Clinte connected');

//         })

//         // /*const io =*/ await require('./middleware/socketIO').init(server);
// io.on('connection', socket => {
// console.log('Clinte connected');
// });

//     })
//     .catch(err => { console.log(err); })

// app.listen(8080, () => {
//     console.log('Server is running on port 8080');
//     console.log('Connected to MongoDB Atlas');
// });



