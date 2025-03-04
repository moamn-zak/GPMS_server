

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectName: {
        type: String,
        required: true,
        unique: true // تحديد الحقل كـ "فريد"
    },
    description: {
        type: String
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Completed', 'Cancelled'],
        default: 'Active'
    },
    githubRepoLink: {
        type: String
    },
    DocumentSubmissionDate: {
        type: Date,
        // default: this.endDate
    },
    Academic_year: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        enum: ['Semester1', 'Semester2', 'Semester3'],
        required: true
    },
    projectType: {
        type: String,
        enum: ['Quarterly', 'Graduation'],
        required: true
    }
}, { timestamps: true });

// استخدام pre-save hook لإضافة السنة واسم الفصل قبل اسم المشروع
projectSchema.pre('save', async function (next) {
    // const currentYear = new Date().getFullYear();
    // const formattedProjectName = `${currentYear} - ${this.semester} - ${this.projectName}`;
    const formattedProjectName = `${this.Academic_year}-${this.semester}-${this.projectType}-${this.projectName.replace(/\s/g, '-')}`;

    // التحقق من فريدة الاسم بعد التعديل
    const existingProject = await mongoose.models.Project.findOne({ projectName: formattedProjectName });
    if (existingProject) {
        return next(new Error('Project name already exists. Please choose a unique name.'));
    }
    this.DocumentSubmissionDate = this.endDate;
    this.projectName = formattedProjectName; // تعديل اسم المشروع
    next();
});

// // التعامل مع الخطأ عند انتهاك الفريدة
// projectSchema.post('save', function (error, doc, next) {
//     if (error.code === 11000 && error.keyPattern.projectName) {
//         next(new Error('Project name already exists. Please choose a unique name.'));
//     } else {
//         next(error);
//     }
// });

module.exports = mongoose.model('Project', projectSchema);
