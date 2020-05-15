import express from 'express';

const router = express.Router();

router.get("*", function(req, res, next){ res.status(404).json({ code: -1, status : "FAIL", message : "올바른 주소가 아닙니다." }); });
router.put("*", function(req, res, next){ res.status(404).json({ code: -1, status : "FAIL", message : "올바른 주소가 아닙니다." }); });
router.post("*", function(req, res, next){ res.status(404).json({ code: -1, status : "FAIL", message : "올바른 주소가 아닙니다." }); });
router.delete("*", function(req, res, next){ res.status(404).json({ code: -1, status : "FAIL", message : "올바른 주소가 아닙니다." }); });

export default router;