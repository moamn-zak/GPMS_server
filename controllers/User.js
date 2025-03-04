const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // تحميل المتغيرات البيئية


const User = require('../models/User'); // افترض أن مسار النموذج هو ../models/User
const ProjectStudent = require('../models/ProjectStudent');
const octokit = require('./Octokit');
const Project = require('../models/Project');

exports.adduser = async (req, res, next) => {
    const { name, username, password, email, role } = req.body;

    try {

        if (!name || !username || !password || !email || !role) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "This email already exists." });
        }
        // const existingUsername = await User.findOne({ username });
        // if (existingUsername) {
        //     return res.status(400).json({ message: "This Username already exists." });
        // }


        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword, // استخدام passwordHash بدلاً من password
            email,
            role
        });

        await newUser.save();
        await octokit.inviteToOrganization(username);
        res.status(201).json({ message: "User created successfully." });
    } catch (error) {
        error.message = "Error creating user account.";
        next(error);
    }
};

exports.login = async (req, res, next) => {
    const { email, password, fcmtoken } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password); // passwordHash بدلاً من password
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password.' });
        }

        if (!fcmtoken) {
            return res.status(401).json({ message: 'FCMtoken required.' });
        }
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        user.fcmToken = fcmtoken;
        await user.save()

        res.status(200).json({ message: "Login successful", token: token });
    } catch (error) {
        res.status(500).json({ message: "Error during login", error });
    }
};



exports.getprofile = async (req, res, next) => {
    try {
        const profile = await User.findById(req.userId).select('-password -fcmToken');
        if (!profile) {
            const error = new Error('Account not found.');
            error.statusCode = 404;
            throw error;

        }
        res.status(200).json({ profile: profile });
    } catch (error) {
        next(error);
    }
};





exports.updateUserInfo = async (req, res, next) => {


    try {
        const { name, username, email, password, role } = req.body;
        // const { name, username, email, password, role,userId } = req.body;
        // const userId = req.body;

        // if (!userId) {
        //     return res.status(400).json({ message: "User Id must be provided." });
        // }

        // const user = await User.findById( userId );
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(403).json({ message: 'User not found.' });
        }

        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ message: 'Account already exists with this email.' });
            }
            user.email = email;
        }
        if (name && name !== user.name) {
            user.name = name;
        }

        if (role && role !== user.role) {
            user.role = role;
        }
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword; // تأكد من استخدام passwordHash
        }

        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ message: 'Account already exists with this username.' });
            }
            await octokit.removeUserFromOrg(user.username);
            user.username = username;
            await octokit.inviteToOrganization(username);
        }



        await user.save();
        res.status(200).json({ message: 'User information updated successfully.', user });
    } catch (error) {
        next(error);
    }
};



exports.getUsers = async (req, res, next) => {
    try {
        let users;
        const { usersfilter } = req.query;
        if (usersfilter === 'Admin') {
            users = await User.find({ role: 'Supervisor' })
                .select('-password')
                .sort({ createdAt: -1 });
        } else if (usersfilter === 'Supervisor') {
            users = await User.find({ role: 'Student' })
                .select('-password')
                .sort({ createdAt: -1 });
        } else if (usersfilter === 'Student') {
            let project;
            // البحث عن المشروع المرتبط بالطالب
            if (req.role !== 'Student') {
                // const project =await Project.findOne({ supervisor: req.userId });

                project = await ProjectStudent.findOne({ projectId: req.query.projectId })
                    .populate('students.studentId')
                if (!project) {
                    return res.status(404).json({ message: 'No project found for this ID.' });
                }
            }
            else {
                // project = await ProjectStudent.findOne({ 'students.studentId': req.userId })
                project = await ProjectStudent.findOne({ projectId: req.query.projectId })
                    .populate('students.studentId')
                if (!project) {
                    return res.status(404).json({ message: 'No project found for this student.' });
                }
            }
            // جلب الطلاب في الفريق المرتبط بالمشروع
            users = project.students.map(student => ({
                studentId: student.studentId._id,
                name: student.studentId.name,
                username: student.studentId.username,
                roleInProject: student.roleInProject
            }));
        } else {
            users = await User.find()
                .select('-password')
                .sort({ createdAt: -1 });
        }

        if (!users || (Array.isArray(users) && users.length === 0)) {
            return res.status(404).json({ message: 'No users found.' });
        }

        res.status(200).json({ message: 'Users retrieved successfully', users });
    } catch (error) {
        next(error);
    }
};


exports.InOrActivateUser = async (req, res, next) => {

    const { userId, status } = req.body;

    try {

        if (req.role != 'Admin') {

            return res.status(400).json({ message: "not authoraized." });
        }
        // const user = await User.findByIdAndUpdate(userId);
        const user = await User.findById(userId);

        if (!user) res.status(404).json({ message: "user not found" });

        user.status = status;

        await user.save();
        res.status(201).json({ message: `user ${status}.` });

    } catch (error) {
        // next(error);
        res.status(500).json({ message: `Error during ${status}.`, error: error.message });
    }
};

