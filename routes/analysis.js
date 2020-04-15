import express from "express";

import { Event } from "../db/models/events";

const router = express.Router();

router.get("/", (req, res, next)=>{
    res.json("Hello");
});

router.get("/commits/", (req, res, next)=>{
    
});

export default router;

