const mongoose = require('mongoose');
const Committee = require('../models/Committee');
const CommitteeMember = require('../models/CommitteeMember');

const DiscussionSchedule = require('../models/DiscussionSchedule');
const Project = require('../models/Project');
const ProjectStudent = require('../models/ProjectStudent');
const NotificationModel = require('../models/Notification');

const { Notification } = require('./Project');
const User = require('../models/User');




// إضافة لجنة جديدة
exports.addCommittee = async (req, res) => {
    try {


        const { name, members, evaluationPhase } = req.body;

        // التحقق من المدخلات
        if (!name || !members || !evaluationPhase) {
            return res.status(400).json({ message: "Missing required fields (name, members, evaluationPhase)." });
        }

        const session = await mongoose.startSession();
        session.startTransaction(); // بدء معاملة (Transaction)

        // إنشاء اللجنة
        const newCommittee = new Committee({
            name,
            evaluationPhase
        });

        // حفظ اللجنة
        await newCommittee.save({ session });

        // إنشاء أعضاء اللجنة وربطهم باللجنة
        const newCommitteeMember = new CommitteeMember({
            committeeId: newCommittee._id,
            members
        });

        // حفظ أعضاء اللجنة
        await newCommitteeMember.save({ session });

        // تأكيد العملية
        await session.commitTransaction();
        session.endSession();

        await members.forEach(async member => {


            const memberAssignedTo = await User.findById(member.memberId);

            let title, content;
            title = 'Added to Committee';
            content = `you were added to a ${name} commitee for ${evaluationPhase}.`
            await Notification(memberAssignedTo.fcmToken, member.memberId, null, title, content);

        });
        // الرد النهائي
        res.status(201).json({
            message: "Committee and members created successfully",
            committee: newCommittee,
            committeeMembers: newCommitteeMember
        });
    } catch (error) {
        // إلغاء التغييرات إذا حدث خطأ
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Error creating committee and members", error });
    }
};






exports.updateCommittee = async (req, res) => {
    // const { committeeId } = req.params;
    const { committeeId, name, members, evaluationPhase } = req.body;

    try {
        // البحث عن اللجنة المطلوبة
        const committee = await Committee.findById(committeeId);
        if (!committee) {
            return res.status(404).json({ message: "Committee not found" });
        }

        // تحديث اسم اللجنة ومرحلة التقييم إذا تم إرسالها
        if (name) {
            committee.name = name;
        }
        if (evaluationPhase) {
            committee.evaluationPhase = evaluationPhase;
        }

        // تحديث الأعضاء
        if (members) {
            // جلب الأعضاء الحاليين من جدول الكسر CommitteeMember
            const committeeMembers = await CommitteeMember.findOne({ committeeId });

            if (!committeeMembers) {
                return res.status(404).json({ message: "Committee members not found" });
            }

            // التحقق من الأعضاء الجدد
            const newMembers = members.filter((newMember) =>
                !committeeMembers.members.some(
                    (existingMember) => existingMember.memberId.toString() === newMember.memberId
                )
            );

            // إضافة الأعضاء الجدد فقط
            committeeMembers.members.push(...newMembers);
            await committeeMembers.save();

            await newMembers.forEach(member => {


                const memberAssignedTo = User.findById(member.memberId);

                let title, content;
                title = 'Added to Committee';
                content = `you were added to a ${name} commitee for ${evaluationPhase}.`
                Notification(memberAssignedTo.fcmTocken, member.memberId, null, title, content);

            });
        }

        // حفظ التعديلات على اللجنة
        await committee.save();

        res.status(200).json({
            message: "Committee updated successfully",
            committee,
        });
    } catch (error) {
        console.error("Error updating committee:", error);
        res.status(500).json({ message: "Error updating committee", error });
    }
};




// ايجاد لجنة 
exports.getCommittees = async (req, res, next) => {
    try {
        // تعريف committeefilter ككائن فارغ
        let committeefilter = {};

        // إذا كان هناك committeeId في الطلب، نضيفه إلى فلتر البحث
        if (req.params.committeeId) {
            committeefilter.committeeId = req.params.committeeId;
            // جلب اللجان باستخدام الفلتر
            const committee = await CommitteeMember.findOne(committeefilter)
                .populate({
                    path: 'committeeId',
                    // select: 'name evaluationPhase' // تحديد الحقول المطلوبة فقط
                })
                .populate({ path: 'members.memberId' });//, 'name email'

            if (!committee) {
                res.status(404).json({ message: "Committee not found", });
            } else {
                res.status(200).json({ message: "Committee retrieved successfully", committee: committee });
            }

        } else { // جلب اللجان باستخدام الفلتر
            const committees = await CommitteeMember.find().sort({ createdAt: -1 })
                .populate({
                    path: 'committeeId',
                    // select: 'name evaluationPhase' // تحديد الحقول المطلوبة فقط
                })
                .populate({
                    path: 'members.memberId',
                    // select: 'name email' // تحديد الحقول المطلوبة فقط
                });

            if (!committees) {
                res.status(404).json({ message: "Committee not found" });
            } else {
                res.status(200).json({ message: "Committees retrieved successfully", committees: committees });
            }
        }
    } catch (error) {
        console.error("Error retrieving committees:", error);
        res.status(500).json({ message: "Error retrieving committees", error });
    }
};


// تابع لجلب جميع المشاريع
exports.getAllProjects = async (req, res) => {
    try {

        const { Academic_year, semester, projectType } = req.query;
        let projectFilter = {};

        // إعداد فلتر المشروع إذا تم إرسال البيانات
        if (Academic_year) projectFilter.Academic_year = Academic_year;
        if (semester) projectFilter.semester = semester;
        if (projectType) projectFilter.projectType = projectType;

        const projects = await Project.find(projectFilter).sort({ createdAt: -1 }); // جلب جميع المشاريع من قاعدة البيانات
        res.status(200).json({ success: true, projects: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching projects', error });
    }
};



// تابع لجلب جميع الجداول
exports.getSchedules = async (req, res) => {
    try {

        const schedules = await DiscussionSchedule.find().sort({ createdAt: -1 }); // جلب جميع المشاريع من قاعدة البيانات
        res.status(200).json({ success: true, schedules: schedules });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching schedules', error });
    }
};





exports.scheduleCommittee = async (req, res) => {
    try {
        const { committeeId, days, timeSlots, discussionDuration, Academic_year, semester, projectType } = req.body;

        // التحقق من المدخلات الأساسية
        if (!committeeId || !days || !timeSlots || !discussionDuration || !Academic_year || !semester || !projectType) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // التحقق من تكرار الأيام
        const uniqueDays = new Set(days);
        if (uniqueDays.size !== days.length) {
            return res.status(400).json({
                message: "Duplicate days detected. Please ensure all days are unique.",
                duplicateDays: days.filter((day, index) => days.indexOf(day) !== index)
            });
        }

        // التحقق من صحة الفترات الزمنية
        const validateTimeSlots = (timeSlots, discussionDuration) => {
            for (let i = 0; i < timeSlots.length; i++) {
                const slot = timeSlots[i];
                const slotStart = new Date(`1970-01-01T${slot.startTime}:00`);
                const slotEnd = new Date(`1970-01-01T${slot.endTime}:00`);

                // التحقق من أن البداية أقل من النهاية
                if (slotStart >= slotEnd) {
                    return {
                        valid: false,
                        message: `Time slot ${slot.startTime} - ${slot.endTime} has invalid start and end times.`
                    };
                }

                // التحقق من التداخل بين الفترات الزمنية
                for (let j = i + 1; j < timeSlots.length; j++) {
                    const nextSlot = timeSlots[j];
                    const nextSlotStart = new Date(`1970-01-01T${nextSlot.startTime}:00`);
                    const nextSlotEnd = new Date(`1970-01-01T${nextSlot.endTime}:00`);

                    // إذا كان هناك تداخل بين الفترات الزمنية
                    if (
                        (slotStart < nextSlotEnd && slotEnd > nextSlotStart) ||
                        (nextSlotStart < slotEnd && nextSlotEnd > slotStart)
                    ) {
                        return {
                            valid: false,
                            message: `Time slots ${slot.startTime} - ${slot.endTime} and ${nextSlot.startTime} - ${nextSlot.endTime} overlap.`
                        };
                    }

                    // التحقق من أن السلوت الجديد يبدأ بعد مدة المناقشة من نهاية السلوت السابق
                    const minStartTime = new Date(slotEnd.getTime() + discussionDuration / 2 * 60000);
                    if (nextSlotStart < minStartTime) {
                        return {
                            valid: false,
                            message: `Time slot ${nextSlot.startTime} - ${nextSlot.endTime} must start at least ${discussionDuration / 2} minutes after the previous slot (${slot.endTime}).`
                        };
                    }
                }
            }

            return { valid: true };
        };

        const uniqueSlots = validateTimeSlots(timeSlots, discussionDuration);
        if (!uniqueSlots.valid) {
            return res.status(400).json({
                message: uniqueSlots.message
            });
        }

        // التحقق من وجود اللجنة
        const committee = await Committee.findById(committeeId);
        if (!committee) {
            return res.status(404).json({ message: "Committee not found." });
        }

        // جلب المشاريع بناءً على الفلترة
        const projects = await Project.find({ Academic_year, semester, projectType });
        if (!projects.length) {
            return res.status(404).json({
                message: "No projects found for the given semester, type, and academic year."
            });
        }

        let totalProjects = projects.length;
        let schedule = [];
        let unscheduledProjects = [];
        let projectIndex = 0;

        // توزيع المشاريع على الفترات الزمنية والأيام
        for (const day of days) {
            for (const slot of timeSlots) {
                let slotStart = new Date(`${day}T${slot.startTime}`);
                let slotEnd = new Date(`${day}T${slot.endTime}`);
                let currentTime = slotStart;

                while (currentTime < slotEnd && projectIndex < totalProjects) {
                    const nextTime = new Date(currentTime.getTime() + discussionDuration * 60000);

                    // التحقق إذا كان المشروع يمكن أن يُجدول في هذه الفترة
                    if (nextTime <= slotEnd) {
                        schedule.push({
                            projectId: projects[projectIndex]._id,
                            date: day,
                            startTime: currentTime.toTimeString().substring(0, 5),
                            endTime: nextTime.toTimeString().substring(0, 5)
                        });

                        currentTime = nextTime;
                        projectIndex++;

                    } else {
                        break;
                    }
                }

                if (projectIndex >= totalProjects) break;
            }

            if (projectIndex >= totalProjects) break;
        }

        // التحقق من المشاريع غير المجدولة
        if (projectIndex < totalProjects) {
            for (let i = projectIndex; i < totalProjects; i++) {
                unscheduledProjects.push({
                    projectId: projects[i]._id,
                    requiredTime: discussionDuration,
                    semester: projects[i].semester,
                    projectType: projects[i].projectType
                });
            }

            return res.status(400).json({
                message: `Not all projects could be scheduled. Please increase the time slots or days.`,
                unscheduledProjects: unscheduledProjects.length,
                requiredAdditionalTime: unscheduledProjects.length * discussionDuration,
                scheduledProjects: schedule.length
            });
        }

        // حفظ جدول المناقشات
        await DiscussionSchedule.create({
            committeeId,
            schedule
        });

        await this.scheduleNotification(committeeId, schedule, days, timeSlots,);

        console.log('second');

        return res.status(200).json({
            message: "All discussions scheduled successfully.",
            schedule
        });
    } catch (error) {
        console.error("Error scheduling discussions:", error);
        return res.status(500).json({
            message: "Error scheduling discussions.",
            error: error.message
        });
    }
};







// exports.scheduleNotification = async (committeeId, schedule, days, timeSlots,) => {

//     try {

//         console.log('first start sending notifications...');

//         await schedule.forEach(project => {

//             let title, content;
//             title = 'Schedule a discussion';
//             content = `your project were  Scheduled to discussionin ${project.date} start at ${project.startTime}.`
//             Notification(null, null, project.projectId, title, content);

//         });
//         const commitee = await CommitteeMember.findById(committeeId);

//         commitee.members.forEach(async member => {


//             const memberAssignedTo = await User.findById(member.memberId);

//             let title, content;
//             title = 'Schedule a discussion';
//             content = `you have a discussion in ${days} at ${timeSlots}.`
//             console.log('content ' + content);
//             Notification(memberAssignedTo.fcmToken, member.memberId, null, title, content);


//         });
//         console.log('notifications sent...');
//         return { success: true, message: `notifications sent sucssfully` };

//     } catch (error) {
//         console.error('Error assigning read access to repository:', error);
//         throw new Error(`Failed to assign read access to ${username} on ${repoName}: ${error.message}`);
//     }
// }




//to doooooo

exports.scheduleNotification = async (committeeId, schedule, days, timeSlots) => {
    try {
        console.log('🔹 Starting to send notifications...');

        // ✅ التحقق مما إذا كان هناك مشاريع مجدولة
        if (!schedule || schedule.length === 0) {
            console.log("⚠️ No scheduled projects found.");
            return { success: false, message: "No scheduled projects found." };
        }

        // ✅ إرسال إشعارات للمشاريع المجدولة
        for (const project of schedule) {
            const title = 'Schedule a Discussion';
            const content = `Your project has been scheduled for discussion on ${project.date} starting at ${project.startTime}.`;

            await Notification(null, null, project.projectId, title, content);
            console.log(`✅ Notification sent to project ${project.projectId}`);
        }

        // ✅ جلب بيانات اللجنة والتحقق من وجودها
        const committee = await CommitteeMember.findById(committeeId);
        if (!committee) {
            console.log(`⚠️ Committee with ID ${committeeId} not found.`);
            return { success: false, message: "Committee not found." };
        }

        // ✅ إرسال إشعارات لأعضاء اللجنة
        for (const member of committee.members) {
            const memberAssignedTo = await User.findById(member.memberId);

            if (!memberAssignedTo) {
                console.log(`⚠️ Member with ID ${member.memberId} not found.`);
                continue;
            }

            if (!memberAssignedTo.fcmToken) {
                console.log(`⚠️ Member ${memberAssignedTo._id} does not have an FCM token.`);
                continue;
            }

            const title = 'Schedule a Discussion';
            const content = `You have a discussion scheduled on ${days} at ${timeSlots}.`;

            await Notification(memberAssignedTo.fcmToken, member.memberId, null, title, content);
            console.log(`✅ Notification sent to committee member ${member.memberId}`);
        }

        console.log('✅ All notifications sent successfully.');
        return { success: true, message: "Notifications sent successfully." };

    } catch (error) {
        console.error('❌ Error sending notifications:', error);
        throw new Error(`Failed to send notifications: ${error.message}`);
    }
};




exports.DocumentSubmissionNotification = async (req, res) => {
    try {
        const { Academic_year, semester, projectType, content, SubmissionDate } = req.body;
        let projectFilter = {};

        // ✅ إعداد فلتر المشروع إذا تم إرسال البيانات
        if (Academic_year) projectFilter.Academic_year = Academic_year;
        if (semester) projectFilter.semester = semester;
        if (projectType) projectFilter.projectType = projectType;

        // ✅ جلب جميع المشاريع من قاعدة البيانات بناءً على الفلتر
        const projects = await Project.find(projectFilter).sort({ createdAt: -1 });

        if (!projects.length) {
            return res.status(404).json({ success: false, message: 'No matching projects found.' });
        }

        let title = 'Document Submission Date', ncon;
        ncon = `${content} on ${SubmissionDate}`
        for (const project of projects) {
            // ✅ تحديث تاريخ تسليم الوثائق في المشروع
            await Project.updateOne({ _id: project._id }, { $set: { SubmissionDate: SubmissionDate } });

            // ✅ إرسال إشعار للمشروع
            await Notification(null, null, project._id, title, ncon);

            // ✅ البحث عن الطلاب المرتبطين بالمشروع
            const projectStudents = await ProjectStudent.findOne({ projectId: project._id });

            if (projectStudents && projectStudents.students.length > 0) {
                for (const student of projectStudents.students) {
                    // ✅ جلب بيانات كل طالب
                    const studentData = await User.findById(student.studentId);
                    if (studentData && studentData.fcmToken) {
                        // ✅ إرسال إشعار لكل طالب
                        await Notification(studentData.fcmToken, studentData._id, null, title, content);
                    }
                }
            }
        }

        res.status(200).json({ success: true, message: 'Notifications sent successfully' });

    } catch (error) {
        console.error('❌ Error sending document submission notifications:', error.message);
        res.status(500).json({ success: false, message: 'Error sending notifications', error: error.message });
    }
};

















