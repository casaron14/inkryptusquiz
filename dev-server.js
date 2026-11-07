const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// API routes
app.all('/api/quiz-state', require('./api/quiz-state'));
app.all('/api/questions', require('./api/questions'));
app.all('/api/submit', require('./api/submit'));
app.all('/api/leaderboard', require('./api/leaderboard'));
app.all('/api/validate', require('./api/validate'));
app.all('/api/debug', require('./api/debug'));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Local server running on http://localhost:${port}`);
});
