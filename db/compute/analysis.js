import * as Models from "../models";
import moment from "moment";
import * as LibAttendance from "../../lib/attendance";
import * as LibChallenge from '../../lib/challenge';

import mongoose from "mongoose";
const db = mongoose.connection;

// github 데이터를 기반으로한 MongoDB 데이터를 추가 가공 합니다

// ================================================================================
// 통계 연산 함수 : 정리된 데이터들로부터 데이터를 가져옵니다
// ================================================================================

/**
 * @description 특정 사용자의 특정 도전 기간에서의 출석 정보를 가져옵니다
 * @param {string} challenge_id 조회할 도전 기간의 id
 * @param {string} user_name 조회할 사용자의 login
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchAttendanceByUser = (challenge_id, user_name) => {
    const currentPromise = new Promise(async (resolve, reject) => {
        const current_user = await Models.User.findOne({ login: user_name });
        const current_challenge = await Models.Challenge.findOne({
            id: challenge_id,
        });
        if (current_challenge && current_user) {
            if (current_challenge.participants.length > 0) {
                let areParticipated = false;
                current_challenge.participants.forEach((participants_id) => {
                    if (
                        participants_id.toString() ===
                        current_user._id.toString()
                    ) {
                        areParticipated = true;
                    }
                });

                if (!areParticipated) {
                    reject({
                        code: -3,
                        status: "FAIL",
                        message: "참여중인 사용자가 아닙니다",
                    });
                    return;
                }

                const aggregatedCommits = await Models.Commit.aggregate([
                    // 일치 조건
                    {
                        $match: {
                            commit_date: {
                                $gte: current_challenge.start_dt,
                                $lte: current_challenge.finish_dt,
                            },
                            committer: current_user._id,
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "committer",
                            foreignField: "_id",
                            as: "lookup_committer",
                        },
                    },
                    {
                        $unwind: "$lookup_committer",
                    },
                    // 그룹
                    {
                        $group: {
                            _id: {
                                committer: "$lookup_committer",
                                date: "$commit_date_string",
                            },
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                    // 정렬
                    {
                        $sort: {
                            "_id.committer.login": -1,
                            "_id.date": -1,
                        },
                    },
                ]);

                // 일자별 정리하기
                const dates = LibAttendance.getAllDatesBetween(
                    current_challenge.start_dt,
                    current_challenge.finish_dt
                );
                const dates_templates = {};
                dates.forEach((date) => {
                    dates_templates[date] = 0;
                });

                let filtered = [];

                const getIndexFromFiltered = (login) => {
                    for (let idx = 0; idx < filtered.length; idx++) {
                        if (filtered[idx].info.login === login) {
                            return idx;
                        }
                    }
                    return -1;
                };

                aggregatedCommits.forEach((_commit) => {
                    const committer_id = _commit._id.committer.login;
                    let current_idx = getIndexFromFiltered(committer_id);
                    if (current_idx === -1) {
                        filtered.push({
                            info: _commit._id.committer,
                            attendances_count: 0,
                            attendances_rate: 0,
                            attendances: { ...dates_templates },
                        });
                        current_idx = filtered.length - 1;
                    }
                    filtered[current_idx]["attendances"][_commit._id.date] +=
                        _commit.count;
                    filtered[current_idx].attendances_count += 1;
                });

                // 참여율 계산
                filtered.forEach((committer) => {
                    committer.attendances_rate =
                        (committer.attendances_count /
                            Object.keys(dates).length) *
                        100;
                });

                // 정렬
                filtered.sort((a, b) => {
                    return a.attendances_rate > b.attendances_rate
                        ? -1
                        : a.attendances_rate < b.attendances_rate
                        ? 1
                        : 0;
                });

                resolve({
                    code: 1,
                    status: "SUCCESS",
                    message: "조회가 성공했습니다",
                    // data : aggregatedCommits,
                    data: filtered,
                });
            } else {
                reject({
                    code: -2,
                    status: "FAIL",
                    message: "참가자가 등록되지 않았습니다",
                });
            }
        } else {
            if (!current_challenge) {
                reject({
                    code: -1,
                    status: "FAIL",
                    message: "존재하지 않는 도전 일정입니다",
                });
            } else {
                reject({
                    code: -1,
                    status: "FAIL",
                    message: "사용자가 존재하지 않습니다",
                });
            }
        }
    });
    return currentPromise;
};

/**
 * @description 특정 도전 기간의 모든 출석 현황을 조회합니다
 * @param {string} challenge_id 조회할 도전 기간의 id
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchAttendance = (challenge_id) => {
    const currentPromise = new Promise(async (resolve, reject) => {
        try {
            const current_challenge = await Models.Challenge.findOne({
                id: challenge_id,
            });
            if (current_challenge) {
                if (current_challenge.participants.length > 0) {
                    const aggregatedCommits = await Models.Commit.aggregate([
                        // 일치 조건
                        {
                            $match: {
                                commit_date: {
                                    $gte: current_challenge.start_dt,
                                    $lte: current_challenge.finish_dt,
                                },
                                committer: {
                                    $in: current_challenge.participants,
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "users",
                                localField: "committer",
                                foreignField: "_id",
                                as: "lookup_committer",
                            },
                        },
                        {
                            $unwind: "$lookup_committer",
                        },
                        // 그룹
                        {
                            $group: {
                                _id: {
                                    committer: "$lookup_committer",
                                    date: "$commit_date_string",
                                },
                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                        // 정렬
                        {
                            $sort: {
                                "_id.committer.login": -1,
                                "_id.date": -1,
                            },
                        },
                    ]);

                    // 일자별 정리하기
                    const dates = LibAttendance.getAllDatesBetween(
                        current_challenge.start_dt,
                        current_challenge.finish_dt
                    );
                    const dates_templates = {};
                    dates.forEach((date) => {
                        dates_templates[date] = 0;
                    });

                    let filtered = [];

                    const getIndexFromFiltered = (login) => {
                        for (let idx = 0; idx < filtered.length; idx++) {
                            if (filtered[idx].info.login === login) {
                                return idx;
                            }
                        }
                        return -1;
                    };

                    aggregatedCommits.forEach((_commit) => {
                        const committer_id = _commit._id.committer.login;
                        let current_idx = getIndexFromFiltered(committer_id);
                        if (current_idx === -1) {
                            filtered.push({
                                info: _commit._id.committer,
                                attendances_count: 0,
                                attendances_rate: 0,
                                attendances: { ...dates_templates },
                            });
                            current_idx = filtered.length - 1;
                        }
                        filtered[current_idx]["attendances"][
                            _commit._id.date
                        ] += _commit.count;
                        filtered[current_idx].attendances_count += 1;
                    });

                    // 참여율 계산
                    filtered.forEach((committer) => {
                        committer.attendances_rate =
                            (committer.attendances_count /
                                Object.keys(dates).length) *
                            100;
                    });

                    // 정렬
                    filtered.sort((a, b) => {
                        return a.attendances_rate > b.attendances_rate
                            ? -1
                            : a.attendances_rate < b.attendances_rate
                            ? 1
                            : 0;
                    });

                    resolve({
                        code: 1,
                        status: "SUCCESS",
                        message: "조회가 성공했습니다",
                        // data : aggregatedCommits,
                        data: filtered,
                    });
                } else {
                    reject({
                        code: -2,
                        status: "FAIL",
                        message: "참가자가 등록되지 않았습니다",
                    });
                }
            } else {
                reject({
                    code: -1,
                    status: "FAIL",
                    message: "존재하지 않는 도전 일정입니다",
                });
            }
        } catch (e) {
            reject({
                code: 0,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error : e.message || e,
            });
        }
    });
    return currentPromise;
};

/**
 * @description 특정 도건 기간의 출석 정보를 일자별로 정리해서 가져옵니다
 * @param {string} challenge_id
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchAttendanceByDate = (challenge_id) => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        const current_challenge = await Models.Challenge.findOne({
            id: challenge_id,
        });
        if (current_challenge) {
            if (current_challenge.participants.length > 0) {
                const allParticipants = await Models.User.aggregate([
                    {
                        $match: {
                            _id: {
                                $in: current_challenge.participants,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            cnt: { $sum: 1 },
                        },
                    },
                    { $project: { _id: 0 } },
                ]);
                const allParticipantsCnt =
                    allParticipants.length > 0 ? allParticipants[0].cnt : 0;

                const aggregatedCommits = await Models.Commit.aggregate([
                    // 일치 조건
                    {
                        $match: {
                            commit_date: {
                                $gte: current_challenge.start_dt,
                                $lte: current_challenge.finish_dt,
                            },
                            committer: {
                                $in: current_challenge.participants,
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "committer",
                            foreignField: "_id",
                            as: "lookup_committer",
                        },
                    },
                    {
                        $unwind: "$lookup_committer",
                    },
                    // 그룹
                    {
                        $group: {
                            _id: {
                                committer: "$lookup_committer",
                                date: "$commit_date_string",
                            },
                            count: {
                                $sum: 1,
                            },
                        },
                    },
                    // 정렬
                    {
                        $sort: {
                            "_id.committer.login": -1,
                            "_id.date": -1,
                        },
                    },
                ]);

                // 일자별 정리하기
                const dates = LibAttendance.getAllDatesBetween(
                    current_challenge.start_dt,
                    current_challenge.finish_dt
                );

                let filtered = [];
                dates.forEach((date) => {
                    // dates_templates[date] = 0;
                    filtered.push({
                        date: date,
                        cnt: 0,
                        all: allParticipantsCnt,
                        rate: 0,
                    });
                });

                aggregatedCommits.forEach((_commit) => {
                    if (_commit.count > 0) {
                        let current_date = filtered.find(
                            (elem) => elem.date === _commit._id.date
                        );
                        current_date.cnt += 1;
                    }
                });

                // 참여율 계산
                filtered.forEach((date) => {
                    date.rate = (date.cnt / date.all) * 100;
                });

                resolve({
                    code: 1,
                    status: "SUCCESS",
                    message: "조회가 성공했습니다",
                    data: filtered,
                });
            } else {
                reject({
                    code: -2,
                    status: "FAIL",
                    message: "참가자가 등록되지 않았습니다",
                });
            }
        } else {
            reject({
                code: -1,
                status: "FAIL",
                message: "존재하지 않는 도전 일정입니다",
            });
        }
    });

    return fetchPromise;
};

/**
 * @description 모든 저장소들의 언어 사용 분포를 가져옵니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchLanguagePopulation = () => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        try {
            let _additionalOptions = [];
            const latestChallenge = await LibChallenge.latestChallenge();
            if(latestChallenge){
                // 진행중인 도전기간이 존재하는 경우 그 도전 기간안에 커밋이 발생한 저장소를 
                // 대상으로 조회함
                const allCommitsInCurrentChallenge = await Models.Commit.aggregate([
                    { 
                        $match : {
                            commit_date : {
                                $gte : latestChallenge.start_dt,
                                $lte : latestChallenge.finish_dt,
                            }
                        }
                    },
                    {
                        $group : {
                            _id : '$repo'
                        }
                    }
                ]);
                let _ids = [];
                allCommitsInCurrentChallenge.forEach(_id => _ids.push(_id._id));
                _additionalOptions.push({
                    $match : {
                        '_id' : { $in : _ids }
                    }
                });
            }
            const allRepos = await Models.Repository.aggregate([
                ..._additionalOptions,
                {
                    $unwind: "$languages",
                },
                {
                    $group: {
                        _id: {
                            language_name: "$languages.name",
                        },
                        rate: {
                            $sum: "$languages.rate",
                        },
                    },
                },
                {
                    $sort: {
                        rate: -1,
                    },
                },
            ]);

            let sumAllOfRates = 0;
            allRepos.forEach((repo) => {
                sumAllOfRates += repo.rate;
            });
            allRepos.forEach((repo) => {
                repo.rate_percentage = (repo.rate / sumAllOfRates) * 100;
            });
            resolve({
                code: 1,
                status: "SUCCESS",
                message: "불러오는데 성공했습니다",
                data: allRepos,
            });
        } catch (e) {
            console.log(e);
            reject({
                code: -1,
                status: "FAIL",
                message: "불러오는 도중 오류가 발생했습니다",
                error: e.message || e,
            });
        }
    });
    return fetchPromise;
};

/**
 * @description 요약해 보여줄 정보를 가져옵니다. 정보는 다음과 같습니다
 *  1. 등록된 저장소 수
 *  2. 등록된 사용자 수
 *  3. 등록된 커밋의 수
 *  4. 현재까지 프로젝트 진행 기간
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchSummary = () => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        // 등록된 저장소 수
        const allRepos = await Models.Repository.aggregate([
            {
                $group: {
                    _id: null,
                    cnt: { $sum: 1 },
                },
            },
            { $project: { _id: 0 } },
        ]);
        // 등록된 사용자 수
        const allUsers = await Models.User.aggregate([
            {
                $group: {
                    _id: null,
                    cnt: { $sum: 1 },
                },
            },
            { $project: { _id: 0 } },
        ]);
        // 등록된 커밋의 수
        const allCommits = await Models.Commit.aggregate([
            {
                $group: {
                    _id: null,
                    cnt: { $sum: 1 },
                },
            },
            { $project: { _id: 0 } },
        ]);
        // 프로젝트 진행 기간
        const allChallenges = await Models.Challenge.find(
            {
                finish_dt : {
                    $lte : new Date(),
                }
            },
            {
                _id: true,
                start_dt: true,
                finish_dt: true,
            }
        );

        const latestChallenge = await Models.Challenge.aggregate([
            { $match:{ is_featured : true } },
            {
                $sort: { created_at: -1 },
            },
        ]);

        let allChallengingDates = 0;
        allChallenges.forEach((challenge) => {
            const m_start_dt = moment(challenge.start_dt);
            const m_finish_dt = moment(challenge.finish_dt);
            const m_now = new moment();
            if (m_now.diff(m_finish_dt) <= 0) {
                // 아직 진행중인 경우
                allChallengingDates += m_now.diff(m_start_dt, "day") + 1;
            } else {
                // 이미 종료된 경우
                allChallengingDates += m_finish_dt.diff(m_start_dt, "day") + 1;
            }
        });

        let lastestChallengeFromNow = 0;
        if (latestChallenge.length > 0) {
            const m_finish_dt = new moment(latestChallenge[0].finish_dt);
            const m_now = new moment();
            lastestChallengeFromNow += m_finish_dt.diff(m_now, "day") + 1;
        }

        const repo_cnt = allRepos.length > 0 ? allRepos[0].cnt : 0;
        const user_cnt = allUsers.length > 0 ? allUsers[0].cnt : 0;
        const commit_cnt = allCommits.length > 0 ? allCommits[0].cnt : 0;


        resolve({
            code: 1,
            status: "SUCCESS",
            message: "조회에 성공했습니다",
            data: {
                repo_cnt: repo_cnt,
                user_cnt: user_cnt,
                commit_cnt: commit_cnt,
                challenge_duration: allChallengingDates,
                current_challenge: {
                    left_days: lastestChallengeFromNow,
                    title:
                        latestChallenge.length > 0
                            ? latestChallenge[0].title
                            : "",
                },
            },
        });
    });
    return fetchPromise;
};

/**
 * @deprecated fetchRepoWithCommits로 대체됨
 * @description 인증된 저장소의 정보를 가져옵니다
 * @param {string} repo_name 가져올 저장소의 이름
 */
const fetchFeaturedRepository = (repo_name) => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        try {
            const aggregatedCommits = await Models.Commit.aggregate([
                {
                    $group: {
                        _id: "$repo",
                        commit_cnt: { $sum: 1 },
                    },
                },
                {
                    $sort: {
                        commit_cnt: -1,
                    },
                },
                {
                    $lookup: {
                        from: "repositories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "repo",
                    },
                },
                {
                    $unwind: "$repo",
                },
                {
                    $match: {
                        "repo.name": repo_name,
                    },
                },
            ]);

            resolve({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: aggregatedCommits.length > 0 ? aggregatedCommits[0] : {},
            });
        } catch (e) {
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: e,
            });
        }
    });
    return fetchPromise;
};

/**
 * @description 특정 저장소의 정보를 커밋 정보와 같이 가져옵니다
 * @param {string} repo_name 데이터를 가져올 저장소의 이름
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchRepoWithCommits = (repo_name) => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        try {
            const aggregatedCommits = await Models.Commit.aggregate([
                {
                    $group: {
                        _id: "$repo",
                        commit_cnt: { $sum: 1 },
                    },
                },
                {
                    $sort: {
                        commit_cnt: -1,
                    },
                },
                {
                    $lookup: {
                        from: "repositories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "repo",
                    },
                },
                {
                    $unwind: "$repo",
                },
                {
                    $match: {
                        "repo.name": repo_name,
                    },
                },
            ]);

            resolve({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: aggregatedCommits.length > 0 ? aggregatedCommits[0] : {},
            });
        } catch (e) {
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: e,
            });
        }
    });
    return fetchPromise;
};

/**
 * @description 최근 프로젝트에서 가장 많은 커밋을 쌓은 저장소를 가져옵니다
 * @returns {Promise} 결과를 담은 프로미스 객체를 반환합니다
 */
const fetchPopularRepository = () => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        try {
            const aggregatedCommits = await Models.Commit.aggregate([
                {
                    $group: {
                        _id: "$repo",
                        commit_cnt: { $sum: 1 },
                    },
                },
                {
                    $sort: {
                        commit_cnt: -1,
                    },
                },
                {
                    $lookup: {
                        from: "repositories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "repo",
                    },
                },
                {
                    $unwind: "$repo",
                },
            ]);

            resolve({
                code: 1,
                status: "SUCCESS",
                message: "조회에 성공했습니다",
                data: aggregatedCommits.length > 0 ? aggregatedCommits[0] : {},
            });
        } catch (e) {
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error: e,
            });
        }
    });
    return fetchPromise;
};

export {
    fetchAttendance,
    fetchAttendanceByUser,
    fetchAttendanceByDate,
    fetchLanguagePopulation,
    fetchPopularRepository,
    fetchFeaturedRepository,
    fetchSummary,
    fetchRepoWithCommits,
};
