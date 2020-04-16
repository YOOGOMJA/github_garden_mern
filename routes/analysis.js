import express from "express";

import { Event } from "../db/models/events";
import { Challenge } from "../db/models/challenges";
import { User } from "../db/models/users";
import { getAllDatesBetween, getAttendRateByUser } from "../db/compute";

const router = express.Router();

router.get("/", (req, res, next) => {
    res.json("Hello");
});

// TODO: 특정 도전 기간에 참여한 모든 사용자와 참석율
router.get("/challenge/:challenge_id/user/", async (req, res, next) => {
    const run_at = new Date();

    // 1. 도전 기간 조회
    const current_challenge = await Challenge.findOne({
        id: req.params.challenge_id,
    }).populate("participants");

    if (current_challenge) {
        // 2. 도전 기간 내 사용자들의 이벤트 조회
        // TODO : 사용자 조회 성공 ! 이제 사용자별 이벤트를 가져와야 함
        const current_events = await Event.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: current_challenge.start_dt,
                        $lte: current_challenge.finish_dt,
                    },
                    actor: {
                        $in: current_challenge.participants,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        actor: "$actor",
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$created_at",
                            },
                        },
                    },
                    count: { $sum: "$payload.size" },
                },
            },
            {
                $sort: {
                    "_id.actor": 1,
                    "_id.date": 1,
                },
            },
        ]);

        const attendanceRate = getAttendRateByUser(
            current_events,
            current_challenge.participants,
            current_challenge.start_dt,
            current_challenge.finish_dt
        );
        const finish_at = new Date();

        console.log(
            "run duration : " + (finish_at.getTime() - run_at.getTime()) + "ms"
        );

        res.json({
            challenge: current_challenge,
            attendance_rates: attendanceRate,
        });
    } else {
        res.status(400).json({
            status: "failed",
            message: "존재하지 않는 도전 기간입니다",
        });
    }
});

// 기간 일자별 모든 참가자 출석률
router.get("/challenge/:challenge_id/", async (req, res, next) => {
    const current_challenge = await Challenge.findOne({
        id: req.params.challenge_id,
    });

    if (current_challenge) {
        // 도전 일자가 존재하는 경우
        const current_events = await Event.aggregate([
            {
                $match: {
                    created_at: {
                        $gte: current_challenge.start_dt,
                        $lte: current_challenge.finish_dt,
                    },
                    // actor: {
                    //     $in: current_challenge.participants,
                    // },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$created_at",
                        }
                    },
                    users: {
                        $addToSet: "$actor"
                    }
                },
            },
            {
                $sort: {
                    _id: 1
                }
            },
        ]);

        function compute(data, num_of_users, start_dt, finish_dt){
            const all_dates = getAllDatesBetween(start_dt, finish_dt);
            const filtered = {};
            all_dates.forEach(dt =>{
                filtered[dt] = {
                    number_of_attendant: 0,
                    number_of_all_members: 0,
                    attendance_rates : 0,
                };                
            });
            
            data.forEach(item=>{
                filtered[item._id] = {
                    number_of_attendant : item.users.length,
                    number_of_all_members : num_of_users,
                    attendance_rates: (item.users.length / num_of_users) * 100
                }
            });

            return filtered;
        }

        res.json({
            challenge: current_challenge,
            events: compute(current_events, current_challenge.participants.length, current_challenge.start_dt, current_challenge.finish_at),
        });
    } else {
        res.status(400).json({
            status: "failed",
            message: "존재하지 않는 도전 기간입니다",
        });
    }
});

export default router;
