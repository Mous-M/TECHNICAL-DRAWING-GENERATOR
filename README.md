TECHNICAL DRAWING GENERATOR — QUICK START

PROJECT CONTENTS
- frontend/index.html: application page
- frontend/style.css: layout and visual styling
- frontend/app.js: drawing engine, commands, colour palette, 3D preview, save/export/print
- backend/server.js: Express server and POST /api/ai endpoint
- package.json: Node dependencies and start script
- .env.example: safe template for AI settings

REQUIREMENTS
- Node.js 18 or newer
- Internet access for AI-provider requests
- A valid API key for the configured AI provider if you want model-powered AI

SETUP
1. Open a terminal in the project root folder (the folder containing package.json).
2. Run: npm install
3. Copy .env.example to .env.
4. Open .env and replace put_your_api_key_here with your own API key. Do not share or publish .env.
5. Run: npm start
6. Open http://localhost:3000 in your browser.
7. Visit http://localhost:3000/api/health to confirm whether the backend and AI key are configured.

AI CONNECTION — IMPORTANT
The frontend calls POST /api/ai. The backend now implements that route and reports a real configuration error instead of pretending the AI worked. If OPENAI_API_KEY is missing or invalid, the AI model cannot respond. Basic drafting still works, and requests for a complete house plan can fall back to a deterministic local sample plan; the assistant labels this as offline mode rather than claiming the AI generated it.

SAFETY / ENGINEERING NOTE
Generated plans are demonstration drafts, not approved construction documents. Verify dimensions, building regulations, structural design, electrical layouts, plumbing, accessibility and local code requirements with qualified professionals before construction.
