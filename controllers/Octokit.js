require('dotenv').config();

const { initializeOctokit } = require('../middleware/Octokit');

const User = require('../models/User');




exports.inviteToOrganization = async (username) => {

    try {


        const octokit = await initializeOctokit();

        const org = process.env.OrgName;

        if (!org || !username) {
            return res.status(400).json({ message: 'Organization and username are required' });
        }

        // جلب الـ user ID للمستخدم عبر اسم المستخدم
        const { data: user } = await octokit.users.getByUsername({ username });

        // دعوة المستخدم للمنظمة باستخدام invitee_id
        const invitation = await octokit.orgs.createInvitation({
            org,  // اسم المنظمة
            invitee_id: user.id  // استخدام الـ GitHub user ID بدلاً من اسم المستخدم
        });

        console.log({ message: 'Invitation sent successfully', invitation: invitation.data })
        return { success: true, message: `${username} Invitation sent successfully ti organization ${org} ` };


    } catch (error) {
        console.log({ message: 'eroor', error: error.message });
    }
};



exports.removeUserFromOrg = async (username) => {

    try {

        const octokit = await initializeOctokit();
        const org = process.env.OrgName;

        await octokit.orgs.removeMembershipForUser({
            org,    // اسم المنظمة
            username: username, // اسم المستخدم الذي تريد حذفه
        });
        console.log(`${username} removed from ${org}`);
        return { success: true, message: `${username} removed from ${org}` };
    } catch (error) {
        console.error('Error removing user:', error);
    }
}



exports.createRepoForOrg = async (repoName) => {

    try {
        const octokit = await initializeOctokit();

        const org = process.env.OrgName;

        await octokit.repos.createInOrg({
            org,
            name: repoName,
            // private: true, // جعل المستودع خاصًا, لايمكن جعله خاص بسبب العقوبات الامريكية بنت الكلب 
        });
        console.log(`Repository ${repoName} created in organization ${org} `);
        return { success: true, message: `Repository ${repoName} created in organization ${org} ` };
    } catch (error) {
        console.error('Error creating RepoForOrg:', error.message);
        throw new Error(`Failed to create RepoForOrg : ${error.message}`);

    }
}






// إنشاء فريق داخل المنظمة
exports.createTeam = async (teamName) => {

    try {
        const octokit = await initializeOctokit();

        const org = process.env.OrgName;
        await octokit.teams.create({
            org,             // اسم المنظمة
            name: teamName,       // اسم الفريق الجديد
            privacy: 'secret' //'closed'     // الفريق يكون مغلق (يمكنك تغييره حسب الحاجة)
        });

        console.log(`Team ${teamName} created successfully`);
        return { success: true, message: `Team ${teamName} created successfully` };


    } catch (error) {
        console.error('Error creating team:', error.message);
        throw new Error(`Failed to create team ${teamName}: ${error.message}`);
    }
};





exports.assignRepoToTeam = async (teamSlug, repo) => {
    try {
        const octokit = await initializeOctokit();
        const org = process.env.OrgName;

        // التحقق من المدخلات
        if (!org || !teamSlug || !repo) {
            throw new Error('Invalid input: organization, teamSlug, or repo is missing');
        }

        console.log(`Assigning repository "${repo}" to team "${teamSlug}" in organization "${org}"`);


        // إضافة المستودع للفريق
        await octokit.teams.addOrUpdateRepoPermissionsInOrg({
            org: org,               // اسم المنظمة
            owner: org, // تأكد من تمرير اسم المالك (المنظمة)
            team_slug: teamSlug,//team.data.name,
            repo: repo, //repoDetails.data.name,             // اسم المستودع
            permission: 'push'      // صلاحيات القراءة والكتابة
        });

        console.log(`${repo} Repository assigned to team ${teamSlug} successfully`);
        return { success: true };
    } catch (error) {
        console.error('Error assigning repository to team:', error.message);
        throw new Error(`Failed to assign repository to team ${teamSlug}: ${error.message}`);
    }
};



exports.addUserToTeam = async (teamNmae, students) => {
    try {

        const octokit = await initializeOctokit();
        const org = process.env.OrgName;

        students.forEach(async student => {

            let user = await User.findById(student.studentId)

            await octokit.teams.addOrUpdateMembershipForUserInOrg({
                org: org,
                owner: org,
                team_slug: teamNmae,
                username: user.username,
            });

        });

        console.log(`Users added to team ${teamNmae} successfully`);
        return { success: true, message: `Users added to team ${teamNmae} successfully` };

    } catch (error) {
        console.error('Error adding users to team:', error.message);
        throw new Error(`Failed to add users to team ${teamSlug}: ${error.message}`);
    }
}



// لحذف عضو من فريق داخل منظمة
exports.removeUserFromTeam = async (teamSlug, username) => {

    try {

        const octokit = await initializeOctokit();

        const org = process.env.OrgName;

        await octokit.teams.removeMembershipForUserInOrg({
            org,
            team_slug: teamSlug,   // المعرف الخاص بالفريق
            username: username,    // اسم المستخدم
        });

        console.log(`${username} removed from team ${teamSlug}`);
        return { success: true, message: `${username} removed from team ${teamSlug}` };
    } catch (error) {
        console.error('Error removing user from team:', error);
        next(error);
    }
}






exports.assignSupAccessToRepo = async (repoName, username) => {
    try {
        const octokit = await initializeOctokit();
        const org = process.env.OrgName;

        // إضافة المشرف إلى المستودع مع صلاحيات القراءة فقط
        await octokit.repos.addCollaborator({
            owner: org,
            repo: repoName,
            username: username,
            permission: 'read' // صلاحية القراءة فقط
        });

        return { success: true, message: `${username} granted read access to repository ${repoName}` };

    } catch (error) {
        console.error('Error assigning read access to repository:', error);
        throw new Error(`Failed to assign read access to ${username} on ${repoName}: ${error.message}`);
    }
};






exports.removeRepoFromTeam = async (teamSlug, repoName) => {
    try {
        const octokit = await initializeOctokit(); // التأكد من تهيئة Octokit
        const org = process.env.OrgName; // اسم المنظمة

        // إزالة ارتباط المستودع بالفريق
        await octokit.teams.removeRepoInOrg({
            org: org,
            team_slug: teamSlug, // معرف الفريق
            owner: org, // اسم المنظمة
            repo: repoName, // اسم المستودع
        });

        console.log(`Repository "${repoName}" removed from team "${teamSlug}" successfully.`);
        return { success: true, message: `Repository "${repoName}" removed from team "${teamSlug}" successfully.` };
    } catch (error) {
        console.error('Error removing repository from team:', error.message);
        throw new Error(`Failed to remove repository "${repoName}" from team "${teamSlug}": ${error.message}`);
    }
};



exports.deleteTeam = async (teamSlug) => {
    try {
        const octokit = await initializeOctokit(); // التأكد من تهيئة Octokit
        const org = process.env.OrgName; // اسم المنظمة

        // حذف الفريق
        await octokit.teams.deleteInOrg({
            org: org,
            team_slug: teamSlug, // معرف الفريق
        });

        console.log(`Team "${teamSlug}" deleted successfully.`);
        return { success: true, message: `Team "${teamSlug}" deleted successfully.` };
    } catch (error) {
        console.error('Error deleting team:', error.message);
        throw new Error(`Failed to delete team "${teamSlug}": ${error.message}`);
    }
};



exports.deleteRepo = async (repoName) => {
    try {
        const octokit = await initializeOctokit(); // التأكد من تهيئة Octokit
        const org = process.env.OrgName; // اسم المنظمة

        // حذف المستودع
        await octokit.repos.delete({
            owner: org, // اسم المنظمة
            repo: repoName, // اسم المستودع
        });

        console.log(`Repository "${repoName}" deleted successfully.`);
        return { success: true, message: `Repository "${repoName}" deleted successfully.` };
    } catch (error) {
        console.error('Error deleting repository:', error.message);
        throw new Error(`Failed to delete repository "${repoName}": ${error.message}`);
    }
};



exports.deleteTeamAndRepo = async (teamSlug, repoName) => {
    try {
        // إزالة ارتباط المستودع بالفريق
        await this.removeRepoFromTeam(teamSlug, repoName);

        // حذف الفريق
        await this.deleteTeam(teamSlug);

        // حذف المستودع
        await this.deleteRepo(repoName);

        console.log(`Team "${teamSlug}" and repository "${repoName}" deleted successfully.`);
        return { success: true, message: `Team "${teamSlug}" and repository "${repoName}" deleted successfully.` };
    } catch (error) {
        console.error('Error deleting team and repository:', error.message);
        throw new Error(`Failed to delete team and repository: ${error.message}`);
    }
};



exports.checkRepoAccess = async (repoName) => {
    try {
        const octokit = await initializeOctokit();
        const org = process.env.OrgName;

        // جلب قائمة المتعاونين
        const collaborators = await octokit.repos.listCollaborators({
            owner: org,
            repo: repoName
        });

        console.log(`Collaborators for repository "${repoName}":`, collaborators.data);
        return collaborators.data;
    } catch (error) {
        console.error('Error fetching collaborators:', error.message);
        throw new Error(`Failed to fetch collaborators: ${error.message}`);
    }
};










exports.getProjectActivityLog = async (req, res) => {
    try {
        const { repoName, startDate, endDate } = req.query;
        const org = process.env.OrgName;
        const octokit = await initializeOctokit();

        let timeline = [];
        let branchCreators = new Map();

        // تحويل startDate و endDate إلى كائنات Date
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // 1️⃣ جلب أحداث المستودع (Repo Events)
        const eventsResponse = await octokit.activity.listRepoEvents({
            owner: org,
            repo: repoName,
            per_page: 50,
        });

        eventsResponse.data.forEach(event => {
            const eventDate = event.created_at ? new Date(event.created_at) : null;
            const author = event.actor?.login || "Unknown";

            if (event.type === "CreateEvent" && event.payload.ref_type === "branch") {
                // ✅ تسجيل من أنشأ الفرع
                const branchName = event.payload.ref || "Unknown";
                branchCreators.set(branchName, author);

                timeline.push({
                    type: "Branch Created",
                    branch: branchName,
                    author: author,
                    date: event.created_at,
                });
            } else if (event.type === "PushEvent") {
                // ✅ كود تم دفعه (Push)
                timeline.push({
                    type: "Code Pushed",
                    branch: event.payload.ref?.replace("refs/heads/", "") || "Unknown",
                    author: author,
                    commit_count: event.payload.size || 0,
                    date: event.created_at,
                });
            }
        });

        // 2️⃣ جلب قائمة الفروع
        const branchesResponse = await octokit.repos.listBranches({
            owner: org,
            repo: repoName,
        });

        for (const branch of branchesResponse.data) {
            let branchCreationDate = null;
            let branchCreator = branchCreators.get(branch.name) || "Unknown";

            try {
                // جلب أول كوميت في الفرع للحصول على `author` و `date`
                const commitsOnBranch = await octokit.repos.listCommits({
                    owner: org,
                    repo: repoName,
                    sha: branch.name,
                    per_page: 1,
                });

                if (commitsOnBranch.data.length > 0) {
                    branchCreationDate = commitsOnBranch.data[0].commit.author.date;
                    branchCreator = commitsOnBranch.data[0].commit.author.name || branchCreator;
                }
            } catch (error) {
                console.warn(`Error fetching first commit for branch: ${branch.name}`);
            }

            // ✅ إذا لم يتم تسجيل الفرع في `CreateEvent`
            if (!branchCreators.has(branch.name)) {
                timeline.push({
                    type: "Branch Created",
                    branch: branch.name,
                    author: branchCreator,
                    date: branchCreationDate,
                });
            }
        }

        // 3️⃣ جلب الكوميتات على كل فرع
        for (const branch of branchesResponse.data) {
            const commitsResponse = await octokit.repos.listCommits({
                owner: org,
                repo: repoName,
                sha: branch.name,
                per_page: 10,
            });

            commitsResponse.data.forEach(commit => {
                if (commit.commit && commit.commit.author) {
                    timeline.push({
                        type: "Commit",
                        branch: branch.name,
                        message: commit.commit.message,
                        author: commit.commit.author.name || "Unknown",
                        date: commit.commit.author.date || null,
                    });
                }
            });
        }

        // 4️⃣ جلب Pull Requests
        const pullsResponse = await octokit.pulls.list({
            owner: org,
            repo: repoName,
            state: "all",
            per_page: 50,
        });

        pullsResponse.data.forEach(pr => {
            timeline.push({
                type: "Pull Request",
                title: pr.title,
                author: pr.user?.login || "Unknown",
                state: pr.state,
                branch: pr.head.ref,
                date: pr.created_at || null,
            });

            if (pr.merged_at) {
                timeline.push({
                    type: "Pull Request Merged",
                    title: pr.title,
                    author: pr.user?.login || "Unknown",
                    branch: pr.head.ref,
                    date: pr.merged_at,
                });
            }
        });

        // 5️⃣ **فلترة جميع البيانات بعد الجمع للتأكد من توافقها مع `startDate` و `endDate`**
        timeline = timeline.filter(item => {
            if (!item.date) return false; // استبعاد الأحداث التي لا تحتوي على تاريخ
            const itemDate = new Date(item.date);
            return (!start || itemDate >= start) && (!end || itemDate <= end);
        });

        // 6️⃣ ترتيب الأحداث حسب التاريخ من الأحدث إلى الأقدم
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 7️⃣ إرسال البيانات إلى الواجهة الأمامية
        res.status(200).json({
            success: true,
            timeline,
        });
    } catch (error) {
        console.error("Error fetching project activity log:", error.message);
        res.status(500).json({
            success: false,
            message: "Error fetching project activity log",
            error: error.message,
        });
    }
};















exports.setAdminRole = async (req, res, next) => {
    try {
        const octokit = await initializeOctokit();

        const { org, username } = req.body;  // اسم المنظمة واسم المستخدم المراد ترقيته

        if (!org || !username) {
            return res.status(400).json({ message: 'Organization and username are required' });
        }

        // جعل العضو Admin بعد قبوله الدعوة
        await octokit.orgs.setMembershipForUser({
            org,               // اسم المنظمة
            username,          // اسم المستخدم الذي تريد ترقيته
            role: 'admin'      // تعيينه كـ Admin
        });

        res.status(200).json({
            message: `User ${username} has been promoted to admin in the organization ${org}.`
        });

    } catch (error) {
        console.error('Error setting admin role:', error);


        res.status(500).json({ message: 'Error setting admin role', error: error.message });
    }
};
