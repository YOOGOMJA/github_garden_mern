import express from 'express';
import * as Models from '../db/models';
import moment from 'moment';
const router = express.Router();

// 특정 사용자의 저장소 정보를 모두 가져옴
router.get("/users/:user_name", async (req, res, next)=>{
    try{
        const current_user = await Models.User.findOne({ login: req.params.user_name });
        if(current_user){
            const repos = await Models.Repository.find({
                contributor : current_user._id
            })
            .populate('contributor')
            .exec((err, data)=>{
                if(!err){
                    res.json({
                        code : 1,
                        status : "SUCCESS",
                        message : "조회되었습니다",
                        data: data,
                    });
                }
                else{
                    res.json({
                        code : -3,
                        status : 'FAIL',
                        message : "조회 중 오류가 발생했습니다",
                        error : err.message,
                    });
                }
            })
            
            
        }
        else{
            res.json({
                code : -2,
                status : 'FAIL',
                message : "존재하지 않는 사용자입니다",
            });
        }
    }
    catch(e){
        res.json({
            code: -1,
            status : 'FAIL',
            message : "조회 중 오류가 발생했습니다",
            error: e,
        });
    }
});

export default router;
