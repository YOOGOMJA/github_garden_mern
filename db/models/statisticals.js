import mongoose from "mongoose";

const StatisticalScheme = new mongoose.Schema({
    num_of_commits: Number,
    hottest_repo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Repository",
    },
    lauguage: [{ name: String, usage: Number }],
    created_dt: Date,
});

const Statistical = mongoose.model("Statistical", StatisticalScheme);

export { Statistical, StatisticalScheme };
