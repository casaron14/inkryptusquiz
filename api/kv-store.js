// Storage helper for the quiz state.
//
// Talks to the Upstash Redis REST API, which is what both the legacy Vercel KV
// integration and the current Upstash Redis marketplace integration expose.
// When no database credentials are present (e.g. a freshly imported Vercel
// project) it falls back to process memory so the API keeps returning valid
// JSON instead of crashing with a 500. Data stored in memory is not shared
// between serverless instances and is lost on cold starts.

const MAX_WINNERS = 5;

const REST_URL =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
const REST_TOKEN =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';

const isConfigured = Boolean(REST_URL && REST_TOKEN);

if (!isConfigured) {
    console.warn(
        '[kv-store] No Redis/KV credentials found (KV_REST_API_URL or UPSTASH_REDIS_REST_URL). ' +
        'Falling back to in-memory storage; quiz state will not persist across serverless instances.'
    );
}

// In-memory fallback, only used when no database is configured.
const memory = new Map();

async function redis(command) {
    const response = await fetch(REST_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${REST_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(command)
    });

    const body = await response.text();
    let payload = null;

    if (body) {
        try {
            payload = JSON.parse(body);
        } catch (error) {
            throw new Error(`Unexpected response from storage (${response.status}): ${body.slice(0, 200)}`);
        }
    }

    if (!response.ok || (payload && payload.error)) {
        const detail = payload && payload.error ? payload.error : `HTTP ${response.status}`;
        throw new Error(`Storage command failed: ${detail}`);
    }

    return payload ? payload.result : null;
}

async function readValue(key, fallback) {
    if (!isConfigured) {
        return memory.has(key) ? memory.get(key) : fallback;
    }

    const raw = await redis(['GET', key]);
    if (raw === null || raw === undefined) {
        return fallback;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return raw;
    }
}

async function writeValue(key, value) {
    if (!isConfigured) {
        memory.set(key, value);
        return;
    }

    await redis(['SET', key, JSON.stringify(value)]);
}

// Initialize default state if not exists
async function getQuizState() {
    const [state, leaderboard, winnerCount] = await Promise.all([
        readValue('quiz:state', 'inactive'),
        readValue('quiz:leaderboard', []),
        readValue('quiz:winnerCount', 0)
    ]);

    return { state, leaderboard, winnerCount };
}

async function setQuizState(state) {
    await writeValue('quiz:state', state);
}

async function getLeaderboard() {
    return await readValue('quiz:leaderboard', []);
}

async function setLeaderboard(leaderboard) {
    await writeValue('quiz:leaderboard', leaderboard);
}

async function getWinnerCount() {
    return await readValue('quiz:winnerCount', 0);
}

async function setWinnerCount(count) {
    await writeValue('quiz:winnerCount', count);
}

async function addWinner(submission) {
    // Get current data
    const leaderboard = await getLeaderboard();
    const winnerCount = await getWinnerCount();

    // Add submission
    leaderboard.push(submission);
    const newCount = winnerCount + 1;

    // Sort by timestamp
    leaderboard.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Update storage
    await setLeaderboard(leaderboard);
    await setWinnerCount(newCount);

    return {
        rank: leaderboard.findIndex(s => s.timestamp === submission.timestamp) + 1,
        winnerCount: newCount
    };
}

async function resetQuiz() {
    await setQuizState('inactive');
    await setLeaderboard([]);
    await setWinnerCount(0);
}

module.exports = {
    MAX_WINNERS,
    isConfigured,
    getQuizState,
    setQuizState,
    getLeaderboard,
    setLeaderboard,
    getWinnerCount,
    setWinnerCount,
    addWinner,
    resetQuiz
};
