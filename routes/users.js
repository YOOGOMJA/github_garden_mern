import express from "express";
import github from "octonode";

import * as Models from "../db/models";

import { Analytics, Crawler } from "../db/compute";
import info from "../secure/info.json";

const router = express.Router();
const ghClient = github.client();

/* GET users listing. */
router.get("/", async function (req, res, next) {
    const result = await Models.User.find();
    res.status(200).json({
        status: "success",
        data: result,
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
                    if (userResult) {
                        res.status(200).json({
                            code: 1,
                            status: "success",
                            message: "추가되었습니다",
                        });
                    }
                } else {
                    const current_error = new ErrorLog({
                        error: err,
                        created_at: new Date(),
                    });
                    current_error.save();

                    res.status(400).json({
                        status: "failed",
                        message: "오류가 발생했습니다",
                    });
                }
            }
        );
    } else {
        res.status(400).json({
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

    res.status(200).json({
        status: "success",
        data: result,
    });
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
    // Crawler(info.secret,req.params.user_name)
    try {
        const current_user = await Models.User.findOne({
            login: req.params.user_name,
        });

        if (current_user) {
            const crawling_result = await Crawler(
                info.secret,
                current_user.login
            );
            const analytics_result = await Analytics.fetch();
            res.status(200).json({
                code: 1,
                status: "SUCCESS",
                message: "데이터를 새로 가져왔습니다",
                crawling_result: crawling_result,
                analytics_result: analytics_result,
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

export default router;
