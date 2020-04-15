import mongoose from "mongoose";

const ChallengeScheme = mongoose.Schema({
    id: {
        type: String,
        unique: true,
    },
    start_dt: Date,
    finish_dt: Date,
    title: String,
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    created_at: Date,
});

const Challenge = mongoose.model("Challenge", ChallengeScheme);

export { Challenge, ChallengeScheme };
