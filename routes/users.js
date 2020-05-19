import express from "express";
import github from "octonode";

import * as Models from "../db/models";
import mongoose from 'mongoose';

const db = mongoose.connection;

import { Analytics, Crawler, Loggers } from "../db/compute";
import info from "../secure/info.json";

const router = express.Router();
const ghClient = github.client();

// 사용자 모두 조회
router.get("/", async (req, res, next)=>{
    try{
      const result = await Models.User.find();
      res.status(200).json({
          status: "success",
          data: result,
      });
    }
    catch(e){
      res.status(500).json({
        code : -1,
        satus : "FAIL",
        message : "오류가 발생했습니다",
        error : e
      })
    }
});

// 사용자 검색
router.get('/search', async (req, res, next)=>{
    const user_name = req.query.user_name || "";
    const users = await Models.User.find({
        $or: [
            {login: {'$regex' : `${user_name}`, '$options' : 'i'} },
            {name: {'$regex' : `${user_name}`, '$options' : 'i'} },
        ]
    });
    res.json({
        code : 1,
        status : 'SUCCESS',
        message : "조회했습니다",
        data : users
    });
});

// 사용자 추가 
// 사용자 추가 뒤 자동으로 최신 도전 기간에 등록 후 크롤링 수행
router.post("/:user_name", async (req, res, next) => {
    const current_user = await Models.User.findOne({
        login: req.params.user_name,
    });
    if (!current_user) {
        ghClient.get(
            "/users/" + req.params.user_name,
            {},
            async (err, status, body, headers) => {
                if (!err) {
                    const newUser = new Models.User({
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

                    const latestChallenge = await Models.Challenge.aggregate([
                        {
                            $sort: { created_at: -1 },
                        },
                    ]);

                    // 최근 도전 기간이 있다면, 추가 함
                    if(latestChallenge.length > 0){
                        await Models.Challenge.updateOne({
                            id: latestChallenge[0].id
                        },
                        {
                            $push : { "participants" : newUser }
                        });

                    }

                    Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 시작`, info.secret);
                    const _crawling_result = await Crawler.one(req.params.user_name);
                    Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 완료`, info.secret);

                    if (userResult) {
                        res.status(200).json({
                            code: 1,
                            status: "success",
                            message: "추가되었습니다",
                            data : {
                                result : _crawling_result
                            }
                        });
                    }
                } else {
                    res.json({
                        code : -2,
                        status: "FAIL",
                        message: "오류가 발생했습니다",
                        error : err
                    });
                }
            }
        );
    } else {
        res.json({
            code: -1,
            status: "FAIL",
            message: "이미 존재하는 사용자 입니다",
        });
    }
});

// 특정 사용자 조회
router.get("/:user_name", async (req, res, next) => {
    const result = await Models.User.findOne({
        login: req.params.user_name.toLowerCase(),
    });
    if(result){
        res.status(200).json({
            code : 1,
            status: "success",
            message : "조회에 성공했습니다",
            data: result,
        });
    }
    else{
        res.status(404).send({
            code : -1,
            status: "fail",
            message : "존재하지 않는 사용자입니다",
            erorr : new Error("존재하지 않는 사용자입니다")
            // data: result,
        });
    }
});

// 특정 사용자를 삭제 
router.delete("/:user_name" , async(req, res, next)=>{
    // 1. 존재하는 사용자인지 확인 
    // 2. 관련 커밋 삭제
    // 3. 관련 저장소 삭제  
    // 4. 관련 이벤트 삭제 
    // 5. 도전 기간에서 참가자 삭제 
    // 6. 사용자 삭제 

    // 다건 업데이트가 발생하므로 트랜잭션 사용
    const session = await db.startSession();
    session.startTransaction();
    try{
        // STEP 1
        const current_user = await Models.User.findOne({ login: req.params.user_name });
        if(current_user){
            // STEP 2
            const rm_commits = await Models.Commit.deleteMany({
                committer : current_user._id
            });
            // STEP 3
            const rm_repos = await Models.Repository.deleteMany({
                contributor : current_user._id
            });
            // STEP 4
            const rm_events = await Models.Event.deleteMany({
                actor: current_user._id
            });
            // STEP 5 
            const rm_participant_challenges = await Models.Challenge.updateMany({
                participants: current_user._id
            }, 
            { $pull : { participants: current_user._id } }
            );
            const rm_user = await current_user.remove();
            await session.commitTransaction();

            res.json({
                code : 1,
                status : "SUCCESS",
                message : "사용자가 정상적으로 삭제되었습니다",
                data: {
                    commits: rm_commits,
                    repos: rm_repos,
                    events : rm_events,
                    challenges: rm_participant_challenges,
                    user : rm_user,
                }
            })
        }
        else{
            res.json({
                code : -2,
                status : "FAIL",
                message : "존재하지 않는 사용자입니다",
            })
        }
    }
    catch(e){
        await session.abortTransaction();
        console.log(e);
        res.json({
            code : -1,
            status : "FAIL",
            message : "통신 중 오류가 발생헀습니다.",
            error : e.message
        })
    }
    finally{
        session.endSession();
    }
}); 

// 특정 사용자의 정보를 새로 불러오고 새로 fetch함
router.post("/:user_name/fetch", async (req, res, next) => {
    try{
        const result = await Crawler.one(req.params.user_name);
        res.json(result);
    }
    catch(e){
        res.json(e);
    }
});

export default router;
