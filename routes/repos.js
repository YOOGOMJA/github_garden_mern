import express from "express";
import * as Models from "../db/models";
import { Analytics } from "../db/compute";
import moment from "moment";
const router = express.Router();
const ITEMS_PER_PAGE = 10;

// 특정 사용자의 저장소 정보를 모두 가져옴
router.get("/users/:user_name", async (req, res, next) => {
    try {
        const _currentPage = req.query.page ? Number(req.query.page) : 1;
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        },{
            access_token : 0
        });
        if (current_user) {
            await Models.Repository.find({
                contributor: current_user._id,
            })
                .populate("contributor")
                .sort({ created_at: "desc" })
                .limit(ITEMS_PER_PAGE)
                .skip(ITEMS_PER_PAGE * (_currentPage - 1))
                .exec((err, data) => {
                    if (!err) {
                        res.json({
                            code: 1,
                            status: "SUCCESS",
                            message: "조회되었습니다",
                            data: data,
                        });
                    } else {
                        res.json({
                            code: -3,
                            status: "FAIL",
                            message: "조회 중 오류가 발생했습니다",
                            error: err.message,
                        });
                    }
                });
        } else {
            res.json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "조회 중 오류가 발생했습니다",
            error: e,
        });
    }
});

router.get("/users/:user_id/hottest", async (req, res) => {
    try {
        const currentUser = await Models.User.findOne({
            login: req.params.user_id,
        });
        if (currentUser) {
            const hottest_repos_ids = await Models.Commit.aggregate([
                {
                    $match: {
                        committer: currentUser._id,
                    },
                },
                {
                    $group: {
                        _id: "$repo",
                        commit_count: { $sum: 1 },
                    },
                },
                { $sort: { commit_count: -1 } },
            ]);
            if (hottest_repos_ids.length > 0) {
                const hottest_repo = await Models.Repository.findOne({
                    _id: hottest_repos_ids[0]._id,
                });
                const repoWithCommits = await Analytics.fetchRepoWithCommits(
                    hottest_repo.name
                );
                res.json(repoWithCommits);
            } else {
                throw new Error("저장소가 존재하지 않습니다");
            }
        } else {
            throw new Error("존재하지 않는 사용자입니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/users/:user_id/challenges/:challenge_id", async (req, res) => {
    try {
        const currentUser = await Models.User.findOne({
            login: req.params.user_id,
        });
        const currentChallenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (currentChallenge && currentUser) {
            const repos_ids = await Models.Commit.aggregate([
                {
                    $match: {
                        commit_date: {
                            $gte: currentChallenge.start_dt,
                            $lte: currentChallenge.finish_dt,
                        },
                        committer: currentUser._id,
                    },
                },
                {
                    $group: {
                        _id: "$repo",
                        commit_count: { $sum: 1 },
                    },
                },
                { $sort: { commit_count: -1 } },
            ]);

            let _ids = [];
            repos_ids.forEach((item) => {
                _ids.push(item._id);
            });

            const repos = await Models.Repository.find({
                _id: { $in: _ids },
            });

            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회되었습니다",
                data: repos,
            });
        } else {
            throw new Error("존재하지 않는 프로젝트 혹은 유저입니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get(
    "/users/:user_id/challenges/:challenge_id/hottest",
    async (req, res) => {
        try {
            const currentUser = await Models.User.findOne({
                login: req.params.user_id,
            });
            const currentChallenge = await Models.Challenge.findOne({
                id: req.params.challenge_id,
            });
            if (currentChallenge && currentUser) {
                const hottest_repos_ids = await Models.Commit.aggregate([
                    {
                        $match: {
                            commit_date: {
                                $gte: currentChallenge.start_dt,
                                $lte: currentChallenge.finish_dt,
                            },
                            committer: currentUser._id,
                        },
                    },
                    {
                        $group: {
                            _id: "$repo",
                            commit_count: { $sum: 1 },
                        },
                    },
                    { $sort: { commit_count: -1 } },
                ]);
                if (hottest_repos_ids.length > 0) {
                    const hottest_repo = await Models.Repository.findOne({
                        _id: hottest_repos_ids[0]._id,
                    });
                    const repoWithCommits = await Analytics.fetchRepoWithCommits(
                        hottest_repo.name
                    );
                    res.json(repoWithCommits);
                } else {
                    throw new Error("저장소가 존재하지 않습니다");
                }
            } else {
                throw new Error("존재하지 않는 프로젝트 혹은 유저입니다");
            }
        } catch (e) {
            res.json({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: { object: e, message: e.message },
            });
        }
    }
);

router.get("/challenges/:challenge_id/popular", async (req, res) => {
    // 현재 도전 기간 중 가장 참여자가 많은 저장소 조회
    try {
        const currentChallenge = await Models.Challenge.findOne({ id : req.params.challenge_id });
        if(!currentChallenge){ throw new Error("존재하지 않는 프로젝트입니다"); }
        const repos_ids = await Models.Commit.aggregate([
            {
                $match: {
                    commit_date: {
                        $gte: currentChallenge.start_dt,
                        $lte: currentChallenge.finish_dt,
                    },
                },
            },
            {
                $group: {
                    _id: "$repo",
                    commit_count: { $sum: 1 },
                },
            },
            { $sort: { commit_count: -1 } },
        ]); 
        
        let _ids = [];
        repos_ids.forEach(item=>_ids.push(item._id));
        
        const _popular_repo = await Models.Repository.aggregate([
            { $match : { _id : { $in : _ids } } },
            { $unwind: "$contributor" },
            {
                $group: {
                    _id: { id: "$_id", name: "$name" },
                    contributor_count: { $sum: 1 },
                },
            },
            // 동률일 경우 알파벳 순
            { $sort: { contributor_count: -1, name: 1 } },
            { $limit: 1 },
        ]);

        if(_popular_repo.length <= 0){ throw new Error("저장소가 존재하지 않습니다"); }

        const popular_repository = await Analytics.fetchRepoWithCommits(
            _popular_repo[0]._id.name
        );
        res.json(popular_repository);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/challenges/:challenge_id/hottest", async (req, res) => {
    try {
        const currentChallenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (currentChallenge) {
            const hottest_repos_ids = await Models.Commit.aggregate([
                {
                    $match: {
                        commit_date: {
                            $gte: currentChallenge.start_dt,
                            $lte: currentChallenge.finish_dt,
                        },
                    },
                },
                {
                    $group: {
                        _id: "$repo",
                        commit_count: { $sum: 1 },
                    },
                },
                { $sort: { commit_count: -1 } },
            ]);
            if (hottest_repos_ids.length > 0) {
                const hottest_repo = await Models.Repository.findOne({
                    _id: hottest_repos_ids[0]._id,
                });
                const repoWithCommits = await Analytics.fetchRepoWithCommits(
                    hottest_repo.name
                );
                res.json(repoWithCommits);
            } else {
                throw new Error("저장소가 존재하지 않습니다");
            }
        } else {
            throw new Error("프로젝트가 존재하지 않습니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

export default router;
