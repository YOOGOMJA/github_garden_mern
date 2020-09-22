import moment from "moment";
import * as Models from "../db/models";

export const valid = (body, target, options) => {
    // 각 항목의 필수 여부
    let _options = options || { title: true, start_dt: true, finish_dt: true };
    let _result = {
        result: false,
        has: { title: false, date: false },
        error: [],
        validated: [],
    };

    if (body) {
        _result.has.title = body.title ? true : false;
        // 기본 값을 true로 변경
        _result.has.date = true;
        _result.result = true;
        if (target) {
            // 수정 건
            const current_finish_dt = new moment(target.finish_dt);
            const current_start_dt = new moment(target.start_dt);
            const mNow = new moment();
            if (mNow.diff(current_finish_dt) < 0) {
                // 날짜 정보가 있는 경우
                if (body.start_dt && body.finish_dt) {
                    // 1. 시작일자 종료일자 모두 주어진 경우
                    // 시작, 종료일이 모두 주어진 경우 시작일은 종료일보다 이전이어야 한다.
                    const update_start_dt = new moment(body.start_dt);
                    const update_finish_dt = new moment(body.finish_dt);

                    // 1.1. 주어진 항목이 날짜 형태가 맞는지 확인
                    if (update_start_dt._isValid && update_finish_dt._isValid) {
                        // 1.2. 주어진 시작일자가 종료일자보다 이전인지 확인
                        if (update_start_dt.diff(update_finish_dt) < 0) {
                            // 일자 1번 조건 통과
                            _result.validated.push({
                                name: "start_dt",
                                value: update_start_dt.toDate(),
                            });
                            _result.validated.push({
                                name: "finish_dt",
                                value: update_finish_dt.toDate(),
                            });
                        } else {
                            _result.result = false;
                            _result.error.push({
                                target: "start_dt,finish_dt",
                                data: body,
                                message:
                                    "시작일자는 종료일자와 같거나, 이후일 수 없습니다",
                            });
                        }
                    } else {
                        _result.result = false;
                        _result.error.push({
                            target: "start_dt,finish_dt",
                            data: body,
                            message:
                                "주어진 날짜 정보의 형식이 올바르지 않습니다",
                        });
                    }
                } else if (body.start_dt && !body.finish_dt) {
                    // 2. 시작일자만 주어진 경우
                    if (_options.finish_dt && !body.finish_dt) {
                        // 필수 항목이나 주어지지 않은 경우
                        _result.result = false;
                        _result.error.push({
                            target: "finish_dt",
                            data: body,
                            message: "종료일자가 주어지지 않았습니다",
                        });
                    } else {
                        // 2. 시작일자만 주어진 경우
                        const update_start_dt = new moment(body.start_dt);
                        // 2.1. 정상 일자인지 확인
                        if (update_start_dt._isValid) {
                            // 2.2. 현재 도전 기간의 마지막 일자보다 이전인지 확인
                            if (update_start_dt.diff(current_finish_dt) < 0) {
                                // 일자 2번 항목 통과
                                _result.validated.push({
                                    name: "start_dt",
                                    value: update_start_dt.toDate(),
                                });
                            } else {
                                _result.result = false;
                                _result.error.push({
                                    target: "start_dt",
                                    data: body,
                                    message: `시작일자는 종료일자(${current_finish_dt.format(
                                        "YYYY-MM-DD"
                                    )})와 같거나, 이후일 수 없습니다`,
                                });
                            }
                        } else {
                            _result.result = false;
                            _result.error.push({
                                target: "start_dt",
                                data: body,
                                message:
                                    "주어진 날짜 정보의 형식이 올바르지 않습니다",
                            });
                        }
                    }
                } else if (!body.start_dt && body.finish_dt) {
                    // 3. 종료일자만 주어진 경우
                    if (_options.start_dt && !body.start_dt) {
                        // 필수 항목이나 주어지지 않은경우
                        _result.result = false;
                        _result.error.push({
                            target: "start_dt",
                            data: body,
                            message: "시작일자가 주어지지 않았습니다",
                        });
                    } else {
                        const update_finish_dt = new moment(body.finish_dt);
                        // 3.1. 정상 일자인지 확인
                        if (update_finish_dt._isValid) {
                            // 3.2. 현재 도전기간의 시작일자보다 이후인지 확인
                            if (current_start_dt.diff(update_finish_dt) < 0) {
                                update_finish_dt.hour(23);
                                update_finish_dt.minute(59);
                                update_finish_dt.second(59);
                                // 일자 3번 항목 통과
                                _result.validated.push({
                                    name: "finish_dt",
                                    value: update_finish_dt.toDate(),
                                });
                            } else {
                                _result.result = false;
                                _result.error.push({
                                    target: "finish_dt",
                                    data: req.body.finish_dt,
                                    message: `종료일자는 시작일자(${current_start_dt.format(
                                        "YYYY-MM-DD"
                                    )})와 같거나, 이전일 수 없습니다`,
                                });
                            }
                        } else {
                            _result.result = false;
                            _result.error.push({
                                target: "finish_dt",
                                data: req.body.finish_dt,
                                message:
                                    "주어진 날짜 정보의 형식이 올바르지 않습니다",
                            });
                        }
                    }
                } else {
                    console.log("둘 다 없음");
                    _result.has.date = false;
                    if (_options.finish_dt || _options.start_dt) {
                        _result.result = false;
                        _result.error.push({
                            target: "start_dt,finish_dt",
                            data: body,
                            message: "날짜가 주어지지 않았습니다",
                        });
                    }
                }
            } else {
                _result.error.push({
                    target: "",
                    data: body,
                    message: "이미 종료된 도전 정보는 수정할 수 없습니다",
                });
                return _result;
            }
        } else {
            // 추가 건
            if (body.start_dt && body.finish_dt) {
                // 1. 시작일자 종료일자 모두 주어진 경우
                // 시작, 종료일이 모두 주어진 경우 시작일은 종료일보다 이전이어야 한다.
                const update_start_dt = new moment(body.start_dt);
                const update_finish_dt = new moment(body.finish_dt);

                // 1.1. 주어진 항목이 날짜 형태가 맞는지 확인
                if (update_start_dt._isValid && update_finish_dt._isValid) {
                    // 1.2. 주어진 시작일자가 종료일자보다 이전인지 확인
                    if (update_start_dt.diff(update_finish_dt) < 0) {
                        // 일자 1번 조건 통과
                        _result.validated.push({
                            name: "start_dt",
                            value: update_start_dt.toDate(),
                        });
                        _result.validated.push({
                            name: "finish_dt",
                            value: update_finish_dt.toDate(),
                        });
                    } else {
                        _result.result = false;
                        _result.error.push({
                            target: "start_dt,finish_dt",
                            data: body,
                            message:
                                "시작일자는 종료일자와 같거나, 이후일 수 없습니다",
                        });
                    }
                } else {
                    _result.result = false;
                    _result.error.push({
                        target: "start_dt,finish_dt",
                        data: body,
                        message: "주어진 날짜 정보의 형식이 올바르지 않습니다",
                    });
                }
            } else {
                _result.has.date = false;
                if (_options.finish_dt || _options.start_dt) {
                    _result.result = false;
                    _result.error.push({
                        target: "start_dt,finish_dt",
                        data: body,
                        message: "날짜가 주어지지 않았습니다",
                    });
                }
            }
        }

        if (_result.has.title) {
            // 제목 항목이 주어진 경우
            if (body.title.trim() !== "" && body.title.length <= 30) {
                // 제목 항목 통과
                _result.validated.push({
                    name: "title",
                    value: body.title.trim(),
                });
            } else {
                _result.result = false;
                _result.error.push({
                    target: "title",
                    data: body,
                    message: "제목은 공백이거나 30자를 넘을 수 없습니다",
                });
            }
        } else {
            // 제목 항목이 주어지지 않았으나, 필수 항목인 경우
            if (_options.title) {
                _result.result = false;
                _result.error.push({
                    target: "title",
                    data: body,
                    message: "제목이 주어지지 않았습니다",
                });
            }
        }

        if (target && !_result.has.title && !_result.has.date) {
            _result.result = false;
            _result.error.push({
                target: "start_dt,finish_dt,title",
                data: body,
                message: "제목과 일자가 주어지지 않았습니다",
            });
        }
    } else {
        _result.error.push({
            target: "",
            data: body,
            message: "유효성 검사 파라미터가 잘못됐습니다",
        });
        return _result;
    }

    return _result;
};

export const latestChallenge = () => {
    return Models.Challenge.findOne({
        is_featured: true,
    });
};
