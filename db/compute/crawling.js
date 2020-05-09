import * as Models from "../models";

import github from "octonode";
import keys from "../../secure/auth_keys.json";
import secure_info from "../../secure/info.json";
import * as Loggers from "./loggers";

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

// 특정 저장소의 언어 정보를 불러옵니다
const fetchRepoLanguages = (repo_name) =>{
    const fetchPromise = new Promise(async (resolve, reject)=>{
        // 1. 불러올 저장소가 존재하는지 확인
        try{
            const current_repo = await Models.Repository.findOne({ name : repo_name });
            if(current_repo){
                console.log(repo_name);
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

export { fetchEvents, fetchRepoLanguages };
