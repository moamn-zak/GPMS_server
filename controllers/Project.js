const Project = require('../models/Project');
const ProjectStudent = require('../models/ProjectStudent');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Feedback = require('../models/Feedback');

const Notification = require('../models/Notification');

const { sendNotification } = require('../middleware/firebaseService');

const path = require('path');
const fs = require('fs');
const User = require('../models/User');



exports.Notification = async (fcmtoken, recipient, projectId, title, content) => {
    try {
        // ✅ إنشاء كائن الإشعار
        let notificationData = {
            title,
            content
        };

        if (recipient) notificationData.recipient = recipient;
        if (projectId) notificationData.projectId = projectId;

        // ✅ حفظ الإشعار في قاعدة البيانات
        const notification = new Notification(notificationData);
        await notification.save();

        // ✅ إرسال الإشعار إذا كان هناك `token` صالح
        if (fcmtoken!=null) {
            // ✅ تأكد من تفعيل دالة sendNotification() قبل الاستخدام
            await sendNotification(fcmtoken, title, content);
            console.log(`📢 Notification sent to user: ${recipient}, Title: ${title}`);
        }

        return { success: true, message: `Notification stored successfully` };

    } catch (error) {
        console.error("❌ Error in sending notification:", error.message);
        return { success: false, message: "Failed to send notification", error: error.message };
    }
};






exports.uploadFile = async (req, res) => {


    let filePath = ' ';
    try {

        const { projectId, documentType } = req.body;

        if (req.file) {
            filePath = `/files/${req.file.destinationFolder}/${req.file.filename}`;
        }

        if (!req.file || !projectId || !documentType || filePath === ' ') {

            clearFile(filePath);
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        // const project = await ProjectStudent.findOne({ projectId }).populate('projectId').populate('projectId.supervisor');

        const project = await ProjectStudent.findOne({ projectId })
            .populate({
                path: 'projectId',
                populate: {
                    path: 'supervisor',
                    select: '_id name username email fcmTocken' // تحديد الحقول المطلوبة فقط من المشرف
                }
            });

        // console.log('project: ' + project.projectId);

        if (!project || !project.students) {              //|| !project.projectId.DocumentSubmissionDate
            clearFile(filePath);
            return res.status(400).json({ message: "can not finde required fields." });
        }

        // البحث عن الطالب الذي يمتلك الدور 'Team Leader'
        let leader = project.students.find(student => {
            if (student.roleInProject === 'Team Leader'); // التحقق مع إزالة المسافات وحالة الأحرف
            return student;
        });

        req.userId = leader.studentId.toString();          // should delete this leater

        if (req.userId != leader.studentId.toString()) {
            clearFile(filePath);
            return res.status(400).json({ message: 'not authoraized.' });
        }

        let docsupdate = new Date(project.projectId.DocumentSubmissionDate).toISOString();
        let datenow = new Date(Date.now()).toISOString();

        if (datenow > docsupdate) {
            clearFile(filePath);
            return res.status(401).json({ message: 'The time of upload files ended.' });
        }

        const document = new Document({
            projectId,
            studentId: req.userId,
            documentType,
            filePath
        })

        await document.save();
        let title, content;
        title = 'File Uploaded';
        content = `a ${documentType} file uploded to ${project.projectId.projectName} project.`
        // console.log("project.supervisor.fcmTocken", project.projectId.supervisor._id.toString(), project.projectId._id.toString(), title, content);

        await this.Notification(project.supervisor.fcmTocken, project.projectId.supervisor._id, project.projectId, title, content);
        res.status(200).json({ message: "Document created successfully.", document });
    } catch (error) {
        clearFile(filePath);
        res.status(500).json({ message: "Error creating Document.", error: error.message });
    }
};









exports.feedback = async (req, res, next) => {
    try {
        const { projectId, documentId, content, status } = req.body;

        // تحقق من الحقول الأساسية
        if (!projectId || !content) {
            return res.status(400).json({ message: "All fields must be provided." });
        }



        // إذا كان documentId موجودًا، قم بمعالجته
        if (documentId) {
            if (!status) return res.status(400).json({ message: "Status field must be provided." });

            const document = await Document.findById(documentId);
            if (!document) return res.status(400).json({ message: "Document not found." });

            document.status = status;
            await document.save();
        }

        // إنشاء الفيدباك
        const feedback = new Feedback({
            projectId,
            supervisorId: req.userId,
            documentId: documentId != null ? documentId : undefined, //|| null, // التعامل مع الحالة التي لا يوجد بها documentId
            content,
        });

        // حفظ الفيدباك
        await feedback.save();

        // عمل populate بعد الحفظ
        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate('projectId', 'projectName description supervisor') // جلب اسم المشروع فقط
            .populate('supervisorId', 'name') // جلب اسم المستخدم والبريد الإلكتروني فقط
            .populate('documentId', 'documentType status filePath');

        let title, Ncontent;
        title = 'File Feedback';
        Ncontent = `${status} the uploded file of your project. 
        Supervisor review ${content}`

        await this.Notification(null, null, projectId, title, Ncontent);


        res.status(200).json({
            message: "Feedback created successfully.",
            feedback: populatedFeedback,
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating feedback.", error: error.message });
    }
};



exports.reviewFeedback = async (req, res) => {
    try {
        const { status, Academic_year, semester, projectType } = req.query;

        // التحقق من الحقول الأساسية
        // if (!status) {
        //     return res.status(400).json({ message: "Status query parameter must be provided." });
        // }

        let projectFilter = {};

        // إعداد فلتر المشروع إذا تم إرسال البيانات
        if (Academic_year) projectFilter.Academic_year = Academic_year;
        if (semester) projectFilter.semester = semester;
        if (projectType) projectFilter.projectType = projectType;

        // استعلام لجلب الفيدباك
        const feedbacks = await Feedback.find({ documentId: { $ne: null } })
            .populate({
                path: 'projectId',
                match: Object.keys(projectFilter).length > 0 ? projectFilter : undefined, // فلترة فقط إذا كانت هناك شروط
                select: 'projectName description'
            })
            .populate('supervisorId', 'name')
            .populate({
                path: 'documentId',
                match: { /*status: status != null? status : undefined,*/ documentType: 'Proposal' }, // تصفية المستندات بناءً على الحالة
                select: 'documentType status filePath'
            })
            .sort({ createdAt: -1 });

        // إزالة الفيدباك الذي لم يتم ربطه بمستند أو مشروع متطابق
        const filteredFeedbacks = feedbacks.filter(fb => fb.documentId && fb.projectId);

        res.status(200).json({
            message: "Feedbacks fetched successfully.",
            feedbacks: filteredFeedbacks
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching feedbacks.", error: error.message });
    }
};






exports.getProjectDocuments = async (req, res) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required." });
        }

        // جلب جميع المستندات الخاصة بالمشروع
        const documents = await Document.find({ projectId })
            .populate('studentId', 'name email') // جلب معلومات الطالب
            .sort({ submissionDate: -1 }); // ترتيب المستندات من الأحدث إلى الأقدم

        if (!documents.length) {
            return res.status(404).json({ message: "No documents found for this project." });
        }

        // جلب جميع الفيدباك المرتبطة بهذه المستندات
        const documentIds = documents.map(doc => doc._id);
        const feedbacks = await Feedback.find({ documentId: { $in: documentIds } })
            .populate('supervisorId', 'name email') // جلب المشرف الذي أضاف الفيدباك
            .populate('documentId', 'documentType status'); // جلب معلومات المستند المرتبط

        // ربط الفيدباك بالمستندات الخاصة بها
        const documentsWithFeedback = documents.map(doc => {
            const docFeedbacks = feedbacks.filter(fb => fb.documentId?._id.toString() === doc._id.toString());
            return {
                ...doc._doc,
                feedbacks: docFeedbacks.length > 0 ? docFeedbacks.map(fb => ({
                    content: fb.content,
                    supervisor: fb.supervisorId ? { name: fb.supervisorId.name, email: fb.supervisorId.email } : null
                })) : [] // إذا لم يكن هناك فيدباك يتم إرجاع مصفوفة فارغة
            };
        });

        res.status(200).json({
            success: true,
            message: "Project documents fetched successfully.",
            documents: documentsWithFeedback
        });

    } catch (error) {
        console.error("Error fetching project documents:", error.message);
        res.status(500).json({ message: "Error fetching project documents.", error: error.message });
    }
};







exports.coordinatorDecision = async (req, res) => {
    try {
        const { documentId, status } = req.body;

        // تحقق من الحقول الأساسية
        if (!documentId || !status) {
            return res.status(400).json({ message: "Document ID and status are required." });
        }

        // التحقق من القيم المسموحة لحقل status
        const allowedStatuses = ['Accepted', 'Rejected'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status value. Allowed values are: ${allowedStatuses.join(', ')}` });
        }

        // جلب المستند
        const document = await Document.findById(documentId)
            .populate({
                path: 'projectId',
                populate: {
                    path: 'supervisor',
                    select: '_id name username email fcmTocken' // تحديد الحقول المطلوبة فقط من المشرف
                }
            });

        if (!document) {
            return res.status(404).json({ message: "Document not found." });
        }

        // تحديث حالة المستند
        document.status = status;
        await document.save();

        let title, content;
        title = 'Feedback review';
        content = `Subject cordinator ${status} file uploded of ${document.projectId.projectName} project.`
        await this.Notification(document.projectId.supervisor.fcmTocken, document.projectId.supervisor._id, document.projectId, title, content);



        res.status(200).json({
            message: `Document status updated to ${status}.`,
            // updatedDocument: {
            //     id: document._id,
            //     status: document.status,
            //     filePath: document.filePath
            // }
        });
    } catch (error) {
        console.error("Error updating document status:", error);
        res.status(500).json({ message: "Error updating document status.", error: error.message });
    }
};



exports.getallDocument = async (req, res) => {

    const documents = await Document.find().sort({ createdAt: -1 });
    res.status(200).json({ message: "Document created successfully.", documents });



}


exports.createTask = async (req, res) => {
    const { projectId, studentAssignedTo, title, description, dueDate } = req.body;

    try {
        // التحقق من وجود جميع الحقول المطلوبة
        if (!projectId || !studentAssignedTo || !title || !dueDate) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        const project = await ProjectStudent.findOne({ projectId });

        if (req.role != 'Supervisor' && req.role != 'Admin') {

            let leader = project.students.find(student => {
                if (student.roleInProject === 'Team Leader'); // التحقق مع إزالة المسافات وحالة الأحرف
                return student;
            });

            if (leader.studentId.toString() != req.userId) {
                return res.status(400).json({ message: "not authoraized." });
            }
        }
        const studentAssignedTo = await User.findById(studentAssignedTo);

        // إنشاء مهمة جديدة
        const newTask = new Task({
            projectId,
            studentAssignedTo,
            title,
            description,
            dueDate
        });

        await newTask.save();

        let title, content;
        title = 'Task created';
        content = `A ${title} task Assigned to you.`
        await this.Notification(studentAssignedTo.fcmTocken, studentAssignedTo, projectId, title, content);

        res.status(201).json({ message: "Task created successfully.", task: newTask });

    } catch (error) {
        res.status(500).json({ message: "Error creating task.", error: error.message });
    }
};




exports.TasksFilter = async (req, res, next) => {

    const { projectId, status, studentAssignedTo } = req.query;

    try {
        let filter = {};
        if (!projectId) {

            const error = new Error('projectId required')
            error.statusCode = 400;
            throw error;
        }
        filter.projectId = projectId;
        if (status) filter.status = status;
        if (studentAssignedTo) filter.studentAssignedTo = studentAssignedTo;

        const tasks = await Task.find(filter)
            .populate('projectId', 'projectName')
            .populate('studentAssignedTo', 'name username email');

        res.status(200).json({ message: "Filtered tasks retrieved successfully.", tasks });
    } catch (error) {
        next(error);

    }
};




exports.getTaskById = async (req, res) => {
    const { taskId } = req.params;

    try {
        const task = await Task.findById(taskId)
            .populate('projectId', 'projectName')
            .populate('studentAssignedTo', 'name email');

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }

        res.status(200).json({ message: "Task retrieved successfully.", task });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving task.", error: error.message });
    }
};




exports.updateTask = async (req, res) => {

    // const { taskId } = req.params;
    const { taskId, studentAssignedTo, title, description, dueDate } = req.body;


    try {
        // const project = await ProjectStudent.findOne({ projectId });

        if (req.role != 'Supervisor' && req.role != 'Admin') {
            const project = await ProjectStudent.findOne({ 'students.studentId': req.userId })

            let leader = project.students.find(student => {
                if (student.roleInProject === 'Team Leader'); // التحقق مع إزالة المسافات وحالة الأحرف
                return student;
            });

            if (leader.studentId.toString() != req.userId) {
                return res.status(400).json({ message: "not authoraized." });
            }
        }
        // التحقق من وجود المهمة
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }
        let AssignedTo = User.findById(task.studentAssignedTo);
        // تحديث المهمة
        if (studentAssignedTo) {
            task.studentAssignedTo = studentAssignedTo;
            AssignedTo = User.findById(studentAssignedTo);
        }
        if (title) task.title = title;
        if (description) task.description = description;
        if (dueDate) task.dueDate = dueDate;

        await task.save();



        let title, content;
        title = 'Task Updated';
        content = `A ${title} task updated.`
        await this.Notification(AssignedTo.fcmTocken, AssignedTo._id, task.projectId, title, content);


        res.status(200).json({ message: "Task updated successfully.", task });
    } catch (error) {
        res.status(500).json({ message: "Error updating task.", error: error.message });
    }
};



exports.deleteTask = async (req, res) => {
    const { taskId } = req.params;

    try {

        if (req.role != 'Supervisor' && req.role != 'Admin') {
            const project = await ProjectStudent.findOne({ 'students.studentId': req.userId })

            let leader = project.students.find(student => {
                if (student.roleInProject === 'Team Leader'); // التحقق مع إزالة المسافات وحالة الأحرف
                return student;
            });

            if (leader.studentId.toString() != req.userId) {
                return res.status(400).json({ message: "not authoraized." });
            }
        }
        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({ message: "Task not found." });
        }
        console.log(task);
        //must recheck agine..................

        let title, content;
        title = 'Task Deleted';
        content = `A ${title} task deleted.`
        await this.Notification(AssignedTo.fcmTocken, AssignedTo._id, task.projectId, title, content);

        res.status(200).json({ message: "Task deleted successfully." });
    } catch (error) {
        res.status(500).json({ message: "Error deleting task.", error: error.message });
    }
};





exports.updateTaskStatus = async (req, res) => {
    try {
        // استخراج معرف المهمة والحالة الجديدة من جسم الطلب
        const { taskId, newStatus } = req.body;
        // نفترض أن معرف الطالب الحالي موجود في req.userId (من خلال Middleware للمصادقة)
        const userId = req.userId;

        // التأكد من وجود كل من taskId والحالة الجديدة
        if (!taskId || !newStatus) {
            return res.status(400).json({ success: false, message: "يجب توفير معرف المهمة والحالة الجديدة." });
        }

        // قائمة الحالات المسموحة
        // const allowedStatuses = ["Not Started", "In Progress", "Complete"];
        // if (!allowedStatuses.includes(newStatus)) {
        //     return res.status(400).json({ success: false, message: "الحالة الجديدة غير صالحة." });
        // }

        // جلب المهمة من قاعدة البيانات باستخدام taskId
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ success: false, message: "المهمة غير موجودة." });
        }

        // التحقق من أن الطالب الحالي هو المسؤول عن المهمة
        if (task.studentAssignedTo.toString() !== userId) {
            return res.status(403).json({ success: false, message: "غير مسموح لك بتغيير حالة هذه المهمة." });
        }

        // تحديث حالة المهمة وحفظها
        task.status = newStatus;
        await task.save();

        return res.status(200).json({
            success: true,
            message: "تم تحديث حالة المهمة بنجاح.",
            task
        });
    } catch (error) {
        console.error("Error updating task status:", error.message);
        return res.status(500).json({ success: false, message: "خطأ في الخادم الداخلي.", error: error.message });
    }
};






exports.getProjectProgress = async (req, res) => {
    try {
        const { projectId } = req.query;
        if (!projectId) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        // جلب جميع المهام المرتبطة بالمشروع
        const tasks = await Task.find({ projectId });

        if (!tasks.length) {
            return res.status(404).json({ success: false, message: "No tasks found for this project" });
        }

        let studentProgress = {}; // نسبة إنجاز كل طالب
        let totalTasks = tasks.length; // إجمالي عدد المهام في المشروع
        let totalAssignedTasks = 0; // عدد المهام المسندة للطلاب

        tasks.forEach(task => {
            if (!task.studentAssignedTo) return; // تجاهل المهام غير المسندة لأي طالب

            const studentId = task.studentAssignedTo.toString();
            totalAssignedTasks++;

            // إذا كان الطالب غير مضاف بعد، أضفه مع قيم افتراضية
            if (!studentProgress[studentId]) {
                studentProgress[studentId] = {
                    completed: 0,
                    inProgress: 0,
                    pending: 0,
                    totalTasks: 0
                };
            }

            studentProgress[studentId].totalTasks++; // زيادة عدد المهام المخصصة له

            // تحديث التقدم بناءً على حالة المهمة
            if (task.status === "Completed") {
                studentProgress[studentId].completed++;
            } else if (task.status === "In Progress") {
                studentProgress[studentId].inProgress++;
            } else {
                studentProgress[studentId].pending++;
            }
        });

        // جلب بيانات جميع الطلاب الذين لديهم مهام في المشروع
        const studentIds = Object.keys(studentProgress);
        const studentsData = await User.find({ _id: { $in: studentIds } }).select("name");

        // تحويل بيانات الطلاب إلى Map لسهولة الوصول إليها
        const studentMap = {};
        studentsData.forEach(student => {
            studentMap[student._id.toString()] = student.name;
        });

        let studentCompletionData = []; // بيانات كل طالب من حيث نسبة الإنجاز والمساهمة

        studentIds.forEach(studentId => {
            const { completed, inProgress, pending, totalTasks } = studentProgress[studentId];

            // نسبة إنجاز الطالب
            const completionRate = totalTasks > 0
                ? ((completed + inProgress * 0.5) / totalTasks) * 100
                : 0;

            // نسبة مساهمة الطالب
            const contributionRate = totalAssignedTasks > 0
                ? (totalTasks / totalAssignedTasks) * 100
                : 0;

            // إضافة معلومات الطالب مع استبدال الـ ID بالاسم
            studentCompletionData.push({
                studentId: studentMap[studentId] || "Unknown",
                totalTasks,
                completed,
                inProgress,
                pending,
                completionRate: parseFloat(completionRate.toFixed(2)), // تقريب إلى منزلتين عشريتين
                contributionRate: parseFloat(contributionRate.toFixed(2)),
            });
        });

        // حساب نسبة إنجاز المشروع ككل بناءً على متوسط إنجاز جميع الطلاب
        const projectCompletionRate = studentCompletionData.length > 0
            ? studentCompletionData.reduce((sum, student) => sum + student.completionRate, 0) / studentCompletionData.length
            : 0;

        res.status(200).json({
            success: true,
            projectCompletionRate: parseFloat(projectCompletionRate.toFixed(2)), // نسبة إنجاز المشروع
            students: studentCompletionData, // بيانات كل طالب
        });

    } catch (error) {
        console.error("Error fetching project progress:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching project progress",
            error: error.message,
        });
    }
};



exports.getProjectsProgressForSupervisor = async (req, res) => {
    try {
        const { academicYear, semester } = req.query;

        if (!academicYear || !semester) {
            return res.status(400).json({ success: false, message: "Academic Year and Semester are required" });
        }

        // جلب جميع المشاريع المطابقة للسنة والفصل الدراسي
        const projects = await Project.find({ Academic_year: academicYear, semester, supervisor: req.userId });

        if (!projects.length) {
            return res.status(404).json({ success: false, message: "No projects found for this academic year and semester" });
        }

        let allProjectsProgress = []; // بيانات إنجاز كل مشروع
        let totalCompletionRate = 0; // إجمالي نسبة الإنجاز لكل المشاريع
        let projectsCount = 0;
        for (const project of projects) {
            // جلب جميع المهام الخاصة بكل مشروع
            const tasks = await Task.find({ projectId: project._id });
            projectsCount++;
            if (!tasks.length) {
                allProjectsProgress.push({
                    projectId: project._id,
                    projectName: project.projectName,
                    projectCompletionRate: "0.00",
                });
                continue; // الانتقال للمشروع التالي
            }

            let totalTasks = tasks.length;
            let completedTasks = tasks.filter(task => task.status === "completed").length;
            let inProgressTasks = tasks.filter(task => task.status === "inProgress").length;

            // حساب نسبة إنجاز المشروع
            let projectCompletionRate = ((completedTasks + (inProgressTasks * 0.5)) / totalTasks) * 100;

            // تخزين بيانات المشروع
            allProjectsProgress.push({
                projectId: project._id,
                projectName: project.projectName,
                projectCompletionRate: projectCompletionRate.toFixed(2),
            });

            // جمع نسب الإنجاز لحساب المتوسط لاحقًا
            totalCompletionRate += projectCompletionRate;
        }

        // حساب متوسط إنجاز جميع المشاريع في الفصل والسنة المحددين
        const averageCompletionRate = (totalCompletionRate / projects.length).toFixed(2);

        res.status(200).json({
            success: true,
            academicYear,
            semester,
            projectsCount: projectsCount,
            averageCompletionRate, // متوسط إنجاز المشاريع
            projects: allProjectsProgress, // قائمة بكل مشروع ونسبة إنجازه
        });

    } catch (error) {
        console.error("Error fetching projects progress:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching projects progress",
            error: error.message,
        });
    }
};





exports.getProjectsProgressBySupervisors = async (req, res) => {
    try {
        const { academicYear, semester, projectType } = req.query;

        if (!academicYear || !semester) {
            return res.status(400).json({ success: false, message: "Academic Year and Semester are required" });
        }
        let filter = {};
        filter.Academic_year = academicYear;
        filter.semester = semester;
        if (projectType) filter.projectType = projectType;
        // جلب جميع المشاريع المطابقة للسنة والفصل الدراسي مع المشرفين
        const projects = await Project.find(filter).populate("supervisor", "name");

        if (!projects.length) {
            return res.status(404).json({ success: false, message: "No projects found for this academic year and semester" });
        }

        let allProjectsProgress = []; // بيانات إنجاز كل مشروع
        let supervisorProgress = {}; // تخزين الإنجاز بناءً على المشرفين
        let totalCompletionRate = 0; // إجمالي نسبة الإنجاز لكل المشاريع
        let totalProjectsCount = projects.length; // عدد المشاريع الكلي

        for (const project of projects) {
            // جلب جميع المهام الخاصة بكل مشروع
            const tasks = await Task.find({ projectId: project._id });

            if (!tasks.length) {
                allProjectsProgress.push({
                    projectId: project._id,
                    projectName: project.projectName,
                    supervisor: project.supervisor?.name || "Unknown",
                    projectCompletionRate: "0.00",
                });
                continue; // الانتقال للمشروع التالي
            }

            let totalTasks = tasks.length;
            let completedTasks = tasks.filter(task => task.status === "completed").length;
            let inProgressTasks = tasks.filter(task => task.status === "inProgress").length;

            // حساب نسبة إنجاز المشروع
            let projectCompletionRate = ((completedTasks + (inProgressTasks * 0.5)) / totalTasks) * 100;

            // إضافة المشروع إلى القائمة
            allProjectsProgress.push({
                projectId: project._id,
                projectName: project.projectName,
                supervisor: project.supervisor?.name || "Unknown",
                projectCompletionRate: projectCompletionRate.toFixed(2),
            });

            // جمع نسب الإنجاز لكل مشرف
            const supervisorName = project.supervisor?.name || "Unknown";
            if (!supervisorProgress[supervisorName]) {
                supervisorProgress[supervisorName] = { totalProjects: 0, totalCompletion: 0 };
            }

            supervisorProgress[supervisorName].totalProjects++;
            supervisorProgress[supervisorName].totalCompletion += projectCompletionRate;

            // جمع نسب الإنجاز لحساب المتوسط العام لاحقًا
            totalCompletionRate += projectCompletionRate;
        }

        // حساب متوسط إنجاز جميع المشاريع في الفصل والسنة المحددين
        const averageCompletionRate = (totalProjectsCount > 0)
            ? (totalCompletionRate / totalProjectsCount).toFixed(2)
            : "0.00";

        // حساب متوسط الإنجاز لكل مشرف
        let supervisorsStats = [];
        Object.keys(supervisorProgress).forEach(supervisorName => {
            const { totalProjects, totalCompletion } = supervisorProgress[supervisorName];
            supervisorsStats.push({
                supervisor: supervisorName,
                totalProjects,
                averageCompletionRate: (totalCompletion / totalProjects).toFixed(2),
            });
        });

        // ترتيب المشرفين حسب الإنجاز من الأعلى إلى الأدنى
        supervisorsStats.sort((a, b) => b.averageCompletionRate - a.averageCompletionRate);

        res.status(200).json({
            success: true,
            academicYear,
            semester,
            totalProjects: totalProjectsCount, // إجمالي عدد المشاريع
            averageCompletionRate, // متوسط إنجاز جميع المشاريع
            supervisors: supervisorsStats, // قائمة المشرفين ومتوسط إنجازهم وعدد مشاريعهم
            projects: allProjectsProgress, // قائمة بكل مشروع ونسبة إنجازه
        });

    } catch (error) {
        console.error("Error fetching projects progress by supervisors:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching projects progress by supervisors",
            error: error.message,
        });
    }
};






const clearFile = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, (err => { if (err) { console.log(err) } }));
};
