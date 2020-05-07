import * as Models from "../models";

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

// 커밋 분석
const ComputeCommits = () => {};
// 저장소 분석
const ComputeRepos = () => {};

const fetch = () => {
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

export { ComputeCommits, ComputeRepos, fetch };
