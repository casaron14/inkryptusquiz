const kvStore = require('./kv-store');
const questions = require('../data/questions.json');

function calculateCorrectCount(questionIds, answers) {
    if (!Array.isArray(questionIds) || !Array.isArray(answers)) {
        return { valid: false, message: 'Invalid submission format' };
    }

    if (questionIds.length !== answers.length) {
        return { valid: false, message: 'Question and answer counts do not match' };
    }

    const totalQuestions = questions.questions.length;
    let correctCount = 0;

    for (let i = 0; i < questionIds.length; i++) {
        const questionId = questionIds[i];
        const answerIndex = answers[i];

        if (!Number.isInteger(questionId) || questionId < 0 || questionId >= totalQuestions) {
            return { valid: false, message: 'Invalid question set' };
        }

        const question = questions.questions[questionId];

        if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= question.options.length) {
            return { valid: false, message: 'Invalid answer data' };
        }

        if (answerIndex === question.correctAnswer) {
            correctCount++;
        }
    }

    return { valid: true, correctCount };
}

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { answers, questionIds } = req.body || {};

        const quizState = await kvStore.getQuizState();
        if (quizState.state !== 'live') {
            return res.status(400).json({ message: 'Quiz has ended' });
        }

        const validation = calculateCorrectCount(questionIds, answers);

        if (!validation.valid) {
            return res.status(400).json({ message: validation.message });
        }

        return res.status(200).json({
            correctCount: validation.correctCount
        });
    } catch (error) {
        console.error('[validate] Validation failed:', error);
        return res.status(500).json({
            message: 'Failed to validate answers',
            detail: error.message
        });
    }
};
