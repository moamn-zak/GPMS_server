
const express = require('express');
const router = express.Router();



const userController = require('../controllers/User');
const projectController = require('../controllers/Project');


const isauth = require('../middleware/isauth');
const multer = require('../middleware/multer'); // استيراد إعدادات Multer
const supervisorController = require('../controllers/Supervisor');



router.post('/uploadfile', isauth, multer.single('file'), projectController.uploadFile);

router.post('/ ', isauth, projectController.uploadFile);

router.post('/updateStatusTask', isauth, projectController.updateTaskStatus);

router.get('/getStudentProjects', isauth, supervisorController.getProjects);










module.exports = router;