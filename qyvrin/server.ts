import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with Application Default Credentials
initializeApp();

async function generateContentWithFallback(ai: GoogleGenAI, prompt: string, requestId: string) {
  const models = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`[ANALYZE_MODEL] requestId=${requestId} model=${model}`);
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
      });
      console.log(`[ANALYZE_SUCCESS] requestId=${requestId} model=${model}`);
      return response.text || '{}';
    } catch (error: any) {
      // Only fallback on recoverable errors: 503, 429, 404, 500
      const status = error.status || (error.response && error.response.status);
      console.log(`[ANALYZE_FAILURE] requestId=${requestId} model=${model} status=${status || 'unknown'}`);
      console.warn(`Model ${model} failed:`, error.message);
      lastError = error;
      if (!status || ![503, 429, 404, 500].includes(status)) {
         throw error;
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware before routes
  app.use(express.json({ limit: '100kb' }));

  const rateLimits = new Map<string, { count: number, resetTime: number }>();

  function checkRateLimit(uid: string, endpoint: string, maxRequests: number, windowMs: number = 60000): { allowed: boolean, retryAfter: number } {
    const now = Date.now();
    const key = `${uid}:${endpoint}`;
    const record = rateLimits.get(key);

    if (!record || record.resetTime < now) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
    }

    record.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimits.entries()) {
      if (record.resetTime < now) {
        rateLimits.delete(key);
      }
    }
  }, 60000);

  // API Routes
  app.post('/api/analyze', async (req, res) => {
    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const uid = decodedToken.uid;
      console.log(`[ANALYZE_REQUEST] requestId=${requestId} endpoint=/api/analyze uid=${uid}`);
      
      const { allowed, retryAfter } = checkRateLimit(uid, '/api/analyze', 10);
      if (!allowed) {
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const payload = (req.body && typeof req.body === 'object') ? req.body : {};
      const { text, category } = payload;
      
      if (!text || typeof text !== 'string' || text.length > 10000) {
        return res.status(400).json({ error: 'Invalid or oversized text payload' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `You are QYVRIN, an AI-powered Financial Decision Intelligence application.
The user has provided a journal entry describing a financial decision.
Category: ${category || 'Unknown'}
Entry: "${text}"

RULES:
1. Grounding: NEVER present an inference, assumption, estimate, or hypothetical scenario as a fact. Distinguish strictly between USER-PROVIDED FACTS and POSSIBLE SIGNALS.
2. Hypothetical Numbers: NEVER invent financial numbers (e.g. 2% discounts, ₹ amounts, interest rates, DSO values, margins) unless supplied by the user. If a hypothetical number is needed to demonstrate a scenario, you MUST explicitly label it as an "Illustrative assumption:".
3. Financial Language: Use precise terminology. Do not claim insolvency, default, profitability decline, or cash-flow deficit unless the user's information supports it. If insufficient, state "Insufficient information to determine this."
4. Decision Patterns: Do not diagnose psychological traits (e.g., do not say "You are an optimist"). Use tentative language like "Possible decision pattern" or "Possible optimism bias".
5. Scenarios: Alternative scenarios must focus on decision paths and trade-offs rather than direct financial recommendations. Do not tell the user what they should choose.
6. Disclaimer adherence: QYVRIN provides educational financial reflection and scenario analysis, not personalized investment, tax, or legal advice.

Please analyze this decision and return the output STRICTLY as a JSON object matching this exact schema:
{
  "summary": "String (1-2 sentences summarizing the core trade-offs or nature of the decision)",
  "userFacts": ["String", "String"], // Only facts explicitly stated by the user
  "possibleSignals": ["String", "String"], // Reasonable financial interpretations of the user's information
  "assumptions": ["String", "String"], // Things that would need to be true for the decision to work
  "potentialRisks": ["String", "String"], // Risks that could arise if certain conditions occur
  "decisionPatterns": ["String", "String"], // Possible cognitive biases or patterns (e.g. "Possible optimism bias")
  "questionsToValidate": ["String", "String"], // Intelligent follow-up questions to validate conclusions
  "alternativeScenarios": [
    {
      "id": "scenario-1",
      "title": "String (Short scenario name)",
      "description": "String (Brief description of alternative decision path and trade-off)",
      "financialImpact": "String (Description of illustrative financial outcome)"
    }
  ],
  "informationGaps": ["String", "String"], // Crucial missing information preventing stronger assessment
  "decisionReadiness": "String (e.g. 'Preliminary: 62% completeness' or 'High: 90% completeness')"
}

Do not include any markdown formatting around the JSON (no \`\`\`json). Return purely the JSON string.`;

      const responseText = await generateContentWithFallback(ai, prompt, requestId);

      const cleanJson = responseText.replace(/^```json/m, '').replace(/^```/m, '').trim();
      
      const analysis = JSON.parse(cleanJson);
      res.json(analysis);

    } catch (error) {
      console.error('Error analyzing decision:', error);
      res.status(500).json({ error: 'Failed to analyze decision.' });
    }
  });

  app.post('/api/replay', async (req, res) => {
    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const uid = decodedToken.uid;
      console.log(`[REPLAY_REQUEST] requestId=${requestId} endpoint=/api/replay uid=${uid}`);

      const { allowed, retryAfter } = checkRateLimit(uid, '/api/replay', 10);
      if (!allowed) {
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const payload = (req.body && typeof req.body === 'object') ? req.body : {};
      
      const validateText = (val: any) => typeof val === 'string' && val.length <= 10000;
      if (payload.journalEntryContent && !validateText(payload.journalEntryContent)) return res.status(400).json({ error: 'Oversized field' });
      if (payload.analysisSummary && !validateText(payload.analysisSummary)) return res.status(400).json({ error: 'Oversized field' });
      if (payload.expectedOutcome && !validateText(payload.expectedOutcome)) return res.status(400).json({ error: 'Oversized field' });
      if (payload.actualOutcome && !validateText(payload.actualOutcome)) return res.status(400).json({ error: 'Oversized field' });
      if (payload.surprises && !validateText(payload.surprises)) return res.status(400).json({ error: 'Oversized field' });
      if (payload.differentNextTime && !validateText(payload.differentNextTime)) return res.status(400).json({ error: 'Oversized field' });

      const { 
        journalEntryContent, 
        analysisSummary, 
        expectedOutcome,
        expectedTimeframe,
        expectedMetric,
        expectedValue,
        actualOutcome,
        actualTimeframe,
        actualMetric,
        actualValue,
        surprises,
        differentNextTime
      } = payload;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `You are QYVRIN, an AI-powered Financial Decision Intelligence application.
The user is reviewing a past financial decision to learn from the outcome.

ORIGINAL JOURNAL ENTRY:
"${journalEntryContent || 'Not provided'}"

ORIGINAL ANALYSIS SUMMARY:
"${analysisSummary || 'Not provided'}"

EXPECTED OUTCOME:
Outcome: ${expectedOutcome || 'Not provided'}
Timeframe: ${expectedTimeframe || 'Not provided'}
Metric: ${expectedMetric || 'Not provided'}
Value: ${expectedValue || 'Not provided'}

ACTUAL OUTCOME:
Outcome: ${actualOutcome || 'Not provided'}
Timeframe: ${actualTimeframe || 'Not provided'}
Metric: ${actualMetric || 'Not provided'}
Value: ${actualValue || 'Not provided'}
Surprises: ${surprises || 'Not provided'}
Different next time: ${differentNextTime || 'Not provided'}

RULES:
1. Grounding: NEVER invent financial values, percentages, dates, metrics, outcomes, or causes.
2. Calculations: If expected and actual numerical values are both provided and are clearly comparable, calculate the variance transparently. If numbers are unavailable, use qualitative comparison.
3. Lessons Learned: Explain the learning from the difference between expectation and reality. Never claim certainty about causation unless the user provided evidence. Use cautious language (e.g. "The outcome suggests...").
4. Future Questions: Generate useful questions to improve future decision-making based on this replay.
5. No Psychological Diagnosis: Do not diagnose the user (e.g. avoid "You have confirmation bias"). Use phrases like "One possible reasoning gap was..." or "The decision may have placed greater weight on...".

Please analyze this decision replay and return the output STRICTLY as a JSON object matching this exact schema:
{
  "decisionSummary": "String",
  "originalReasoning": "String",
  "expectedOutcome": "String",
  "actualOutcome": "String",
  "expectationVsReality": "String (Explain variance transparently if applicable)",
  "whatWentWell": ["String", "String"],
  "whatWasDifferent": ["String", "String"],
  "possibleReasoningGaps": ["String", "String"],
  "lessonLearned": "String",
  "futureQuestions": ["String", "String"]
}

Do not include any markdown formatting around the JSON (no \`\`\`json). Return purely the JSON string.`;

      const responseText = await generateContentWithFallback(ai, prompt, requestId);
      const cleanJson = responseText.replace(/^```json/m, '').replace(/^```/m, '').trim();
      
      const replay = JSON.parse(cleanJson);
      res.json(replay);
    } catch (error) {
      console.error('Error generating replay:', error);
      res.status(500).json({ error: 'Failed to generate decision replay.' });
    }
  });

  app.post('/api/premortem', async (req, res) => {
    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const uid = decodedToken.uid;
      console.log(`[PREMORTEM_REQUEST] requestId=${requestId} endpoint=/api/premortem uid=${uid}`);

      const { allowed, retryAfter } = checkRateLimit(uid, '/api/premortem', 10);
      if (!allowed) {
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const payload = (req.body && typeof req.body === 'object') ? req.body : {};
      
      if (!payload.journalEntry || typeof payload.journalEntry !== 'string' || payload.journalEntry.length > 10000) {
        return res.status(400).json({ error: 'Invalid or oversized journalEntry payload' });
      }
      if (payload.category && (typeof payload.category !== 'string' || payload.category.length > 10000)) {
        return res.status(400).json({ error: 'Invalid or oversized category payload' });
      }

      const { journalEntry, category, userFacts, informationGaps } = payload;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `You are QYVRIN, an AI-powered Financial Decision Intelligence application.
The user wants to run a Pre-Mortem Analysis on a decision they are considering.

ORIGINAL JOURNAL ENTRY:
"${journalEntry || 'Not provided'}"

CATEGORY: ${category || 'Unknown'}

EXISTING USER FACTS:
${userFacts ? JSON.stringify(userFacts) : 'None'}

EXISTING INFORMATION GAPS:
${informationGaps ? JSON.stringify(informationGaps) : 'None'}

RULES FOR PRE-MORTEM:
1. Assume this decision did not achieve the expected outcome. Identify plausible factors that could have contributed. Failure scenarios must remain plausible hypothetical pathways, not claims about what actually happened.
2. Distinguish explicitly between: User-provided facts, Plausible hypothetical failure factors, and Assumptions that should be validated. Critical assumptions should be written as assumptions that need validation, not statements of fact.
3. NEVER claim the decision will fail or that failure is certain.
4. NEVER state that an unmentioned cost, condition, event, or circumstance already exists or was already overlooked. (e.g., instead of "The recurring support costs were not accounted for", use "Expected benefits could be reduced if recurring support or implementation costs are higher than anticipated.")
5. NEVER infer how saved time will be used unless the user explicitly states it. (e.g., instead of "The 25 hours saved will become revenue-generating work", use "Time saved from manual work could potentially be redirected toward higher-value activities.")
6. NEVER infer the relative size of a financial commitment unless the user explicitly provides total costs. (e.g., instead of "The ₹6 lakh upfront cost represents the majority of the financial commitment", use "The ₹6 lakh purchase may not represent the full cost of ownership if additional costs apply.")
7. When a potential financial factor is unknown, prefer placing it under "Information Gaps" or "Questions to Investigate" rather than presenting it as an existing condition.
8. GROUNDING RULE: Do NOT invent financial amounts, percentages, ROI, interest rates, margins, dates, business metrics, or user circumstances unless explicitly provided in the Journal Entry or User Facts.
9. If an example number is absolutely necessary to explain a concept, you MUST label it clearly as "Illustrative assumption". Prefer qualitative reasoning instead.
10. Do not diagnose personality or psychology (e.g., avoid "You are overconfident"). Use neutral language such as "The decision may rely on an assumption that...".

Please return the output STRICTLY as a JSON object matching this exact schema:
{
  "failureScenarios": [
    {
      "title": "string",
      "description": "string"
    }
  ],
  "criticalAssumptions": ["string"],
  "earlyWarningIndicators": ["string"],
  "questionsToInvestigate": ["string"],
  "mitigationOptions": ["string"],
  "informationGaps": ["string"]
}

Do not include any markdown formatting around the JSON (no \`\`\`json). Return purely the JSON string.`;

      const responseText = await generateContentWithFallback(ai, prompt, requestId);
      const cleanJson = responseText.replace(/^```json/m, '').replace(/^```/m, '').trim();
      
      const preMortem = JSON.parse(cleanJson);
      preMortem.generatedAt = new Date().toISOString();
      res.json(preMortem);
    } catch (error) {
      console.error('Error generating pre-mortem:', error);
      res.status(500).json({ error: 'Failed to generate pre-mortem analysis.' });
    }
  });

  app.post('/api/fingerprint', async (req, res) => {
    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const uid = decodedToken.uid;
      console.log(`[FINGERPRINT_REQUEST] requestId=${requestId} endpoint=/api/fingerprint uid=${uid}`);

      const { allowed, retryAfter } = checkRateLimit(uid, '/api/fingerprint', 5);
      if (!allowed) {
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const payload = (req.body && typeof req.body === 'object') ? req.body : {};
      const { decisions, deterministicSummary } = payload;
      
      if (!decisions || !Array.isArray(decisions) || decisions.length > 50) {
        return res.status(400).json({ error: 'Invalid or oversized decisions payload' });
      }
      for (const d of decisions) {
        if (!d || typeof d !== 'object') {
          return res.status(400).json({ error: 'Malformed decision object' });
        }
        if (d.text && (typeof d.text !== 'string' || d.text.length > 10000)) {
          return res.status(400).json({ error: 'Oversized decision text' });
        }
        if (d.decisionSummary && (typeof d.decisionSummary !== 'string' || d.decisionSummary.length > 10000)) {
          return res.status(400).json({ error: 'Oversized decision summary' });
        }
      }
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
      }
      const ai = new GoogleGenAI({ apiKey });

      const validIds = new Set((decisions || []).map((d: any) => d.decisionId));
      
      const prompt = `You are QYVRIN, an AI-powered Financial Decision Intelligence application.
The user wants to generate a Decision Fingerprint based on their completed decisions.

COMPLETED DECISIONS:
${JSON.stringify(decisions || [])}

DETERMINISTIC SUMMARY (Calculated by code):
${JSON.stringify(deterministicSummary || {})}

RULES FOR DECISION FINGERPRINT:
1. Synthesize qualitative patterns from the supplied evidence (recurring assumptions, decision strengths, information gaps, etc.).
2. Do NOT invent decisions, outcomes, financial amounts, percentages, variance, user history, or decision IDs. Do not generate an approximate range unless it is explicitly calculated by the deterministic code provided.
3. Every meaningful pattern MUST be supported by one or more supplied decision IDs in the "observedIn" array.
4. Do NOT diagnose personality or psychology (e.g., avoid "you are impulsive", "you are overconfident"). Describe decision patterns neutrally.
5. Acknowledge mixed or contradictory evidence if present, rather than forcing a single conclusion.
6. Use cautious language like "Potential pattern", "Observed in X decisions", "May indicate".
7. For Confidence Calibration: Only discuss confidence if structured confidence data exists. Distinguish between confidence levels and observable expectation/outcome differences. If the sample is small (<= 3), use cautious language or state "Insufficient evidence to assess confidence calibration reliably."
8. For Decision Strengths: Describe observable decision practices (e.g., "Measurable success criteria are frequently defined before decisions"), not personality or unsupported capabilities. Avoid statements like "You consistently have the ability to...".

Please return the output STRICTLY as a JSON object matching this exact schema:
{
  "expectationAccuracySummary": "string",
  "recurringAssumptions": [
    {
      "pattern": "string",
      "observedIn": ["decisionId"]
    }
  ],
  "decisionStrengths": [
    {
      "strength": "string",
      "observedIn": ["decisionId"]
    }
  ],
  "informationGaps": [
    {
      "pattern": "string",
      "observedIn": ["decisionId"]
    }
  ],
  "confidenceCalibration": "string",
  "emergingPatterns": [
    {
      "pattern": "string",
      "observedIn": ["decisionId"]
    }
  ]
}

If there is insufficient evidence for a section, return an empty array or an appropriate "Insufficient evidence" statement.
Do not include any markdown formatting around the JSON (no \`\`\`json). Return purely the JSON string.`;

      const responseText = await generateContentWithFallback(ai, prompt, requestId);
      const cleanJson = responseText.replace(/^```json/m, '').replace(/^```/m, '').trim();
      
      const fingerprint = JSON.parse(cleanJson);

      // Validate decision IDs
      const filterValidIds = (arr: any[]) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => {
          if (!item.observedIn || !Array.isArray(item.observedIn)) return item;
          item.observedIn = item.observedIn.filter((id: string) => {
            const isValid = validIds.has(id);
            if (!isValid) console.warn(`[FINGERPRINT_VALIDATION_ERROR] requestId=${requestId} invalid ID: ${id}`);
            return isValid;
          });
          return item;
        }).filter(item => !item.observedIn || item.observedIn.length > 0);
      };

      fingerprint.recurringAssumptions = filterValidIds(fingerprint.recurringAssumptions);
      fingerprint.decisionStrengths = filterValidIds(fingerprint.decisionStrengths);
      fingerprint.informationGaps = filterValidIds(fingerprint.informationGaps);
      fingerprint.emergingPatterns = filterValidIds(fingerprint.emergingPatterns);

      res.json(fingerprint);
    } catch (error) {
      console.error('Error generating fingerprint:', error);
      res.status(500).json({ error: 'Failed to generate decision fingerprint.' });
    }
  });

  app.post('/api/circle-synthesis', async (req, res) => {
    try {
      const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      let decodedToken;
      try {
        decodedToken = await getAuth().verifyIdToken(idToken);
      } catch (authError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const uid = decodedToken.uid;
      console.log(`[SYNTHESIS_REQUEST] requestId=${requestId} endpoint=/api/circle-synthesis uid=${uid}`);

      const { allowed, retryAfter } = checkRateLimit(uid, '/api/circle-synthesis', 5);
      if (!allowed) {
        res.setHeader('Retry-After', retryAfter.toString());
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      const payload = (req.body && typeof req.body === 'object') ? req.body : {};
      const { circleId, decisionId, snapshot, perspectives } = payload;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      if (!circleId || !decisionId || !snapshot || typeof snapshot !== 'object' || !perspectives || !Array.isArray(perspectives)) {
        return res.status(400).json({ error: "Missing required fields or IDs" });
      }

      if (perspectives.length > 50) {
        return res.status(400).json({ error: 'Too many perspectives' });
      }
      for (const p of perspectives) {
        if (!p || typeof p.content !== 'string' || p.content.length > 2000) {
          return res.status(400).json({ error: 'Invalid or oversized perspective content' });
        }
      }
      
      // Authorization Check
      const db = getFirestore(undefined, 'ai-studio-qyvrin-59b0d002-89ab-43cc-bb2b-3e093475add3');
      const docRef = db.collection('circles').doc(circleId).collection('sharedDecisions').doc(decisionId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        return res.status(403).json({ error: "Unauthorized: Decision not found." });
      }
      
      if (docSnap.data()?.authorId !== uid) {
        return res.status(403).json({ error: "Unauthorized: You are not the author of this decision." });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are a Decision Synthesis Engine. Your task is to analyze a shared professional decision snapshot alongside community perspectives and produce a structured summary.

DECISION SNAPSHOT:
Title: ${snapshot.title}
Category: ${snapshot.category}
Summary: ${snapshot.decisionSummary}
Assumptions: ${JSON.stringify(snapshot.selectedAssumptions || [])}
Information Gaps: ${JSON.stringify(snapshot.selectedInformationGaps || [])}

COMMUNITY PERSPECTIVES:
${JSON.stringify(perspectives.map((p: any) => ({ id: p.id, type: p.type, content: p.content })))}

RULES:
1. You must ONLY summarize the perspectives provided. Do NOT invent new perspectives, opinions, numbers, or facts.
2. Do NOT provide financial, tax, or legal advice. Do NOT decide who is "right".
3. Every synthesized item MUST include a "supportingPerspectiveIds" array containing the exact perspective IDs that support it. Do not hallucinate IDs.
4. If there is no data for a section, return an empty array for that section.
5. Use neutral, observational language (e.g., "Several perspectives suggested...", "One member raised a risk regarding...").

Please return the output STRICTLY as a JSON object matching this schema:
{
  "keyConsiderations": [ { "text": "...", "supportingPerspectiveIds": ["id1"] } ],
  "commonRisks": [ { "text": "...", "supportingPerspectiveIds": ["id1"] } ],
  "alternativePerspectives": [ { "text": "...", "supportingPerspectiveIds": ["id1"] } ],
  "areasOfAgreement": [ { "text": "...", "supportingPerspectiveIds": ["id1", "id2"] } ],
  "areasOfDisagreement": [ { "text": "...", "supportingPerspectiveIds": ["id1", "id3"] } ],
  "questionsWorthExploring": [ { "text": "...", "supportingPerspectiveIds": ["id1"] } ]
}
Do not include any markdown formatting around the JSON (no \`\`\`json). Return purely the JSON string.`;

      const responseText = await generateContentWithFallback(ai, prompt, requestId);
      const cleanJson = responseText.replace(/^```json/m, '').replace(/^```/m, '').trim();
      const jsonMatch = JSON.parse(cleanJson);

      // Validate IDs server-side
      const validIds = new Set(perspectives.map((p: any) => p.id));
      const cleanSection = (section: any) => {
        if (!Array.isArray(section)) return [];
        return section.map((item: any) => ({
          text: item.text,
          supportingPerspectiveIds: (item.supportingPerspectiveIds || []).filter((id: string) => {
            const isValid = validIds.has(id);
            if (!isValid) console.warn(`[SYNTHESIS_VALIDATION_ERROR] requestId=${requestId} invalid ID: ${id}`);
            return isValid;
          })
        })).filter((item: any) => item.supportingPerspectiveIds.length > 0 || item.text);
      };

      const result = {
        keyConsiderations: cleanSection(jsonMatch.keyConsiderations),
        commonRisks: cleanSection(jsonMatch.commonRisks),
        alternativePerspectives: cleanSection(jsonMatch.alternativePerspectives),
        areasOfAgreement: cleanSection(jsonMatch.areasOfAgreement),
        areasOfDisagreement: cleanSection(jsonMatch.areasOfDisagreement),
        questionsWorthExploring: cleanSection(jsonMatch.questionsWorthExploring)
      };

      res.json(result);
    } catch (error) {
      console.error('Error generating synthesis:', error);
      res.status(500).json({ error: 'Failed to generate synthesis.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
