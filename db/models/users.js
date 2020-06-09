import mongoose from 'mongoose';
import passportLocalMongoose from 'passport-local-mongoose';
const UserScheme = mongoose.Schema({
    // 깃허브 내 아이디
    id : {
        type: Number,
        unique: true,
    },
    login: String,
    html_url: String,
    avatar_url: String,
    name: String,
    company: String,
    blog: String,
    email: String,
    bio: String,
    url: String,
    events_url: String,
    access_token : String,
    refresh_token : String,
    created_at : Date,
    is_admin : {
        type : Boolean,
        default : false
    },
});

UserScheme.plugin(passportLocalMongoose, { usernameField: 'email' });

const User = mongoose.model("User" , UserScheme);

export { User, UserScheme };