import * as Models from '../../../db/models';
import moment from 'moment';

export default {
    name : "!check",
    description : "출석 여부를 체크합니다",
    async execute(msg, args){
        const splited = msg.content.split(this.name);
        if(splited.length > 1){
            const username = splited[1].trim();
            const user = await Models.User.findOne({  
                login : username
            });

            if(user){
                const mNow = moment();
                const mNowStart= mNow.clone().set(0, "hour").set(0,"minute").set(0,"second");
                const mNowFinish = mNow.clone().set(23, "hour").set(59,"minute").set(59,"second");
                const commits = await Models.Commit.find({
                    committer : user._id,
                    commit_date : {
                        $gte : mNowStart.toDate(),
                        $lt : mNowFinish.toDate()
                    }               
                });    
                
                if(commits.length > 0){
                    msg.channel.send(`'${username}' 정원사님은 오늘 출석했습니다😎`);
                }
                else{
                    msg.channel.send(`'${username}' 정원사님은 오늘 아직 출석안했슴다🧐`);
                }
            }
            else{
                msg.channel.send(`'${username}'는 존재하지 않는 정원사 입니다`);
            }
        }
        else{
            msg.channel.send('명령어 실행 중 오류가 발생했습니다');
            throw new Error("사용자 이름이 없습니다");
        }
    }
}