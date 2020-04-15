import express from "express";

import { Event } from "../db/models/events";

const router = express.Router();

router.get("/", (req, res, next)=>{
    res.json("Hello");
});

// TODO: 참여한 모든 인원 조회
router.get("/users/", (req, res, next)=>{
    
});

export default router;

