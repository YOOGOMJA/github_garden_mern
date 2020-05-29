import * as nodeSchedule from 'node-schedule';
import moment from 'moment';
import { isNullOrUndefined } from 'util';

const _SCHEDULE_JOB_TITLE = "CRAWLING_EVERY_6_HOURS";
const _SCHEDULE_RULE = "0 0 */4 * * *"

let _currentSchedule;

export const getCurrentScheduleRule = ()=> _SCHEDULE_RULE;

export const printCurrentScheduleRule = ()=>{
    console.log(`[SCHEDULER] RULE : ${_SCHEDULE_RULE}` );
}

export const getCurrentSchedule = ()=> {
    return _currentSchedule;
}

export const init = ()=>{
    if(isNullOrUndefined(_currentSchedule)){
        _currentSchedule = new nodeSchedule.scheduleJob(
            _SCHEDULE_JOB_TITLE,
            _SCHEDULE_RULE,
            function(){
                const current_time = new moment();
                console.log(`[SCHEDULER] 스케줄러 실행됨 ${current_time.format("YYYY-MM-DD hh:mm:ss")}`);
            }
        );
    }
    else{
        console.log('[SCHEDULER] 스케줄러가 이미 초기화 되어있습니다');
    }
    return getCurrentSchedule();
};
