import mongoose from 'mongoose';

const CommitScheme = mongoose.Schema({
    sha: {
        type: String,
        unique: true,
    },
    // 작성자 이메일
    author_email : String,
    // 작성자 명 
    author_name: String,
    // 커밋 메시지
    message: String,
    distinct: Boolean,
    // 실제 커밋 주소 
    url: String,
});

const Commit = mongoose.model("Commit" , CommitScheme);

export { Commit, CommitScheme };