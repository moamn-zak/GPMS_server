const express = require('express');
const router = express.Router();



const userController = require('../controllers/User');
const projectController = require('../controllers/Project');
const supervisorController = require('../controllers/Supervisor');
const ConversationController = require('../controllers/Conversation');
const octokitController = require('../controllers/Octokit');

const isauth = require('../middleware/isauth');


router.post('/login', userController.login);

router.post('/addUser', userController.adduser);

router.post('/createtask', isauth, projectController.createTask);

// مسار لإنشاء مشروع جديد
router.post('/addProject', isauth, supervisorController.addProject);

// مسار لإضافة طالب إلى مشروع معين
router.post('/addStudentsToProject', supervisorController.addStudentsToProject);

router.post('/conversationSend', isauth, ConversationController.conversationSend);
// router.post('/conversationSend', ConversationController.conversationSend);






router.get('/getUsers', isauth, userController.getUsers);

router.get('/getprofile', isauth, userController.getprofile);

router.get('/tasksFilter', projectController.TasksFilter);

router.get('/getTaskById/:taskId', projectController.getTaskById);

router.get('/getProjectDocuments', projectController.getProjectDocuments);

router.get('/project-activity-log', octokitController.getProjectActivityLog);

router.get('/getProjectProgress', projectController.getProjectProgress);

router.get('/getNotifications', supervisorController.getNotifications);

router.get('/conversationReceive', ConversationController.conversationReceive);



router.put('/updateUserInfo', userController.updateUserInfo);

router.put('/updateTask', isauth, projectController.updateTask);

router.delete('/deleteTask/:taskId', isauth, projectController.deleteTask);









module.exports = router;