import { Crawler } from '../../../db/compute';

const title = "CRAWLING_EVERY_6_HOURS";
const rule = "0 0 */4 * * *";
const job = async function (){
    await Crawler.all();
}

export {
    title,
    rule,
    job
};