# ServiceFlow AI — Product Dashboard

## Quick Start (5 minutes)

### 1. Install dependencies
```bash
cd serviceflow
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Open .env and add your API keys
```

### 3. Run the server
```bash
npm start
# → http://localhost:3000
```

### 4. Demo login
```
Email:    demo@serviceflow.ai
Password: demo1234
```

---

## Integration Setup

### Anthropic API (AI Chat — Required)
1. Go to https://console.anthropic.com
2. Create an API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

### Google Calendar (Optional)
1. Go to https://console.cloud.google.com
2. Create a new project → Enable "Google Calendar API"
3. Create OAuth2 credentials
4. Add redirect URI: `http://localhost:3000/api/calendar/callback`
5. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. Click "Connect" in Settings → Integrations

### Twilio SMS Missed Call Text-Back (Optional)
1. Sign up free at https://twilio.com
2. Get Account SID + Auth Token from console
3. Buy a phone number (~$1/mo)
4. Add to `.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_PHONE_NUMBER=+18135550100
   ```
5. In Twilio console, set your number's webhook:
   - "A call comes in" → `https://your-domain.com/api/twilio/missed-call`

---

## Deploy to Production

### Render (free tier)
1. Push to GitHub
2. Create new Web Service at render.com
3. Add environment variables in Render dashboard
4. Deploy

### Railway
```bash
npm install -g railway
railway login
railway init
railway up
```

### Heroku
```bash
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY=sk-ant-...
git push heroku main
```

---

## File Structure
```
serviceflow/
├── server.js          # Backend API (Express)
├── package.json       # Dependencies
├── .env.example       # Environment template
├── README.md          # This file
└── public/
    └── index.html     # Frontend dashboard
```
