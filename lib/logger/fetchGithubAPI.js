import * as Models from '../../db/models';

/**
 * 
 * @param {string} user_name 조회 로그를 남길 사용자 이름입니다. 모두 조회한 경우에는 넘기지 않습니다
 * @returns {Promise} 결과를 담은 프로미스 객체입니다
 */
const FetchGithubAPILogger = (user_name)=>{    
    return new Promise(async (resolve, reject)=>{
        try{
            // 1. 사용자가 주어졌다면 존재하는지 확인 
            let current_user;
            if(user_name){
                current_user = await Models.User.findOne({ login : user_name });
                if(!current_user){ throw new Error("사용자가 존재하지 않습니다") }
            }

            const newLog = new Models.LogFetchGithubAPI({
                user : current_user || 'ALL',
                created_at : new Date()
            });
            await newLog.save();
            resolve({
                code : 1,
                status : 'SUCCESS',
                message : '로그를 저장했습니다',
                data : newLog
            });
        }
        catch(e){
            reject({
                code : -1,
                status : "FAIL",
                message : "통신중 오류가 발생했습니다",
                error : e
            })
        }
    });
}

export default FetchGithubAPILogger;