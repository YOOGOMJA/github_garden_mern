import * as nodeSchedule from 'node-schedule';
import moment from 'moment';
import { isNullOrUndefined } from 'util';
import * as schedules from './schedules';

let jobs = [];

const exists = (name)=>{
    return jobs.find(item=> item.name === name);
}

const init = (discordBot)=>{
    if(discordBot){
        for(const key in schedules){
            const _s = schedules[key];
            if(!exists(_s.title)){
                jobs.push({
                    name : _s.title,
                    job : new nodeSchedule.scheduleJob(
                        _s.title,
                        _s.rule,
                        function(){
                            console.log(`[SCHEDULER] ${_s.title}이 실행됐습니다`)
                            _s.job(discordBot);
                        }
                    )
                });
                console.log(`[SCHEDULER] ${_s.title}이 초기화되었습니다`);
            }
        }
    }
    else{
        throw new Error("작업에서 discord bot을 필요로 합니다");
    }
}

const getJobs = ()=>jobs.slice(0);

export {
    init,
    getJobs,
}
