// Persistent storage using Vercel KV / Upstash Redis
const kvStore = require('./kv-store');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // GET: Return current quiz state
        if (req.method === 'GET') {
            const isAdminRequest = req.query && req.query.admin === '1';
            const authHeader = req.headers.authorization;

            if (isAdminRequest && authHeader !== ADMIN_PASSWORD) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const quizState = await kvStore.getQuizState();

            return res.status(200).json({
                state: quizState.state,
                winnerCount: quizState.winnerCount
            });
        }

        // POST: Change quiz state (admin only)
        if (req.method === 'POST') {
            const authHeader = req.headers.authorization;

            console.log(`[quiz-state POST] Auth header provided: ${authHeader ? 'yes' : 'no'}`);

            if (authHeader !== ADMIN_PASSWORD) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { action } = req.body || {};
            const quizState = await kvStore.getQuizState();

            switch (action) {
                case 'start':
                    if (quizState.state === 'inactive') {
                        await kvStore.setQuizState('live');
                        return res.status(200).json({
                            state: 'live',
                            message: 'Quiz started'
                        });
                    }
                    return res.status(400).json({ message: 'Quiz is not inactive' });

                case 'end':
                    if (quizState.state === 'live') {
                        await kvStore.setQuizState('ended');
                        return res.status(200).json({
                            state: 'ended',
                            message: 'Quiz ended'
                        });
                    }
                    return res.status(400).json({ message: 'Quiz is not live' });

                case 'reset':
                    await kvStore.resetQuiz();
                    return res.status(200).json({
                        state: 'inactive',
                        message: 'Quiz reset successfully'
                    });

                default:
                    return res.status(400).json({ message: 'Invalid action' });
            }
        }

        return res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        console.error('[quiz-state] Request failed:', error);
        return res.status(500).json({
            message: 'Failed to update quiz state',
            detail: error.message
        });
    }
};
