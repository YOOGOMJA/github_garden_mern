import express from "express";

import { Event } from "../db/models/events";
import { Challenge } from "../db/models/challenges";

const router = express.Router();

router.get("/", (req, res, next)=>{
    res.json("Hello");
});

// TODO: 특정 도전 기간에 참여한 모든 사용자와 참석율
router.get("/challenge/:challenge_id/user/", async (req, res, next)=>{
    // 1. 도전 기간 조회
    const current_challenge = await Challenge.findOne({ id: req.params.challenge_id }).populate('participants');

    if(current_challenge){
        // 2. 도전 기간 내 사용자들의 이벤트 조회
        // TODO : 사용자 조회 성공 ! 이제 사용자별 이벤트를 가져와야 함
        current_challenge.populate("participants");
        current_challenge.participants.forEach(user=>{
            console.log(user);
        });
        res.json("hello");
    }
    else{
        res.status(400).json({
            status: "failed",
            message: "존재하지 않는 도전 기간입니다"
        })
    }
});

export default router;

