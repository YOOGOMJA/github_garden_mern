import mongoose from 'mongoose';

const UserScheme = mongoose.Schema({
    // 깃허브 내 아이디
    id : {
        type: Number,
        unique: true,
    },
    login: String,
    html_url: String,
    avartar_url: String,
    name: String,
    company: String,
    blog: String,
    email: String,
    bio: String,
    api_url: String,
    events_url: String,
    auth : {
        email : String,
        password : String,
    }
});

const User = mongoose.model("User" , UserScheme);

export { User, UserScheme };