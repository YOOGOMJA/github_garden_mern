import express from "express";

import moment from "moment";

import { Event } from "../db/models/events";
import { Challenge } from "../db/models/challenges";

import * as LibAttendance from "../lib/attendance";
import * as LibChallenge from "../lib/challenge";
import * as LibRepo from "../lib/repo";
import * as Models from "../db/models";
import { Analytics } from "../db/compute";

const router = express.Router();

// 현재저장된 저장소의 언어 정보를 가져옴
router.get("/languages", async (req, res, next) => {
    try {
        const latestChallenge = await LibChallenge.latestChallenge();
        const result = await Analytics.fetchLanguagePopulation({
            challenge_id: latestChallenge.id,
        });
        res.json(result);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/languages/users/:user_id", async (req, res) => {
    try {
        const currentUserExists = await Models.User.exists({
            login: req.params.user_id,
        });
        if (!currentUserExists) {
            throw new Error("존재하지 않는 유저 입니다");
        }
        const result = await Analytics.fetchLanguagePopulation({
            login: req.params.user_id,
        });
        res.json(result);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/languages/challenges/:challenge_id", async (req, res) => {
    try {
        const currentChallengeExists = await Models.Challenge.exists({
            id: req.params.challenge_id,
        });
        if (!currentChallengeExists) {
            throw new Error("존재하지 않는 프로젝트 입니다");
        }
        const result = await Analytics.fetchLanguagePopulation({
            challenge_id: req.params.challenge_id,
        });
        res.json(result);
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
    "/languages/challenges/:challenge_id/users/:user_id",
    async (req, res) => {
        try {
            const currentChallengeExists = await Models.Challenge.exists({
                id: req.params.challenge_id,
            });
            const currentUserExists = await Models.User.exists({
                login: req.params.user_id,
            });
            if (!currentChallengeExists) {
                throw new Error("존재하지 않는 프로젝트 입니다");
            }
            if (!currentUserExists) {
                throw new Error("존재하지 않는 유저 입니다");
            }
            const result = await Analytics.fetchLanguagePopulation({
                challenge_id: req.params.challenge_id,
                login: req.params.user_id,
            });
            res.json(result);
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

// 가장 붐비는 저장소
router.get("/repo/popular", async (req, res, next) => {
    // 현재 도전 기간 중 가장 참여자가 많은 저장소 조회
    try {
        const _popular_repo = await Models.Repository.aggregate([
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

// 가장 커밋이 많은 저장소를 조회
router.get("/repo/hottest", async (req, res, next) => {
    try {
        const latestChallenge = await LibChallenge.latestChallenge();
        if (latestChallenge) {
            const hottest_repos_ids = await Models.Commit.aggregate([
                {
                    $match: {
                        commit_date: {
                            $gte: latestChallenge.start_dt,
                            $lte: latestChallenge.finish_dt,
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
            throw new Error("최신 도전 기간이 존재하지 않습니다");
        }
        // const hottest_repository = await Analytics.fetchPopularRepository();
        // res.json(hottest_repository);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

// 메인 페이지 : 활동 요약
router.get("/summary", async (req, res, next) => {
    try {
        const summary = await Analytics.fetchSummary();
        res.json(summary);
    } catch (e) {
        res.status(500).json(e);
    }
});

router.get("/summary/:challenge_id", async (req, res) => {
    try {
        const result = await Analytics.fetchSummaryByProject(
            req.params.challenge_id
        );
        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회했습니다",
            data: result,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "조회 중 오류가 발생했습니다",
            error: {
                message: e.message | (e.error | e),
                object: e,
            },
        });
    }
});

// 최신 도전 기간에서 모든 사용자들의 출석률
// TODO : challenge_id를 기준으로 조회하는 항목 추가 되어야
router.get("/attendances/", async (req, res, next) => {
    try {
        const latest_challenge = await Models.Challenge.aggregate([
            { $match: { is_featured: true } },
            {
                $sort: { created_at: -1 },
            },
        ]);
        if (latest_challenge.length > 0) {
            const attendances = await Analytics.fetchAttendance(
                latest_challenge[0].id
            );
            res.json(attendances);
        } else {
            res.json({
                code: -1,
                status: "FAIL",
                message: "등록된 도전 기간이 존재하지 않습니다",
                data: [],
            });
        }
    } catch (e) {
        res.status(500).json(e);
    }
});

// 최신 도전 기간에서 특정 사용자의 출석률
router.get("/attendances/latest/users/:user_name", async (req, res, next) => {
    try {
        const latest_challenge = await Models.Challenge.aggregate([
            { $match: { is_featured: true } },
            {
                $sort: { created_at: -1 },
            },
        ]);
        const attendances = await Analytics.fetchAttendanceByUser(
            latest_challenge[0].id,
            req.params.user_name
        );

        res.json(attendances);
    } catch (e) {
        res.json(e);
    }
});

// 최신 도전 기간에서 일자별 출석률
router.get("/attendances/date", async (req, res, next) => {
    try {
        const latest_challenge = await Models.Challenge.aggregate([
            { $match: { is_featured: true } },
            {
                $sort: { created_at: -1 },
            },
        ]);
        const result = await Analytics.fetchAttendanceByDate(
            latest_challenge[0].id
        );
        res.json(result);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

// 모든 커밋
router.get("/commits", async (req, res, next) => {
    try {
        const all_commits = await Models.Commit.aggregate([
            {
                $lookup: {
                    from: "repositories",
                    localField: "repo",
                    foreignField: "_id",
                    as: "lookuped_repo",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "committer",
                    foreignField: "_id",
                    as: "lookuped_committer",
                },
            },
            {
                $sort: {
                    commit_date: -1,
                },
            },
        ]);

        res.json({
            code: 1,
            status: "SUCCESS",
            message: "조회했습니다",
            data: all_commits,
        });
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/rank/:challenge_id/users/:user_id", async (req, res) => {});

router.get("/attendances/:challenge_id", async (req, res) => {
    try {
        const _challenge_id = req.params.challenge_id;
        const _challenge_exists = await Models.Challenge.exists({
            id: _challenge_id,
        });
        if (_challenge_exists) {
            const attendances = await Analytics.fetchAttendance(_challenge_id);
            res.json(attendances);
        } else {
            res.json({
                code: -1,
                status: "FAIL",
                message: "등록된 도전 기간이 존재하지 않습니다",
                data: [],
            });
        }
    } catch (e) {
        res.status(500).json(e);
    }
});

router.get("/attendances/:challenge_id/date", async (req, res) => {
    try {
        const _challenge_id = req.params.challenge_id;
        const _current_challenge_exists = await Models.Challenge.exists({
            id: _challenge_id,
        });
        if (!_current_challenge_exists) {
            throw new Error("존재하지 않는 도전기간 입니다");
        }
        const result = await Analytics.fetchAttendanceByDate(_challenge_id);

        res.json(result);
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: { object: e, message: e.message },
        });
    }
});

router.get("/attendances/:challenge_id/rank", async (req, res) => {
    try {
        const _challenge_id = req.params.challenge_id;
        const currentChallenge = await Models.Challenge.findOne({
            id: _challenge_id,
        });
        if (currentChallenge) {
            const mStartDt = moment(currentChallenge.start_dt);
            const mNow = moment();
            const diffStrt = mStartDt.diff(mNow);
            if (diffStrt > 0) {
                throw new Error("아직 시작하지 않은 일정입니다");
            }

            const _allAttendances = await Analytics.fetchAttendance(
                _challenge_id
            );
            let rank = 1;
            let accumulate = 0;
            let attCount = 0;
            let participants = [];
            for (let idx = 0; idx < _allAttendances.data.length; idx++) {
                if (idx === 10) break;
                const participant = _allAttendances.data[idx];
                if (idx === 0) attCount = participant.attendances_count;

                if (attCount != participant.attendances_count) {
                    attCount = participant.attendances_count;
                    rank += accumulate;
                    accumulate = 0;
                } else {
                    accumulate += 1;
                }

                participants.push({
                    info: participant.info,
                    rank: rank,
                    total: _allAttendances.data.length,
                    attendances_count: participant.attendances_count,
                });
            }
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: participants,
            });
        } else {
            throw new Error("존재하지 않는 유저 혹은 프로젝트입니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message:
                e.message || e.error.message || "조회중 오류가 발생했습니다",
            error: {
                message: e.message,
                object: e,
            },
        });
    }
});

router.get("/attendances/:challenge_id/users/:user_id", async (req, res) => {
    const _challenge_id = req.params.challenge_id;
    const _user_id = req.params.user_id;
    try {
        const current_challenge = await Models.Challenge.exists({
            id: _challenge_id,
        });
        const current_user = await Models.User.exists({ login: _user_id });
        if (current_challenge && current_user) {
            const attendances = await Analytics.fetchAttendanceByUser(
                _challenge_id,
                _user_id
            );
            res.json(attendances);
        } else {
            res.json({
                code: -1,
                status: "FAIL",
                message: "프로젝트 혹은 사용자가 존재하지 않습니다",
                data: [],
            });
        }
    } catch (e) {
        res.status(500).json(e);
    }
});

router.get(
    "/attendances/:challenge_id/users/:user_id/rank",
    async (req, res) => {
        try {
            const _challenge_id = req.params.challenge_id;
            const _user_id = req.params.user_id;
            const currentChallenge = await Models.Challenge.findOne({
                id: _challenge_id,
            });
            const userExists = await Models.User.exists({
                login: _user_id,
            });
            if (currentChallenge && userExists) {
                const mStartDt = moment(currentChallenge.start_dt);
                const mFinishDt = moment(currentChallenge.finish_dt);
                const mNow = moment();
                const diffStrt = mStartDt.diff(mNow);
                if (diffStrt > 0) {
                    throw new Error("아직 시작하지 않은 일정입니다");
                }

                const _allAttendances = await Analytics.fetchAttendance(
                    _challenge_id
                );
                let rank = 1;
                let accumulate = 0;
                let attCount = 0;
                for (let idx = 0; idx < _allAttendances.data.length; idx++) {
                    const participant = _allAttendances.data[idx];
                    if (participant.info.login === _user_id) {
                        break;
                    }
                    const participant = _allAttendances.data[idx];
                    if (idx === 0) attCount = participant.attendances_count;

                    if (attCount != participant.attendances_count) {
                        attCount = participant.attendances_count;
                        rank += accumulate;
                        accumulate = 0;
                    } else {
                        accumulate += 1;
                    }

                    participants.push({
                        info: participant.info,
                        rank: rank,
                        total: _allAttendances.data.length,
                        attendances_count: participant.attendances_count,
                    });
                }
                res.json({
                    code: 1,
                    status: "SUCCESS",
                    message: "조회에 성공했습니다",
                    data: {
                        rank: rank,
                        total: _allAttendances.data.length,
                    },
                });
            } else {
                throw new Error("존재하지 않는 유저 혹은 프로젝트입니다");
            }
        } catch (e) {
            res.json({
                code: -1,
                status: "FAIL",
                message:
                    e.message ||
                    e.error.message ||
                    "조회중 오류가 발생했습니다",
                error: {
                    message: e.message,
                    object: e,
                },
            });
        }
    }
);

router.get(
    "/attendances/:challenge_id/users/:user_id/today",
    async (req, res) => {
        try {
            const _challenge_id = req.params.challenge_id;
            const _user_id = req.params.user_id;
            const currentChallenge = await Models.Challenge.findOne({
                id: _challenge_id,
            });
            const currentUser = await Models.User.findOne({
                login: _user_id,
            });
            if (currentChallenge && currentUser) {
                const mStartDt = moment(currentChallenge.start_dt);
                const mFinishDt = moment(currentChallenge.finish_dt);
                const mNow = moment();
                const diffStrt = mStartDt.diff(mNow);
                const diffFinish = mFinishDt.diff(mNow);

                if (diffStrt <= 0 && diffFinish >= 0) {
                    const commit = await Models.Commit.aggregate([
                        {
                            $match: {
                                committer: currentUser._id,
                                commit_date: {
                                    $gte: mNow
                                        .hour(0)
                                        .minute(0)
                                        .second(0)
                                        .toDate(),
                                    $lte: mNow
                                        .hour(23)
                                        .minute(59)
                                        .second(59)
                                        .millisecond(999)
                                        .toDate(),
                                },
                            },
                        },
                    ]);
                    res.json({
                        code: 1,
                        status: "SUCCESS",
                        message: "조회했습니다",
                        data: commit,
                    });
                } else {
                    throw new Error(
                        "이미 종료되거나 아직 시작되지 않은 일정입니다"
                    );
                }
            } else {
                throw new Error("존재하지 않는 유저 혹은 프로젝트입니다");
            }
        } catch (e) {
            res.json({
                code: -1,
                status: "FAIL",
                message:
                    e.message ||
                    e.error.message ||
                    "조회중 오류가 발생했습니다",
                error: {
                    message: e.message,
                    object: e,
                },
            });
        }
    }
);

export default router;
