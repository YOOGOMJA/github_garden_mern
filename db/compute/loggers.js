import { ErrorLog, CrawlingLog } from '../models';

// 에러 로그 쌓기 
const Error = err=>{
    const current_error = new ErrorLog({
        created_at : new Date(),
        error : err
    });
    return current_error.save().then(()=>{
        console.log("[LOGGER.ERROR] 현재 에러가 저장되었습니다");
        return this;
    });
}

// 크롤링 로그 쌓기 
const Crawler = (message, auth_key)=>{
    const current_crawling_log = new CrawlingLog({
        message : message,
        auth_key : auth_key,
        created_at : new Date(),
    });
    return current_crawling_log.save()
    .then(()=>{
        console.log("[LOGGER.CRAWLING] 크롤링 정보가 저장되었습니다");
        return this;
    })
}

export {
    Error,
    Crawler,
};