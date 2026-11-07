#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'questions.json');
const errors = [];
const warnings = [];

function fail(message) {
    errors.push(message);
}

let data;
try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
    console.error(`Invalid JSON in ${dataPath}: ${error.message}`);
    process.exit(1);
}

if (Array.isArray(data)) {
    fail('Top level must be an object with a "questions" array, not a bare array.');
    data = { questions: data };
} else if (!data || typeof data !== 'object') {
    fail('Top level must be an object with a "questions" array.');
    data = { questions: [] };
}

if (!Array.isArray(data.questions)) {
    fail('The "questions" property must be an array.');
    data.questions = [];
}

const extraTopLevelKeys = Object.keys(data).filter(key => key !== 'questions');
if (extraTopLevelKeys.length > 0) {
    warnings.push(`Unexpected top-level keys: ${extraTopLevelKeys.join(', ')}`);
}

const questions = data.questions;

if (questions.length < 10) {
    fail(`Expected at least 10 questions (the quiz serves 10), found ${questions.length}.`);
}

const seenQuestions = new Map();
const answerDistribution = {};

questions.forEach((item, index) => {
    const label = `Question ${index + 1}`;

    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        fail(`${label}: must be an object.`);
        return;
    }

    const expectedKeys = ['question', 'options', 'correctAnswer'];
    const keys = Object.keys(item);
    const missingKeys = expectedKeys.filter(key => !keys.includes(key));
    const extraKeys = keys.filter(key => !expectedKeys.includes(key));

    if (missingKeys.length > 0) {
        fail(`${label}: missing ${missingKeys.join(', ')}.`);
    }

    if (extraKeys.length > 0) {
        warnings.push(`${label}: unexpected keys: ${extraKeys.join(', ')}.`);
    }

    if (typeof item.question !== 'string' || item.question.trim() === '') {
        fail(`${label}: "question" must be a non-empty string.`);
    } else {
        const normalized = item.question.trim().toLowerCase();
        if (seenQuestions.has(normalized)) {
            fail(`${label}: duplicate question text (also question ${seenQuestions.get(normalized) + 1}).`);
        } else {
            seenQuestions.set(normalized, index);
        }
    }

    if (!Array.isArray(item.options)) {
        fail(`${label}: "options" must be an array.`);
        return;
    }

    if (item.options.length < 2) {
        fail(`${label}: needs at least 2 options.`);
    } else if (item.options.length !== 4) {
        warnings.push(`${label}: has ${item.options.length} options (usually 4).`);
    }

    const seenOptions = new Set();
    item.options.forEach((option, optionIndex) => {
        if (typeof option !== 'string' || option.trim() === '') {
            fail(`${label}: option ${optionIndex + 1} must be a non-empty string.`);
            return;
        }

        const normalized = option.trim().toLowerCase();
        if (seenOptions.has(normalized)) {
            fail(`${label}: duplicate option ${optionIndex + 1} ("${option}").`);
        }
        seenOptions.add(normalized);
    });

    if (!Number.isInteger(item.correctAnswer)) {
        fail(`${label}: "correctAnswer" must be an integer index (0-${item.options.length - 1}).`);
    } else if (item.correctAnswer < 0 || item.correctAnswer >= item.options.length) {
        fail(`${label}: "correctAnswer" ${item.correctAnswer} is out of range.`);
    } else {
        answerDistribution[item.correctAnswer] =
            (answerDistribution[item.correctAnswer] || 0) + 1;
    }
});

console.log(`Questions: ${questions.length}`);
console.log('Correct answer distribution:', answerDistribution);

if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach(warning => console.log(`  - ${warning}`));
}

if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}):`);
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
}

console.log('\nquestions.json format is valid.');
