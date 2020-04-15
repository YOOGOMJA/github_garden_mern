import mongoose from 'mongoose';

const CrawlingLogScheme = mongoose.Schema({
    targets : [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    auth_key: String,
    created_at: Date,
});

const CrawlingLog = mongoose.model("CrawlingLog", CrawlingLogScheme);

export { CrawlingLog, CrawlingLogScheme };