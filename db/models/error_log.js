import mongoose from "mongoose";

const ErrorLogScheme = mongoose.Schema({
    created_at: Date,
    error: Object,
});

const ErrorLog = mongoose.model("CrawlingErrLog", ErrorLogScheme);

export { ErrorLog, ErrorLogScheme };
