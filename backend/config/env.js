/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * VARIABLES DE ENTORNO
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

require('dotenv').config();
const path = require('path');

module.exports = {
    // Servidor
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Base de datos
    DATABASE_PATH: process.env.DATABASE_PATH || path.join(__dirname, '../../storage/database.sqlite'),

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'sri-secret-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    // Email
    MAIL_HOST: process.env.MAIL_HOST || 'smtp.gmail.com',
    MAIL_PORT: parseInt(process.env.MAIL_PORT || '587'),
    MAIL_USER: process.env.MAIL_USER || '',
    MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',

    // OCR Nanonets
    NANONETS_API_KEY: process.env.NANONETS_API_KEY || '',
    NANONETS_MODEL_ID: process.env.NANONETS_MODEL_ID || '',

    // URLs
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3000/api',

    // n8n MCP Integration
    N8N_MCP_URL: process.env.N8N_MCP_URL || '',
    N8N_MCP_TOKEN: process.env.N8N_MCP_TOKEN || '',

    // Redis
    REDIS_URL: process.env.REDIS_URL || '',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379'),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
    REDIS_DB: parseInt(process.env.REDIS_DB || '0'),

    // Session
    SESSION_SECRET: process.env.SESSION_SECRET || 'sri-session-secret-change-in-production',
    SESSION_MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || '604800000'), // 7 days in ms

    // Paths
    STORAGE_PATH: path.join(__dirname, '../../storage'),
    UPLOADS_PATH: path.join(__dirname, '../../storage/uploads'),
    LOGS_PATH: path.join(__dirname, '../../logs')
};
