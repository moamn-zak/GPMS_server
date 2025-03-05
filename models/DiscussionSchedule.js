const mongoose = require('mongoose');

const discussionScheduleSchema = new mongoose.Schema({
    committeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Committee',
        required: true
    }, // معرف اللجنة
    schedule: [{
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        }, // المشروع المجدول
        date: {
            type: Date,
            required: true
        }, // تاريخ الجلسة
        startTime: {
            type: String,
            required: true
        }, // وقت بداية الجلسة
        endTime: {
            type: String,
            required: true
        } // وقت نهاية الجلسة
    }]
},
    { timestamps: true });

module.exports = mongoose.model('DiscussionSchedule', discussionScheduleSchema);




