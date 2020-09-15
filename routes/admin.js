import express from "express";
import passport from "passport";
import * as Models from "../db/models";
import moment from "moment-timezone";
import randomstring from "randomstring";

moment.tz.setDefault("Asia/Seoul");

const router = express.Router();
const ITEMS_PER_PAGE = 10;
// 특정 도전 기간의 요청 목록을 조회
router.get("/challenge/:challenge_id/request", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }

        const current_page = req.query.page || 1;
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });

        if (!current_challenge) {
            throw new Error("존재하지 않는 도전기간입니다");
        }

        const allRequests = await Models.JoinRequest.aggregate([
            { $match: { challenge: current_challenge._id } },
            {
                $sort: {
                    created_at: -1,
                },
            },
            {
                $skip: ITEMS_PER_PAGE * (current_page - 1),
            },
            {
                $limit: ITEMS_PER_PAGE,
            },
            {
                $lookup: {
                    from: "challenges",
                    localField: "challenge",
                    foreignField: "_id",
                    as: "challenge",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user",
                },
            },
        ]);
        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회되었습니다",
            data: allRequests,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 특정 사용자 승인 처리
router.put("/challenge/:challenge_id/user/:login/request", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (!current_challenge) {
            throw new Error("존재하지 않는 도전기간입니다");
        }

        const current_user = await Models.User.findOne({
            login: req.params.login,
        });
        if (!current_user) {
            throw new Error("존재하지 않는 사용자입니다");
        }

        current_challenge.participants.push(current_user._id);
        await current_challenge.save();

        const acceptRequest = await Models.JoinRequest.updateOne(
            {
                challenge: current_challenge._id,
                user: current_user._id,
                is_expired: false,
            },
            {
                is_accepted: true,
                is_expired: true,
            }
        );

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회되었습니다",
            data: acceptRequest,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 특정 사용자 반려 처리
router.delete(
    "/challenge/:challenge_id/user/:login/request",
    async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                throw new Error("로그인이 필요합니다");
            }
            if (!req.user.is_admin) {
                throw new Error("관리자 권한이 필요합니다");
            }
            const current_challenge = await Models.Challenge.findOne({
                id: req.params.challenge_id,
            });
            if (!current_challenge) {
                throw new Error("존재하지 않는 도전기간입니다");
            }

            const current_user = await Models.User.findOne({
                login: req.params.login,
            });
            if (!current_user) {
                throw new Error("존재하지 않는 사용자입니다");
            }

            const rejectRequest = await Models.JoinRequest.updateOne(
                {
                    challenge: current_challenge._id,
                    user: current_user._id,
                    is_expired: false,
                },
                {
                    is_accepted: false,
                    is_expired: true,
                }
            );

            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회되었습니다",
                data: rejectRequest,
            });
        } catch (e) {
            res.json({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: {
                    message: e.message || e.error || e,
                    object: e,
                },
            });
        }
    }
);

// 특정 사용자 프로젝트에서 제외
router.delete("/challenge/:challenge_id/user/:login", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (!current_challenge) {
            throw new Error("존재하지 않는 도전기간입니다");
        }

        const current_user = await Models.User.findOne({
            login: req.params.login,
        });
        if (!current_user) {
            throw new Error("존재하지 않는 사용자입니다");
        }

        let updated = await Models.Challenge.updateOne(
            { _id: current_challenge._id },
            {
                $pull: { participants: current_user._id },
            }
        );

        res.json({
            code: -1,
            status: "SUCCESS",
            message: "제외처리 되었습니다",
            data: updated,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 모든 사용자 조회
router.get("/users", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }

        const result = await Models.User.find();

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회되었습니다",
            data: result,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 관리자 가입용 토큰 생성
router.post("/token", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }
        const mExpired = moment().add(1, "hour");
        const generated_token = randomstring.generate();
        const newToken = new Models.AuthToken({
            value: generated_token,
            created_by: req.user._id,
            expired_at: mExpired.toDate(),
        });

        await newToken.save();

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "토큰이 생성되었습니다",
            data: newToken,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 생성된 토큰 조회
router.get("/token", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 필요합니다");
        }
        const current_page = req.query.page || 1;
        const result = await Models.AuthToken.aggregate([
            {
                $sort: {
                    expired_at: -1,
                },
            },
            {
                $skip: ITEMS_PER_PAGE * (current_page - 1),
            },
            {
                $limit: ITEMS_PER_PAGE,
            },
            {
                $lookup: {
                    from: "users",
                    localField: "used_by",
                    foreignField: "_id",
                    as: "used_by",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "created_by",
                    foreignField: "_id",
                    as: "created_by",
                },
            },
            {
                $project: {
                    _id: 0,
                    // value : 0,
                },
            },
        ]);

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회되었습니다",
            data: result,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 관리자 가입용 토큰
router.put("/token/:token", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (req.user.is_admin) {
            throw new Error("이미 관리자 계정으로 등록된 계정입니다");
        }
        const token = req.params.token;

        const fetchedToken = await Models.AuthToken.findOne({
            value: token,
        });
        if (!fetchedToken) {
            throw new Error(`[${req.params.token}]는 존재하지 않는 토큰입니다`);
        }
        const mNow = moment();
        const mExpired = moment(fetchedToken.expired_at);
        if (mNow.diff(mExpired) > 0) {
            throw new Error("만료된 토큰 입니다");
        }
        if (fetchedToken.used_by !== null) {
            throw new Error("이미 사용된 토큰입니다");
        }

        const update = await Models.User.updateOne(
            {
                _id: req.user._id,
            },
            {
                is_admin: true,
            }
        );

        fetchedToken.used_by = req.user._id;
        fetchedToken.expired_at = new Date();
        await fetchedToken.save();

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "전환되었습니다",
            data: update,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

router.delete("/token/:token", async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            throw new Error("로그인이 필요합니다");
        }
        if (!req.user.is_admin) {
            throw new Error("관리자 권한이 없습니다");
        }
        const token = req.params.token;
        const fetchedToken = await Models.AuthToken.findOne({
            value: token,
        });
        if (!fetchedToken) {
            throw new Error(`[${req.params.token}]는 존재하지 않는 토큰입니다`);
        }
        const mNow = moment();

        fetchedToken.expired_at = mNow.toDate();
        await fetchedToken.save();

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "만료 처리 되었습니다",
        });
    } catch (e) {
        console.log(e);
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    }
});

// 특정 사용자 삭제
router.delete("/user/:login", async (req, res) => {
    // 1. 존재하는 사용자인지 확인
    // 2. 관련 커밋 삭제
    // 3. 관련 저장소 삭제 혹은 contributor 제외 처리
    // 4. 관련 이벤트 삭제
    // 5. 도전 기간에서 참가자 삭제
    // 6. 사용자 삭제
    if (!req.isAuthenticated()) {
        throw new Error("로그인이 필요합니다");
    }
    if (!req.user.is_admin) {
        throw new Error("관리자 권한이 필요합니다");
    }
    // 다건 업데이트가 발생하므로 트랜잭션 사용
    const session = await db.startSession();
    session.startTransaction();
    try {
        // STEP 1
        const current_user = await Models.User.findOne({
            login: req.params.login,
        });
        if (current_user) {
            // STEP 2
            const rm_commits = await Models.Commit.deleteMany({
                committer: current_user._id,
            });
            // STEP 3
            const rm_repos = await Models.Repository.find({
                contributor: current_user._id,
            });
            let rm_repos_removed = [];
            let rm_repos_updated = [];
            for (let repo of rm_repos) {
                if (repo.contributor.length <= 1) {
                    let removed = await repo.remove();
                    rm_repos_removed.push(removed);
                } else {
                    let updated = await Models.Repository.updateOne(
                        { _id: repo._id },
                        {
                            $pull: { contributor: current_user._id },
                        }
                    );
                    rm_repos_updated.push(updated);
                }
            }
            // STEP 4
            const rm_events = await Models.Event.deleteMany({
                actor: current_user._id,
            });
            // STEP 5
            const rm_participant_challenges = await Models.Challenge.updateMany(
                {
                    participants: current_user._id,
                },
                { $pull: { participants: current_user._id } }
            );
            // STEP 6
            const rm_user = await current_user.remove();
            await session.commitTransaction();
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "사용자가 정상적으로 삭제되었습니다",
                data: {
                    commits: rm_commits,
                    events: rm_events,
                    challenges: rm_participant_challenges,
                    user: rm_user,
                    repos: {
                        updated: rm_repos_updated,
                        removed: rm_repos_removed,
                    },
                },
            });
        } else {
            res.json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } catch (e) {
        await session.abortTransaction();
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message || e.error || e,
                object: e,
            },
        });
    } finally {
        session.endSession();
    }
});

export default router;
