const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const interviewController = require("../controllers/interview.controller");
const upload = require("../middlewares/file.middleware");

const interviewRouter = express.Router();

/**
 * ✅ IMPORTANT: Put PDF route FIRST (to avoid conflict with /:interviewId)
 */
interviewRouter.get(
    '/resume/pdf/:interviewReportId',
    authMiddleware.authUser,
    interviewController.generateResumePdfController
);

/**
 * @route POST /api/interview/generate
 */
interviewRouter.post(
    '/generate',
    authMiddleware.authUser,
    upload.single('resume'),
    interviewController.generateInterviewReportController
);

/**
 * @route GET /api/interview/
 */
interviewRouter.get(
    '/',
    authMiddleware.authUser,
    interviewController.getAllInterviewReportsController
);

/**
 * @route GET /api/interview/:interviewId
 */
interviewRouter.get(
    '/:interviewId',
    authMiddleware.authUser,
    interviewController.generateInterviewReportByIdController
);

module.exports = interviewRouter;