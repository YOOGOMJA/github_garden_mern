import mongoose from "mongoose";

const ChallengeScheme = mongoose.Schema({
    // 도전 일련번호 
    id: {
        type: String,
        unique: true,
    },
    // 도전 시작 일자 
    start_dt: Date,
    // 도전 종료 일자 
    finish_dt: Date,
    // 도전 기간 이름
    title: String,
    // 참여자들 목록
    participants: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    // 생성 일자 
    created_at: Date,
    // 인증 여부
    is_featured : Boolean,
    // 생성자
    owner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    }
});

const Challenge = mongoose.model("Challenge", ChallengeScheme);

export { Challenge, ChallengeScheme };
