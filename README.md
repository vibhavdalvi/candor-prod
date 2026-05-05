# Candor — AI Qualitative Research Tool

AI-powered interviews that replace static forms. Participants have a real conversation with an AI interviewer. You get a structured data dashboard.

## Stack

- **Frontend:** React (Create React App)
- **Backend:** Express.js + Node.js
- **Database:** MongoDB (Mongoose)
- **AI:** Anthropic Claude Sonnet 4.5
- **Auth:** JWT

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cd server
cp .env.example .env
# Edit .env with your values
```

Required values in `server/.env`:
```
MONGODB_URI=mongodb://localhost:27017/candor
JWT_SECRET=your_secret_key_here
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLIENT_URL=http://localhost:3000
```

### 3. Start MongoDB

```bash
mongod
# or with Homebrew: brew services start mongodb-community
```

### 4. Run development servers

```bash
npm run dev
```

This starts:
- Server on `http://localhost:5000`
- Client on `http://localhost:3000`

## Project Structure

Imports use absolute paths from `src/` via `client/jsconfig.json` (`baseUrl: "src"`), e.g. `import App from 'app/App'`, `import api from 'shared/api'`.

```
candor/
├── server/
│   ├── constants/   Shared enums & helpers (e.g. survey mode labels)
│   ├── models/      Mongoose schemas (User, Survey, Interview)
│   ├── routes/      Express routers (auth, surveys, interviews, ai)
│   ├── middleware/  JWT auth
│   └── lib/         AI (buildSystem, synthesis, sentinel)
├── client/
│   ├── jsconfig.json  baseUrl: src — absolute imports
│   └── src/
│       ├── app/           App shell, router, ProtectedRoute
│       ├── features/      Domain-oriented UI
│       │   ├── auth/      Login, Signup
│       │   ├── marketing/ Landing
│       │   ├── researcher/ Dashboard, NewSurvey, Share, Results
│       │   └── participant/ Interview (public link flow)
│       ├── components/    Shared UI (layouts/ResearcherLayout)
│       ├── shared/        api, theme, modes (cross-feature config)
│       └── store/         Zustand (auth)
└── package.json           concurrently dev script
```

## API Routes

### Auth
- `POST /api/auth/signup` — create account
- `POST /api/auth/login` — get JWT
- `GET  /api/auth/me` — current user (protected)

### Surveys (protected)
- `GET  /api/surveys` — list your surveys
- `POST /api/surveys` — create survey
- `GET  /api/surveys/:id` — get survey + interviews
- `POST /api/surveys/:id/synthesise` — trigger AI synthesis
- `POST /api/surveys/:id/interviews` — create new interview slot
- `GET  /api/surveys/:id/export/json` — download JSON
- `GET  /api/surveys/:id/export/excel` — download Excel

### Interviews (public — participant facing)
- `GET  /api/interviews/:token` — load interview by token
- `POST /api/interviews/:token/profile` — save participant profile
- `POST /api/interviews/:token/message` — send message, get AI reply

### AI (protected)
- `POST /api/ai/suggest` — get AI-suggested survey parameters

## Survey modes (6)

When you create a survey, you choose **one** mode. Each mode uses different setup fields, participant profile prompts, and AI research goals (see `client/src/shared/modes.js` and `server/lib/buildSystem.js`).

| Mode | Internal key | Best for |
|------|----------------|----------|
| **Idea Validation** | `founder` | Startup / product discovery — pain, frequency, workarounds, WTP signals without asking directly. |
| **Academic Research** | `researcher` | Neutral qualitative interviews — thematic depth, lived experience, no leading toward a hypothesis. |
| **Product Feedback** | `product` | How users feel about a product or feature — delight, friction, churn signals. |
| **Event Feedback** | `event` | Fresh reactions after talks, workshops, conferences — often shared via QR. |
| **Team Pulse** | `hr` | Anonymous team morale / blockers — psychological safety, deeper than a rating scale. |
| **Customer Satisfaction** | `csat` | Post-purchase or post-service — expectation vs reality, loyalty and referral signals. |

Landing page and **New survey** flow expose all six. The API accepts `mode` as one of: `founder`, `researcher`, `product`, `event`, `hr`, `csat` (see `POST /api/surveys` and `server/constants/surveyModes.js`).

## The AI Interview

The system prompt uses motivational interviewing psychology:
- Elicit, never ask directly
- Read subtext in every response
- Ladder technique (surface → consequences → emotions)
- Follow the energy
- Mirror and stay
- Handle deflection, vague answers, short answers
- Track mandatory questions and ensure coverage

Signals used in the protocol:
- `START` → AI greets and asks first question
- `[AT_LIMIT]` → AI has reached question limit but keeps going until mandatory questions are covered
- `[DONE]` → AI signals it's ready to close (prefix stripped before sending to client)
- `[CLARIFY]` → AI is probing, doesn't count against question limit

## Dashboard

The results page generates:
1. Study overview stats
2. Signal distribution chart (SVG)
3. Theme frequency chart (SVG, hover for quotes)
4. Verbatim quotes grid
5. Response depth scatter plot (SVG)
6. Question coverage table (per custom question)
7. Key findings grid with confidence levels
8. Participant table with transcript viewer
9. Sentinel alerts (patterns detected mid-study)

Download as PDF (window.print) or PNG (html-to-image).
