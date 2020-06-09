import passportGithub from 'passport-github2';
import config from '../../config.json';
import { User } from '../../models';

const host = process.env.NODE_ENV === "development" ? "localhost:4000" : "34.64.243.31/"

export default new passportGithub.Strategy({
    clientID : config.github.client_id,
    clientSecret : config.github.client_secret,
    callbackURL : `http://${ host }/auth/callback`
},
    async function( accessToken, refreshToken, profile, cb ){
        console.log('strategy function called');
        try{    
            const user = await User.findOne({
                id : profile.id
            });
            if(user){  console.log('this user already signed up'); return cb(null, user);  }
            else{
                const newUser = new User({
                    ...profile._json,
                    access_token : accessToken,
                    refresh_token : refreshToken,
                });
                await newUser.save();
                console.log('create new user');
                return cb(null, newUser);
            }
        }
        catch(err){
            return cb(err);
        }
    }
)