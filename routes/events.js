import express from 'express';
import * as Models from '../db/models';
import moment from 'moment';
const router = express.Router();

const ITEMS_PER_PAGE = 10;

// 모든 이벤트를 가져옴 
// 페이징 적용
router.get("/", async (req, res, next)=>{
    try{
        // 1. 페이징 기본 값이 있는지 확인
        const _currentPage = req.query.page ? Number(req.query.page) : 1;
        
        if(isNaN(_currentPage)){
            res.json({
                code : -2,
                status : 'FAIL',
                message : "페이지가 잘못됐습니다"
            });
        }
        else{
            // 2. 모든 이벤트 숫자 카운트
            const _countEvents = await Models.Event.countDocuments();
            let extendedEvents = [];
            // 3. 페이징 적용해 조회
            const _paginatedEvents = await Models.Event
                                    .find()
                                    .limit(ITEMS_PER_PAGE)
                                    .skip(ITEMS_PER_PAGE * _currentPage)
                                    .sort({
                                        created_at: 'desc'
                                    })
                                    .exec();
                                    
            // 4. 다시 탐색해 repo 정보 포함
            for(let event of _paginatedEvents){
                const _repoDetail = await Models.Repository.findOne({
                    id: event.repo.id
                });
                const _actorDetail = await Models.User.findOne({
                    _id: event.actor
                });

                extendedEvents.push({
                    ...event._doc,
                    repo_detail: _repoDetail,
                    actor_login: _actorDetail.login
                });
            }

            // 5. 전환
            res.json({
                code : 1,
                status : "SUCCESS",
                message : "조회했습니다",
                data : {
                    count_all_items : _countEvents,
                    events: extendedEvents
                }
            });
        }
    }
    catch(e){
        res.json({
            code : -1,
            status : 'FAIL',
            message : "오류가 발생했습니다.",
            error : {
                message : e.message,
                object : e
            }
        });
    }
});

router.get("/:user_name", async (req, res, next)=>{
    try{
        // 1. 페이징 기본 값이 있는지 확인
        const _currentPage = req.query.page ? Number(req.query.page) : 1;
        const _currentUser = await Models.User.findOne({ login : req.params.user_name });
        if(isNaN(_currentPage)){
            res.json({
                code : -2,
                status : 'FAIL',
                message : "페이지가 잘못됐습니다"
            });
        }
        else if(_currentUser == null){
            res.json({
                code : -3,
                status : 'FAIL',
                message : "사용자 이름이 잘못됐습니다"
            });
        }
        else{
            // 2. 모든 이벤트 숫자 카운트
            const _countEvents = await Models.Event.countDocuments({ actor: _currentUser._id });
            let extendedEvents = [];
            // 3. 페이징 적용해 조회
            const _paginatedEvents = await Models.Event
                                    .find({ actor: _currentUser._id })
                                    .limit(ITEMS_PER_PAGE)
                                    .skip(ITEMS_PER_PAGE * (_currentPage - 1))
                                    .sort({
                                        created_at: 'desc'
                                    })
                                    .exec();
                                    
            // 4. 다시 탐색해 repo 정보 포함
            for(let event of _paginatedEvents){
                const _repoDetail = await Models.Repository.findOne({
                    id: event.repo.id
                });
                const _actorDetail = await Models.User.findOne({
                    _id: event.actor
                });

                extendedEvents.push({
                    ...event._doc,
                    repo_detail: _repoDetail,
                    actor_login: _actorDetail.login
                });
            }

            // 5. 전환
            res.json({
                code : 1,
                status : "SUCCESS",
                message : "조회했습니다",
                data : {
                    count_all_items : _countEvents,
                    events: extendedEvents
                }
            });
        }
    }
    catch(e){
        res.json({
            code : -1,
            status : 'FAIL',
            message : "오류가 발생했습니다.",
            error : {
                message : e.message,
                object : e
            }
        });
    }
});

export default router;
