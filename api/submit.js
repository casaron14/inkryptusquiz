// Persistent storage using Vercel KV / Upstash Redis
const kvStore = require('./kv-store');

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
        const { userId, correctCount } = req.body || {};

        // Validation
        if (!userId || !userId.trim()) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if (correctCount !== 10) {
            return res.status(400).json({ message: 'Must answer all 10 questions correctly' });
        }

        // Check quiz state
        const quizState = await kvStore.getQuizState();

        if (quizState.state !== 'live') {
            return res.status(400).json({ message: 'Quiz has ended' });
        }

        // Check winner limit BEFORE adding (allow up to MAX_WINNERS)
        if (quizState.winnerCount >= kvStore.MAX_WINNERS) {
            return res.status(400).json({ message: 'Quiz has ended' });
        }

        // Create submission entry
        const submission = {
            userId: userId.trim(),
            timestamp: new Date().toISOString(),
            correctCount: correctCount
        };

        // Add to leaderboard using KV store
        const result = await kvStore.addWinner(submission);

        const response = {
            message: 'Submission successful',
            rank: result.rank,
            winnerCount: result.winnerCount,
            quizEnded: false
        };

        // Auto-end if we NOW reached max winners (after accepting this submission)
        if (result.winnerCount >= kvStore.MAX_WINNERS) {
            await kvStore.setQuizState('ended');
            response.quizEnded = true;
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error('[submit] Submission failed:', error);
        return res.status(500).json({
            message: 'Failed to submit result',
            detail: error.message
        });
    }
};
