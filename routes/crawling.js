import express from 'express';
import { Crawler, Analytics } from '../db/compute';

const router = express.Router();

router.post("/all" , (req, res, next)=>{
    Crawler(req.body.auth_key)
    .then(result=>{
        res.status(200).json(result);
    })
    .catch(err=>{
        res.status(400).json(err);
    });
});

router.get("/fetch" , (req, res, next)=>{
    Analytics.computeEvents()
    .then(result=>{
        res.json(result);
    })
    .catch(result=>{
        res.status(400).json(result);
    });
});

router.get("/language", async (req,res, next)=>{
    const result = await Crawler.fetchRepoLanguages("YOOGOMJA/github_garden_mern");
    res.json(result);
});

export { router };