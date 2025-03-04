const express = require('express');
const router = express.Router();
exports.router = router;


const userController = require('../controllers/User');

const supervisorController = require('../controllers/Supervisor');
const projectController = require('../controllers/Project');

const isauth = require('../middleware/isauth');


// router.post('/feedback', projectController.feedback);
router.post('/feedback', isauth, projectController.feedback);

// // مسار لإنشاء مشروع جديد
// router.post('/addProject', isauth, supervisorController.addProject);

// // مسار لإضافة طالب إلى مشروع معين
// // router.post('/addStudentsToProject/:projectId', supervisorController.addStudentsToProject);
// router.post('/addStudentsToProject', supervisorController.addStudentsToProject);

router.post('/createTask', isauth, projectController.createTask);

router.get('/getStudents', isauth, userController.getUsers);

router.get('/getSupervisorProjects', isauth, supervisorController.getProjects);

router.get('/getSupervisorSchedules', isauth, supervisorController.getSupervisorSchedules);

router.get('/getProjectWithStudents/:projectId', supervisorController.getProjectWithStudents);

router.get('/getProjectsProgressForSupervisor', isauth, projectController.getProjectsProgressForSupervisor);


router.put('/updateUserInfo', userController.updateUserInfo);


module.exports = router;
