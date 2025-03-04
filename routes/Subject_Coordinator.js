const express = require('express');
const router = express.Router();

const isauth = require('../middleware/isauth');

const userController = require('../controllers/User'); // افترض أن مسار الكنترولر هو ../controllers/authController

const Subject_CoordinatorController = require('../controllers/Subject_Coordinator');

const projectController = require('../controllers/Project');








// Subject_CoordinatorController
router.get('/getcommittees/:committeeId', Subject_CoordinatorController.getCommittees);

router.get('/getcommittees', Subject_CoordinatorController.getCommittees);

router.get('/getSchedules', Subject_CoordinatorController.getSchedules);

// router.get('/getcommittees', Subject_CoordinatorController.getCommittees);

router.get('/getAllProjects', Subject_CoordinatorController.getAllProjects);

// router.get('/getNotifications', Subject_CoordinatorController.getNotifications);

router.get('/getAlldoc', projectController.getallDocument);

router.get('/reviewfeedback', projectController.reviewFeedback);

router.get('/getProjectsProgressBySupervisors', projectController.getProjectsProgressBySupervisors);


// مسار إضافة لجنة جديدة
router.post('/createcommittees', Subject_CoordinatorController.addCommittee);

router.post('/scheduleCommittee', Subject_CoordinatorController.scheduleCommittee);

router.post('/DocumentSubmissionNotification', Subject_CoordinatorController.DocumentSubmissionNotification);

router.post('/coordinatorDecision', projectController.coordinatorDecision)

router.post('/InOrActivateUser', isauth, userController.InOrActivateUser);

// مسار تعديل معلومات اللجنة
router.put('/editcommittees/:committeeId', Subject_CoordinatorController.updateCommittee);



module.exports = router;
