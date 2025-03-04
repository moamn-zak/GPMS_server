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








































// const mongoose = require('mongoose');

// const evaluationCommitteeSchema = new mongoose.Schema({
//     project: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Project', required: true
//     },
//     member: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User', required: true
//     },
//     role: {
//         type: String, enum: ['Chair', 'Member'],
//         required: true
//     },
//     evaluationDate: {
//         type: Date
//     },
//     comments: {
//         type: String
//     }
// }, { timestamps: true });

// module.exports = mongoose.model('EvaluationCommittee', evaluationCommitteeSchema);



// const mongoose = require('mongoose');

// const evaluationCommitteeSchema = new mongoose.Schema({
//     committeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee', required: true }, // معرف اللجنة
//     projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // معرف المشروع

//     projectType: {
//         type: String,
//         enum: ['Quarterly', 'Graduation'],
//         required: true
//     }, // نوع المشروع (فصل أو فصلين)

//     days: [{ type: Date, required: true }], // قائمة الأيام المتاحة للجلسات

//     timeSlots: [{
//         day: { type: Date, required: true }, // اليوم المحدد
//         startTime: { type: String, required: true }, // وقت بداية الجلسة
//         endTime: { type: String, required: true } // وقت نهاية الجلسة
//     }],

//     schedule: [{
//         projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // المشروع المجدول
//         date: { type: Date, required: true }, // تاريخ الجلسة
//         startTime: { type: String, required: true }, // وقت بداية الجلسة
//         endTime: { type: String, required: true } // وقت نهاية الجلسة
//     }]
// });

// module.exports = mongoose.model('EvaluationCommittee', evaluationCommitteeSchema);
