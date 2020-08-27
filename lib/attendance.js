import moment from "moment";

const getAllDatesBetween = (start_dt, finish_dt, format, hasAllDates) => {
    format = format || "YYYY-MM-DD";
    start_dt = moment(start_dt);
    finish_dt = moment(finish_dt);
    if (!hasAllDates) {
        const current_dt = new moment();
        if (current_dt.diff(finish_dt) <= 0) {
            finish_dt = current_dt;
        }
    }
    const dates = [];
    const diff = hasAllDates
        ? finish_dt.diff(start_dt, "day") + 1
        : finish_dt.diff(start_dt, "day") + 1;
    for (let i = 0; i <= diff; i++) {
        dates.push(
            start_dt
                .clone()
                .add(i - 1, "days")
                .format(format)
        );
    }
    return dates;
};

const getUserCommitCountByDate = (data, start_dt, finish_dt) => {
    const dates = getAllDatesBetween(start_dt, finish_dt);
    const dates_template = {};
    dates.forEach((date) => {
        dates_template[date] = 0;
    });

    let filtered = {};

    data.forEach((item) => {
        const actor_id = item._id.actor.toString();
        if (Object.keys(filtered).indexOf(actor_id) < 0) {
            filtered[actor_id] = { ...dates_template };
        }
        filtered[actor_id][item._id.date] += item.count;
    });
    return filtered;
};

const getAttendRateByUser = (data, users, start_dt, finish_dt) => {
    const raw = getUserCommitCountByDate(data, start_dt, finish_dt);
    const user_ids = Object.keys(raw);
    const now = new moment();
    const result = {};

    const getUserObject = (_users, _id) => {
        let info;
        for (let key in _users) {
            if (_users[key]._id == _id) {
                info = _users[key];
                break;
            }
        }
        return info;
    };

    user_ids.forEach((user_id) => {
        if (Object.keys(user_id).indexOf() < 0) {
            result[user_id] = {
                info: getUserObject(users, user_id),
                attend: 0,
                notAttend: 0,
                rate: 0,
            };
        }

        const dates = Object.keys(raw[user_id]);
        dates.forEach((date) => {
            const mDate = moment(date);
            if (mDate.isBefore(now)) {
                if (raw[user_id][date] > 0) {
                    result[user_id].attend++;
                } else {
                    result[user_id].notAttend++;
                }
            }
        });

        result[user_id].rate =
            (result[user_id].attend /
                (result[user_id].attend + result[user_id].notAttend)) *
            100;
    });

    return result;
};

export {
    // 사용자의 일자별 커밋 개수
    getUserCommitCountByDate,
    // 시작일자와 종료일자 사이의 모든 날짜를 저장한 배열을 가져옴
    getAllDatesBetween,
    getAttendRateByUser,
};
