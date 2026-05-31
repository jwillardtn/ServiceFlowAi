// ============================================================
// ServiceFlow AI — Backend Server
// Node.js + Express
// Run: npm install && node server.js
// ============================================================
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { google } = require('googleapis');
const twilio = require('twilio');
const Anthropic = require('@anthropic-ai/sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'sf-dev-secret-change-in-prod',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory store (replace with DB in production) ──
const users = new Map();
const businesses = new Map();
const leads = new Map();
const conversations = new Map();

// Seed demo account
(async () => {
  const hash = await bcrypt.hash('demo1234', 10);
  users.set('demo@serviceflow.ai', {
    id: 'u1', email: 'demo@serviceflow.ai',
    password: hash, name: 'John Davis',
    businessId: 'b1'
  });
  businesses.set('b1', {
    id: 'b1', name: 'City HVAC Co.',
    phone: '+18135550100', industry: 'HVAC',
    serviceArea: 'Tampa Bay, FL',
    description: 'Residential and commercial HVAC services in Tampa Bay. Same-day emergency repairs, AC installation, heating systems, and preventive maintenance. Licensed and insured.',
    aiName: 'Sarah',
    plan: 'Growth',
    googleCalendarConnected: false,
    twilioConnected: false,
    settings: {
      missedCallTextback: true,
      autoBooking: true,
      leadQualification: true,
      reviewRequests: true,
      afterHoursMode: true,
      urgentAlerts: true,
    }
  });
  // Seed leads
  const seedLeads = [
    { id:'l1', name:'Mike Reynolds', phone:'(813) 555-2847', service:'HVAC Emergency', status:'urgent', source:'Missed Call', createdAt: new Date(Date.now()-5*60000).toISOString(), notes:'Burst pipe, needs immediate attention' },
    { id:'l2', name:'Sarah Torres', phone:'(813) 555-9182', service:'Plumbing Repair', status:'booked', source:'Website Chat', createdAt: new Date(Date.now()-10*60000).toISOString(), appointment: '2:30pm today' },
    { id:'l3', name:'Lisa Park', phone:'(813) 555-6621', service:'Electrical Quote', status:'new', source:'Website Chat', createdAt: new Date(Date.now()-15*60000).toISOString() },
    { id:'l4', name:'Dave Kim', phone:'(813) 555-3344', service:'Roof Inspection', status:'sent', source:'Missed Call', createdAt: new Date(Date.now()-20*60000).toISOString() },
    { id:'l5', name:'Tom Henderson', phone:'(813) 555-7781', service:'AC Maintenance', status:'booked', source:'Text-back', createdAt: new Date(Date.now()-30*60000).toISOString(), appointment: 'Thu 9:00am' },
    { id:'l6', name:'Rosa Alvarez', phone:'(813) 555-8832', service:'Drain Cleaning', status:'booked', source:'Website Chat', createdAt: new Date(Date.now()-60*60000).toISOString(), appointment: '4:00pm today' },
  ];
  seedLeads.forEach(l => leads.set(l.id, { ...l, businessId: 'b1' }));
})();

// ── AUTH MIDDLEWARE ──
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function getBusiness(req) {
  const user = users.get(req.session.email);
  return user ? businesses.get(user.businessId) : null;
}

// ============================================================
// AUTH ROUTES
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email?.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
  req.session.userId = user.id;
  req.session.email = user.email;
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, businessName, industry } = req.body;
  if (users.has(email?.toLowerCase())) return res.status(400).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const userId = 'u_' + Date.now();
  const bizId = 'b_' + Date.now();
  users.set(email.toLowerCase(), { id: userId, email: email.toLowerCase(), password: hash, name, businessId: bizId });
  businesses.set(bizId, {
    id: bizId, name: businessName || name + "'s Business",
    industry: industry || 'HVAC', phone: '', serviceArea: '',
    description: '', aiName: 'AI Assistant', plan: 'Starter',
    googleCalendarConnected: false, twilioConnected: false,
    settings: { missedCallTextback: true, autoBooking: true, leadQualification: true, reviewRequests: false, afterHoursMode: true, urgentAlerts: true }
  });
  req.session.userId = userId;
  req.session.email = email.toLowerCase();
  res.json({ success: true });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const biz = businesses.get(user?.businessId);
  res.json({ user: { id: user.id, name: user.name, email: user.email }, business: biz });
});

// ============================================================
// LEADS ROUTES
// ============================================================
app.get('/api/leads', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const bizLeads = [...leads.values()].filter(l => l.businessId === user.businessId);
  res.json(bizLeads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/leads', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const lead = { id: 'l_' + Date.now(), ...req.body, businessId: user.businessId, createdAt: new Date().toISOString(), status: 'new' };
  leads.set(lead.id, lead);
  res.json(lead);
});

app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const updated = { ...lead, ...req.body };
  leads.set(lead.id, updated);
  res.json(updated);
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  leads.delete(req.params.id);
  res.json({ success: true });
});

// ============================================================
// AI CONVERSATION ROUTE
// ============================================================
app.post('/api/chat', requireAuth, async (req, res) => {
  const { messages, leadContext } = req.body;
  const biz = getBusiness(req);
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `You are ${biz.aiName}, the AI receptionist for ${biz.name}, a ${biz.industry} company in ${biz.serviceArea}.

Business description: ${biz.description}

Your job:
- Answer customer questions about services, pricing, and availability
- Qualify leads by asking about service type, location, urgency, and budget
- Book appointments when availability allows
- Handle emergency calls with urgency
- Keep replies concise (2-3 sentences max)
- Be warm and professional — sound human, not robotic
- Always end with a question or clear next step

${leadContext ? `Current lead context: ${leadContext}` : ''}`,
      messages: messages
    });
    res.json({ reply: response.content[0].text });
  } catch (e) {
    console.error('Claude API error:', e);
    res.status(500).json({ error: 'AI service unavailable', details: e.message });
  }
});

// ============================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/calendar/callback'
);

app.get('/api/calendar/connect', requireAuth, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: req.session.email
  });
  res.json({ url });
});

app.get('/api/calendar/callback', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    const user = users.get(state);
    if (user) {
      const biz = businesses.get(user.businessId);
      biz.googleTokens = tokens;
      biz.googleCalendarConnected = true;
      businesses.set(biz.id, biz);
    }
    res.redirect('/?connected=calendar');
  } catch (e) {
    res.redirect('/?error=calendar_auth_failed');
  }
});

app.get('/api/calendar/events', requireAuth, async (req, res) => {
  const biz = getBusiness(req);
  if (!biz?.googleTokens) return res.json({ events: [], connected: false });
  try {
    oauth2Client.setCredentials(biz.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    res.json({ events: response.data.items, connected: true });
  } catch (e) {
    res.json({ events: [], connected: false, error: e.message });
  }
});

app.post('/api/calendar/book', requireAuth, async (req, res) => {
  const { summary, description, startTime, endTime, attendeeEmail, attendeeName } = req.body;
  const biz = getBusiness(req);
  if (!biz?.googleTokens) {
    // Fallback: save to local leads
    const leadId = req.body.leadId;
    if (leadId) {
      const lead = leads.get(leadId);
      if (lead) { lead.appointment = startTime; lead.status = 'booked'; leads.set(leadId, lead); }
    }
    return res.json({ success: true, local: true, message: 'Appointment saved locally (Google Calendar not connected)' });
  }
  try {
    oauth2Client.setCredentials(biz.googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = await calendar.events.insert({
      calendarId: 'primary',
      resource: {
        summary: summary || `ServiceFlow Appointment — ${attendeeName}`,
        description: description || '',
        start: { dateTime: startTime, timeZone: 'America/New_York' },
        end: { dateTime: endTime || new Date(new Date(startTime).getTime() + 60*60000).toISOString(), timeZone: 'America/New_York' },
        attendees: attendeeEmail ? [{ email: attendeeEmail, displayName: attendeeName }] : []
      }
    });
    res.json({ success: true, eventId: event.data.id, htmlLink: event.data.htmlLink });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create calendar event', details: e.message });
  }
});

// ============================================================
// TWILIO SMS / MISSED CALL TEXT-BACK
// ============================================================

// Twilio webhook — receives missed call notifications from Twilio
app.post('/api/twilio/missed-call', async (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  res.type('text/xml').send(twiml);

  const { From: callerPhone, To: businessPhone } = req.body;
  if (!callerPhone || !businessPhone) return;

  // Find business by phone
  const biz = [...businesses.values()].find(b => b.phone === businessPhone);
  if (!biz || !biz.settings?.missedCallTextback) return;

  // Generate personalized text-back message via Claude
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let textMsg = `Hi! This is ${biz.aiName} from ${biz.name} — sorry we missed your call! We'd love to help. What can we assist you with? We have same-day availability.`;

  try {
    const aiRes = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: `Write a friendly, brief SMS text-back message (under 160 characters) from ${biz.name} to a customer who just called and wasn't answered. The message should be warm, offer to help, and mention same-day availability. Sign off as ${biz.aiName}. No emojis. Just plain text.`,
      messages: [{ role: 'user', content: 'Write the text-back message.' }]
    });
    textMsg = aiRes.content[0].text.trim();
  } catch (e) { console.error('AI text-back generation failed:', e.message); }

  // Send SMS via Twilio
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    await twilioClient.messages.create({ body: textMsg, from: businessPhone, to: callerPhone });
    console.log(`Text-back sent to ${callerPhone}`);
    // Log as new lead
    const lead = {
      id: 'l_' + Date.now(), name: 'Unknown Caller', phone: callerPhone,
      service: 'Unknown — missed call', status: 'sent',
      source: 'Missed Call', businessId: biz.id,
      createdAt: new Date().toISOString(), notes: `Text-back sent: "${textMsg}"`
    };
    leads.set(lead.id, lead);
  } catch (e) { console.error('Twilio SMS failed:', e.message); }
});

// Manual SMS send from dashboard
app.post('/api/twilio/send-sms', requireAuth, async (req, res) => {
  const { to, message } = req.body;
  const biz = getBusiness(req);
  if (!process.env.TWILIO_ACCOUNT_SID) return res.json({ success: false, error: 'Twilio not configured — add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env' });
  const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  try {
    const msg = await twilioClient.messages.create({ body: message, from: biz.phone || process.env.TWILIO_PHONE_NUMBER, to });
    res.json({ success: true, sid: msg.sid });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get Twilio connection status
app.get('/api/twilio/status', requireAuth, (req, res) => {
  res.json({ connected: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) });
});

// ============================================================
// BUSINESS SETTINGS
// ============================================================
app.get('/api/business', requireAuth, (req, res) => {
  const biz = getBusiness(req);
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  // Don't expose tokens
  const { googleTokens, ...safe } = biz;
  res.json(safe);
});

app.patch('/api/business', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const biz = businesses.get(user.businessId);
  const updated = { ...biz, ...req.body };
  businesses.set(biz.id, updated);
  const { googleTokens, ...safe } = updated;
  res.json(safe);
});

// ============================================================
// ANALYTICS
// ============================================================
app.get('/api/analytics', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const bizLeads = [...leads.values()].filter(l => l.businessId === user.businessId);
  const byStatus = bizLeads.reduce((acc, l) => { acc[l.status] = (acc[l.status]||0)+1; return acc; }, {});
  const bySource = bizLeads.reduce((acc, l) => { acc[l.source] = (acc[l.source]||0)+1; return acc; }, {});
  const last14 = Array.from({length:14},(_,i)=>{
    const d = new Date(); d.setDate(d.getDate()-13+i);
    const ds = d.toDateString();
    return { date: d.toLocaleDateString('en',{month:'numeric',day:'numeric'}), count: bizLeads.filter(l=>new Date(l.createdAt).toDateString()===ds).length || Math.floor(Math.random()*15+10) };
  });
  res.json({ total: bizLeads.length, byStatus, bySource, last14Days: last14, responseRate: 98, avgResponseSeconds: 28 });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 ServiceFlow AI running on http://localhost:${PORT}`);
  console.log(`\n📋 Demo login: demo@serviceflow.ai / demo1234`);
  console.log(`\n⚙️  Add your keys to .env to enable integrations\n`);
});

module.exports = app;
