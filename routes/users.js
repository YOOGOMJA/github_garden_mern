import express from "express";
import github from "octonode";

import * as Models from "../db/models";

import { Analytics, Crawler, Loggers } from "../db/compute";
import info from "../secure/info.json";

const router = express.Router();
const ghClient = github.client();

/* GET users listing. */
router.get("/", async (req, res, next)=>{
    console.log("hello users api!");
    try{
      const result = await Models.User.find();
      console.log("load complete");
      res.status(200).json({
          status: "success",
          data: result,
      });
    }
    catch(e){
      console.log("error !" , e);
      res.status(500).json({
        code : -1,
        satus : "FAIL",
        message : "오류가 발생했습니다",
        error : e
      })
    }
});

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
                    const crawling_result = await Crawler.fetchEvents(
                        info.secret,
                        newUser.login
                    );
                    const analytics_result_event = await Analytics.computeEvents();
                    const analytics_result_repo = await Analytics.computeRepos();

                    Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 완료`, info.secret);

                    if (userResult) {
                        res.status(200).json({
                            code: 1,
                            status: "success",
                            message: "추가되었습니다",
                            data : {
                                crawling_result: crawling_result,
                                analytics_result: {
                                    event : analytics_result_event,
                                    repo : analytics_result_repo
                                }
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

// 해당 사용자의 커밋들
router.get("/:user_name/commits", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });

        if (current_user) {
            const commits = await Models.Commit.aggregate([
                {
                    $match: {
                        committer: current_user._id
                    },
                },
                {
                    $sort: {
                        commit_date: -1,
                    },
                },
                {
                  $lookup: {
                    from: 'repositories',
                    localField : 'repo',
                    foreignField : "_id",
                    as : "repo_detail"
                  }
                },
                {
                  $unwind : "$repo_detail"
                }
            ]);
                
            res.json({
              code : 1,
              status : "SUCCESS",
              message : "조회에 성공했습니다",
              data : commits
            })
        } else {
            res.status(400).json({
                code: -1,
                status: "ERROR",
                message: "등록되지 않은 사용자입니다",
            });
        }
    } catch (e) {
        res.status(500).json({
            code: -2,
            status: "ERROR",
            message: "오류가 발생했습니다",
            error: e,
        });
    }
});

// 해당 사용자의 등록된 repo들
router.get("/:user_name/repos", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });

        if (current_user) {
            const repos = await Models.Repository.find({
                contributor: current_user,
            })
                .populate("contributor")
                .exec((err, result) => {
                    if (!err) {
                        res.json({
                            code: 1,
                            message: "조회에 성공했습니다",
                            data: result,
                        });
                    } else {
                        res.status(500).json({
                            code: -3,
                            status: "FAIL",
                            message: "조회 중 오류가 발생했습니다",
                            error: err,
                        });
                    }
                });
        } else {
            res.status(400).json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } catch (e) {
        res.status(400).json({
            code: -1,
            status: "FAIL",
            message: "이미 존재하는 사용자 입니다",
        });
    }
});

// 해당 사용자가 등록된 도전 기간들
router.get("/:user_name/challenges", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });

        if (current_user) {
            const challenges = await Models.Challenge.find({
                participants: current_user,
            })
                .populate("participants")
                .exec((err, result) => {
                    if (!err) {
                        res.json({
                            code: 1,
                            status: "SUCCESS",
                            message: "조회에 성공했습니다",
                            data: result,
                        });
                    } else {
                        res.status(500).json({
                            code: -3,
                            status: "FAIL",
                            message: "오류가 발생했습니다",
                            error: err,
                        });
                    }
                });
        } else {
            res.status(400).json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } catch (e) {
        res.status(400).json({
            code: -1,
            status: "FAIL",
            message: "이미 존재하는 사용자 입니다",
        });
    }
});

// 해당 사용자의 정보를 새로 불러오고 새로 fetch함
router.post("/:user_name/fetch", async (req, res, next) => {
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });

        if (current_user) {
            Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 시작`, info.secret);
            const crawling_result = await Crawler.fetchEvents(
                info.secret,
                current_user.login
            );
            const analytics_result_event = await Analytics.computeEvents();
            const analytics_result_repo = await Analytics.computeRepos();

            Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 완료`, info.secret);
            res.status(200).json({
                code: 1,
                status: "SUCCESS",
                message: "데이터를 새로 가져왔습니다",
                crawling_result: crawling_result,
                analytics_result: {
                    event : analytics_result_event,
                    repo : analytics_result_repo,
                },
            });
        } else {
            res.status(400).json({
                code: -2,
                status: "FAIL",
                message: "존재하지 않는 사용자입니다",
            });
        }
    } catch (e) {
        Loggers.Crawler(`사용자 [${req.params.user_name}] 데이터 갱신 실패`, info.secret);
        res.status(400).json({
            code: -1,
            status: "FAIL",
            message: "오류가 발생했습니다",
            error : e,
        });
    }
});

export default router;
