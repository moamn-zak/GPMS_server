require('dotenv').config();

const admin = require('firebase-admin');
const path = require('path');

const User = require('../models/User');


// const serviceAccount = require("C:/Users/MOAMN/Desktop/GPMS_server/firebase_kay/gpms-aspu-firebase-adminsdk-fbsvc-9e7b095e6d.json");

const serviceAccount = require('/etc/secrets/firebase_key.json');



exports.fire = () => {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    // console.log("✅ Firebase Admin Initialized Successfully!");
};

exports.sendNotification = async (token, title, content) => {
    // const message = {
    //     notification: {
    //         title: title,
    //         content: content,
    //     }
    // };
    const message = {
        token: token, // التوكن الخاص بالمستلم
        notification: {
            title: title,
            body: content // يجب أن يكون `body` بدلاً من `content`
        },
        android: {
            priority: "high"
        },
        apns: {
            payload: {
                aps: {
                    sound: "default"
                }
            }
        }
    };
    console.log(message);
    // await admin.messaging().sendToDevice(token, message)
    await admin.messaging().send(message)
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
