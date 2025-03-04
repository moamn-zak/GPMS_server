require('dotenv').config();

const firebase = require('firebase-admin');
const path = require('path');

const User = require('../models/User');

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


// const serviceAccount = require(path.resolve(`C:\\Users\\ASUS\\Desktop\\GPMS\\GPMS_server\\firebase_kay\\${process.env.FIREBASE_SERVICE_ACCOUNT}`));
const serviceAccount = require('/etc/secrets/firebase_key.json');



// $env:GOOGLE_APPLICTION_CREDENTIALS="C:\Users\ASUS\Desktop\GPMS\GPMS_server\firebase_kay\gpms-aspu-firebase-adminsdk-fbsvc-9e7b095e6d.json"


firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    // databaseURL: 'https://<project-id>.firebaseio.com' // تأكد من استبدال <project-id> بمعرف مشروعك
});

exports.sendNotification = async (token, title, content) => {
    const message = {
        notification: {
            title: title,
            content: content,
        }
    };

    await firebase.messaging().sendToDevice(token, message)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
};


exports.directNotification = async (req, res, next) => {

    try {
        const { userId, title, message } = req.body;
        // التحقق من أن المستخدم هو مدير
        const isAdmin = await User.findById(req.userId);

        if (isAdmin.role != 'Admin') {
            return res.status(403).json({ message: 'You are not authorized to perform this action.' });
        }

        const user = await User.findById(userId);
        this.sendNotification(user.fcmToken, title, message);

        res.status(200).json({ message: 'Notification send successfully' });
    }
    catch (error) {
        next(error);
    }
};







exports.brodcastNotification = async (req, res, next) => {

    try {
        const { title, message } = req.body;
        // التحقق من أن المستخدم هو مدير
        const isAdmin = await User.findById(req.userId);
        if (isAdmin.role != 'Admin') {
            return res.status(403).json({ message: 'You are not authorized to perform this action.' });
        }
        const users = await User.find();

        users.forEach(user => {
            this.sendNotification(user.fcmToken, title, message);
        });
        res.status(200).json({ message: 'Notification send successfully' });
    }
    catch (error) {
        next(error);
    }
};
