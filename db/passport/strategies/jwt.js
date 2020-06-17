// https://stackhoarder.com/2019/07/17/node-js-passport-js-jwt-token-%EC%9D%B4%EC%9A%A9%ED%95%B4-%EB%A1%9C%EA%B7%B8%EC%9D%B8-%EA%B5%AC%ED%98%84/
import passportJWT from 'passport-jwt';
const JWTStrategy = passportJWT.Strategy;
const ExtractJWT = passportJWT.ExtractJwt;

import config from '../../config.json';
import * as Models from "../../models";

export default new JWTStrategy(
    {
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.secret,
    },
    async function (jwtPayload, done) {
        try {
            const user = await Models.User.findOneById(jwtPayload.id);
            return done(null, user);
        }
        catch (err) {
            return done(err);
        }
    }
);
