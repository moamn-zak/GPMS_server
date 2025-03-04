const Message = require('../models/Message');

const { getIO } = require('../middleware/socketIO');


// const { Notification } = require('./Project');


exports.Notification = async (fcmtoken, recipient, projectId, title, content) => {
    try {
        // ✅ إنشاء كائن الإشعار
        let notificationData = {
            title,
            content
        };

        if (recipient) notificationData.recipient = recipient;
        if (projectId) notificationData.projectId = projectId;


        // ✅ إرسال الإشعار إذا كان هناك `token` صالح
        if (fcmtoken) {
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


exports.conversationSend = async (req, res) => {
    try {
        const { projectId, content } = req.body;

        if (!projectId || !content) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // إنشاء الرسالة الجديدة
        const newMessage = new Message({
            sender: req.userId,
            projectId,
            content
        });

        await newMessage.save();

        // جلب معلومات المرسل بعد الحفظ
        const populatedMessage = await newMessage.populate("sender", "name email role");

        // إرسال الرسالة عبر Socket.io مع معلومات المرسل
        const io = getIO();
        await getIO().to(JSON.stringify(projectId)).emit('newMessage', populatedMessage);

        // إرسال إشعار للمشاركين في المشروع
        await this.Notification(null, null, projectId, "New Message", `You have a new message: "${content}"`);

        res.status(201).json({ success: true, message: "Message sent successfully", data: populatedMessage });

    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ success: false, message: "Error sending message", error: error.message });
    }
};




exports.conversationReceive = async (req, res) => {
    try {
        const { projectId } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required." });
        }

        // جلب جميع الرسائل الخاصة بالمشروع مع معلومات المرسل
        const messages = await Message.find({ projectId })
            .populate('sender', 'name username')
            .sort({ sentAt: 1 }); // ترتيب الرسائل من الأقدم إلى الأحدث

        res.status(200).json({
            success: true,
            message: "Messages fetched successfully.",
            messages
        });

    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ success: false, message: "Error fetching messages.", error: error.message });
    }
};





// exports.markMessagesAsRead = async (req, res) => {
//     try {
//         const { projectId } = req.body;

//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required." });
//         }

//         await Message.updateMany({ projectId, readStatus: false }, { $set: { readStatus: true } });

//         res.status(200).json({ success: true, message: "Messages marked as read." });

//     } catch (error) {
//         console.error("Error updating messages:", error.message);
//         res.status(500).json({ success: false, message: "Error updating messages.", error: error.message });
//     }
// };








