const express = require('express');
const router = express.Router();
const { generateContent } = require('../services/ai.service');

/**
 * @route POST /api/ai/generate
 * @description Generate content using Gemini AI
 * @access Public
 * @param {string} prompt - The prompt to send to Gemini
 */
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'Prompt is required'
            });
        }

        const response = await generateContent(prompt);

        res.status(200).json({
            success: true,
            data: response,
            message: 'Content generated successfully'
        });
    } catch (error) {
        console.error('Error generating content:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate content'
        });
    }
});

/**
 * @route POST /api/ai/interview-analysis
 * @description Analyze interview responses using Gemini AI
 * @access Public
 */
router.post('/interview-analysis', async (req, res) => {
    try {
        const { question, answer } = req.body;

        if (!question || !answer) {
            return res.status(400).json({
                success: false,
                message: 'Question and answer are required'
            });
        }

        const prompt = `As an interview expert, analyze the following interview response:
        
Question: ${question}

Answer: ${answer}

Please provide:
1. Overall assessment (Good/Average/Needs Improvement)
2. Strengths (2-3 points)
3. Areas for improvement (2-3 points)
4. Score out of 10
5. Feedback for improvement`;

        const response = await generateContent(prompt);

        res.status(200).json({
            success: true,
            data: response,
            message: 'Analysis completed'
        });
    } catch (error) {
        console.error('Error analyzing interview:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to analyze interview'
        });
    }
});

/**
 * @route GET /api/ai/health
 * @description Check Gemini AI service health
 * @access Public
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Gemini AI service is running',
        timestamp: new Date()
    });
});

module.exports = router;
