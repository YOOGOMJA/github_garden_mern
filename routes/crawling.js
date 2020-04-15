import express from 'express';
import github from 'octonode';
import Axios from 'axios';

import { Event } from '../db/models/events';
import { User} from '../db//models/users';
import { CrawlingLog } from '../db/models/crawling_log';
import { ErrorLog } from '../db/models/error_log';

import db from '../db/db';

import keys  from '../secure/auth_keys.json';
import secure_info from '../secure/info.json';

const router = express.Router();
const client = github.client(secure_info.github_sha);

const __auth = {
    isAuthenticated : key=>{
        console.log(keys, key);
        return (keys.indexOf(key) >= 0);
    }
}

const __log = {
    process: async (targets, auth_key) => {
        const logs = new CrawlingLog({
            targets: targets,
            auth_key: auth_key,
            created_at: new Date()
        });
        await logs.save();
    },
    error : async e=>{
        const err_log = new ErrorLog({
            created_at: new Date(),
            error : e
        });
        await err_log.save();
    }
}

router.get("/" ,(req, res, next)=>{
    res.json({
        test: "Hello World"
    });
});

router.post("/all", async (req, res, next)=>{
    // 패스워드가 주어졌을 때 크롤링하도록 함
    if(await __auth.isAuthenticated(req.body.auth_key)){
        const all_users = await User.find();
        
        await __log.process(all_users,req.body.auth_key);

        if(all_users.length>0){
            // 1. 등록된 사용자들을 탐색
            //  TODO : 왠지 이 과정에서 동기 처리가 진행되지 않음
            all_users.forEach(async _user=>{
                try{
                    const _events = await client.user(_user.login).eventsAsync(["PushEvent"]);
                    _events[0].forEach(async _event=>{
                        const duplicated_event = await Event.findOne({ id: _user.login + "_" + _event.id });
                        if(!duplicated_event){
                            const md_event = new Event({
                                id: _user.login + "_" + _event.id,
                                type: _event.type,
                                actor: _user,
                                repo: _event.repo,
                                payload: _event.payload,
                                public: _event.public,
                                created_at: _event.created_at,
                            });
                            await md_event.save();
                            // console.log("[gomja] save '"+ _user.login +"' events | id : " + md_event.id);
                        }
                        else{
                            // console.log("[gomja] already exists '"+ _user.login +"' events | id : " + _event.id);
                        }
                    });
                }
                catch (e){
                    await __log.error(e);
                    console.log("[gomja] failed '"+ _user.login +"' events");
                }
            });

            res.status(200).json({
                status: "success",
                message: "크롤링 요청이 수행되었습니다",
            });
        }
        else{
            __log.error({
                message: "등록된 사용자가 없음",
                auth_key: req.body.auth_key,
            });

            res.status(400).json({
                status: 'failed',
                message: "등록된 사용자가 없습니다",
            })
        }
    }
    else{
        __log.error({
            message: "잘못된 인증키",
            auth_key: req.body.auth_key,
        });

        res.status(400).json({
            status: 'failed',
            message: "인증키가 올바르지 않습니다.",
        })
    }
});

router.post("/:user_name", async (req, res, next)=>{
    // 패스워드가 주어졌을 때 크롤링하도록 함
    if(await __auth.isAuthenticated(req.body.auth_key)){
        // 유저가 디비에 존재하는지 확인
        const current_user = await User.findOne({ login: req.params.user_name });
        // 로그를 남김
        await __log.process([current_user],req.body.auth_key);

        if(current_user){
            const user_name = req.params.user_name
            // 1. 깃허브에서 불러옴     
            client.get("/users/"+user_name+"/events", {}, (err, status, body, headers)=>{
                if(!err){
                    let crawling_cnt = 0;
                    // 2. 불러온 이벤트들을 하나씩 탐색
                    body.forEach(async item=>{
                        if(item.type.toLowerCase() === "pushevent"){
                            const duplicatedEvent = await Event.findOne({ id: user_name+"_"+item.id });
                            if(!duplicatedEvent){
                                // 3. mongoose 모델로 생성
                                const newEvent = new Event({
                                    id: current_user.login +"_"+item.id,
                                    type: item.type,
                                    actor: current_user,
                                    repo: {
                                        id: item.repo.id,
                                        name: item.repo.name
                                    },
                                    payload: {
                                        push_id: item.payload.push_id,
                                        size: item.payload.size,
                                        distinct_size: item.payload.distinct_size,
                                        ref: item.payload.ref,
                                        commits: item.payload.commits,
                                    },
                                    public: item.public,
                                    created_at: item.created_at
                                });
                                // 3.2. 저장
                                const current_event = await newEvent.save();
                                crawling_cnt++;
                            }
                            else{
                                // console.log("이미 추가된 이벤트 : " + duplicatedEvent.id);
                            }   
                        }
                    });

                    // 4. 모두 저장 후 응답
                    res.status(200).json({
                        status: 'success',
                        message: "[" + user_name + "] 사용자의 이벤트 "+crawling_cnt+"건이 추가되었습니다.",
                        cnt: crawling_cnt
                    })
                }
                else{
                    
                    __log.error(err);

                    res.status(500).json({
                        status: "failed",
                        message: "불러오는 도중 문제가 발생했습니다. 잠시 후 다시 시도해주세요",
                        error: err,
                    });
                }
            });
        }
        else{
            
            __log.error({
                message: "등록된 사용자가 아님",
                auth_key: req.body.auth_key,
            });

            res.status(400).json({
                status: "failed",
                message: "등록되지 않은 사용자입니다"
            });
        }
    }
    else{
        __log.error({
            message: "잘못된 인증키",
            auth_key: req.body.auth_key
        });

        res.status(400).json({
            status: "failed",
            message: "인증키가 잘못됐습니다"
        })
    }
});



export { router };