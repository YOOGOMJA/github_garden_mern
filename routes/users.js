import express from "express";

import * as Models from "../db/models";
import * as GithubAPI from "../db/compute/github";
import mongoose from "mongoose";

const db = mongoose.connection;

import { Crawler } from "../db/compute";
import * as LibChallenge from "../lib/challenge";

const router = express.Router();

// 사용자 모두 조회
router.get("/", async (req, res, next) => {
    try {
        const result = await Models.User.find();
        res.status(200).json({
            status: "success",
            data: result,
        });
    } catch (e) {
        res.status(500).json({
            code: -1,
            satus: "FAIL",
            message: "오류가 발생했습니다",
            error: e,
        });
    }
});

// 사용자 로그인 상태 조회
router.get("/auth", async (req, res) => {
    if (req.isAuthenticated()) {
        // 1. 사용자 정보
        // 2. 사용자의 참가 프로젝트 목록
        // 3. 가장 최근 커밋 커밋
        try {
            const challenges = await Models.Challenge.find({
                participants: req.user._id,
            });
            const latestCommits = await Models.Commit.aggregate([
                {
                    $match : {
                        committer : req.user._id,
                    }
                },
                {
                    $sort: {
                        commit_date: -1,
                    },
                },
                {
                    $limit: 1
                }
            ]);
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: {
                    is_authenticated: req.isAuthenticated(),
                    user: req.user,
                    challenges: challenges,
                    latestCommits: latestCommits,
                },
            });
        } catch (e) {
            res.json({
                code: -1,
                status: "FAIL",
                message: "오류가 발생했습니다",
                error: {
                    message: e.message,
                    object: e,
                },
            });
        }
    } else {
        res.json({
            code: 0,
            status: "FAIL",
            message: "로그인 상태가 아님",
            data: {
                is_authenticated: req.is_authenticated,
            },
        });
    }
});

// 사용자 검색
router.get("/search", async (req, res, next) => {
    const user_name = req.query.user_name || "";
    const users = await Models.User.find({
        $or: [
            { login: { $regex: `${user_name}`, $options: "i" } },
            { name: { $regex: `${user_name}`, $options: "i" } },
        ],
    });
    res.json({
        code: 1,
        status: "SUCCESS",
        message: "조회했습니다",
        data: users,
    });
});

router.get("/latest", async (req, res, next) => {
    try {
        const latestChallenge = await LibChallenge.latestChallenge();
        if (latestChallenge) {
            const users = await Models.User.find({
                _id: {
                    $in: latestChallenge.participants,
                },
            });
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: users,
            });
        } else {
            throw new Erorr("인증된 도전 기간이 존재하지 않습니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: {
                message: e.message,
                body: e,
            },
        });
    }
});

// 특정 사용자 조회
router.get("/:user_name", async (req, res, next) => {
    const result = await Models.User.findOne({
        login: req.params.user_name,
    });
    if (result) {
        res.status(200).json({
            code: 1,
            status: "success",
            message: "조회에 성공했습니다",
            data: result,
        });
    } else {
        res.status(404).send({
            code: -1,
            status: "fail",
            message: "존재하지 않는 사용자입니다",
            erorr: new Error("존재하지 않는 사용자입니다"),
            // data: result,
        });
    }
});

// 특정 사용자를 삭제
// TODO : 사용자 삭제시 저장소 삭제되지 않도록 처리
router.delete("/:user_name", async (req, res, next) => {
    // 1. 존재하는 사용자인지 확인
    // 2. 관련 커밋 삭제
    // 3. 관련 저장소 삭제 혹은 contributor 제외 처리
    // 4. 관련 이벤트 삭제
    // 5. 도전 기간에서 참가자 삭제
    // 6. 사용자 삭제

    // 다건 업데이트가 발생하므로 트랜잭션 사용
    const session = await db.startSession();
    session.startTransaction();
    try {
        // STEP 1
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
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
        console.log(e);
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생헀습니다.",
            error: e.message,
        });
    } finally {
        session.endSession();
    }
});

// 특정 사용자의 정보를 새로 불러오고 새로 fetch함
router.post("/:user_name/fetch", async (req, res, next) => {
    try {
        const result = await Crawler.one(req.params.user_name);
        res.json(result);
    } catch (e) {
        res.json(e);
    }
});

router.get("/:user_name/fetch" , async (req, res)=>{
    try{
        const _currentUser = await Models.User.findOne({
            login: req.params.user_name
        });
        if(_currentUser){
            const latestFetchLog = await Models.LogFetchGithubAPI.findOne()
            .sort({ created_at : "desc" })
            .limit(1)
            .exec();
            res.json({
                code : 1,
                status : "SUCCESS",
                message : "성공했습니다",
                data : latestFetchLog
            })
        }
        else{
            throw new Error("존재하지 않는 사용자 입니다");
        }
    }
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "오류가 발생했습니다",
            error : {
                message : e.error ? ( e.error.message ? e.error.message : e.error ) : e.message,
                object : e
            }
        })
    }
})

export default router;
