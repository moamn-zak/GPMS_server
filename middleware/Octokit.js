require('dotenv').config();


exports.initializeOctokit = async function () {
    const { Octokit } = await import('@octokit/rest');
    return new Octokit({
        auth: `${process.env.GITHUB_TOKEN}`,
    });
};


// setInterval(async () => {

//     try {
//         // استدعاء الدالة وتحديث المنظمات
//         const data = await admincontroller.updateorganization();

//         console.log('Organizations updated:', data);  // طباعة البيانات المحدثة

//     } catch (error) {
//         console.error('Error updating organizations:', error);
//     }

// }, 60 * 60 * 1000);  // تحديث كل يوم  24 * 60  
