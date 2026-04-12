const pdfParse = require('pdf-parse');
const { generateInterviewReport, initializeGeminiAI, generateResumePdf } = require('../services/ai.service')
const interviewReportModel = require('../models/interviewReport.model')

// Initialize Groq AI when controller loads
initializeGeminiAI()

async function generateInterviewReportController(req, res) {
    try {
        const resume = req.file
        const { selfDescription, jobDescription } = req.body

        let resumeText = ''
        if (resume) {
            const resumeContent = await pdfParse(resume.buffer)
            resumeText = resumeContent.text
        }

        const interviewReportByAi = await generateInterviewReport(
            resumeText,
            jobDescription,
            selfDescription
        )

        const interviewReport = await interviewReportModel.create({
            user: req.user._id,
            resumeText,                              // ✅ Fixed: was "resume"
            jobDescription,
            selfIntroduction: selfDescription,       // ✅ Fixed: was "selfDescription"
            ...interviewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully",
            interviewReport
        })
    } catch (err) {
        console.error("Error in generateInterviewReportController:", err)
        res.status(500).json({ message: "Failed to generate report", error: err.message })
    }
}

async function generateInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params
        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user._id })
        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found" })
        }
        res.status(200).json({ interviewReport })
    } catch (err) {
        console.error("Error in generateInterviewReportByIdController:", err)
        res.status(500).json({ message: "Failed to fetch report", error: err.message })
    }
}

async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user._id })
            .select("-resumeText -selfIntroduction -jobDescription -__v -technicalQuestions -behaviouralQuestions -skillgaps -preparationPlan")

        res.status(200).json({ interviewReports })
    } catch (err) {
        console.error("Error in getAllInterviewReportsController:", err)
        res.status(500).json({ message: "Failed to fetch reports", error: err.message })
    }
}

async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params;

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user._id
        });

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found"
            });
        }

        const pdfBuffer = await generateResumePdf({
            resume: interviewReport.resumeText,
            jobDescription: interviewReport.jobDescription,
            selfDescription: interviewReport.selfIntroduction
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=resume_${interviewReportId}.pdf`,
        });

        res.send(pdfBuffer);

    } catch (error) {
        console.error("PDF ERROR:", error);
        res.status(500).json({
            message: "Failed to generate PDF",
            error: error.message
        });
    }
}

module.exports = { generateInterviewReportController, generateInterviewReportByIdController, getAllInterviewReportsController,generateResumePdfController }