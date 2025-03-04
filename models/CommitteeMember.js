const mongoose = require('mongoose');

const CommitteeMemberSchema = new mongoose.Schema({

    committeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Committee',
        required: true
    }, // معرف اللجنة
    members: [{
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', required: true
        },
        role: {
            type: String,
            required: true
        }
    }] // قائمة الأعضاء

}, { timestamps: true });

module.exports = mongoose.model('CommitteeMember', CommitteeMemberSchema);
