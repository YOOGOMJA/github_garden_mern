import * as Models from "../models";
import moment from "moment";
import { getAllDatesBetween } from "./tools";
import { fetchRepoLanguages } from "./crawling";

// github 데이터를 기반으로 MONGO DB 데이터를 새로 갱신하는 경우 사용됩니다.

// TODO : 모든 등록된 프로젝트 구하기
// TODO : 참여중인 모든 정원사 수
// TODO : 현재 저장된 모든 커밋
// TODO : 프로젝트가 시작한 시간 (시작일자부터 오늘까지)
// TODO : 정원사 별 참여율 순위 (출석 일자 / 오늘(<=마지막날)) + 평균
// TODO : 일별 출석한 정원사 비율(출석자 / 총원)
// TODO : 등록된 커밋과 저장소에 사용된 언어 비율
// TODO : 요즘 커밋이 가장 많이 등록된 저장소
// TODO : DSC에서 등록한 저장소 정보
// TODO : 참여중인 정원사 정보
// TODO : 전체 출석률

// ================================================================================
// 통계 연산 함수 : 정리된 데이터들로부터 데이터를 가져옵니다
// ================================================================================

// 프로젝트 당 출석 현황
const fetchAttendance = (challenge_id) => {
    const currentPromise = new Promise(async (resolve, reject) => {
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
                const dates = getAllDatesBetween(
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
            reject({
                code: -1,
                status: "FAIL",
                message: "존재하지 않는 도전 일정입니다",
            });
        }
    });
    return currentPromise;
};

// 모든 사용자들의 일별 출석 현황 
const fetchAttendanceByDate = (challenge_id)=>{
    const fetchPromise = new Promise(async (resolve, reject)=>{
        const current_challenge = await Models.Challenge.findOne({
            id: challenge_id,
        });
        if (current_challenge) {
            if (current_challenge.participants.length > 0) {
                const allParticipants = await Models.User.aggregate([
                    {
                        $match:{
                            _id : {
                                $in : current_challenge.participants
                            }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            cnt: { $sum: 1 },
                        },
                    },
                    { $project: { _id: 0 } },
                ]);
                const allParticipantsCnt = allParticipants.length > 0 ? allParticipants[0].cnt : 0;

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
                const dates = getAllDatesBetween(
                    current_challenge.start_dt,
                    current_challenge.finish_dt
                );
                
                let filtered = [];
                dates.forEach((date) => {
                    // dates_templates[date] = 0;
                    filtered.push({
                        date : date,
                        cnt : 0,
                        all : allParticipantsCnt,
                        rate : 0,
                    });
                });
                
                aggregatedCommits.forEach((_commit) => {
                    if(_commit.count > 0){
                        let current_date = filtered.find( elem => elem.date === _commit._id.date);
                        current_date.cnt += 1;
                    }
                });

                // 참여율 계산
                filtered.forEach(date => {
                    date.rate = date.cnt / date.all * 100;
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
}

// 저장된 저장소들의 언어 사용 분포도
const fetchLanguagePopulation = () => {
    const fetchPromise = new Promise(async (resolve, reject) => {
        try {
            const allRepos = await Models.Repository.aggregate([
                {
                    $unwind: "$languages",
                },
                {
                    $group: {
                        _id: {
                            language_name: "$languages.name",
                        },
                        // name : "$language.name",
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
            reject({
                code: -1,
                status: "FAIL",
                message: "불러오는 도중 오류가 발생했습니다",
                error: e,
            });
        }
    });
    return fetchPromise;
};

// 최상단에 보여줄 항목
// 1. 등록된 저장소 수
// 2. 등록된 사용자 수
// 3. 등록된 커밋의 수
// 4. 현재까지 프로젝트 진행 기간
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
            {},
            {
                _id: true,
                start_dt: true,
                finish_dt: true,
            }
        );

        let allChallengingDates = 0;
        allChallenges.forEach((challenge) => {
            const m_start_dt = challenge.start_dt;
            const m_finish_dt = challenge.finish_dt;
            const m_now = new moment();
            if (m_now.diff(m_finish_dt) <= 0) {
                // 아직 진행중인 경우
                allChallengingDates += m_now.diff(m_start_dt, "day") + 1;
            } else {
                // 이미 종료된 경우
                allChallengingDates += m_finish_dt.diff(m_start_dt, "day") + 1;
            }
        });

        resolve({
            code: 1,
            status: "SUCCESS",
            message: "조회에 성공했습니다",
            data: {
                repo_cnt: allRepos[0].cnt,
                user_cnt: allUsers[0].cnt,
                commit_cnt: allCommits[0].cnt,
                challenge_duration: allChallengingDates,
            },
        });
    });
    return fetchPromise;
};

// 해당 프로젝트에서 인증한 저장소 
const fetchFeaturedRepository = (repo_name)=>{
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
                        commit_cnt : -1
                    }
                },
                {
                    $lookup: {
                        from :"repositories",
                        localField: "_id",
                        foreignField: "_id",
                        as :"repo"
                    }
                },
                {
                    $unwind : "$repo"
                },
                {
                    $match:{
                        'repo.name' : repo_name,
                    }
                },  
            ])

            resolve({
                code : 1,
                status : "SUCCESS",
                message : "조회에 성공했습니다",
                data : aggregatedCommits.length > 0 ? aggregatedCommits[0] : {}
            });
        } catch (e) {
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error : e,
            });
        }

        
    });
    return fetchPromise;
}

// 최근 commits이 제일 많은 저장소
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
                        commit_cnt : -1
                    }
                },
                {
                    $lookup: {
                        from :"repositories",
                        localField: "_id",
                        foreignField: "_id",
                        as :"repo"
                    }
                },
                {
                    $unwind : "$repo"
                }
            ])

            resolve({
                code : 1,
                status : "SUCCESS",
                message : "조회에 성공했습니다",
                data : aggregatedCommits.length > 0 ? aggregatedCommits[0] : {}
            });
        } catch (e) {
            reject({
                code: -1,
                status: "FAIL",
                message: "통신 중 오류가 발생했습니다",
                error : e,
            });
        }

        
    });
    return fetchPromise;
};

// ================================================================================
// 재정리 함수들 : github api에서 가져온 raw 데이터들을 후처리, 혹은 새 문서로 저장합니다
// ================================================================================

// 저장소들의 언어정보를 모두 가져옴
const computeRepos = () => {
    const computePromise = new Promise(async (resolve, reject) => {
        const allRepos = await Models.Repository.find();
        let successes = [];
        let fails = [];
        for (let i = 0; i < allRepos.length; i++) {
            const current_repo = allRepos[i];
            try {
                const current_repo_languages = await fetchRepoLanguages(
                    current_repo.name
                );
                successes.push(current_repo.name);
            } catch (e) {
                fails.push({
                    name: current_repo.name,
                    error: e,
                });
            }
        }
        resolve({
            code: 1,
            status: "SUCCESS",
            message: "모든 데이터를 가져왔습니다",
            success_list: successes,
            fail_list: fails,
        });
    });
    return computePromise;
};

// 이벤트로부터 커밋정보와 저장소 정보, 기여자 정보를 가져옴
const computeEvents = () => {
    const fetchPromise = new Promise((resolve, reject) => {
        const allEvents = Models.Event.find()
            .populate("actor")
            .exec(async (err, res) => {
                if (err) {
                    reject({
                        code: -1,
                        status: "FAIL",
                        message: "데이터를 가져오는데 실패했습니다",
                    });
                } else {
                    for (let idx = 0; idx < res.length; idx++) {
                        // 모든 이벤트를 하나씩 읽음
                        // TODO : 존재하지 않는 repository 일 경우 생성
                        // TODO : 커밋을 추가
                        const currentEvent = res[idx];
                        const currentRepository = await Models.Repository.findOne(
                            { name: currentEvent.repo.name }
                        );
                        // 1. 저장소가 존재하지 않으면 저장소를 추가
                        if (!currentRepository) {
                            const newRepository = new Models.Repository({
                                id: currentEvent.repo.id,
                                name: currentEvent.repo.name,
                                contributor: [currentEvent.actor],
                            });
                            try {
                                await newRepository.save();
                            } catch (e) {
                                reject({
                                    code: -2,
                                    status: "FAIL",
                                    message: "새 저장소 등록에 실패했습니다",
                                });
                                return;
                            }
                        }
                        // 2. 저장소가 존재하면 저장소에 스스로를 추가
                        // 존재하지 않을때만 추가된다.
                        await Models.Repository.updateOne(
                            {
                                name: currentRepository.name,
                            },
                            {
                                $addToSet: {
                                    contributor: currentEvent.actor,
                                },
                            }
                        );
                        // 3. 커밋 생성
                        for (
                            let cIdx = 0;
                            cIdx < currentEvent.payload.commits.length;
                            cIdx++
                        ) {
                            const currentCommitData =
                                currentEvent.payload.commits[cIdx];
                            const duplicatedCommit = await Models.Commit.findOne(
                                {
                                    sha: currentCommitData.sha,
                                    committer: currentEvent.actor,
                                }
                            );
                            if (!duplicatedCommit) {
                                const newCommitModel = new Models.Commit({
                                    sha: currentCommitData.sha,
                                    author: currentCommitData.author,
                                    message: currentCommitData.message,
                                    commit_date: currentEvent.created_at,
                                    commit_date_string: new moment(
                                        currentEvent.created_at
                                    ).format("YYYY-MM-DD"),
                                    committer: currentEvent.actor,
                                    repo: currentRepository,
                                });
                                try {
                                    await newCommitModel.save();
                                } catch (e) {
                                    reject({
                                        code: -2,
                                        status: "FAIL",
                                        message: "커밋 등록에 실패했습니다",
                                    });
                                    return;
                                }
                            }
                        }
                    }

                    resolve({
                        code: 1,
                        status: "SUCCESS",
                        message: "모든 커밋과 저장소를 추가했습니다",
                    });
                }
            });
    });
    return fetchPromise;
};

export {
    fetchAttendance,
    fetchAttendanceByDate,
    fetchLanguagePopulation,
    fetchPopularRepository,
    fetchFeaturedRepository,
    fetchSummary,
    computeEvents,
    computeRepos,
};
