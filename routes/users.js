import express from "express";
import github from "octonode";
import Axios from "axios";

import { User } from "../db/models/users";

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


export default router;
