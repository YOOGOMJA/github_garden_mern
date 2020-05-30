import LocalStrategy from "passport-local";
import * as Models from "../../models";

export default new LocalStrategy(
    {
        usernameField: "auth.email",
        passwordField: "auth.password",
    },
    async function (email, password, done) {
        try {
            const user = await Models.User.findOne({
                "auth.email": email,
                "auth.password": password,
            });
            if (!user) {
                return done(null, false, {
                    message: "이메일 혹은 비밀번호가 올바르지 않습니다",
                });
            }
            else {
                return done(null, user, { message: "로그인 성공" });
            }
        }
        catch (err) {
            return done(err);
        }
    }
);
