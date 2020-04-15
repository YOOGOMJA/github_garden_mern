import express from "express";
import github from "octonode";
import Axios from "axios";

import { User } from "../db/models/users";
import db from "../db/db";

const router = express.Router();
const ghClient = github.client();

/* GET users listing. */
router.get("/", async function (req, res, next) {
    const result = await User.find();
    res.status(200).json({
      status: 'success',
      data: result
    });
});

router.get("/:user_name", async (req, res, next) => {
    const result = await User.findOne({
        login: req.params.user_name.toLowerCase(),
    });

    res.status(200).json({
      status: 'success',
      data: result
    });
});

router.post("/", async (req, res, next) => {
    if (req.body.user_name) {
        const result = await User.find({
            login: req.body.user_name.toLowerCase(),
        });
        if (result.length > 0) {
            res.status(400).json({
                status: "success",
                message: "이미 존재하는 계정입니다.",
            });
        } else {
            ghClient.get(
                "/users/" + req.body.user_name,
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
                }
            );
        }
    } else {
        res.status(400).json({
            status: "failed",
            message: "user_name이 주어지지 않았습니다.",
        });
    }
});

export default router;
