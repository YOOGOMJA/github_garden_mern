import express from "express";

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
        const result = await Analytics.fetchLanguagePopulation();
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
        if(latestChallenge){
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
                    $group : {
                        _id : '$repo',
                        commit_count : { $sum : 1 }
                    }
                },
                { $sort : { commit_count : -1 } }
            ]);
            if(hottest_repos_ids.length > 0){
                const hottest_repo = await Models.Repository.findOne({ _id : hottest_repos_ids[0]._id });
                const repoWithCommits = await Analytics.fetchRepoWithCommits(hottest_repo.name);
                res.json(repoWithCommits);
            }
            else{
                throw new Error("저장소가 존재하지 않습니다");
            }
        }
        else{
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
        const attendances = await Analytics.fetchAttendance(
            latest_challenge[0].id
        );
        res.json(attendances);
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

// 특정 도전 기간에서 특정 사용자의 출석률
router.get(
    "/attendances/:challenge_id/users/:user_name",
    async (req, res, next) => {
        console.log("hi");
        try {
            const attendances = await Analytics.fetchAttendanceByUser(
                req.params.challenge_id,
                req.params.user_name
            );
            res.json(attendances);
        } catch (e) {
            res.json(e);
        }
    }
);

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

// TODO: 특정 도전 기간에 참여한 모든 사용자와 참석율
// deprecated
router.get("/challenge/:challenge_id/user/", async (req, res, next) => {
    try {
        const run_at = new Date();

        // 1. 도전 기간 조회
        const current_challenge = await Challenge.findOne({
            id: req.params.challenge_id,
        }).populate("participants");

        if (current_challenge) {
            // 2. 도전 기간 내 사용자들의 이벤트 조회
            // TODO : 사용자 조회 성공 ! 이제 사용자별 이벤트를 가져와야 함
            const current_events = await Event.aggregate([
                {
                    $match: {
                        created_at: {
                            $gte: current_challenge.start_dt,
                            $lte: current_challenge.finish_dt,
                        },
                        actor: {
                            $in: current_challenge.participants,
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            actor: "$actor",
                            date: {
                                $dateToString: {
                                    format: "%Y-%m-%d",
                                    date: "$created_at",
                                },
                            },
                        },
                        count: { $sum: "$payload.size" },
                    },
                },
                {
                    $sort: {
                        "_id.actor": 1,
                        "_id.date": 1,
                    },
                },
            ]);
            const attendanceRate = LibAttendance.getAttendRateByUser(
                current_events,
                current_challenge.participants,
                current_challenge.start_dt,
                current_challenge.finish_dt
            );
            const finish_at = new Date();

            console.log(
                "run duration : " +
                    (finish_at.getTime() - run_at.getTime()) +
                    "ms"
            );

            res.json({
                challenge: current_challenge,
                attendance_rates: attendanceRate,
            });
        } else {
            res.status(400).json({
                status: "failed",
                message: "존재하지 않는 도전 기간입니다",
            });
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

// 기간 일자별 모든 참가자 출석률
// deprecated
router.get("/challenge/:challenge_id/", async (req, res, next) => {
    try {
        const current_challenge = await Challenge.findOne({
            id: req.params.challenge_id,
        });

        if (current_challenge) {
            // 도전 일자가 존재하는 경우
            const current_events = await Event.aggregate([
                {
                    $match: {
                        created_at: {
                            $gte: current_challenge.start_dt,
                            $lte: current_challenge.finish_dt,
                        },
                        // actor: {
                        //     $in: current_challenge.participants,
                        // },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$created_at",
                            },
                        },
                        users: {
                            $addToSet: "$actor",
                        },
                    },
                },
                {
                    $sort: {
                        _id: 1,
                    },
                },
            ]);

            function compute(data, num_of_users, start_dt, finish_dt) {
                const all_dates = LibAttendance.getAllDatesBetween(
                    start_dt,
                    finish_dt
                );
                const filtered = {};
                all_dates.forEach((dt) => {
                    filtered[dt] = {
                        number_of_attendant: 0,
                        number_of_all_members: 0,
                        attendance_rates: 0,
                    };
                });

                data.forEach((item) => {
                    filtered[item._id] = {
                        number_of_attendant: item.users.length,
                        number_of_all_members: num_of_users,
                        attendance_rates:
                            (item.users.length / num_of_users) * 100,
                    };
                });

                return filtered;
            }

            res.json({
                challenge: current_challenge,
                events: compute(
                    current_events,
                    current_challenge.participants.length,
                    current_challenge.start_dt,
                    current_challenge.finish_at
                ),
            });
        } else {
            res.status(400).json({
                status: "failed",
                message: "존재하지 않는 도전 기간입니다",
            });
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
