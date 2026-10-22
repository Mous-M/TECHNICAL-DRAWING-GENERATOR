'use strict';

// Technical Drawing Generator backend.
// Node.js 18+ required (built-in fetch is used).
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_DIR = path.resolve(__dirname, '../frontend');
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use(express.static(FRONTEND_DIR, { extensions: ['html'] }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'Technical Drawing Generator API',
    aiConfigured: Boolean(API_KEY),
    model: MODEL,
    message: API_KEY ? 'Backend is running and an AI key is configured.' : 'Backend is running, but OPENAI_API_KEY is missing.'
  });
});

function extractJson(text) {
  const cleaned = String(text || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try { return JSON.parse(cleaned); } catch (_) {}
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch (_) {}
  }
  return null;
}

app.post('/api/ai', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ error: 'Enter a prompt for the AI assistant.' });
  if (!API_KEY) {
    return res.status(503).json({
      error: 'The backend is running, but OPENAI_API_KEY is not configured. Add your API key to the project .env file, then restart the server.'
    });
  }

  const currentDrawing = req.body?.drawing && typeof req.body.drawing === 'object' ? req.body.drawing : {};
  const systemPrompt = `You are the AI assistant inside Technical Drawing Generator, a 2D architectural drafting application. Help with building plans and technical drawing tasks. Return ONLY one valid JSON object with these keys: reply (short plain-language message), drawing (optional complete drawing object), command (optional one supported command string), commands (optional array of supported command strings). Do not claim that drawing changes were made unless you return drawing/command/commands. If the user requests a full floor plan, return a complete drawing object with arrays named walls, doors, windows, rooms, furniture, kitchen, bathroom, columns, electrical, and dimensions. Preserve the app's schema: walls use x1,y1,x2,y2,thickness,layer,color; doors/windows refer to wallIndex integer (never JavaScript object references), and use t,width,type,opening,swing,color; rooms use x,y,width,height,name,type,color; furniture/fixtures use type,x,y,width,depth,rotation,color; dimensions use start,end,value,text,color. All drawing coordinates are screen-space pixels; dimensions and widths are millimetres. Use distinct clear colors by feature type. If you cannot safely make a requested edit, explain in reply and do not invent data. Current project name: ${String(req.body?.projectName || 'Untitled').slice(0,120)}.`;

  try {
    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Current drawing JSON (for context):\n${JSON.stringify(currentDrawing).slice(0, 100000)}\n\nUser request: ${prompt}` }
        ]
      }),
      signal: AbortSignal.timeout(60000)
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = payload?.error?.message || `AI provider returned HTTP ${upstream.status}.`;
      const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status === 429 ? 429 : 502;
      return res.status(status).json({ error: `AI provider error: ${providerMessage}` });
    }
    const content = payload?.choices?.[0]?.message?.content;
    const result = extractJson(content);
    if (!result || typeof result !== 'object') {
      return res.status(502).json({ error: 'The AI provider replied, but its response was not valid drawing JSON. Please retry with a more specific request.' });
    }
    if (result.drawing && typeof result.drawing === 'object') {
      // The frontend's restoreDrawing() expects wallIndex and reconnects
      // each door/window to the canonical wall object after loading.
      const walls = Array.isArray(result.drawing.walls) ? result.drawing.walls : [];
      for (const group of ['doors', 'windows']) {
        if (!Array.isArray(result.drawing[group])) continue;
        result.drawing[group] = result.drawing[group].map(opening => {
          const copy = { ...opening };
          if (!Number.isInteger(copy.wallIndex) && copy.wall && typeof copy.wall === 'object') {
            copy.wallIndex = walls.findIndex(w =>
              w.x1 === copy.wall.x1 && w.y1 === copy.wall.y1 &&
              w.x2 === copy.wall.x2 && w.y2 === copy.wall.y2
            );
          }
          delete copy.wall;
          if (!Number.isInteger(copy.wallIndex) || copy.wallIndex < 0) copy.wallIndex = 0;
          return copy;
        });
      }
    }
    return res.json({
      reply: String(result.reply || 'AI response received. Review the drawing before using it for construction.'),
      ...(result.drawing ? { drawing: result.drawing } : {}),
      ...(result.command ? { command: result.command } : {}),
      ...(Array.isArray(result.commands) ? { commands: result.commands } : {})
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
    return res.status(502).json({ error: timedOut ? 'The AI provider timed out. Try again or use the local drawing tools.' : `Could not contact the AI provider: ${error.message}` });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[TDG backend]', err);
  res.status(500).json({ error: 'The backend encountered an internal error. Check the terminal for details.' });
});

app.listen(PORT, () => {
  console.log(`Technical Drawing Generator: http://localhost:${PORT}`);
  console.log(`AI status: ${API_KEY ? `configured (${MODEL})` : 'NOT CONFIGURED — add OPENAI_API_KEY to .env'}`);
});
