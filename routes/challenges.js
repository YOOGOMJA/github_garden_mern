import express from "express";
import * as Models from "../db/models";
import moment from "moment";
const router = express.Router();

// 모든 도전 목록
router.get("/", async (req, res, next) => {
    try {
        const challenges = await Models.Challenge.find()
            .populate("participants")
            .exec((err, result) => {
                if (err) {
                    res.status(500).json({
                        code: -2,
                        status: "ERROR",
                        message: "오류가 발생했습니다",
                        error: err,
                    });
                } else {
                    res.status(200).json({
                        code: 1,
                        status: "SUCCESS",
                        message: "정상적으로 불러왔습니다",
                        data: result,
                    });
                }
            });
    } catch (e) {
        res.status(400).json({
            code: -1,
            status: "ERROR",
            message: "에러가 발생했습니다",
            error: e,
        });
        console.log(e);
    }
});

router.get("/latest", async (req, res, next) => {
    try {
        const latestChallenge = await Models.Challenge.aggregate([
            {
                $sort: { created_at: -1 },
            },
        ]);
        if (latestChallenge.length <= 0) {
            res.json({
                code: -1,
                status: "FAIL",
                message: "도전 항목이 존재하지 않습니다",
            });
        } else {
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회했습니다.",
                data: latestChallenge[0],
            });
        }
    } catch (e) {
        res.json({
            code : -2,
            status : "FAIL",
            message : "조회 중 오류가 발생했습니다",
            error : e
        });
    }
});

// 새로운 도전을 등록
router.post("/", async (req, res, next) => {
    if (!req.body.start_dt || !req.body.finish_dt || !req.body.title) {
        res.json({
            code: -1,
            status: "failed",
            message: "누락된 정보가 있습니다",
        });
        return;
    }

    const start_dt = new moment(req.body.start_dt);
    const finish_dt = new moment(req.body.finish_dt);
    const new_challenge = new Challenge({
        id: "challenge_" + new Date().getTime(),
        start_dt: start_dt.toDate(),
        finish_dt: finish_dt.toDate(),
        title: req.body.title,
        created_at: new Date(),
    });

    try {
        const result = await new_challenge.save();
        res.json({
            status: "success",
            message: "일정이 추가되었습니다",
            data: result,
        });
    } catch (e) {
        res.status(400).json({
            code: -2,
            status: "ERROR",
            message: "데이터 추가 중 오류가 발생했습니다",
        });
    }
});

// 주어진 도전 정보의 일자를 수정하거나, 이름을 수정합니다
router.put("/:challenge_id", async(req, res, next)=>{
    try{
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id
        });
        if(current_challenge){
            const current_finish_dt = new moment(current_challenge.finish_dt);
            const current_start_dt = new moment(current_challenge.start_dt);
            const mNow = new moment();
            if(mNow.diff(current_finish_dt) < 0){
                let hasTitle = req.body.title ? true : false;
                let hasDate = true;
                let error = [];
                
                // 날짜 정보가 있는 경우 
                if(req.body.start_dt && req.body.finish_dt){
                    // 1. 시작일자, 종료일자 모두 주어진 경우 
                    const update_start_dt = new moment(req.body.start_dt);
                    const update_finish_dt = new moment(req.body.finish_dt);
                    
                    // 1.1. 주어진 항목이 날짜 형태가 맞는지 확인
                    if(update_start_dt._isValid && update_finish_dt._isValid){
                        // 1.2. 주어진 시작일자가 종료일자보다 이전인지 확인 
                        if(update_start_dt.diff(update_finish_dt) < 0){
                            current_challenge.start_dt = update_start_dt.toDate();
                            current_challenge.finish_dt = update_finish_dt.toDate();
                        }
                        else{
                            error.push(new Error("시작일자는 종료일자와 같거나, 이후일 수 없습니다"));
                        }
                    }
                    else{
                        error.push(new Error("주어진 날짜 정보의 형식이 올바르지 않습니다"));
                    }
                }
                else if(req.body.start_dt && !req.body.finish_dt){
                    // 2. 시작일자만 주어진 경우
                    const update_start_dt = new moment(req.body.start_dt) ;
                    // 2.1. 정상 일자인지 확인 
                    if(update_start_dt._isValid){
                        // 2.2. 현재 도전 기간의 마지막 일자보다 이전인지 확인
                        if(update_start_dt.diff(current_finish_dt) < 0){
                            current_challenge.start_dt = update_start_dt.toDate();
                        }
                        else{
                            error.push(new Error("시작일자는 종료일자와 같거나, 이후일 수 없습니다"));
                        }
                    }
                    else{
                        error.push(new Error("주어진 날짜 정보의 형식이 올바르지 않습니다"));
                    }
                }
                else if(!req.body.finish_dt&& req.body.finish_dt){
                    // 3. 종료일자만 주어진 경우
                    const update_finish_dt = new moment(req.body.finish_dt); 
                    const current_start_dt = new moment(current_challenge.start_dt);
                    // 3.1. 정상 일자인지 확인 
                    if(update_finish_dt._isValid){
                        // 3.2. 현재 도전기간의 시작일자보다 이후인지 확인
                        if(current_start_dt.diff(update_finish_dt) < 0){
                            current_challenge.finish_dt = update_finish_dt.toDate();
                        }
                        else{
                            error.push(new Error("종료일자는 시작일자와 같거나, 이전일 수 없습니다"));
                        }
                    }
                    else{
                        error.push(new Error("주어진 날짜 정보의 형식이 올바르지 않습니다"));
                    }
                }
                else{ hasDate = false; }

                // 제목 항목이 있는 경우 
                if(hasTitle){
                    if(req.body.title.trim() !== ""){
                        current_challenge.title = req.body.title;
                    }
                    else{
                        error.push(new Error("제목은 공백일 수 없습니다"))
                    }
                }
                
                if(hasDate || hasTitle){
                    if(error.length <= 0){
                        try{
                            const result = await current_challenge.save();
                            res.json({
                                code : 1,
                                status : "SUCCESS",
                                message : "수정이 완료되었습니다",
                                data : result
                            });
                        }
                        catch(e){
                            res.json({
                                code : -6,
                                status : "FAIL",
                                message : "데이터 저장 도중 오류가 발생했습니다",
                                error : e
                            });
                        }
                    }
                    else{
                        res.json({
                            code : -5,
                            status : "FAIL",
                            message : "입력정보가 잘못됐습니다",
                            error : error
                        });
                    }
                }
                else{
                    res.json({
                        code : -4,
                        status : "FAIL",
                        message : "변경할 정보가 없습니다",
                    })
                }
            }
            else{
                res.json({
                    code : -3,
                    status : "FAIL",
                    message : "이미 종료된 도전 정보는 수정할 수 없습니다"
                });
            }
        }
        else{
            res.json({
                code : -2,
                status : "FAIL",
                message : "존재하지 않는 도전 기간입니다",
            })
        }
    }
    catch(e){
        res.json({
            code : -1,
            status :"FAIL",
            message : "통신 중 오류가 발생했습니다",
            error : e
        })
    }
});

// 특정 사용자의 도전 목록
router.get("/users/:user_name", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });
        if (current_user) {
            const challenges = await Models.Challenge.find({
                _id: current_user._id,
            });
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "조회되었습니다",
                data: challenges,
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

// 특정 도전 기간 정보와 등록된 등록자 목록
router.get("/:challenge_id/users", async (req, res, next) => {
    const current_challenge = await Models.Challenge.findOne({
        id: req.params.challenge_id,
    });
    if (current_challenge) {
        current_challenge.populate("participants").exec((err, result) => {
            if (!err) {
                res.json({
                    code: 1,
                    status: "SUCCESS",
                    message: "조회에 성공했습니다",
                    data: result,
                });
            } else {
                res.status(500).json({
                    code: -2,
                    status: "ERROR",
                    message: "조회 중 오류가 발생했습니다",
                    error: err,
                });
            }
        });
    } else {
        res.status(400).json({
            code: -1,
            status: "ERROR",
            message: "존재하지 않는 도전 기간입니다",
        });
    }
});

// 해당 도전 기간에 등록
router.post("/:challenge_id/users/:user_name", async (req, res, next) => {
    const current_challenge = await Models.Challenge.findOne({
        id: req.params.challenge_id,
    });
    if (current_challenge) {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });
        if (current_user) {
            current_challenge.participants.push(current_user);
            const result = await current_challenge.save();
            res.status(200).json({
                status: "SUCCESS",
                message: "등록되었습니다",
                data: result,
            });
        } else {
            res.status(400).json({
                code: -2,
                status: "ERROR",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } else {
        res.status(400).json({
            code: -1,
            status: "FAIL",
            message: "존재하지 않는 도전 기간입니다",
        });
    }
});

export default router;
