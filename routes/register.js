import express from 'express';
import moment from 'moment';
import github from "octonode";

import { Challenge } from '../db/models/challenges';
import { User } from '../db/models/users';
import { ErrorLog } from '../db/models/error_log';

const router = express.Router();
const ghClient = github.client();

// TODO: 이벤트 생성 | 등록
// TODO: 특정 이벤트에 사용자 추가
router.get("/" , (req, res, next)=>{
    res.json("hello");
});

// 모든 도전 일정을 조회
router.get("/challenge", async (req, res, next)=>{
    const all_challenges = await Challenge.find();
    
    res.status(200).json({
        status: "success",
        data: all_challenges
    });
});

// TODO: 특정 도전 기간에 참가중인 사용자를 조회
router.get("/challenge/:challenge_id/user", async (req, res, next)=>{
    // 1. 도전 기간이 존재하는지 확인
    const current_challenge = await Challenge.findOne({ id: req.params.challenge_id })
    .populate("participants")
    .exec((err, result)=>{
        if(!err){
            res.status(200).json({
                status: "success",
                message: "성공적으로 조회 되었습니다",
                data: result
            });
        }
        else if(!result){
            res.status(400).json({
                status: "failed",
                message: "존재하지 않는 도전 기간입니다"
            });
        }
        else{
            res.status(400).json({
                status: "failed",
                message: "오류가 발생했습니다"
            });
        }
    });
    
});

router.post("/user/:user_name", async (req, res, next)=>{
    const current_user = await User.findOne({ login: req.params.user_name });
    if(!current_user){
        ghClient.get(
            "/users/" + req.params.user_name,
            {},
            async (err, status, body, headers) => {
                if (!err) {
                    const newUser = new User({
                        id: body.id,
                        login: body.login.toLowerCase(),
                        html_url: body.html_url,
                        avartar_url: body.avartar_url,
                        name: body.name,
                        blog: body.blog,
                        email: body.email,
                        bio: body.bio,
                        api_url: body.url,
                        events_url: body.events_url,
                    });
                    const userResult = await newUser.save();
                    if (userResult) {
                        res.status(200).json({
                            status: "success",
                            message: "추가되었습니다",
                        });
                    }
                }
                else{
                    const current_error = new ErrorLog({
                        error: err,
                        created_at: new Date()
                    });
                    current_error.save();

                    res.status(400).json({
                        status:"failed",
                        message: "오류가 발생했습니다"
                    });
                }
            }
        );
    }
    else{
        res.status(400).json({
            status: "failed",
            message: "이미 존재하는 사용자입니다",
        })
    }
});

// TODO: 도전 기간을 생성
router.post("/challenge", async (req, res, next)=>{
    if(!req.body.start_dt || !req.body.period || !req.body.title){
        res.json({
            status: "failed",
            message: "누락된 정보가 있습니다",
        });
        return;
    }

    const start_dt = new moment(req.body.start_dt);
    const finish_dt = start_dt.clone().add(req.body.period, 'days');
    const new_challenge = new Challenge({
        id: "challenge_" + (new Date()).getTime(),
        start_dt: start_dt.toDate(),
        finish_dt: finish_dt.toDate(),
        title: req.body.title,
        created_at: new Date(),
    });

    await new_challenge.save();

    res.json({
        status: "success",
        message: "일정이 추가되었습니다"
    });
});

// TODO: 특정 도전 기간에 사용자를 추가
router.post("/challenge/:challenge_id/user/:user_name", async (req, res, next)=>{
    // 1. 도전 기간이 존재하는지 확인
    const current_challenge = await Challenge.findOne({ id: req.params.challenge_id });
    if(current_challenge){
        // 2. 사용자가 존재하는지 확인
        const current_user = await User.findOne({ login: req.params.user_name });
        
        if(current_user){
            current_challenge.participants.push(
                current_user
            );
            current_challenge.save();
            res.status(200).json({
                status: "success",
                message: "등록되었습니다"
            });
        }
        else{
            res.status(400).json({
                status: "failed",
                message: "존재하지 않는 사용자 입니다",
            });
        }
    }
    else{
        res.status(400).json({
            status: "failed",
            message: "존재하지 않는 도전 기간입니다",
        });
    } 
});

export default router;