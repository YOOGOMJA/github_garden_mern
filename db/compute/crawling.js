import * as Models from "../models";

import github from "octonode";
import keys from "../../secure/auth_keys.json";
import secure_info from "../../secure/info.json";
import * as Loggers from "./loggers";
import moment from 'moment';

import mongoose, { modelNames } from 'mongoose';
const db = mongoose.connection;

// github API를 사용해야하는 기능들은 여기에 모두 모아둡니다

// 단건 이벤트 불러오기
const fetchEvent = async (user_name) => {
    console.log("[crawler] fetching started : " + user_name);
    // 현재 넘겨받은 이름이 존재하는지 확인
    const current_user = await Models.User.findOne({ login: user_name });
    const current_promise = new Promise(async (resolve, reject) => {
        if (current_user) {
            const githubAPIClient = github.client(secure_info.github_sha);
            githubAPIClient.get(
                `/users/${user_name}/events`,
                {},
                async (err, status, body) => {
                    if (err) {
                        reject({
                            code: -2,
                            status: "FAIL",
                            message: "에러가 발생했습니다",
                            error: {
                                status: status,
                                error: err,
                            },
                        });
                    } else {
                        // console.log("[CRAWLER] fetched data from github : " + user_name, body);
                        for (let idx = 0; idx < body.length; idx++) {
                            const _event = body[idx];
                            if (_event.type.toLowerCase() === "pushevent") {
                                const _duplicatedEvent = await Models.Event.findOne(
                                    {
                                        id: `${current_user.login}_${_event.id}`,
                                    }
                                );
                                if (!_duplicatedEvent) {
                                    const _mEvent = new Models.Event({
                                        id: `${current_user.login}_${_event.id}`,
                                        type: _event.type,
                                        actor: current_user,
                                        repo: {
                                            id: _event.repo.id,
                                            name: _event.repo.name,
                                        },
                                        payload: {
                                            push_id: _event.payload.push_id,
                                            size: _event.payload.size,
                                            distinct_size:
                                                _event.payload.distinct_size,
                                            ref: _event.payload.ref,
                                            commits: _event.payload.commits,
                                        },
                                        public: _event.public,
                                        created_at: new Date(_event.created_at),
                                    });
                                    try {
                                        const result = await _mEvent.save();
                                    } catch (e) {
                                        console.log(
                                            "[CRAWER] 에러가 발생했습니다.",
                                            e
                                        );
                                        reject({
                                            code: -3,
                                            status: "FAIL",
                                            message: "에러가 발생했습니다",
                                            error: e,
                                        });
                                        return;
                                    }
                                }
                            }
                        }
                        console.log("[CRAWLER] 데이터를 가져왔습니다");
                        resolve({
                            code: 1,
                            status: "SUCCESS",
                            message: "데이터를 가져왔습니다",
                        });
                    }
                }
            );
        } else {
            reject({
                code: -1,
                status: "FAIL",
                message: "등록되지 않은 사용자입니다",
            });
        }
    });

    return current_promise;
};

// 다건 이벤트들을 불러옵니다
const fetchEvents = (auth_key, user_name) => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        if (keys.indexOf(auth_key) >= 0) {
            if (user_name) {
                // 특정
                try {
                    const result = await fetchEvent(user_name);
                    resolve({
                        code: 1,
                        status: "SUCCESS",
                        message: "데이터를 모두 가져왔습니다",
                        data: result,
                    });
                } catch (err) {
                    reject({
                        code: -2,
                        status: "FAIL",
                        message: "데이터를 가져오는데 실패했습니다",
                        error: err,
                    });
                    Loggers.Error(err);
                }
            } else {
                // 전체
                try {
                    console.log("[CRAWLER] fetch all users");
                    const allUsers = await Models.User.find();
                    for (let idx = 0; idx < allUsers.length; idx++) {
                        try {
                            const _events = await fetchEvent(
                                allUsers[idx].login
                            );
                        } catch (e) {
                            reject({
                                code: -3,
                                status: "FAIL",
                                message: "데이터를 가져오는데 실패했습니다",
                            });
                            Loggers.Error(e);
                            return;
                        }
                    }
                    resolve({
                        code: 1,
                        status: "SUCCESS",
                        message: "데이터를 모두 가져왔습니다",
                    });
                } catch (e) {
                    reject({
                        code: -2,
                        status: "FAIL",
                        message: "데이터를 가져오는데 실패했습니다",
                        error: e,
                    });
                    Loggers.Error(e);
                }
            }
        } else {
            reject({
                code: -1,
                status: "FAIL",
                message: "인증키가 올바르지 않습니다",
            });
            Loggers.Error({
                status: "FAIL",
                message: "인증키가 올바르지 않습니다",
            });
        }
    });
    return fetchPromise;
};


/**
 * @description github api로부터 해당 저장소의 언어 정보를 갱신합니다
 * @param {string} repo_name 정보를 갱신할 저장소의 풀 네임입니다
 * @returns {Promise} 결과 정보를 담은 프로미스 객체를 반환합니다
 */
const fetchRepoLanguages = (repo_name) =>{
    const fetchPromise = new Promise(async (resolve, reject)=>{
        // 1. 불러올 저장소가 존재하는지 확인
        try{
            const current_repo = await Models.Repository.findOne({ name : repo_name });
            if(current_repo){
                const githubAPIClient = github.client(secure_info.github_sha);
                githubAPIClient.get(
                    `/repos/${repo_name}/languages`,
                    {},
                    async (err, status, body) =>{
                        if(!err){
                            const languages = [];
                            Object.keys(body).forEach(lang=>{
                                languages.push({
                                    name : lang,
                                    rate : body[lang]
                                });
                            });

                            current_repo.languages = languages;
                            const update_result = await current_repo.save();
                            
                            resolve({
                                code : 1,
                                status : "SUCCESS",
                                message : "데이터를 불러왔습니다",
                                repo : update_result,
                                languages: languages,
                            })
                        }
                        else{
                            reject({
                                code : -3,
                                status : "FAIL",
                                message : "github API 오류가 발생했습니다",
                                error : err
                            })
                        }
                    }
                )
            }
            else{
                reject({
                    code : -2,
                    status : "FAIL",
                    message : `저장소 ${repo_name}는 등록된 저장소가 아닙니다` 
                })
            }
        }
        catch(e){
            reject({
                code : -1,
                status : "FAIL",
                message : "불러오는 중 보류가 발생했습니다"
            })
        }        
    });
    return fetchPromise;
}

/**
 * @description 모든 사용자의 이벤트 정보를 github API로 갱신합니다
 * @returns {Promise} 결과 정보를 담은 프로미스 객체를 반환합니다
 */
const fetchAllUsersEvents = ()=>{
    return new Promise(async (resolve, reject)=>{
        try{
            const allUsers = await Models.User.find();
            let _results = [];
            for(const user of allUsers){
                const _result = await fetchUserEvents(user.login);
                _results.push(_result);
            }
            resolve({
                code : 1,
                status : "ERROR",
                message : "모든 사용자의 이벤트 갱신이 완료되었습니다",
                data : _results
            })
        }
        catch(e){
            resolve({
                code : -1,
                status : "ERROR",
                message : "통신 중 오류가 발생했습니다",
                error : e.message || e
            })
        }
    })
}

/**
 * @description 특정 사용자의 모든 이벤트를 조회합니다
 * @param {string} user_name 
 */
const fetchUserEvents = async (user_name) => {
    console.log("[crawler] fetching started : " + user_name);
    // 현재 넘겨받은 이름이 존재하는지 확인
    const current_user = await Models.User.findOne({ login: user_name });
    const current_promise = new Promise(async (resolve, reject) => {
        if (current_user) {
            const githubAPIClient = github.client(secure_info.github_sha);
            githubAPIClient.get(
                `/users/${user_name}/events`,
                {},
                async (err, status, body) => {
                    if (err) {
                        reject({
                            code: -2,
                            status: "FAIL",
                            message: "에러가 발생했습니다",
                            error: {
                                status: status,
                                error: err,
                            },
                        });
                    } else {
                        // console.log("[CRAWLER] fetched data from github : " + user_name, body);
                        for (let idx = 0; idx < body.length; idx++) {
                            const _event = body[idx];
                            if (_event.type.toLowerCase() === "pushevent") {
                                const _duplicatedEvent = await Models.Event.findOne(
                                    {
                                        id: `${current_user.login}_${_event.id}`,
                                    }
                                );
                                if (!_duplicatedEvent) {
                                    const _mEvent = new Models.Event({
                                        id: `${current_user.login}_${_event.id}`,
                                        type: _event.type,
                                        actor: current_user,
                                        repo: {
                                            id: _event.repo.id,
                                            name: _event.repo.name,
                                        },
                                        payload: {
                                            push_id: _event.payload.push_id,
                                            size: _event.payload.size,
                                            distinct_size:
                                                _event.payload.distinct_size,
                                            ref: _event.payload.ref,
                                            commits: _event.payload.commits,
                                        },
                                        public: _event.public,
                                        created_at: new Date(_event.created_at),
                                    });
                                    try {
                                        const result = await _mEvent.save();
                                    } catch (e) {
                                        console.log(
                                            "[CRAWER] 에러가 발생했습니다.",
                                            e
                                        );
                                        reject({
                                            code: -3,
                                            status: "FAIL",
                                            message: "에러가 발생했습니다",
                                            error: e,
                                        });
                                        return;
                                    }
                                }
                            }
                        }
                        console.log("[CRAWLER] 데이터를 가져왔습니다");
                        resolve({
                            code: 1,
                            status: "SUCCESS",
                            message: "데이터를 가져왔습니다",
                        });
                    }
                }
            );
        } else {
            reject({
                code: -1,
                status: "FAIL",
                message: "등록되지 않은 사용자입니다",
            });
        }
    });

    return current_promise;
};


/**
 * @description 저장소의 정보를 github API를 이용해 갱신합니다. 언어 정보 또한 갱신합니다
 * @param {string} repo_name 정보를 갱신할 저장소 이름
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchRepo = (repo_name) =>{   
    const fetchPromise = new Promise(async (resolve, reject)=>{
        // 트랜잭션 시작
        const session = await db.startSession();
        session.startTransaction();
        try{
            // 1. 저장소를 불러옴 
            let repo = await Models.Repository.findOne({
                name : repo_name
            });

            if(repo){
                // 1.1. 저장소가 존재하는 경우
                const githubAPIClient = github.client(secure_info.github_sha);
                githubAPIClient.get(
                    `/repos/${repo_name}`,{},
                    async (err, status, body)=>{
                        if(err){
                            session.abortTransaction();
                            session.endSession();
                            reject({
                                code : -2,
                                status : "ERROR",
                                message : "Github API 통신 중 오류가 발생했습니다",
                                error : `[${status}] ${err.message || err}`
                            });
                        }
                        else{
                            repo.description = body.description;
                            repo.created_at = body.created_at;
                            repo.stargazers_count = body.stargazers_count;
                            repo.watchers_count = body.watchers_count;
                            repo.forks_count = body.forks_count;
                            repo.homepage = body.homepage;
                            repo.license = body.license;
                            try{
                                await repo.save();
                                session.commitTransaction();
                                resolve({
                                    code : 1,
                                    status : "SUCCESS",
                                    message : `저장소 [${repo.name}]의 갱신이 완료되었습니다`,
                                    data : repo
                                });
                            }
                            catch(e){
                                session.abortTransaction();
                                reject({
                                    code : -3,
                                    status : "ERROR",
                                    message : "저장소 정보 갱신 중 오류가 발생했습니다",
                                    error : e.message || e
                                });
                            }
                            finally{
                                session.endSession();
                            }
                        }
                    }
                );
            }
            else{
                throw new Error("저장소가 존재하지 않습니다");
            }
        }
        catch(e){
            session.abortTransaction();
            session.endSession();
            reject({
                code : -1,
                status : "ERROR",
                message : "통신 중 오류가 발생했습니다",
                error : e.message || e
            });
        }
    });
    return fetchPromise;
}

/**
 * @description 특정 사용자의 모든 저장소 모든 정보(저장소 / 언어)를 갱신합니다
 * @param {string} user_name 갱신할 사용자의 github login 입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchUserReposAllInfo = (user_name)=>{
    const fetchPromise = new Promise(async (resolve, reject)=>{
        // 존재하는 사용자인지 먼저 확인
        try{
            const currentUser = await Models.User.findOne({
                login : user_name
            });

            if(currentUser){
                const repos = await Models.Repository.find({
                    contributor : currentUser._id
                });
                let _results = [];
                for(let repo of repos){
                    const _repo_result = await fetchRepo(repo.name);
                    const _lan_result = await fetchRepoLanguages(repo.name);
                    _results.push({
                        repo : _repo_result,
                        lan : _lan_result,
                    });
                }
                resolve({
                    code : 1,
                    status : "SUCCESS",
                    message : `'${currentUser.login}'의 모든 저장소 정보를 갱신했습니다`,
                    data : _results,
                });
            }
            else{
                reject({
                    code : -2,
                    status : "FAIL",
                    message : "존재하지 않는 사용자입니다",
                })
            }
        }
        catch(e){
            reject({
                code : -1,
                status : "FAIL",
                message : "통신 중 오류가 발생했습니다",
                error : e.message || e
            });
        }
    });
    return fetchPromise;
}

/**
 * @description 모든 사용자들의 모든 저장소 정보를 불러옵니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchAllUsersReposAllInfo = ()=>{
    return new Promise(async (resolve, reject)=>{
        try{
            const allUsers = await Models.User.find();
            let _results = [];
            for(const user of allUsers){
                const _result = await fetchUserReposAllInfo(user.login);
                _results.push(_result);
            }
            resolve({
                code : 1,
                status : "ERROR",
                message : "모든 사용자의 저장소 갱신이 완료되었습니다",
                data : _results
            })
        }
        catch(e){
            resolve({
                code : -1,
                status : "ERROR",
                message : "통신 중 오류가 발생했습니다",
                error : e.message || e
            })
        }
    })
}

/**
 * @description 특정 사용자의 pushEvents로부터 커밋, 저장소를 갱신합니다
 * @param {string} user_name 갱신할 사용자의 github login 입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const computeUserEvents = (user_name) => {
    const computedPromise = new Promise(async (resolve, reject) => {
        const session = await db.startSession();
        session.startTransaction();
        let event_result = [];
        let commit_result = [];
        let repo_result = [];
        
        try {
            if (!user_name) {
                throw new Error("사용자 명이 주어지지 않았습니다");
            }
            // 1 . 존재하는 사용자인지 확인
            const _currentUser = await Models.User.findOne({
                login: user_name,
            });
            if (_currentUser) {
                // 2. 사용자의 이벤트를 모두 불러옴 
                const _events = await Models.Event.aggregate([
                    {
                        $match: {
                            actor: _currentUser._id,
                        },
                    },
                ]);
                // 3. 현재 사용자의 이벤트를 한건씩 읽어들임
                for(const event of _events){
                    let eventRepo = await Models.Repository.findOne({
                        name : event.repo.name
                    });
                    // 3.1. 이벤트의 저장소 정보를 가져옴
                    if(!eventRepo){    
                        // 3.1.1. 현재 이벤트의 타겟 저장소가 DB에 존재하지 않는 경우 
                        // 생성 처리 
                        const newRepo = new Models.Repository({
                            id : event.repo.id,
                            name : event.repo.name,
                            // 생성 후 스스로를 contributor로 추가
                            contributor : [_currentUser],
                        });
                        try{
                            // 3.1.1.1. 디비에 새로운 저장소를 추가
                            await newRepo.save();
                            eventRepo = newRepo;
                            repo_result.push({
                                target : newRepo.name,
                                action_type : 'ADD'
                            });
                        }
                        catch(e){
                            repo_result.push({
                                target : newRepo.name,
                                action_type : 'ERROR'
                            });
                            // 3.1.1.2. 저장소 추가가 실패하면 모든 행동을 취소 처리 함
                            throw new Error(e.message || e);
                        }
                    }
                    else{
                        // 3.1.2. 저장소가 존재한다면 스스로를 추가 
                        // : 이미 추가된 경우 자동으로 무시된다
                        const updateRepoResult = await Models.Repository.updateOne({
                            name : eventRepo.name,
                        },{
                            $addToSet:{
                                contributor: _currentUser
                            }
                        });
                        repo_result.push({
                            target : eventRepo.name,
                            action_type : 'UPDATE',
                            data : updateRepoResult
                        });
                    }
                    
                    // 3.2. 이벤트 안의 커밋들을 불러옴 
                    for(const commit of event.payload.commits){
                        // 3.2.1. 중복 커밋이 있는지 확인
                        const duplicatedCommit = await Models.Commit.findOne({
                            sha : commit.sha,
                            committer : _currentUser,
                        });
                        if(!duplicatedCommit){
                            // 3.2.1.1. 새로운 커밋 생성
                            const newCommit = new Models.Commit({
                                sha : commit.sha,
                                author : commit.author,
                                message : commit.message,
                                commit_date : event.created_at,
                                commit_date_string: new moment(
                                    event.created_at
                                ).format("YYYY-MM-DD"),
                                committer : _currentUser,
                                repo : eventRepo
                            });

                            try{
                                await newCommit.save();
                                commit_result.push({
                                    target : newCommit.sha,
                                    repo : eventRepo.name,
                                    action_type : "ADD"
                                });
                            }
                            catch(e){
                                commit_result.push({
                                    target : newCommit.sha,
                                    repo : eventRepo.name,
                                    action_type : "ERROR"
                                });
                                throw new Error(e.message || e);
                            }
                        }
                    } 

                    // 3.3. 이벤트 탐색 종료 
                    event_result.push({
                        target : event.id,
                        action_type : 'ADD',
                    });
                }

                // 4. 갱신 완료 처리 후 트랜잭션 커밋 
                session.commitTransaction();
                resolve({
                    code: 1,
                    status: "SUCCESS",
                    message: "갱신이 성공했습니다",
                    result :{
                        event : event_result,
                        repo : repo_result,
                        commit : commit_result
                    }
                });
            } else {
                session.abortTransaction();
                reject({
                    code: -2,
                    status: "FAIL",
                    message: "존재하지 않는 사용자입니다",
                });
            }
        } catch (e) {
            session.abortTransaction();
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: e.message || e,
            });
        }
        finally{
            session.endSession();
        }
    });
    return computedPromise;
};

/**
 * @description 등록된 모든 사용자의 pushEvents로부터 커밋, 저장소를 갱신합니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const computeAllUsersEvents = ()=>{
    const computedPromise = new Promise(async (resolve, reject)=>{
        try{
            let _result = [];
            const allUsers = await Models.User.find();
            for(const user of allUsers){
                const computeUserEventResult = await computeUserEvents(user.login);
                _result.push(computeUserEventResult);
            }
            resolve({
                code : 1,
                status : "SUCCESS",
                message : "모든 유저의 이벤트 갱신이 완료되었습니다",
                result : _result
            })
        }
        catch(e){
            reject({
                code : -1,
                status : "FAIL",
                message : "갱신 중 에러가 발생했습니다",
                error : e.message || e
            });
        }
    });

    return computedPromise;
}

// WILL DEPRECATE
/**
 * @deprecated fetch / compute 기능 분리로 삭제
 */
export { 
    fetchEvents, 
    fetchRepoLanguages,
};

// ================================================================
// 크롤러 반환 내용
// ================================================================

/**
 * @description 사용자의 모든 정보를 갱신합니다
 * @param {string} user_name 정보를 가져올 사용자의 github login입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const one = (user_name)=>{
    return new Promise(async (resolve, reject)=>{
        try{
            // 1. 깃허브 API로부터 이벤트를 불러옴
            const _fetchEvents = await fetchUserEvents(user_name);
            // 2. 불러온 이벤트로부터 커밋 , 저장소를 생성
            const _computeEvents = await computeUserEvents(user_name);
            // 3. 생성된 저장소의 추가 정보와 언어 정보를 갱신 
            const _fetchReposInfo = await fetchUserReposAllInfo(user_name);
            resolve({
                code : 1,
                status : "SUCCESS",
                message : `사용자[${user_name}]의 모든 정보를 갱신했습니다`,
                data : {
                    fetch_events : _fetchEvents,
                    compute_events : _computeEvents,
                    fetch_repos : _fetchReposInfo
                }
            });
        }
        catch(e){
            reject({
                code : -1,
                status : "ERROR",
                message : "갱신 중 오류가 발생했습니다",
                error : e.message || e
            });
        }
    });
}

/**
 * @description 모든 사용자의 모든 정보를 갱신합니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const all = ()=>{
    return new Promise(async (resolve, reject)=>{
        try{
            // 1. 깃허브 API로부터 이벤트를 불러옴
            const _fetchEvents = await fetchAllUsersReposAllInfo();
            // 2. 불러온 이벤트로부터 커밋 , 저장소를 생성
            const _computeEvents = await computeAllUsersEvents();
            // 3. 생성된 저장소의 추가 정보와 언어 정보를 갱신 
            const _fetchReposInfo = await fetchAllUsersReposAllInfo();
            resolve({
                code : 1,
                status : "SUCCESS",
                message : `모든 사용자들의 정보를 갱신했습니다`,
                data : {
                    fetch_events : _fetchEvents,
                    compute_events : _computeEvents,
                    fetch_repos : _fetchReposInfo
                }
            });
        }
        catch(e){
            reject({
                code : -1,
                status : "ERROR",
                message : "갱신 중 오류가 발생했습니다",
                error : e.message || e
            });
        }
    });
}