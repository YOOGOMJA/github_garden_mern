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

router.post("/:user_name", (req, res, next)=>{
    // 패스워드가 주어졌을 때 크롤링하도록 함
    try{
        const result = Crawler.fetchEvents(req.body.auth_key, req.params.user_name);
        res.status(200).json({
            code : 1,
            status : 'SUCCESS',
            data : result
        });
    }
    catch(e){
        res.status(400).json({
            code : -1,
            status : "FAIL",
            message : "조회에 실패했습니다",
            error : e
        });
    }
});

router.get("/language", async (req,res, next)=>{
    const result = await Crawler.fetchRepoLanguages("YOOGOMJA/github_garden_mern");
    res.json(result);
});

export { router };