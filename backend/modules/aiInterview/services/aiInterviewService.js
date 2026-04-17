const axios = require('axios');

let AccessToken = null;
let livekitImportError = null;

try {
  ({ AccessToken } = require('livekit-server-sdk'));
} catch (error) {
  livekitImportError = error;
}

const SHORT_RESPONSE_SCORE = Object.freeze({
  grammar: 50,
  vocabulary: 50,
  clarity: 50,
  fillers: 0,
  overall: 50,
  feedback: 'Answer is too short to evaluate. Add more detail and examples.',
});

const FILLER_PATTERN = /\b(um+|uh+|like|you know|basically|literally|sort of|kind of|i mean|actually|honestly)\b/gi;

const clampScore = (value, fallback = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const normalizeText = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const LIVEKIT_VALIDATE_TIMEOUT_MS = 8000;

const normalizeLiveKitHttpUrl = (wsUrl) => normalizeText(wsUrl)
  .replace(/\/+$/, '')
  .replace(/^wss:\/\//i, 'https://')
  .replace(/^ws:\/\//i, 'http://');

const readLiveKitErrorMessage = (payload, status) => {
  if (payload && typeof payload === 'string') {
    const text = normalizeText(payload);
    if (text) return text;
  }

  if (payload && typeof payload === 'object') {
    const message = normalizeText(
      payload.message
      || payload.error
      || payload.details
    );
    if (message) return message;
  }

  return `LiveKit returned status ${status}`;
};

const validateLiveKitToken = async ({ wsUrl, token }) => {
  const baseUrl = normalizeLiveKitHttpUrl(wsUrl);
  if (!baseUrl || !token) {
    return {
      attempted: false,
      valid: false,
      statusCode: null,
      message: 'Missing LiveKit URL or token',
    };
  }

  try {
    const response = await axios.get(`${baseUrl}/rtc/v1/validate`, {
      params: { access_token: token },
      timeout: LIVEKIT_VALIDATE_TIMEOUT_MS,
      validateStatus: () => true,
    });

    const valid = response.status >= 200 && response.status < 300;
    return {
      attempted: true,
      valid,
      statusCode: response.status,
      message: valid
        ? 'LiveKit token validated successfully'
        : readLiveKitErrorMessage(response.data, response.status),
    };
  } catch (error) {
    return {
      attempted: true,
      valid: false,
      statusCode: error?.response?.status || null,
      message: normalizeText(
        error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
      ) || 'LiveKit validation request failed',
    };
  }
};

const countFillers = (text) => (text.match(FILLER_PATTERN) || []).length;

const extractGeminiText = (payload) => payload?.candidates?.[0]?.content?.parts
  ?.map((part) => part?.text || '')
  .join('')
  .trim();

const parseJsonResponse = (rawText) => {
  if (!rawText) {
    return null;
  }

  const cleaned = rawText.replace(/```json|```/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // continue to relaxed parse
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return null;
  }
};

const buildFeedback = ({ fillers, clarity, vocabulary }) => {
  if (fillers >= 4) {
    return 'Reduce filler words and add short pauses before key points.';
  }

  if (clarity < 60) {
    return 'Structure your answer with a clear beginning, action, and outcome.';
  }

  if (vocabulary < 60) {
    return 'Use more role-specific terms and stronger action verbs.';
  }

  return 'Clear response. Keep backing points with one concrete example.';
};

const localLanguageScore = (text) => {
  const normalized = normalizeText(text);
  if (normalized.length < 10) {
    return { ...SHORT_RESPONSE_SCORE };
  }

  const words = normalized.split(' ').filter(Boolean);
  const wordCount = words.length;
  const fillers = countFillers(normalized);
  const uniqueRatio = wordCount
    ? new Set(words.map((word) => word.toLowerCase())).size / wordCount
    : 0;
  const avgWordLength = wordCount
    ? words.reduce((sum, word) => sum + word.length, 0) / wordCount
    : 0;
  const sentenceCount = Math.max(1, (normalized.match(/[.!?]/g) || []).length);
  const avgSentenceLength = wordCount / sentenceCount;

  const grammar = clampScore(78 - Math.abs(avgSentenceLength - 14) * 1.8 - fillers * 2, 62);
  const vocabulary = clampScore(uniqueRatio * 95 + avgWordLength * 2.5, 62);
  const clarity = clampScore(84 - Math.max(0, avgSentenceLength - 24) * 1.9 - fillers * 3, 62);
  const overall = clampScore(
    grammar * 0.35 + vocabulary * 0.35 + clarity * 0.30 - fillers * 3,
    62
  );

  return {
    grammar,
    vocabulary,
    clarity,
    fillers,
    overall,
    feedback: buildFeedback({ fillers, clarity, vocabulary }),
  };
};

const normalizeLanguageScore = (score, text) => {
  const fallback = localLanguageScore(text);
  const fillers = Number.isFinite(Number(score?.fillers))
    ? Math.max(0, Math.round(Number(score.fillers)))
    : fallback.fillers;

  const grammar = clampScore(score?.grammar, fallback.grammar);
  const vocabulary = clampScore(score?.vocabulary, fallback.vocabulary);
  const clarity = clampScore(score?.clarity, fallback.clarity);
  const computedOverall = clampScore(
    grammar * 0.35 + vocabulary * 0.35 + clarity * 0.30 - fillers * 3,
    fallback.overall
  );

  return {
    grammar,
    vocabulary,
    clarity,
    fillers,
    overall: clampScore(score?.overall, computedOverall),
    feedback: normalizeText(score?.feedback) || fallback.feedback,
  };
};

const requestGeminiLanguageScore = async (text) => {
  const apiKey = normalizeText(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
  );

  if (!apiKey) {
    return null;
  }

  const prompt = `
You are an expert language evaluator for job interviews.

Return ONLY valid JSON with this schema:
{
  "grammar": <0-100 integer>,
  "vocabulary": <0-100 integer>,
  "clarity": <0-100 integer>,
  "fillers": <integer>,
  "overall": <0-100 integer>,
  "feedback": "<one actionable sentence>"
}

Scoring guidance:
- Grammar should penalize grammatical errors.
- Vocabulary should reward precision and variety.
- Clarity should reward concise structure.
- Fillers should count words like um, uh, like, you know, basically, literally.
- Overall should align to: grammar*0.35 + vocabulary*0.35 + clarity*0.30 - fillers*3, clamped 0-100.

Answer to evaluate:
"${text.slice(0, 1200)}"
`;

  try {
    const { data } = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 250,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      },
      {
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const raw = extractGeminiText(data);
    return parseJsonResponse(raw);
  } catch (error) {
    return null;
  }
};

const buildRoomId = (roomId) => {
  const normalized = normalizeText(roomId)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);

  return normalized || `session-${Date.now()}`;
};

const buildIdentity = (user) => {
  const rawId = normalizeText(
    user?.chartersUserId
    || user?._id
    || user?.email
    || user?.id
  );
  const cleanedId = rawId
    .replace(/[^a-z0-9_-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28) || 'candidate';

  const role = normalizeText(user?.role).toLowerCase();
  const prefix = role === 'admin' || role === 'recruiter' ? 'admin' : 'candidate';

  return `${prefix}-${cleanedId}-${Date.now()}`;
};

const aiInterviewService = {
  async healthCheck({ user } = {}) {
    const livekitConfigured = Boolean(
      normalizeText(process.env.LIVEKIT_URL)
      && normalizeText(process.env.LIVEKIT_API_KEY)
      && normalizeText(process.env.LIVEKIT_API_SECRET)
    );

    const geminiConfigured = Boolean(
      normalizeText(
        process.env.GOOGLE_GENERATIVE_AI_API_KEY
        || process.env.GEMINI_API_KEY
        || process.env.GOOGLE_API_KEY
      )
    );

    const issues = [];
    if (livekitImportError) {
      issues.push(`LiveKit SDK unavailable: ${livekitImportError.message}`);
    }

    let livekitTokenValidation = {
      attempted: false,
      valid: false,
      statusCode: null,
      message: 'Skipped: LiveKit token validation requires a configured LiveKit setup',
    };

    if (livekitConfigured && AccessToken) {
      try {
        const probeToken = await aiInterviewService.createInterviewToken({
          roomId: `health-${Date.now().toString(36)}`,
          user: user || {
            role: 'admin',
            chartersUserId: 'health-check',
            name: 'Health Check',
          },
        });

        livekitTokenValidation = await validateLiveKitToken({
          wsUrl: probeToken.wsUrl,
          token: probeToken.token,
        });
      } catch (error) {
        livekitTokenValidation = {
          attempted: false,
          valid: false,
          statusCode: error?.status || error?.response?.status || null,
          message: normalizeText(error?.message) || 'LiveKit probe token generation failed',
        };
      }
    }

    if (!livekitTokenValidation.valid) {
      issues.push(`LiveKit token validation failed: ${livekitTokenValidation.message}`);
    }

    const livekitReady = livekitConfigured && Boolean(AccessToken) && livekitTokenValidation.valid;

    return {
      status: livekitReady ? 'ready' : 'degraded',
      message: livekitReady
        ? 'AI interview module is ready'
        : 'AI interview module loaded with fallback mode',
      checks: {
        livekitSdkInstalled: Boolean(AccessToken),
        livekitConfigured,
        livekitTokenValidation,
        geminiConfigured,
        faceTrackingModelPath: '/face-api-models',
      },
      issues,
      timestamp: new Date().toISOString(),
    };
  },

  async createInterviewToken({ roomId, user }) {
    if (!AccessToken) {
      const error = new Error(
        'LiveKit token service unavailable. Install backend dependency `livekit-server-sdk` and restart the server.'
      );
      error.status = 503;
      throw error;
    }

    const livekitUrl = normalizeText(process.env.LIVEKIT_URL);
    const apiKey = normalizeText(process.env.LIVEKIT_API_KEY);
    const apiSecret = normalizeText(process.env.LIVEKIT_API_SECRET);

    if (!livekitUrl || !apiKey || !apiSecret) {
      const error = new Error(
        'LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in backend/.env.'
      );
      error.status = 503;
      throw error;
    }

    const normalizedRoomId = buildRoomId(roomId);
    const room = `interview-${normalizedRoomId}`;
    const identity = buildIdentity(user);

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      name: normalizeText(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`) || 'Candidate',
      ttl: '2h',
    });

    token.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
    });

    return {
      token: await token.toJwt(),
      wsUrl: livekitUrl,
      room,
      identity,
      expiresIn: '2h',
    };
  },

  async scoreLanguage({ text }) {
    const normalized = normalizeText(text);
    if (normalized.length < 10) {
      return { ...SHORT_RESPONSE_SCORE, source: 'rule' };
    }

    const geminiScore = await requestGeminiLanguageScore(normalized);
    if (geminiScore) {
      return {
        ...normalizeLanguageScore(geminiScore, normalized),
        source: 'gemini',
      };
    }

    return {
      ...localLanguageScore(normalized),
      source: 'fallback',
    };
  },
};

module.exports = aiInterviewService;
