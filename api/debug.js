const kvStore = require('./kv-store');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const isDefault = !process.env.ADMIN_PASSWORD;

    // List environment variables related to storage/admin without exposing secrets
    const kvVars = {};
    Object.keys(process.env).forEach(key => {
        if (key.startsWith('KV_') || key.startsWith('UPSTASH_') || key.startsWith('ADMIN')) {
            kvVars[key] = key.includes('TOKEN') || key.includes('PASSWORD')
                ? '***' + process.env[key].slice(-4)
                : (key.includes('URL') ? process.env[key] : 'set');
        }
    });

    return res.status(200).json({
        message: 'Debug info',
        adminPassword: {
            isSet: !!process.env.ADMIN_PASSWORD,
            length: password.length,
            usingDefault: isDefault
        },
        kvStorage: {
            configured: kvStore.isConfigured,
            mode: kvStore.isConfigured ? 'redis' : 'in-memory (not persistent)',
            vars: kvVars
        },
        environment: process.env.NODE_ENV || 'development'
    });
};
