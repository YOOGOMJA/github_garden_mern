import passportGithub from 'passport-github2';
import config from '../../config.json';
import { User } from '../../models';

export default new passportGithub.Strategy({
    clientID : config.github.oauth.client_id,
    clientSecret : config.github.oauth.client_secret,
    callbackURL : `${ config.host.server[process.env.NODE_ENV] }/auth/callback`
},
    async function( accessToken, refreshToken, profile, cb ){
        try{    
            const user = await User.findOne({
                id : profile.id
            });
            if(user){ 
                await User.updateOne({
                    id : profile.id,
                },
                {
                    ...profile._json,
                    access_token : accessToken,
                    refresh_token : refreshToken,
                });
                return cb(null, user);  }
            else{
                const newUser = new User({
                    ...profile._json,
                    access_token : accessToken,
                    refresh_token : refreshToken,
                });
                await newUser.save();
                return cb(null, newUser);
            }
        }
        catch(err){
            return cb(err);
        }
    }
)