import github from 'octonode';
import config from '../config.json';

// GITHUB API + Promise 

/**
 * @description github API를 이용해 사용자의 이벤트를 불러옵니다
 * @param {string} user_name github API에서 이벤트를 불러올 사용자의 login입니다
 * @param {number} page 데이터를 가져올 페이지를 입력합니다. 기본값은 1입니다.
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const fetchEvents = (user_name, page = 1) =>{
    return new Promise((resolve, reject)=>{
        
        const _APIClient = github.client(config.github_api_sha);
        _APIClient.get(
            `/users/${user_name}/events`,{ page : page}, 
            (err,status, body)=>{
            if(!err){
                resolve({ data : body });
            }
            else{
                reject({ error : err , status : status});
            }
        });
    });
}

/**
 * @description GITHUB API를 이용해 특정 저장소의 정보를 모두 불러옵니다
 * @param {string} repo_name 데이터를 가져올 저장소의 풀네임입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const fetchRepos = (repo_name)=>{
    return new Promise((resolve, reject)=>{
        const _APIClient = github.client(config.github_api_sha);
        _APIClient.get(
            `/repos/${repo_name}`,
            {},
            (err, status, body)=>{
                if(!err){
                    resolve({ data : body });
                }
                else{
                    reject({ error : err , status : status});
                }
            }
        )
    });
}

/**
 * @description github API를 이용해 특정 저장소의 언어 정보를 모두 불려옵니다
 * @param {string} repo_name 데이터를 가져올 저장소의 풀네임입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const fetchRepoLang = (repo_name)=>{
    return new Promise((resolve, reject)=>{
        const _APIClient = github.client(config.github_api_sha);
        _APIClient.get(
            `/repos/${repo_name}/languages`,{},
            (err, status , body)=>{
                if(!err){
                    resolve({ data : body });
                }
                else{
                    reject({ error : err , status : status});
                }
            }
        )
    })
}

/**
 * @description github API를 이용해 특정 사용자의 정보를 모두 불려옵니다
 * @param {string} user_name 데이터를 가져올 사용자의 계정명입니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
export const fetchUser = (user_name)=>{
    return new Promise((resolve, reject)=>{
        const _APIClient = github.client(config.github_api_sha);
        _APIClient.get(
            `/users/${user_name}`,{},
            (err, status , body)=>{
                if(!err){
                    resolve({ data : body });
                }
                else{
                    reject({ error : err , status : status});
                }
            }
        )
    })
}