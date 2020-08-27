import * as Models from '../../../db/models';
import moment from 'moment';

const CHANNEL_TITLE = "정원사-프로젝트";
const title = "NOTI_EVERY_4_HOURS";
const rule = "0 0 */6 * * *";
const job = async function (bot){
    bot.channels.cache.map(async channel=>{
        if(channel.name === CHANNEL_TITLE){
            const mNow = new moment();
            const mNowStart = mNow.clone().set(0,"hour").set(0,"minute").set(0,"second");
            const mNowFinish = mNow.clone().set(23,"hour").set(59,"minute").set(59,"second");
            const challenges = await Models.Challenge.find({
                start_dt : { $lte : mNowStart.toDate() },
                finish_dt : { $gte : mNowFinish.toDate() }
            });
            for(const challenge of challenges){
                let _list = [];
                for(const user_id of challenge.participants){
                    const commitExists = await Models.Commit.exists({
                        commit_date : {
                            $gte : mNowStart.toDate(),
                            $lte : mNowFinish.toDate(),
                        },
                        committer : user_id
                    });
                    if(!commitExists){
                        const _user = await Models.User.findOne({
                            _id : user_id
                        });
                        _list.push(_user.login);
                    }
                }

                if(_list.length > 0){
                    channel.send(`[${ challenge.title }] 현재 시각 미출석자 : ${ _list.join(",") }`)
                }
            }
        }
    });
}

export {
    title,
    rule,
    job
};;