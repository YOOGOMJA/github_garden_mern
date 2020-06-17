import github from './strategies/github';
import * as Models from '../models';

export default _passport=>{
    _passport.serializeUser(Models.User.serializeUser());
    _passport.deserializeUser(Models.User.deserializeUser());
    _passport.use(github);
    return _passport;
}