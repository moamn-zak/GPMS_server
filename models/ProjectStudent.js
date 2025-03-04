const mongoose = require('mongoose');



const projectStudentSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    teamName: {
        type: String,
        required: true
        // default: 'not set yet'
    },
    students: [{
        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        roleInProject: {
            type: String,
            // enum: ['Team Leader', 'FrontEnd', 'BackEnd', 'AI','Other'],
            required: true
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('ProjectStudent', projectStudentSchema);
