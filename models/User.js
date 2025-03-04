const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Supervisor', 'Student'],
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    fcmToken: {
        type: String,
        default: ''
    }
},
    { timestamps: true });

module.exports = mongoose.model('User', userSchema);

// createdAt: { type: Date, default: Date.now },