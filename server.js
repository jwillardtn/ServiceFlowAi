const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch(e) {}

const HTML = require('./html.js');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'sf-secret-dev',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// ── In-memory store ──
const users = new Map();
const businesses = new Map();
const leads = new Map();

(async () => {
  const hash = await bcrypt.hash('demo1234', 10);
  users.set('demo@serviceflow.ai', { id:'u1', email:'demo@serviceflow.ai', password:hash, name:'John Davis', businessId:'b1' });
  businesses.set('b1', {
    id:'b1', name:'City HVAC Co.', phone:'+18135550100', industry:'HVAC',
    serviceArea:'Tampa Bay, FL', plan:'Growth',
    description:'Residential and commercial HVAC services in Tampa Bay. Same-day emergency repairs, AC installation, heating, and maintenance. Licensed and insured.',
    aiName:'Sarah', googleCalendarConnected:false, twilioConnected:false,
    settings:{ missedCallTextback:true, autoBooking:true, leadQualification:true, reviewRequests:true, afterHoursMode:true, urgentAlerts:true }
  });
  [
    {id:'l1',name:'Mike Reynolds',phone:'(813) 555-2847',service:'HVAC Emergency',status:'urgent',source:'Missed Call',createdAt:new Date(Date.now()-5*60000).toISOString()},
    {id:'l2',name:'Sarah Torres',phone:'(813) 555-9182',service:'Plumbing Repair',status:'booked',source:'Website Chat',createdAt:new Date(Date.now()-10*60000).toISOString()},
    {id:'l3',name:'Lisa Park',phone:'(813) 555-6621',service:'Electrical Quote',status:'new',source:'Website Chat',createdAt:new Date(Date.now()-15*60000).toISOString()},
    {id:'l4',name:'Dave Kim',phone:'(813) 555-3344',service:'Roof Inspection',status:'sent',source:'Missed Call',createdAt:new Date(Date.now()-20*60000).toISOString()},
    {id:'l5',name:'Tom Henderson',phone:'(813) 555-7781',service:'AC Maintenance',status:'booked',source:'Text-back',createdAt:new Date(Date.now()-30*60000).toISOString()},
    {id:'l6',name:'Rosa Alvarez',phone:'(813) 555-8832',service:'Drain Cleaning',status:'booked',source:'Website Chat',createdAt:new Date(Date.now()-60*60000).toISOString()},
  ].forEach(l => leads.set(l.id, {...l, businessId:'b1'}));
})();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error:'Unauthorized' });
  next();
}
function getBusiness(req) {
  const user = users.get(req.session.email);
  return user ? businesses.get(user.businessId) : null;
}

// ── AUTH ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.get(email?.toLowerCase());
  if (!user) return res.status(401).json({ error:'Invalid email or password' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error:'Invalid email or password' });
  req.session.userId = user.id;
  req.session.email = user.email;
  res.json({ success:true, user:{ id:user.id, name:user.name, email:user.email } });
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, businessName } = req.body;
  if (users.has(email?.toLowerCase())) return res.status(400).json({ error:'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const userId = 'u_'+Date.now(), bizId = 'b_'+Date.now();
  users.set(email.toLowerCase(), { id:userId, email:email.toLowerCase(), password:hash, name, businessId:bizId });
  businesses.set(bizId, { id:bizId, name:businessName||name+"'s Business", industry:'HVAC', phone:'', serviceArea:'', description:'', aiName:'AI Assistant', plan:'Starter', googleCalendarConnected:false, twilioConnected:false, settings:{ missedCallTextback:true, autoBooking:true, leadQualification:true, reviewRequests:false, afterHoursMode:true, urgentAlerts:true } });
  req.session.userId = userId;
  req.session.email = email.toLowerCase();
  res.json({ success:true });
});

app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ success:true }); });

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const biz = businesses.get(user?.businessId);
  res.json({ user:{ id:user.id, name:user.name, email:user.email }, business:biz });
});

// ── LEADS ──
app.get('/api/leads', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  res.json([...leads.values()].filter(l=>l.businessId===user.businessId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)));
});
app.post('/api/leads', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const lead = { id:'l_'+Date.now(), ...req.body, businessId:user.businessId, createdAt:new Date().toISOString(), status:'new' };
  leads.set(lead.id, lead); res.json(lead);
});
app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error:'Not found' });
  const updated = {...lead,...req.body}; leads.set(lead.id, updated); res.json(updated);
});
app.delete('/api/leads/:id', requireAuth, (req, res) => { leads.delete(req.params.id); res.json({ success:true }); });

// ── AI CHAT ──
app.post('/api/chat', requireAuth, async (req, res) => {
  if (!Anthropic || !process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error:'Add ANTHROPIC_API_KEY to Railway variables.' });
  const { messages, leadContext } = req.body;
  const biz = getBusiness(req);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model:'claude-sonnet-4-20250514', max_tokens:400,
      system:'You are ' + (biz&&biz.aiName||'Sarah') + ', AI receptionist for ' + (biz&&biz.name||'the business') + '. Be warm, professional, concise (2-3 sentences). Always end with a question or next step.' + (leadContext?' Context: '+leadContext:''),
      messages: messages.slice(-10)
    });
    res.json({ reply: response.content[0].text });
  } catch(e) { res.status(500).json({ error:'AI error', details:e.message }); }
});

// ── BUSINESS ──
app.get('/api/business', requireAuth, (req, res) => {
  const biz = getBusiness(req);
  if (!biz) return res.status(404).json({ error:'Not found' });
  const { googleTokens, ...safe } = biz; res.json(safe);
});
app.patch('/api/business', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const biz = businesses.get(user.businessId);
  const updated = {...biz,...req.body}; businesses.set(biz.id, updated);
  const { googleTokens, ...safe } = updated; res.json(safe);
});

// ── TWILIO ──
app.get('/api/twilio/status', requireAuth, (req, res) => {
  res.json({ connected:!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) });
});

// ── ANALYTICS ──
app.get('/api/analytics', requireAuth, (req, res) => {
  const user = users.get(req.session.email);
  const bizLeads = [...leads.values()].filter(l=>l.businessId===user.businessId);
  res.json({ total:bizLeads.length, responseRate:98, avgResponseSeconds:28 });
});

// ── CALENDAR ──
app.get('/api/calendar/connect', requireAuth, (req, res) => {
  res.json({ error:'Add GOOGLE_CLIENT_ID to Railway variables to enable Google Calendar.' });
});

// ── SERVE APP ──
app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error:'Not found' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('ServiceFlow AI running on port', PORT);
});
