import express from "express";
import * as Models from "../db/models";
import moment from "moment";
import * as _lib_challenge from "../lib/challenge";
const router = express.Router();

// 모든 도전 기간 목록
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

// 종료되지 않은 도전 기간을 조회
router.get("/active" , async(req, res)=>{
    try{
        const mNow = moment();
        const activeChallenges = await Models.Challenge.find({
            finish_dt : {
                $gte : mNow.toDate()
            }
        })
        .sort({
            start_dt : "ASC",
            title : "ASC"
        });

        res.json({
            code : 1,
            status : "SUCCESS",
            message : "조회했습니다",
            data : activeChallenges
        })
    }
    catch(e){
        res.json({
            code : -1,
            status : "FAIL",
            message : "조회 중 오류가 발생했습니다",
            error : {
                message : e.message,
                object : e
            }
        })
    }
})

// 최신 도전 기간을 조회
router.get("/latest", async (req, res, next) => {
    try {
        const latestChallenge = await Models.Challenge.aggregate([
            { 
                $match : { is_featured : true }
            },
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
            code: -2,
            status: "FAIL",
            message: "조회 중 오류가 발생했습니다",
            error: e,
        });
    }
});

// 새로운 도전 기간을 등록
router.post("/", async (req, res, next) => {
    const valid = _lib_challenge.valid(req.body);
    if (valid.result) {
        const new_challenge = new Models.Challenge({
            id: "challenge_" + new Date().getTime(),
            created_at: new Date(),
            is_featured : false,
        });

        valid.validated.map((item) => {
            new_challenge[item.name] = item.value;
        });

        try {
            const result = await new_challenge.save();
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "일정이 추가되었습니다",
                data: result,
                valid: valid,
            });
        } catch (e) {
            res.status(400).json({
                code: -2,
                status: "FAIL",
                message: "데이터 추가 중 오류가 발생했습니다",
            });
        }
    } else {
        res.json({
            code: -1,
            status: "FAIL",
            message: "주어진 데이터가 올바르지 않습니다",
            error: valid.error,
        });
    }
});

router.put("/:challenge_id/featured" , async (req, res, next)=>{
    try {
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (current_challenge) {
            if(Object.keys(req.body).indexOf('is_featured') >= 0){
                if(req.body.is_featured){
                    // 인증 처리 하는 경우 
                    const _ChallengeFeaturedAlready = await Models.Challenge.findOne({
                        is_featured : true
                    });
                    if(_ChallengeFeaturedAlready){
                        throw new Error("이미 인증된 도전 기간이 있습니다");
                    }
                }
                current_challenge.is_featured = req.body.is_featured;
                await current_challenge.save();
                res.json({
                    code : 1,
                    status : 'SUCCESS',
                    message : '수정 되었습니다',
                });
            }   
            else{ throw new Error("인증 여부가 주어지지 않았습니다");  }
        } else {
            throw new Error("존재하지 않는 도전 기간입니다");
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: e.message || e,
        });
    }
});

// 주어진 도전 정보의 일자를 수정하거나, 이름을 수정합니다
router.put("/:challenge_id", async (req, res, next) => {
    try {
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (current_challenge) {
            const valid = _lib_challenge.valid(req.body, current_challenge, {
                title: false,
                start_dt: false,
                finish_dt: false,
            });
            if (valid.result) {
                valid.validated.map((item) => {
                    current_challenge[item.name] = item.value;
                });
                const result = await current_challenge.save();
                res.json({
                    code: 1,
                    status: "SUCCESS",
                    message: "수정되었습니다",
                    data: result,
                });
            } else {
                res.json({
                    code: -3,
                    status: "FAIL",
                    message: "주어진 데이터가 올바르지 않습니다",
                    error: valid.error,
                });
            }
        } else {
            res.json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 도전 기간입니다",
            });
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: e,
        });
    }
});

// 해당 도전 기간을 삭제
router.delete("/:challenge_id", async (req, res, next) => {
    try {
        const current_challenge = await Models.Challenge.findOne({
            id: req.params.challenge_id,
        });
        if (current_challenge) {
            const result = await current_challenge.delete();
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "삭제되었습니다",
                data: result,
            });
        } else {
            res.json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 도전 기간입니다",
            });
        }
    } catch (e) {
        res.json({
            code: -1,
            status: "FAIL",
            message: "통신 중 오류가 발생했습니다",
            error: e,
        });
    }
});

// 특정 사용자의 도전 기간 목록
router.get("/users/:user_name", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });
        if (current_user) {
            const challenges = await Models.Challenge.aggregate([
                {
                    $match: {
                        participants: current_user._id,
                    },
                },
                {
                    $sort : {
                        is_featured : -1,
                        start_dt : -1,
                        finish_dt: -1
                    }
                }
            ]);
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

router.delete("/:challenge_id/users/:user_name", async (req, res, next)=>{
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });
        if (current_user) {
            const result = await Models.Challenge.updateOne({
                id : req.params.challenge_id,
            },{
                $pull:{
                    participants: current_user._id
                }
            });
            res.json({
                code: 1,
                status: "SUCCESS",
                message: "삭제되었습니다",
                data: result,
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

// 특정 도전 기간 정보와 등록된 사용자 목록
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

// 사용자를 해당 도전 기간에 등록
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
