import passport from 'passport';
import local from './strategies/local';
import jwt from './strategies/jwt';

export default ()=>{
    passport.use(local);
    passport.use(jwt);
}