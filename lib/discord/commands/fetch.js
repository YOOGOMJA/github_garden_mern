import * as Models from '../../../db/models';
import { Crawler } from '../../../db/compute';

export default {
    name : "!fetch",
    description : "정보를 갱신합니다",
    async execute(msg, args){
        const splited = msg.content.split(this.name);
        if(splited.length > 1){
            const username = splited[1].trim();
            try{
                const user_exists = await Models.User.exists({ login : username });

                if(user_exists){
                    msg.channel.send(`'${ username }' 정원사의 정보를 갱신합니다. 이 작업은 조금 오래 걸릴 수 있습니다`);
                    const result = await Crawler.one(username);
                    msg.channel.send(result.message);
                }
                else{
                    msg.channel.send(`'${ username }'은 존재하지 않는 정원사 입니다`);
                }
            }
            catch(e){
                msg.channel.send(`실행 중 오류가 발생했습니다. [${ e.error.message }]`);
            }
        }
        else{   
            msg.channel.send("명령어가 잘못됐습니다");
        }
    }
}