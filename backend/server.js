const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/adminAuth');
const adminRoutes = require('./routes/admin');
const permissionsRoutes = require('./routes/permissions');
const internalPermissionsRoutes = require('./routes/internalPermissions');
const jobPostingRoutes = require('./routes/jobPosting.routes')
const internshipPostingRoutes = require('./routes/internshipPosting.routes')
const { requestId } = require('./middleware/requestId');

const createUnavailableRouter = (name, message) => {
  const router = express.Router();

  router.use((req, res) => {
    res.status(503).json({
      success: false,
      requestId: req.requestId || null,
      message: `${name} unavailable: ${message}`,
    });
  });

  return router;
};

const loadRouteModule = (label, path) => {
  try {
    const routeModule = require(path);
    console.log(`Loaded ${label} routes`);
    return routeModule;
  } catch (error) {
    console.error(`Failed to load ${label} routes:`, error.message);
    return createUnavailableRouter(label, error.message);
  }
};

const profileBrandingRoutes = loadRouteModule('profileBranding', './routes/profileBranding');
const aiServicesRoutes = loadRouteModule('aiServices', './routes/aiServices');
const aiInterviewRoutes = loadRouteModule('aiInterview', './routes/aiInterview');

const app = express();
const DEFAULT_ALLOWED_ORIGINS = [
  'https://charters-business-admin.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
const DEFAULT_ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/charters-business-admin-[a-z0-9-]+\.vercel\.app$/i,
];

const parseAllowedOrigins = (value) => String(value || '')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);

const parseAllowedOriginRegexes = (value) => {
  const entries = parseAllowedOrigins(value);
  const regexes = [];

  for (const entry of entries) {
    try {
      regexes.push(new RegExp(entry));
    } catch (error) {
      console.warn(`Ignoring invalid FRONTEND_URL_REGEX pattern: ${entry}`);
    }
  }

  return regexes;
};

const configuredOrigins = parseAllowedOrigins(process.env.FRONTEND_URL);
const allowedOrigins = Array.from(
  new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredOrigins])
);
const configuredOriginPatterns = parseAllowedOriginRegexes(process.env.FRONTEND_URL_REGEX);
const allowedOriginPatterns = [...DEFAULT_ALLOWED_ORIGIN_PATTERNS, ...configuredOriginPatterns];

const isAllowedOrigin = (origin) => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};

const parseTrustProxy = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return 1;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return value;
};

app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

// Establish the database connection before serving requests.
connectDB();

// Security Middleware
app.use(helmet());
app.use(compression());
app.use(requestId);

// Request logging (structured)
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const payload = {
      level: 'info',
      type: 'request',
      requestId: req.requestId || null,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'] || null,
    };

    console.log(JSON.stringify(payload));
  });

  next();
});

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body Parser Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/profile-branding', profileBrandingRoutes);
app.use('/api/ai-services', aiServicesRoutes);
app.use('/api/ai-interview', aiInterviewRoutes);
app.use('/api/interview', aiInterviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/internal/permissions', internalPermissionsRoutes);
app.use("/api/internal/admin/jobs", jobPostingRoutes);
app.use("/api/internal/admin/internships", internshipPostingRoutes);

// Server start time for client-side restart detection
const SERVER_START = new Date().toISOString();

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    requestId: req.requestId || null,
    timestamp: new Date().toISOString(),
    serverStart: SERVER_START,
  });
});

// Root route for platform health checks
app.get('/', (req, res) => {
  res.status(200).send('API is running');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const payload = {
    level: 'error',
    type: 'request_error',
    requestId: req.requestId || null,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  console.error(JSON.stringify(payload));

  res.status(statusCode).json({
    success: false,
    requestId: req.requestId || null,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    requestId: req.requestId || null,
    message: 'Route not found',
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Graceful shutdown helpers
const linkedinScraperService = require('./services/linkedinScraperService');
const linkedinScraperJobQueue = require('./services/linkedinScraperJobQueue');

const gracefulShutdown = async (signal) => {
  console.log(`Received ${signal} - shutting down gracefully`);
  try {
    server.close(() => console.log('Closed HTTP server'));
  } catch (error) {
    // no-op
  }

  try {
    if (
      linkedinScraperJobQueue &&
      typeof linkedinScraperJobQueue.shutdown === 'function'
    ) {
      await linkedinScraperJobQueue.shutdown();
    }
  } catch (error) {
    console.warn('Error shutting down job queue:', error && error.message ? error.message : error);
  }

  try {
    if (
      linkedinScraperService &&
      typeof linkedinScraperService.cleanup === 'function'
    ) {
      await linkedinScraperService.cleanup();
    }
  } catch (error) {
    console.warn('Error cleaning up scraper service:', error && error.message ? error.message : error);
  }

  setTimeout(() => process.exit(0), 500);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;
