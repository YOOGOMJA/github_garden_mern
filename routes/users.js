import express from "express";

import * as Models from "../db/models";
import * as GithubAPI from "../db/compute/github";
import mongoose, { models, Model } from "mongoose";
import moment from 'moment';

const db = mongoose.connection;

import { Crawler } from "../db/compute";
import * as LibChallenge from "../lib/challenge";

const router = express.Router();

// 사용자 모두 조회
router.get("/", async (req, res, next) => {
    try {
        const result = await Models.User.find({},{
            access_token : 0
        });
        res.status(200).json({
            status: "success",
            data: result,
        });
    } catch (e) {
        res.status(500).json({
            code: -1,
            satus: "FAIL",
            message: "오류가 발생했습니다",
            error: e.message,
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
    },{
        access_token : 0
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
            },{
                access_token : 0
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

router.get("/challenges/:challenge_id" , async (req, res)=>{
    try{
        const currentChallenge = await Models.Challenge.findOne({
            id : req.params.challenge_id
        });
        if(currentChallenge){
            const participants = await Models.User.find({
                _id : { $in: currentChallenge.participants }
            },{
                access_token : 0
            });
            let _data = [];
            const mNow = moment();
            const mStartToday = mNow.clone().hour(0).minute(0).second(0);
            const mFinishToday = mNow.clone().hour(23).minute(59).second(59)
            for(const participant of participants){
                const commit_now = await Models.Commit.exists({
                    commit_date : {
                        $gte : mStartToday,
                        $lte : mFinishToday
                    },
                    committer : participant._id
                });
                _data.push({
                    user : participant,
                    attended : commit_now
                });
            }

            res.json({
                code : 1,
                status : "SUCCESS",
                message : "조회에 성공했습니다",
                data : _data
            });
        }
        else{
            throw new Error("존재하지 않는 도전 기간입니다");
        }
    }
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "통신 중 오류가 발생했습니다",
            error : {
                message : e.message || ( e.error || e ),
                object : e
            }
        });
    }
});

// 특정 사용자 조회
router.get("/:user_name", async (req, res, next) => {
    const result = await Models.User.findOne({
        login: req.params.user_name,
    },{
        access_token : 0
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

// 특정 도전에 추가
router.post("/challenge/:challenge_id/request", async(req, res)=>{
    try{
        if(!req.isAuthenticated()){throw new Error("로그인이 필요합니다");}
        
        const current_challenge = await Models.Challenge.findOne({
            id : req.params.challenge_id
        });

        if(!current_challenge){ throw new Error("존재하지않는 도전 기간입니다"); }

        const prevRequestExists = await Models.JoinRequest.exists({
            user : req.user._id,
            is_expired : false,
            challenge : current_challenge._id
        });

        if(prevRequestExists){ throw new Error("이미 요청했습니다"); }

        const newRequest = new Models.JoinRequest({
            user : req.user._id,
            challenge : current_challenge._id,
            updated_by : req.user._id,
            created_at : new Date()
        });
        const result = await newRequest.save();

        res.json({
            code : 1,
            status : "SUCCESS",
            message : "요청되었습니다",
            data : result
        });
    }
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "통신 중 오류가 발생했습니다",
            error : {
                message : e.message || ( e.error || e ),
                object : e
            }
        });
    }
});

// 특정 도전 요청 여부 확인
router.get("/challenge/:challenge_id/request" , async(req, res)=>{
    try{
        if(req.isAuthenticated()){
            if(!req.isAuthenticated()){throw new Error("로그인이 필요합니다");}
        
            const current_challenge = await Models.Challenge.findOne({
                id : req.params.challenge_id
            });

            if(!current_challenge){ throw new Error("존재하지않는 도전 기간입니다"); }

            const prevRequest = await Models.JoinRequest.findOne({
                user : req.user._id,
                is_expired : false,
                challenge : current_challenge._id
            });

            res.json({
                code : 1,
                status : "SUCCESS",
                message : "조회했습니다",
                data : prevRequest
            });
        }
        else{
            throw new Error("로그인이 필요합니다");
        }
    }
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "통신 중 오류가 발생했습니다",
            error : {
                message : e.message || ( e.error || e ),
                object : e
            }
        });
    }
});

// 특정 도전 요청 여부 삭제
// 삭제 처리는 expired로 
router.delete("/challenge/:challenge_id/request", async(req,res)=>{
    try{
        if(req.isAuthenticated()){
            if(!req.isAuthenticated()){throw new Error("로그인이 필요합니다");}
        
            const current_challenge = await Models.Challenge.findOne({
                id : req.params.challenge_id
            });

            if(!current_challenge){ throw new Error("존재하지않는 도전 기간입니다"); }

            const prevRequest = await Models.JoinRequest.findOne({
                user : req.user._id,
                is_expired : false,
                challenge : current_challenge._id
            });

            if(!prevRequest){ throw new Error("요청이 존재하지 않습니다"); }

            const result = await Models.updateOne(
            {
                user : req.user._id,
                is_expired : false,
                challenge : current_challenge._id
            } , 
            {
                is_expired : true,
                updated_at : new Date(),
                updated_by : req.user._id
            });

            res.json({
                code : 1,
                status : "SUCCESS",
                message : "수정했습니다",
                data : result
            });
        }
        else{
            throw new Error("로그인이 필요합니다");
        }
    }   
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "통신 중 오류가 발생했습니다",
            error : {
                message : e.message || ( e.error || e ),
                object : e
            }
        });
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
});



export default router;
