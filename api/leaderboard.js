// Persistent storage using Vercel KV / Upstash Redis
const kvStore = require('./kv-store');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const quizState = await kvStore.getQuizState();

        return res.status(200).json({
            leaderboard: quizState.leaderboard,
            winnerCount: quizState.winnerCount,
            quizState: quizState.state
        });
    } catch (error) {
        console.error('[leaderboard] Failed to load leaderboard:', error);
        return res.status(500).json({
            message: 'Failed to load leaderboard',
            detail: error.message
        });
    }
};
