const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    studentAssignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started'
    }


}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);



























// const mongoose = require('mongoose');

// const taskSchema = new mongoose.Schema({
//     projectId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Project',
//         required: true
//     },
//     task: [{
//         studentAssignedTo: {
//             type: mongoose.Schema.Types.ObjectId,
//             ref: 'User',
//             required: true
//         },
//         title: {
//             type: String,
//             required: true
//         },
//         description: {
//             type: String
//         },
//         dueDate: {
//             type: Date,
//             required: true
//         },
//         status: {
//             type: String,
//             enum: ['Not Started', 'In Progress', 'Completed'],
//             default: 'Not Started'
//         }
//     }]

// }, { timestamps: true });

// module.exports = mongoose.model('Task', taskSchema);
