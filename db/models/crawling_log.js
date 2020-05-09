import mongoose from 'mongoose';

const CrawlingLogScheme = mongoose.Schema({
    message : String,
    auth_key: String,
    created_at: Date,
});

const CrawlingLog = mongoose.model("CrawlingLog", CrawlingLogScheme);

export { CrawlingLog, CrawlingLogScheme };