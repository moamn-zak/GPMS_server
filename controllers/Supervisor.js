// require('dotenv').config();

const Project = require('../models/Project'); // استيراد نموذج المشروع
const ProjectStudent = require('../models/ProjectStudent'); // استيراد نموذج المشروع
const NotificationModel = require('../models/Notification');

const octokit = require('./Octokit');

// دالة إنشاء مشروع جديد
exports.addProject = async (req, res) => {
    const { projectName, description, startDate, endDate, Academic_year, semester, projectType, supervisorId } = req.body;

    const session = await Project.startSession(); // بدء جلسة معاملات (Transaction)
    session.startTransaction();

    try {
        // التحقق من صحة السنة الأكاديمية
        let valiAcademic_year = Academic_year.split('-');
        if ((valiAcademic_year[0] - valiAcademic_year[1]) != -1) {
            throw new Error('Academic year invalid');
        }

        // إنشاء مشروع جديد
        const newProject = new Project({
            projectName,
            description,
            startDate,
            endDate,
            supervisor: req.role == 'Supervisor' ? req.userId : supervisorId,
            Academic_year,
            semester,
            projectType
        });

        console.log(`Creating project: ${newProject.projectName}`);

        // حفظ المشروع في قاعدة البيانات
        await newProject.save({ session });

        // إنشاء المستودع على GitHub
        console.log(`Creating repository for project: ${newProject.projectName}`);
        const repoResponse = await octokit.createRepoForOrg(newProject.projectName);

        if (!repoResponse || !repoResponse.success) {
            throw new Error(`Failed to create repository for project: ${newProject.projectName}`);
        }
        const repoTeam = await octokit.createTeam(newProject.projectName);

        if (!repoTeam || !repoTeam.success) {
            throw new Error(`Failed to create Team for project: ${newProject.projectName}`);
        }
        // إذا نجحت كل الخطوات، نقوم بتأكيد المعاملة
        await session.commitTransaction();
        session.endSession();

        console.log(`Project and repository created successfully: ${newProject.projectName}`);
        res.status(201).json({ message: "Project created successfully", project: newProject });
    } catch (error) {
        console.error("Error creating project:", error.message);

        // إذا حدث خطأ، نقوم بالتراجع عن المعاملة
        await session.abortTransaction();
        session.endSession();

        // إرسال رسالة الخطأ إلى العميل
        if (error.message) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Error creating project", error });
        }
    }
};







exports.addStudentsToProject = async (req, res) => {
    const { projectId, students } = req.body;

    const session = await ProjectStudent.startSession(); // بدء جلسة المعاملة (Transaction)
    session.startTransaction();

    try {
        // ✅ التحقق من وجود المشروع
        const project = await Project.findById(projectId).populate('supervisor');
        if (!project) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Project not found" });
        }

        // ✅ البحث عن ProjectStudent
        let projectStudent = await ProjectStudent.findOne({ projectId });

        if (!projectStudent) {
            // ✅ إذا لم يكن موجودًا، يتم إنشاؤه مع الطلاب الجدد
            projectStudent = new ProjectStudent({
                projectId,
                teamName: project.projectName,
                students // مصفوفة الطلاب مع أدوارهم
            });

            console.log(`Creating new team: ${project.projectName}`);

            // ✅ GitHub API Calls - التأكد من نجاح كل خطوة
            try {
                await octokit.assignRepoToTeam(project.projectName, project.projectName);
                await octokit.addUserToTeam(project.projectName, students);
                await octokit.assignSupAccessToRepo(project.projectName, project.supervisor.username);
            } catch (githubError) {
                await session.abortTransaction();
                session.endSession();
                console.error("GitHub API Error:", githubError.message);
                return res.status(500).json({ message: "GitHub API error", error: githubError.message });
            }

            // ✅ حفظ البيانات بعد نجاح كل العمليات
            await projectStudent.save({ session });

            // ✅ تأكيد المعاملة
            await session.commitTransaction();
            session.endSession();

            return res.status(201).json({
                message: "Students added to new project successfully",
                projectStudent
            });

        } else {
            // ✅ إذا كان موجودًا، يتم التحقق من وجود الطلاب
            let newStudentsAdded = false;
            let studentsToAdd = [];

            students.forEach(student => {
                const isExisting = projectStudent.students.some(existingStudent =>
                    existingStudent.studentId.toString() === student.studentId
                );

                if (!isExisting) {
                    projectStudent.students.push(student);
                    studentsToAdd.push(student.studentId);
                    newStudentsAdded = true;
                }
            });

            // ✅ تحديث الفريق في GitHub فقط إذا تمت إضافة طلاب جدد
            if (newStudentsAdded) {
                try {
                    await octokit.addUserToTeam(project.projectName, studentsToAdd);
                } catch (githubError) {
                    await session.abortTransaction();
                    session.endSession();
                    console.error("GitHub API Error:", githubError.message);
                    return res.status(500).json({ message: "GitHub API error", error: githubError.message });
                }
            }

            // ✅ حفظ التعديلات بعد نجاح كل العمليات
            await projectStudent.save({ session });

            // ✅ تأكيد المعاملة
            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                message: "Students added to existing project successfully",
                projectStudent
            });
        }
    } catch (error) {
        // ❌ إذا حدث خطأ، نقوم بالتراجع عن المعاملة
        await session.abortTransaction();
        session.endSession();
        console.error("Error adding students to project:", error.message);
        res.status(500).json({ message: "Error adding students to project", error: error.message });
    }
};




exports.getProjects = async (req, res) => {
    try {
        if (req.role === 'Supervisor') {
            const supervisorId = req.userId; // استخراج الـ ID الخاص بالمشرف من التوكن
            const Academic_year = req.query.Academic_year; // الحصول على السنة الأكاديمية من الطلب

            // إذا كانت السنة الأكاديمية موجودة، نطبق الفلترة عليها، وإلا نرجع جميع المشاريع
            const query = { supervisor: supervisorId };
            if (Academic_year) {
                query.Academic_year = Academic_year;
            }

            const projects = await Project.find(query).sort({ createdAt: -1 }); // جلب المشاريع
            if (projects.length <= 0) return res.status(200).json({ message: 'No projects matched', projects });

            return res.status(200).json({ success: true, projects });
        }

        else if (req.role === 'Student') {
            const studentId = req.userId; // استخراج معرف الطالب من التوكن

            // البحث عن المشاريع التي يشارك بها الطالب في سكيما ProjectStudent
            const projectStudent = await ProjectStudent.find({ 'students.studentId': studentId });
            const projectIds = projectStudent.map(ps => ps.projectId); // استخراج معرفات المشاريع

            // البحث عن المشاريع في سكيما Project باستخدام المعرّفات
            const projects = await Project.find({ _id: { $in: projectIds } }).sort({ createdAt: -1 });
            return res.status(200).json({ success: true, projects });
        }

        // إذا كان الدور غير مشرف أو طالب
        res.status(403).json({ success: false, message: 'Unauthorized role' });

    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ success: false, message: 'Error fetching projects', error });
    }
};





exports.getProjectWithStudents = async (req, res) => {
    try {
        const projectId = req.params.projectId; // الحصول على الـ projectId من الـ URL

        // جلب معلومات المشروع مع الطلاب بناءً على الـ projectId
        const projectWithStudents = await ProjectStudent.findOne({ projectId })
            .populate('projectId') // ربط الـ projectId بمعلومات المشروع
            .populate('students.studentId', 'name username email') // ربط الـ studentId بمعلومات الطالب (الاسم والبريد الإلكتروني)
            .select('-students._id '); // حذف الـ _id من داخل الطلاب
        console.log(projectWithStudents);
        if (!projectWithStudents) {
            return res.status(404).json({ message: 'Project not found' });
        }
        let project = projectWithStudents.students.map(student => ({

            studentId: student.studentId._id,
            name: student.studentId.name,
            username: student.studentId.username,
            email: student.studentId.email,
            roleInProject: student.roleInProject
        }));


        // إرسال استجابة بنجاح مع المشروع والطلاب
        res.status(200).json({ success: true, project: projectWithStudents.projectId, students: project });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching project with students', er: error.message });
    }
};






//  تابع لجلب الجداول الخاصة بالمشرف
exports.getSupervisorSchedules = async (req, res) => {

    try {

        const committees = await CommitteeMember.find({ 'members.memberId': req.userId });
        const schedules = {}

        committees.forEach(async element => {

            schedules.push(await DiscussionSchedule.find({ committeeId: element.committeeId })) // جلب جميع المشاريع من قاعدة البيانات
        })
        schedules.sort({ createdAt: -1 });
        res.status(200).json({ success: true, schedules: schedules });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching schedules', error });
    }

};




exports.getNotifications = async (req, res) => {
    try {
        const { recipient, projectId, limit = 50, page = 1 } = req.query;
        let filter = {};

        if (recipient) filter.recipient = recipient;
        if (projectId) filter.projectId = projectId;

        // ✅ جلب الإشعارات حسب الفلتر المحدد + تقسيم إلى صفحات
        const notifications = await NotificationModel.find(filter)
            .sort({ createdAt: -1 })
        // .limit(parseInt(limit))
        // .skip((parseInt(page) - 1) * parseInt(limit));

        res.status(200).json({
            success: true,
            total: notifications.length,
            // page: parseInt(page),
            // limit: parseInt(limit),
            notifications
        });

    } catch (error) {
        console.error("❌ Error fetching notifications:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching notifications",
            error: error.message
        });
    }
};
