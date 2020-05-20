import * as Models from '../db/models';
import * as LibChallenge from './challenge';

export const getReposIdInLatestChallenge = ()=>{
    return new Promise(async(resolve, reject)=>{
        try{
            const latestChallenge = LibChallenge.latestChallenge();
            if(latestChallenge){
                const allCommitsInCurrentChallenge = await Models.Commit.aggregate([
                    { 
                        $match : {
                            commit_date : {
                                $gte : latestChallenge.start_dt,
                                $lte : latestChallenge.finish_dt,
                            }
                        }
                    },
                    {
                        $group : {
                            _id : '$repo'
                        }
                    }
                ]);
                let _ids = [];
                allCommitsInCurrentChallenge.forEach(_id => _ids.push(_id._id));
                resolve({
                    code : 1,
                    status : 'SUCCES',
                    message : '조회했습니다',
                    data : _ids
                });
            }
            else{
                throw new Error("인증된 도전 기간이 존재하지 않습니다");
            }
        }
        catch(e){
            reject({
                code : -1,
                status : 'FAIL',
                message : "통신 중 오류가 발생했습니다",
                error : {
                    message : e.message,
                    body : e
                }
            });
        }    
    });
}