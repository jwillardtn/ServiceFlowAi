const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let Anthropic;
try { Anthropic = require('@anthropic-ai/sdk'); } catch(e) {}

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'sf-secret-dev',
  resave: false, saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ServiceFlow AI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
/* ── RESET & BASE ── */
:root {
  --blue:#1847F0; --blue-lt:#EEF2FF; --blue-dk:#1240D8;
  --ink:#0F1117; --ink2:#1C2333;
  --white:#FFFFFF; --off:#F7F8FA; --off2:#EDEEF2;
  --muted:#6C7280; --muted2:#9CA3AF;
  --border:#E5E7EB; --border2:#D1D5DB;
  --success:#10B981; --warn:#F59E0B; --danger:#EF4444;
  --sidebar:240px; --topbar:56px;
  --serif:'Instrument Serif',Georgia,serif;
  --sans:'Inter',system-ui,sans-serif;
  --r-sm:6px; --r-md:10px; --r-lg:14px; --r-xl:18px;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body{height:100%;overflow:hidden;}
body{font-family:var(--sans);font-size:14px;line-height:1.5;background:var(--off);color:var(--ink);-webkit-font-smoothing:antialiased;}
button,input,select,textarea{font-family:var(--sans);}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}

/* ══════════════════════════════════════
   AUTH SCREEN
══════════════════════════════════════ */
#auth-screen {
  position:fixed;inset:0;background:var(--off);
  display:flex;align-items:center;justify-content:center;z-index:999;
}
.auth-box {
  background:var(--white);border:1px solid var(--border);border-radius:var(--r-xl);
  padding:40px;width:400px;box-shadow:0 4px 24px rgba(0,0,0,0.06);
}
.auth-logo {
  display:flex;align-items:center;gap:8px;margin-bottom:32px;
  font-size:17px;font-weight:600;color:var(--ink);letter-spacing:-0.3px;
}
.auth-dot{width:9px;height:9px;border-radius:50%;background:var(--blue);animation:breathe 3s ease-in-out infinite;}
@keyframes breathe{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.6);opacity:0.5;}}
.auth-title{font-family:var(--serif);font-size:26px;color:var(--ink);letter-spacing:-0.5px;margin-bottom:6px;}
.auth-sub{font-size:13px;color:var(--muted);font-weight:300;margin-bottom:28px;}
.auth-tab-row{display:flex;gap:0;margin-bottom:24px;border-bottom:1px solid var(--border);}
.auth-tab{padding:8px 0;font-size:13px;font-weight:500;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;margin-right:24px;transition:all 0.15s;}
.auth-tab.active{color:var(--blue);border-bottom-color:var(--blue);}
.auth-field{margin-bottom:16px;}
.auth-label{font-size:12px;font-weight:500;color:var(--ink);margin-bottom:5px;display:block;}
.auth-input{width:100%;padding:10px 13px;border:1px solid var(--border);border-radius:var(--r-md);font-size:14px;color:var(--ink);background:var(--white);outline:none;transition:border-color 0.15s;}
.auth-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(24,71,240,0.08);}
.auth-btn{width:100%;padding:11px;background:var(--ink);color:#fff;border:none;border-radius:var(--r-md);font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s;margin-top:4px;}
.auth-btn:hover{background:var(--blue);}
.auth-error{background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);color:var(--danger);font-size:12px;padding:9px 12px;border-radius:var(--r-md);margin-bottom:14px;display:none;}
.auth-divider{text-align:center;font-size:12px;color:var(--muted2);margin:16px 0;position:relative;}
.auth-divider::before{content:'';position:absolute;top:50%;left:0;right:0;height:1px;background:var(--border);}
.auth-divider span{background:var(--white);padding:0 10px;position:relative;}
.demo-hint{background:var(--blue-lt);border:1px solid rgba(24,71,240,0.15);border-radius:var(--r-md);padding:10px 14px;font-size:12px;color:var(--blue);margin-top:16px;}
.demo-hint strong{font-weight:600;}

/* ══════════════════════════════════════
   APP LAYOUT
══════════════════════════════════════ */
#app{display:none;flex-direction:column;height:100%;}
#app.visible{display:flex;}

/* ── TOPBAR ── */
.topbar{
  height:var(--topbar);background:var(--white);border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;flex-shrink:0;z-index:50;
}
.topbar-logo{font-size:16px;font-weight:600;color:var(--ink);letter-spacing:-0.3px;display:flex;align-items:center;gap:8px;}
.logo-dot{width:8px;height:8px;border-radius:50%;background:var(--blue);animation:breathe 3s ease-in-out infinite;}
.topbar-center{display:flex;align-items:center;gap:8px;}
.tb-status{display:flex;align-items:center;gap:6px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:100px;padding:4px 12px;}
.tb-status-dot{width:6px;height:6px;border-radius:50%;background:var(--success);animation:breathe 2s ease-in-out infinite;}
.tb-status-text{font-size:12px;font-weight:500;color:var(--success);}
.topbar-right{display:flex;align-items:center;gap:8px;}
.tb-icon-btn{width:32px;height:32px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--white);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;transition:all 0.15s;position:relative;}
.tb-icon-btn:hover{background:var(--off);}
.tb-badge-dot{position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;background:var(--danger);border:1.5px solid var(--white);}
.tb-avatar{width:32px;height:32px;border-radius:50%;background:var(--blue-lt);border:1px solid rgba(24,71,240,0.2);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--blue);cursor:pointer;}

/* ── BODY ── */
.app-body{display:flex;flex:1;overflow:hidden;}

/* ── SIDEBAR ── */
.sidebar{
  width:var(--sidebar);background:var(--white);border-right:1px solid var(--border);
  display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;
}
.sb-group{padding:12px 10px 4px;}
.sb-group-label{font-size:10px;font-weight:600;color:var(--muted2);letter-spacing:1.2px;text-transform:uppercase;padding:0 8px;margin-bottom:4px;}
.sb-item{
  display:flex;align-items:center;gap:9px;padding:7px 10px;border-radius:var(--r-md);
  font-size:13px;font-weight:400;color:var(--muted);cursor:pointer;
  transition:all 0.12s;user-select:none;
}
.sb-item:hover{background:var(--off);color:var(--ink);}
.sb-item.active{background:var(--blue-lt);color:var(--blue);font-weight:500;}
.sb-icon{font-size:15px;width:18px;text-align:center;flex-shrink:0;opacity:0.7;}
.sb-item.active .sb-icon{opacity:1;}
.sb-pill{margin-left:auto;font-size:9px;font-weight:700;padding:2px 7px;border-radius:100px;letter-spacing:0.3px;}
.sp-red{background:rgba(239,68,68,0.1);color:var(--danger);}
.sp-blue{background:var(--blue-lt);color:var(--blue);}
.sb-foot{margin-top:auto;padding:12px 10px;border-top:1px solid var(--border);}
.sb-biz{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--r-md);cursor:pointer;}
.sb-biz:hover{background:var(--off);}
.sb-biz-av{width:28px;height:28px;border-radius:var(--r-sm);background:var(--blue-lt);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--blue);flex-shrink:0;}
.sb-biz-name{font-size:12px;font-weight:500;color:var(--ink);}
.sb-biz-plan{font-size:10px;color:var(--muted);margin-top:1px;}

/* ── MAIN ── */
.main{flex:1;overflow-y:auto;display:flex;flex-direction:column;}
.page{display:none;flex-direction:column;flex:1;padding:24px 28px;}
.page.active{display:flex;}
.page-hd{margin-bottom:22px;}
.page-title{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--ink);letter-spacing:-0.6px;margin-bottom:3px;}
.page-sub{font-size:13px;color:var(--muted);font-weight:300;}

/* ── CARDS ── */
.card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;}
.card-hd{font-size:10px;font-weight:600;color:var(--muted2);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:14px;}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r-md);font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s;border:none;white-space:nowrap;}
.btn-primary{background:var(--ink);color:#fff;}
.btn-primary:hover{background:var(--blue);}
.btn-outline{background:var(--white);color:var(--ink);border:1px solid var(--border);}
.btn-outline:hover{border-color:var(--border2);background:var(--off);}
.btn-blue{background:var(--blue);color:#fff;}
.btn-blue:hover{background:var(--blue-dk);}
.btn-danger{background:rgba(239,68,68,0.08);color:var(--danger);border:1px solid rgba(239,68,68,0.2);}
.btn-sm{padding:5px 12px;font-size:12px;}

/* ── BADGES ── */
.badge{display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:3px 8px;border-radius:100px;letter-spacing:0.3px;text-transform:uppercase;white-space:nowrap;}
.badge-new{background:var(--blue-lt);color:var(--blue);}
.badge-booked{background:rgba(16,185,129,0.1);color:var(--success);}
.badge-urgent{background:rgba(239,68,68,0.08);color:var(--danger);}
.badge-sent{background:rgba(245,158,11,0.08);color:var(--warn);}
.badge-closed{background:var(--off);color:var(--muted);}

/* ── FORMS ── */
.form-label{font-size:12px;font-weight:500;color:var(--ink);display:block;margin-bottom:5px;}
.form-input{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r-md);font-size:13px;color:var(--ink);background:var(--white);outline:none;transition:border-color 0.15s;}
.form-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(24,71,240,0.07);}
.form-select{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r-md);font-size:13px;color:var(--ink);background:var(--white);outline:none;}
.form-textarea{width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r-md);font-size:13px;color:var(--ink);background:var(--white);outline:none;resize:vertical;line-height:1.5;}
.form-textarea:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(24,71,240,0.07);}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.form-group{display:flex;flex-direction:column;}

/* ── TOGGLE ── */
.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-top:1px solid var(--border);}
.toggle-row:first-child{border-top:none;padding-top:0;}
.tr-label{font-size:13px;font-weight:500;color:var(--ink);}
.tr-desc{font-size:11px;color:var(--muted);font-weight:300;margin-top:2px;}
.toggle{position:relative;width:38px;height:21px;flex-shrink:0;}
.toggle input{opacity:0;width:0;height:0;}
.toggle-sl{position:absolute;inset:0;background:#D1D5DB;border-radius:100px;cursor:pointer;transition:background 0.2s;}
.toggle-sl::before{content:'';position:absolute;width:15px;height:15px;border-radius:50%;background:#fff;top:3px;left:3px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.15);}
.toggle input:checked+.toggle-sl{background:var(--blue);}
.toggle input:checked+.toggle-sl::before{transform:translateX(17px);}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
.metrics-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;}
.metric{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;}
.metric-val{font-family:var(--serif);font-size:32px;color:var(--ink);letter-spacing:-1px;line-height:1;}
.metric-lbl{font-size:12px;color:var(--muted);margin-top:6px;font-weight:300;}
.metric-trend{font-size:11px;margin-top:5px;font-weight:500;}
.trend-up{color:var(--success);}
.trend-info{color:var(--blue);}
.dash-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;}

/* Lead rows */
.lead-rows{display:flex;flex-direction:column;gap:6px;}
.lead-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--white);cursor:pointer;transition:all 0.12s;}
.lead-row:hover{border-color:rgba(24,71,240,0.2);background:var(--blue-lt);}
.lead-row.is-urgent{border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.015);}
.lr-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;}
.lr-info{flex:1;min-width:0;}
.lr-name{font-size:13px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lr-sub{font-size:11px;color:var(--muted);margin-top:1px;font-weight:300;}
.lr-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
.lr-time{font-size:10px;color:var(--muted2);}

/* Activity */
.activity-feed{display:flex;flex-direction:column;}
.act-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);}
.act-item:last-child{border-bottom:none;}
.act-icon{width:28px;height:28px;border-radius:var(--r-sm);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;margin-top:1px;}
.act-text{font-size:12px;color:var(--ink);line-height:1.55;}
.act-time{font-size:10px;color:var(--muted2);margin-top:3px;}

/* ══════════════════════════════════════
   LEADS TABLE
══════════════════════════════════════ */
.leads-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap;}
.search-wrap{flex:1;min-width:180px;position:relative;}
.search-wrap input{width:100%;padding:8px 12px 8px 34px;border:1px solid var(--border);border-radius:var(--r-md);font-size:13px;color:var(--ink);outline:none;transition:border-color 0.15s;}
.search-wrap input:focus{border-color:var(--blue);}
.search-wrap::before{content:'⌕';position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted2);font-size:16px;pointer-events:none;}
.filter-tabs{display:flex;gap:4px;}
.ftab{padding:7px 14px;border:1px solid var(--border);border-radius:var(--r-md);font-size:12px;font-weight:500;color:var(--muted);background:var(--white);cursor:pointer;transition:all 0.12s;}
.ftab:hover{color:var(--ink);border-color:var(--border2);}
.ftab.active{background:var(--blue-lt);border-color:rgba(24,71,240,0.25);color:var(--blue);}

.leads-table{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;}
.lt-head{display:grid;grid-template-columns:2fr 1.3fr 100px 100px 110px 76px;padding:10px 16px;background:var(--off);border-bottom:1px solid var(--border);}
.lt-head span{font-size:10px;font-weight:600;color:var(--muted2);letter-spacing:0.8px;text-transform:uppercase;}
.lt-row{display:grid;grid-template-columns:2fr 1.3fr 100px 100px 110px 76px;padding:12px 16px;border-bottom:1px solid var(--border);align-items:center;cursor:pointer;transition:background 0.12s;}
.lt-row:last-child{border-bottom:none;}
.lt-row:hover{background:var(--off);}
.lt-name-cell{display:flex;align-items:center;gap:9px;}
.lt-av{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;flex-shrink:0;}
.lt-n{font-size:13px;font-weight:500;color:var(--ink);}
.lt-ph{font-size:11px;color:var(--muted);font-weight:300;margin-top:1px;}
.lt-cell{font-size:12px;color:var(--ink);}
.lt-cell.dim{color:var(--muted);font-weight:300;}
.lt-acts{display:flex;gap:5px;}
.lt-act{width:26px;height:26px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--white);display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;transition:all 0.12s;}
.lt-act:hover{border-color:rgba(24,71,240,0.3);background:var(--blue-lt);}

/* ══════════════════════════════════════
   CONVERSATIONS
══════════════════════════════════════ */
.chat-shell{display:grid;grid-template-columns:280px 1fr;flex:1;border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;background:var(--white);min-height:0;}
.conv-panel{border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;}
.cp-header{padding:14px;border-bottom:1px solid var(--border);}
.cp-search{width:100%;padding:7px 11px;border:1px solid var(--border);border-radius:var(--r-md);font-size:12px;color:var(--ink);outline:none;}
.cp-search:focus{border-color:var(--blue);}
.conv-list{overflow-y:auto;flex:1;}
.conv-item{padding:12px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.12s;}
.conv-item:hover{background:var(--off);}
.conv-item.active{background:var(--blue-lt);}
.ci-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;}
.ci-name{font-size:13px;font-weight:500;color:var(--ink);}
.ci-time{font-size:10px;color:var(--muted2);}
.ci-preview{font-size:12px;color:var(--muted);font-weight:300;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:5px;}

.chat-panel{display:flex;flex-direction:column;overflow:hidden;}
.chat-top{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:11px;}
.chat-top-av{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;}
.chat-top-name{font-size:14px;font-weight:500;color:var(--ink);}
.chat-top-sub{font-size:11px;color:var(--muted);font-weight:300;margin-top:1px;}
.chat-top-actions{display:flex;gap:7px;margin-left:auto;}

.chat-msgs{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:10px;}
.ai-bar{display:inline-flex;align-items:center;gap:5px;background:var(--blue-lt);border:1px solid rgba(24,71,240,0.15);border-radius:100px;padding:4px 12px;font-size:10px;font-weight:600;color:var(--blue);letter-spacing:0.3px;align-self:flex-start;}
.msg-wrap{display:flex;gap:8px;align-items:flex-end;}
.msg-wrap.user{flex-direction:row-reverse;}
.msg-av-xs{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;flex-shrink:0;}
.msg-col{display:flex;flex-direction:column;gap:3px;max-width:62%;}
.msg-wrap.user .msg-col{align-items:flex-end;}
.msg-bub{padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.55;color:var(--ink);}
.msg-wrap.ai .msg-bub{background:var(--off);border:1px solid var(--border);border-radius:3px 12px 12px 12px;}
.msg-wrap.user .msg-bub{background:var(--ink);color:#fff;border-radius:12px 3px 12px 12px;}
.msg-time{font-size:10px;color:var(--muted2);padding:0 3px;}

.typing-bub{display:flex;gap:4px;padding:9px 13px;background:var(--off);border:1px solid var(--border);border-radius:3px 12px 12px 12px;width:fit-content;}
.typing-bub span{width:5px;height:5px;border-radius:50%;background:var(--muted2);animation:td 1.2s infinite;}
.typing-bub span:nth-child(2){animation-delay:0.2s;}
.typing-bub span:nth-child(3){animation-delay:0.4s;}
@keyframes td{0%,80%,100%{transform:translateY(0);opacity:0.4;}40%{transform:translateY(-4px);opacity:1;}}

.chat-input-row{padding:14px 18px;border-top:1px solid var(--border);display:flex;gap:9px;align-items:flex-end;}
.chat-ta{flex:1;padding:9px 13px;border:1px solid var(--border);border-radius:10px;font-size:13px;resize:none;outline:none;line-height:1.5;max-height:100px;overflow-y:auto;transition:border-color 0.15s;}
.chat-ta:focus{border-color:var(--blue);}
.chat-send{width:36px;height:36px;border-radius:9px;background:var(--ink);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;transition:background 0.15s;}
.chat-send:hover{background:var(--blue);}

/* ══════════════════════════════════════
   CALENDAR
══════════════════════════════════════ */
.cal-layout{display:grid;grid-template-columns:1fr 260px;gap:16px;flex:1;min-height:0;}
.cal-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;display:flex;flex-direction:column;}
.cal-head{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;}
.cal-nav-btn{width:28px;height:28px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--white);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all 0.12s;}
.cal-nav-btn:hover{background:var(--off);}
.cal-month-label{font-size:15px;font-weight:500;color:var(--ink);letter-spacing:-0.3px;}
.cal-today{margin-left:auto;padding:5px 12px;border:1px solid var(--border);border-radius:var(--r-sm);font-size:12px;font-weight:500;cursor:pointer;background:var(--white);transition:all 0.12s;}
.cal-today:hover{background:var(--off);}
.cal-dow{display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border);}
.cal-dow span{padding:8px;text-align:center;font-size:10px;font-weight:600;color:var(--muted2);letter-spacing:0.5px;}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);flex:1;}
.cal-cell{border-right:1px solid var(--border);border-bottom:1px solid var(--border);padding:6px;min-height:72px;cursor:pointer;transition:background 0.12s;}
.cal-cell:hover{background:var(--off);}
.cal-cell:nth-child(7n){border-right:none;}
.cal-date-num{width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--ink);border-radius:50%;margin-bottom:3px;}
.cal-cell.today .cal-date-num{background:var(--blue);color:#fff;}
.cal-cell.dim .cal-date-num{color:var(--off2);}
.cal-evt{font-size:9px;font-weight:500;padding:2px 5px;border-radius:3px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ce-b{background:var(--blue-lt);color:var(--blue);}
.ce-g{background:rgba(16,185,129,0.1);color:var(--success);}
.ce-o{background:rgba(245,158,11,0.08);color:var(--warn);}
.cal-sidebar{display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
.sched-item{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border);}
.sched-item:last-child{border-bottom:none;}
.sched-time{font-size:11px;font-weight:600;color:var(--ink);width:46px;flex-shrink:0;padding-top:1px;}
.sched-bar{width:3px;border-radius:2px;flex-shrink:0;margin-top:3px;}
.sched-info{flex:1;}
.sched-name{font-size:13px;font-weight:500;color:var(--ink);}
.sched-sub{font-size:11px;color:var(--muted);font-weight:300;margin-top:2px;}

/* ══════════════════════════════════════
   ANALYTICS
══════════════════════════════════════ */
.analytics-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;flex:1;}
.bar-row{display:flex;align-items:flex-end;gap:5px;height:100px;margin-top:10px;}
.bar-col-wrap{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;}
.bar-fill{width:100%;border-radius:3px 3px 0 0;cursor:pointer;transition:opacity 0.15s;}
.bar-fill:hover{opacity:0.7;}
.bar-lbl{font-size:8px;color:var(--muted2);}
.source-row{display:flex;flex-direction:column;gap:10px;margin-top:10px;}
.src-item{}
.src-top{display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;}
.src-name{color:var(--ink);}
.src-pct{font-weight:500;}
.src-bar{background:var(--off);border-radius:100px;height:5px;overflow:hidden;}
.src-fill{height:100%;border-radius:100px;}
.funnel-row{display:flex;flex-direction:column;gap:7px;margin-top:10px;}
.funnel-item{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:var(--r-md);}
.fi-label{font-size:12px;font-weight:500;}
.fi-val{font-family:var(--serif);font-size:20px;letter-spacing:-0.5px;}

/* ══════════════════════════════════════
   CHAT WIDGET PAGE
══════════════════════════════════════ */
.widget-layout{display:grid;grid-template-columns:1fr 340px;gap:20px;flex:1;min-height:0;}
.widget-settings{display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
.code-block{background:var(--ink2);border-radius:var(--r-md);padding:16px 18px;font-family:'SF Mono','Fira Code',monospace;font-size:12px;color:#7FA4F7;line-height:1.7;position:relative;}
.code-copy{position:absolute;top:10px;right:10px;padding:4px 10px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:var(--r-sm);font-size:11px;color:rgba(255,255,255,0.5);cursor:pointer;font-family:var(--sans);transition:all 0.15s;}
.code-copy:hover{background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.8);}
.widget-preview-panel{display:flex;flex-direction:column;}
.widget-bg{background:var(--ink2);border-radius:var(--r-lg);flex:1;display:flex;align-items:flex-end;justify-content:flex-end;padding:20px;position:relative;min-height:460px;}
.wp-hint{position:absolute;top:14px;left:14px;font-size:11px;color:rgba(255,255,255,0.25);letter-spacing:0.3px;}

/* Chat Widget */
.sf-widget{width:320px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.35);}
.sfwh{background:var(--ink);padding:14px 16px;display:flex;align-items:center;gap:9px;}
.sfwh-av{width:32px;height:32px;border-radius:50%;background:rgba(24,71,240,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#7FA4F7;}
.sfwh-name{font-size:13px;font-weight:600;color:#fff;}
.sfwh-status{font-size:10px;color:rgba(255,255,255,0.4);margin-top:1px;}
.sfwh-status::before{content:'●';color:var(--success);margin-right:4px;font-size:7px;}
.sfwh-x{margin-left:auto;color:rgba(255,255,255,0.3);cursor:pointer;font-size:16px;line-height:1;}
.sfwb{padding:14px;background:#fff;min-height:200px;max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;}
.sfwm{max-width:88%;}
.sfwm.ai{}
.sfwm.user{align-self:flex-end;}
.sfwm-bub{padding:8px 12px;border-radius:11px;font-size:12px;line-height:1.55;}
.sfwm.ai .sfwm-bub{background:#F7F8FA;color:var(--ink);border-radius:3px 11px 11px 11px;}
.sfwm.user .sfwm-bub{background:var(--ink);color:#fff;border-radius:11px 3px 11px 11px;}
.sfw-chips{display:flex;flex-wrap:wrap;gap:5px;padding:0 14px 10px;}
.sfw-chip{padding:5px 11px;border:1px solid var(--border);border-radius:100px;font-size:11px;font-weight:500;color:var(--ink);cursor:pointer;background:#fff;transition:all 0.12s;}
.sfw-chip:hover{border-color:rgba(24,71,240,0.35);color:var(--blue);background:var(--blue-lt);}
.sfwi{padding:9px 13px;border-top:1px solid var(--border);display:flex;gap:7px;align-items:center;}
.sfwi input{flex:1;border:none;outline:none;font-size:12px;font-family:var(--sans);color:var(--ink);}
.sfwi input::placeholder{color:#9CA3AF;}
.sfwi-send{width:28px;height:28px;border-radius:7px;background:var(--ink);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:background 0.15s;}
.sfwi-send:hover{background:var(--blue);}
.sfw-fab{position:absolute;bottom:20px;right:20px;width:48px;height:48px;border-radius:50%;background:var(--blue);box-shadow:0 4px 20px rgba(24,71,240,0.45);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;z-index:0;transition:transform 0.15s;}
.sfw-fab:hover{transform:scale(1.1);}

/* ══════════════════════════════════════
   SETTINGS
══════════════════════════════════════ */
.settings-shell{display:grid;grid-template-columns:200px 1fr;gap:16px;flex:1;min-height:0;}
.settings-nav{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:10px;align-self:start;}
.sn-item{padding:7px 11px;border-radius:var(--r-md);font-size:13px;color:var(--muted);cursor:pointer;transition:all 0.12s;}
.sn-item:hover{background:var(--off);color:var(--ink);}
.sn-item.active{background:var(--blue-lt);color:var(--blue);font-weight:500;}
.settings-body{display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
.sg{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:22px 24px;}
.sg-title{font-size:15px;font-weight:500;color:var(--ink);letter-spacing:-0.3px;margin-bottom:3px;}
.sg-desc{font-size:12px;color:var(--muted);font-weight:300;margin-bottom:18px;}

/* ── INTEGRATION CARDS ── */
.integration-card{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);}
.integration-card:last-child{border-bottom:none;padding-bottom:0;}
.int-logo{width:38px;height:38px;border-radius:var(--r-md);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.int-info{flex:1;}
.int-name{font-size:13px;font-weight:500;color:var(--ink);}
.int-desc{font-size:11px;color:var(--muted);font-weight:300;margin-top:2px;}
.int-status{font-size:11px;font-weight:500;margin-top:3px;}
.int-connected{color:var(--success);}
.int-disconnected{color:var(--muted2);}

/* ── TOAST ── */
#toast{position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
.toast-item{background:var(--ink);color:#fff;padding:11px 16px;border-radius:var(--r-lg);font-size:13px;box-shadow:0 4px 20px rgba(0,0,0,0.15);animation:toastIn 0.25s ease;display:flex;align-items:center;gap:8px;}
.toast-item.success::before{content:'✓';color:var(--success);font-weight:700;}
.toast-item.error::before{content:'✗';color:var(--danger);}
@keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}

/* ── LOADING ── */
.loading{display:flex;align-items:center;justify-content:center;padding:40px;color:var(--muted);font-size:13px;gap:8px;}
.spin{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spin 0.6s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
</style>
</head>
<body>

<!-- AUTH SCREEN -->
<div id="auth-screen">
  <div class="auth-box">
    <div class="auth-logo"><div class="auth-dot"></div>ServiceFlow AI</div>
    <div class="auth-title">Welcome back.</div>
    <div class="auth-sub">Sign in to your dashboard</div>
    <div class="auth-tab-row">
      <div class="auth-tab active" onclick="switchAuthTab('login')">Sign In</div>
      <div class="auth-tab" onclick="switchAuthTab('signup')">Create Account</div>
    </div>
    <div id="auth-error" class="auth-error"></div>
    <!-- LOGIN -->
    <div id="login-form">
      <div class="auth-field"><label class="auth-label">Email</label><input class="auth-input" id="login-email" type="email" placeholder="you@company.com" value="demo@serviceflow.ai"></div>
      <div class="auth-field"><label class="auth-label">Password</label><input class="auth-input" id="login-pw" type="password" placeholder="••••••••" value="demo1234" onkeydown="if(event.key==='Enter')login()"></div>
      <button class="auth-btn" onclick="login()">Sign In →</button>
      <div class="demo-hint">Demo account pre-filled — just click <strong>Sign In</strong> to explore the dashboard.</div>
    </div>
    <!-- SIGNUP -->
    <div id="signup-form" style="display:none;">
      <div class="auth-field"><label class="auth-label">Full Name</label><input class="auth-input" id="su-name" type="text" placeholder="John Davis"></div>
      <div class="auth-field"><label class="auth-label">Business Name</label><input class="auth-input" id="su-biz" type="text" placeholder="City HVAC Co."></div>
      <div class="auth-field"><label class="auth-label">Email</label><input class="auth-input" id="su-email" type="email" placeholder="you@company.com"></div>
      <div class="auth-field"><label class="auth-label">Password</label><input class="auth-input" id="su-pw" type="password" placeholder="Min. 8 characters" onkeydown="if(event.key==='Enter')signup()"></div>
      <button class="auth-btn" onclick="signup()">Create Account →</button>
    </div>
  </div>
</div>

<!-- APP -->
<div id="app">
  <div class="topbar">
    <div class="topbar-logo"><div class="logo-dot"></div>ServiceFlow AI</div>
    <div class="topbar-center">
      <div class="tb-status"><div class="tb-status-dot"></div><span class="tb-status-text">AI Active</span></div>
    </div>
    <div class="topbar-right">
      <div class="tb-icon-btn" title="Notifications">🔔<div class="tb-badge-dot"></div></div>
      <div class="tb-avatar" id="user-initials">JD</div>
    </div>
  </div>
  <div class="app-body">
    <div class="sidebar">
      <div class="sb-group">
        <div class="sb-group-label">Overview</div>
        <div class="sb-item active" onclick="nav('dashboard')"><span class="sb-icon">▣</span>Dashboard</div>
      </div>
      <div class="sb-group">
        <div class="sb-group-label">CRM</div>
        <div class="sb-item" onclick="nav('leads')"><span class="sb-icon">👥</span>Leads<span class="sb-pill sp-red" id="sb-lead-count">8</span></div>
        <div class="sb-item" onclick="nav('conversations')"><span class="sb-icon">💬</span>Conversations<span class="sb-pill sp-blue">3</span></div>
        <div class="sb-item" onclick="nav('calendar')"><span class="sb-icon">📅</span>Calendar</div>
      </div>
      <div class="sb-group">
        <div class="sb-group-label">AI Tools</div>
        <div class="sb-item" onclick="nav('analytics')"><span class="sb-icon">📊</span>Analytics</div>
        <div class="sb-item" onclick="nav('widget')"><span class="sb-icon">🤖</span>Chat Widget</div>
      </div>
      <div class="sb-group">
        <div class="sb-group-label">Account</div>
        <div class="sb-item" onclick="nav('settings')"><span class="sb-icon">⚙️</span>Settings</div>
        <div class="sb-item" onclick="logout()"><span class="sb-icon">↩</span>Sign Out</div>
      </div>
      <div class="sb-foot">
        <div class="sb-biz">
          <div class="sb-biz-av" id="sb-biz-av">CA</div>
          <div><div class="sb-biz-name" id="sb-biz-name">City HVAC Co.</div><div class="sb-biz-plan" id="sb-biz-plan">Growth Plan</div></div>
        </div>
      </div>
    </div>
    <div class="main">

      <!-- DASHBOARD -->
      <div class="page active" id="page-dashboard">
        <div class="page-hd"><div class="page-title">Dashboard</div><div class="page-sub" id="dash-greeting">Good morning — here's what your AI captured.</div></div>
        <div class="metrics-row">
          <div class="metric"><div class="metric-val" id="m-leads">—</div><div class="metric-lbl">Leads today</div><div class="metric-trend trend-up" id="m-leads-trend">↑ loading...</div></div>
          <div class="metric"><div class="metric-val">98%</div><div class="metric-lbl">Response rate</div><div class="metric-trend trend-up">↑ from 41% before AI</div></div>
          <div class="metric"><div class="metric-val">$8.4k</div><div class="metric-lbl">Pipeline value</div><div class="metric-trend trend-up">↑ 23% this week</div></div>
          <div class="metric"><div class="metric-val">28s</div><div class="metric-lbl">Avg AI response</div><div class="metric-trend trend-info">vs 5.2hr industry avg</div></div>
        </div>
        <div class="dash-cols">
          <div class="card">
            <div class="card-hd">Live Leads</div>
            <div class="lead-rows" id="dash-leads"><div class="loading"><div class="spin"></div>Loading leads...</div></div>
          </div>
          <div class="card">
            <div class="card-hd">AI Activity</div>
            <div class="activity-feed" id="dash-activity">
              <div class="act-item"><div class="act-icon" style="background:rgba(16,185,129,0.1);">📅</div><div><div class="act-text">AI booked <strong>Sarah Torres</strong> for plumbing repair — 2:30pm today</div><div class="act-time">4 minutes ago</div></div></div>
              <div class="act-item"><div class="act-icon" style="background:rgba(239,68,68,0.08);">📵</div><div><div class="act-text">Missed call from <strong>(813) 555-4829</strong> — text-back sent in 22 seconds</div><div class="act-time">9 minutes ago</div></div></div>
              <div class="act-item"><div class="act-icon" style="background:rgba(24,71,240,0.08);">💬</div><div><div class="act-text">New chat lead qualified: <strong>Lisa Park</strong>, electrical quote, Tampa area</div><div class="act-time">14 minutes ago</div></div></div>
              <div class="act-item"><div class="act-icon" style="background:rgba(245,158,11,0.1);">⭐</div><div><div class="act-text">Review request sent to <strong>Carlos M.</strong> after completed job</div><div class="act-time">1 hour ago</div></div></div>
              <div class="act-item"><div class="act-icon" style="background:rgba(16,185,129,0.1);">✅</div><div><div class="act-text"><strong>3 leads</strong> qualified and routed overnight — 2 booked</div><div class="act-time">6 hours ago</div></div></div>
            </div>
          </div>
        </div>
      </div>

      <!-- LEADS -->
      <div class="page" id="page-leads">
        <div class="page-hd"><div class="page-title">Leads</div><div class="page-sub">All leads captured and qualified by your AI.</div></div>
        <div class="leads-toolbar">
          <div class="search-wrap"><input type="text" placeholder="Search leads..." id="lead-search" oninput="filterLeads()"></div>
          <div class="filter-tabs">
            <div class="ftab active" onclick="filterStatus('all',this)">All</div>
            <div class="ftab" onclick="filterStatus('new',this)">New</div>
            <div class="ftab" onclick="filterStatus('booked',this)">Booked</div>
            <div class="ftab" onclick="filterStatus('urgent',this)">Urgent</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openAddLead()">+ Add Lead</button>
        </div>
        <div class="leads-table">
          <div class="lt-head"><span>Lead</span><span>Service</span><span>Status</span><span>Source</span><span>Date</span><span>Actions</span></div>
          <div id="leads-body"><div class="loading"><div class="spin"></div>Loading...</div></div>
        </div>
      </div>

      <!-- CONVERSATIONS -->
      <div class="page" id="page-conversations" style="padding:24px 28px;">
        <div class="page-hd"><div class="page-title">Conversations</div><div class="page-sub">AI-powered conversations with your leads.</div></div>
        <div class="chat-shell">
          <div class="conv-panel">
            <div class="cp-header"><input class="cp-search" placeholder="Search conversations..."></div>
            <div class="conv-list" id="conv-list">
              <div class="conv-item active" onclick="selectConv(this,'MR','Mike Reynolds','HVAC Emergency · AI is handling','urgent')">
                <div class="ci-row"><span class="ci-name">Mike Reynolds</span><span class="ci-time">Just now</span></div>
                <div class="ci-preview">Burst pipe — water is everywhere</div>
                <div style="display:flex;gap:5px;margin-top:4px;"><span class="badge badge-urgent">Urgent</span><span class="badge badge-new">AI Active</span></div>
              </div>
              <div class="conv-item" onclick="selectConv(this,'LP','Lisa Park','Electrical Quote · New lead','new')">
                <div class="ci-row"><span class="ci-name">Lisa Park</span><span class="ci-time">14m</span></div>
                <div class="ci-preview">Looking for an electrical quote</div>
                <div style="margin-top:4px;"><span class="badge badge-new">New</span></div>
              </div>
              <div class="conv-item" onclick="selectConv(this,'ST','Sarah Torres','Plumbing Repair · Booked 2:30pm','booked')">
                <div class="ci-row"><span class="ci-name">Sarah Torres</span><span class="ci-time">4m</span></div>
                <div class="ci-preview">Great, 2:30pm works perfectly!</div>
                <div style="margin-top:4px;"><span class="badge badge-booked">Booked</span></div>
              </div>
              <div class="conv-item" onclick="selectConv(this,'DK','Dave Kim','Roof Inspection · Text-back sent','sent')">
                <div class="ci-row"><span class="ci-name">Dave Kim</span><span class="ci-time">9m</span></div>
                <div class="ci-preview">Sorry we missed your call!</div>
                <div style="margin-top:4px;"><span class="badge badge-sent">Text-back</span></div>
              </div>
            </div>
          </div>
          <div class="chat-panel">
            <div class="chat-top" id="chat-top">
              <div class="chat-top-av" id="ct-av" style="background:rgba(239,68,68,0.1);color:var(--danger);">MR</div>
              <div><div class="chat-top-name" id="ct-name">Mike Reynolds</div><div class="chat-top-sub" id="ct-sub">HVAC Emergency · AI is handling</div></div>
              <div class="chat-top-actions">
                <button class="btn btn-outline btn-sm" onclick="nav('calendar')">📅 Book</button>
                <button class="btn btn-primary btn-sm" onclick="takeoverChat()" id="takeover-btn">Take Over</button>
              </div>
            </div>
            <div class="chat-msgs" id="chat-msgs">
              <div class="ai-bar">🤖 AI Receptionist — responding automatically</div>
              <div class="msg-wrap ai"><div class="msg-av-xs" style="background:rgba(24,71,240,0.1);color:var(--blue);">AI</div><div class="msg-col"><div class="msg-bub">Hi! Thanks for reaching out to City HVAC. I'm here to help 24/7. What can I assist you with today?</div><div class="msg-time">8:02 AM · AI</div></div></div>
              <div class="msg-wrap user"><div class="msg-av-xs" style="background:rgba(239,68,68,0.1);color:var(--danger);">MR</div><div class="msg-col"><div class="msg-bub">Burst pipe under my kitchen sink, water is everywhere</div><div class="msg-time">8:03 AM</div></div></div>
              <div class="msg-wrap ai"><div class="msg-av-xs" style="background:rgba(24,71,240,0.1);color:var(--blue);">AI</div><div class="msg-col"><div class="msg-bub">Flagging this as urgent. First — shut off the water valve under the sink or at your main. I have a tech available at 10:30am today. Shall I book that?</div><div class="msg-time">8:03 AM · AI</div></div></div>
              <div class="msg-wrap user"><div class="msg-av-xs" style="background:rgba(239,68,68,0.1);color:var(--danger);">MR</div><div class="msg-col"><div class="msg-bub">Yes please, 10:30 works.</div><div class="msg-time">8:04 AM</div></div></div>
              <div class="msg-wrap ai" id="typing-row" style="display:none;"><div class="msg-av-xs" style="background:rgba(24,71,240,0.1);color:var(--blue);">AI</div><div class="msg-col"><div class="typing-bub"><span></span><span></span><span></span></div></div></div>
            </div>
            <div class="chat-input-row">
              <textarea class="chat-ta" id="chat-input" placeholder="Reply as yourself..." rows="1" onkeydown="handleChatKey(event)"></textarea>
              <button class="chat-send" onclick="sendChat()">➤</button>
            </div>
          </div>
        </div>
      </div>

      <!-- CALENDAR -->
      <div class="page" id="page-calendar">
        <div class="page-hd"><div class="page-title">Calendar</div><div class="page-sub">Appointments booked by your AI.</div></div>
        <div class="cal-layout">
          <div class="cal-card">
            <div class="cal-head">
              <div class="cal-nav-btn" onclick="changeMonth(-1)">‹</div>
              <div class="cal-nav-btn" onclick="changeMonth(1)">›</div>
              <div class="cal-month-label" id="cal-label">June 2025</div>
              <button class="cal-today" onclick="goToday()">Today</button>
              <button class="btn btn-blue btn-sm" style="margin-left:8px;" onclick="nav('conversations')">+ Book via AI</button>
            </div>
            <div class="cal-dow"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
            <div class="cal-grid" id="cal-grid"></div>
          </div>
          <div class="cal-sidebar">
            <div class="card">
              <div class="card-hd">Today's Schedule</div>
              <div id="today-schedule">
                <div class="sched-item"><div class="sched-time">9:00 AM</div><div class="sched-bar" style="background:var(--blue);height:42px;"></div><div class="sched-info"><div class="sched-name">AC Tune-Up</div><div class="sched-sub">Tom Henderson · Booked by AI</div></div></div>
                <div class="sched-item"><div class="sched-time">10:30 AM</div><div class="sched-bar" style="background:var(--danger);height:42px;"></div><div class="sched-info"><div class="sched-name">Emergency Repair</div><div class="sched-sub">Mike Reynolds · Urgent</div></div></div>
                <div class="sched-item"><div class="sched-time">2:30 PM</div><div class="sched-bar" style="background:var(--success);height:42px;"></div><div class="sched-info"><div class="sched-name">Plumbing Repair</div><div class="sched-sub">Sarah Torres · Booked by AI</div></div></div>
                <div class="sched-item"><div class="sched-time">4:00 PM</div><div class="sched-bar" style="background:var(--warn);height:42px;"></div><div class="sched-info"><div class="sched-name">Drain Cleaning</div><div class="sched-sub">Rosa Alvarez · Booked by AI</div></div></div>
              </div>
            </div>
            <div class="card">
              <div class="card-hd">This Week</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);font-weight:300;">Total appointments</span><span style="font-weight:500;">14</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);font-weight:300;">Booked by AI</span><span style="font-weight:500;color:var(--blue);">11 of 14</span></div>
                <div style="display:flex;justify-content:space-between;font-size:13px;"><span style="color:var(--muted);font-weight:300;">No-shows</span><span style="font-weight:500;color:var(--success);">0</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ANALYTICS -->
      <div class="page" id="page-analytics">
        <div class="page-hd"><div class="page-title">Analytics</div><div class="page-sub">AI performance and lead conversion data.</div></div>
        <div class="metrics-row">
          <div class="metric"><div class="metric-val">312</div><div class="metric-lbl">Leads this month</div><div class="metric-trend trend-up">↑ 37% vs last month</div></div>
          <div class="metric"><div class="metric-val">$48k</div><div class="metric-lbl">Revenue booked</div><div class="metric-trend trend-up">↑ 52% vs last month</div></div>
          <div class="metric"><div class="metric-val">4.8★</div><div class="metric-lbl">Avg review score</div><div class="metric-trend trend-up">94 total reviews</div></div>
          <div class="metric"><div class="metric-val">68%</div><div class="metric-lbl">Admin time saved</div><div class="metric-trend trend-up">~62 hrs/month</div></div>
        </div>
        <div class="analytics-grid">
          <div class="card">
            <div class="card-hd">Leads — Last 14 Days</div>
            <div class="bar-row" id="bar-chart"></div>
          </div>
          <div class="card">
            <div class="card-hd">Lead Sources</div>
            <div class="source-row">
              <div class="src-item"><div class="src-top"><span class="src-name">Missed Call Text-Back</span><span class="src-pct">44%</span></div><div class="src-bar"><div class="src-fill" style="width:44%;background:var(--blue);"></div></div></div>
              <div class="src-item"><div class="src-top"><span class="src-name">Website Chat Widget</span><span class="src-pct">31%</span></div><div class="src-bar"><div class="src-fill" style="width:31%;background:var(--success);"></div></div></div>
              <div class="src-item"><div class="src-top"><span class="src-name">AI Follow-Up</span><span class="src-pct">18%</span></div><div class="src-bar"><div class="src-fill" style="width:18%;background:var(--warn);"></div></div></div>
              <div class="src-item"><div class="src-top"><span class="src-name">Manual / Other</span><span class="src-pct">7%</span></div><div class="src-bar"><div class="src-fill" style="width:7%;background:var(--muted2);"></div></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-hd">Conversion Funnel</div>
            <div class="funnel-row">
              <div class="funnel-item" style="background:var(--blue-lt);"><span class="fi-label" style="color:var(--blue);">Leads captured</span><span class="fi-val" style="color:var(--blue);">312</span></div>
              <div class="funnel-item" style="background:var(--off);"><span class="fi-label">Leads qualified</span><span class="fi-val">248</span></div>
              <div class="funnel-item" style="background:var(--off);"><span class="fi-label">Appointments booked</span><span class="fi-val">189</span></div>
              <div class="funnel-item" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:var(--r-md);"><span class="fi-label" style="color:var(--success);">Jobs completed</span><span class="fi-val" style="color:var(--success);">141</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-hd">Response Time</div>
            <div style="display:flex;flex-direction:column;gap:7px;margin-top:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--off);border-radius:var(--r-md);"><span style="font-size:13px;">Under 30 seconds</span><span style="font-size:13px;font-weight:600;color:var(--success);">91%</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--off);border-radius:var(--r-md);"><span style="font-size:13px;">30 sec – 2 min</span><span style="font-size:13px;font-weight:500;">7%</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 13px;background:var(--off);border-radius:var(--r-md);"><span style="font-size:13px;">Over 2 min</span><span style="font-size:13px;font-weight:500;color:var(--danger);">2%</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- WIDGET -->
      <div class="page" id="page-widget">
        <div class="page-hd"><div class="page-title">Chat Widget</div><div class="page-sub">Embed your AI receptionist on any website with one line of code.</div></div>
        <div class="widget-layout">
          <div class="widget-settings">
            <div class="card">
              <div class="card-hd">Embed Code</div>
              <div class="code-block">
                &lt;script src="https://cdn.serviceflow.ai/widget.js"<br>
                &nbsp;&nbsp;data-key="<span style="color:#34D399;">sf_live_aBc123xyz</span>"<br>
                &nbsp;&nbsp;data-color="<span style="color:#FBBF24;">#1847F0</span>"<br>
                &gt;&lt;/script&gt;
                <div class="code-copy" onclick="toast('Copied to clipboard!','success');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)">Copy</div>
              </div>
              <p style="font-size:12px;color:var(--muted);margin-top:10px;font-weight:300;">Paste before the &lt;/body&gt; tag. Loads in under 200ms.</p>
            </div>
            <div class="card">
              <div class="card-hd">Widget Customization</div>
              <div class="form-row" style="margin-bottom:12px;">
                <div class="form-group"><label class="form-label">AI Name</label><input class="form-input" id="w-ainame" value="Sarah from City HVAC"></div>
                <div class="form-group"><label class="form-label">Greeting Message</label><input class="form-input" id="w-greeting" value="Hi! How can we help you today?"></div>
              </div>
              <div class="form-row" style="margin-bottom:12px;">
                <div class="form-group"><label class="form-label">Brand Color</label><input class="form-input" id="w-color" type="color" value="#1847F0" oninput="updateWidgetColor(this.value)" style="height:38px;padding:4px;cursor:pointer;"></div>
                <div class="form-group"><label class="form-label">Language</label><select class="form-select"><option>English</option><option>Spanish</option><option>Bilingual</option></select></div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="saveWidgetSettings()">Save Changes</button>
            </div>
          </div>
          <div class="widget-preview-panel">
            <div style="font-size:10px;font-weight:600;color:var(--muted2);letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;">Live Preview — Click to interact</div>
            <div class="widget-bg">
              <div class="wp-hint">Your website background</div>
              <div class="sf-widget">
                <div class="sfwh" id="sfwh">
                  <div class="sfwh-av" id="sfw-av">SF</div>
                  <div><div class="sfwh-name" id="sfw-name">Sarah from City HVAC</div><div class="sfwh-status">Online — replies instantly</div></div>
                  <div class="sfwh-x">✕</div>
                </div>
                <div class="sfwb" id="sfw-msgs">
                  <div class="sfwm ai"><div class="sfwm-bub">Hi there! I'm Sarah, your AI assistant. I can answer questions, check availability, and book appointments instantly. How can I help?</div></div>
                </div>
                <div class="sfw-chips" id="sfw-chips">
                  <div class="sfw-chip" onclick="widgetChip('Get a free quote')">Free quote</div>
                  <div class="sfw-chip" onclick="widgetChip('Book an appointment')">Book appointment</div>
                  <div class="sfw-chip" onclick="widgetChip('Emergency service')">Emergency</div>
                </div>
                <div class="sfwi">
                  <input id="sfw-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')widgetSend()">
                  <button class="sfwi-send" onclick="widgetSend()">➤</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SETTINGS -->
      <div class="page" id="page-settings">
        <div class="page-hd"><div class="page-title">Settings</div><div class="page-sub">Configure your AI and connected integrations.</div></div>
        <div class="settings-shell">
          <div class="settings-nav">
            <div class="sn-item active" onclick="showSettingsTab('business',this)">Business Info</div>
            <div class="sn-item" onclick="showSettingsTab('automation',this)">AI Automation</div>
            <div class="sn-item" onclick="showSettingsTab('integrations',this)">Integrations</div>
          </div>
          <div class="settings-body">
            <!-- Business Info -->
            <div id="stab-business">
              <div class="sg">
                <div class="sg-title">Business Information</div>
                <div class="sg-desc">Your AI uses this to answer customer questions accurately.</div>
                <div class="form-row" style="margin-bottom:12px;">
                  <div class="form-group"><label class="form-label">Business Name</label><input class="form-input" id="s-bizname" value="City HVAC Co."></div>
                  <div class="form-group"><label class="form-label">Phone Number</label><input class="form-input" id="s-phone" value="(813) 555-0100"></div>
                </div>
                <div class="form-row" style="margin-bottom:12px;">
                  <div class="form-group"><label class="form-label">Service Area</label><input class="form-input" id="s-area" value="Tampa Bay, FL — 30mi radius"></div>
                  <div class="form-group"><label class="form-label">Industry</label><select class="form-select" id="s-industry"><option>HVAC</option><option>Plumbing</option><option>Electrical</option><option>Roofing</option><option>Landscaping</option><option>Pest Control</option><option>Cleaning</option><option>General Contractor</option></select></div>
                </div>
                <div class="form-group" style="margin-bottom:16px;"><label class="form-label">Business Description (what your AI says about you)</label><textarea class="form-textarea" id="s-desc" rows="3">City HVAC Co. provides residential and commercial HVAC services in the Tampa Bay area. We offer same-day emergency repairs, AC installation, heating systems, and preventive maintenance. Licensed and insured with 15+ years of experience.</textarea></div>
                <button class="btn btn-primary btn-sm" onclick="saveBusinessSettings()">Save Changes</button>
              </div>
            </div>
            <!-- Automation -->
            <div id="stab-automation" style="display:none;">
              <div class="sg">
                <div class="sg-title">AI Automation Controls</div>
                <div class="sg-desc">Choose what your AI handles automatically.</div>
                <div class="toggle-row"><div><div class="tr-label">Missed call text-back</div><div class="tr-desc">Automatically text every missed caller within 30 seconds</div></div><label class="toggle"><input type="checkbox" checked id="t-textback"><div class="toggle-sl"></div></label></div>
                <div class="toggle-row"><div><div class="tr-label">Appointment booking</div><div class="tr-desc">AI books directly into your calendar</div></div><label class="toggle"><input type="checkbox" checked id="t-booking"><div class="toggle-sl"></div></label></div>
                <div class="toggle-row"><div><div class="tr-label">Lead qualification</div><div class="tr-desc">AI screens leads before routing to your team</div></div><label class="toggle"><input type="checkbox" checked id="t-qualify"><div class="toggle-sl"></div></label></div>
                <div class="toggle-row"><div><div class="tr-label">Review requests</div><div class="tr-desc">Auto-request reviews after completed jobs</div></div><label class="toggle"><input type="checkbox" checked id="t-reviews"><div class="toggle-sl"></div></label></div>
                <div class="toggle-row"><div><div class="tr-label">After-hours mode</div><div class="tr-desc">AI handles all inquiries outside business hours</div></div><label class="toggle"><input type="checkbox" checked id="t-afterhours"><div class="toggle-sl"></div></label></div>
                <div class="toggle-row"><div><div class="tr-label">Urgent lead alerts</div><div class="tr-desc">Push notification for hot or urgent leads</div></div><label class="toggle"><input type="checkbox" checked id="t-alerts"><div class="toggle-sl"></div></label></div>
                <div style="margin-top:16px;"><button class="btn btn-primary btn-sm" onclick="saveAutomation()">Save Changes</button></div>
              </div>
            </div>
            <!-- Integrations -->
            <div id="stab-integrations" style="display:none;">
              <div class="sg">
                <div class="sg-title">Connected Integrations</div>
                <div class="sg-desc">Connect your calendar and phone to unlock the full ServiceFlow AI experience.</div>
                <div class="integration-card">
                  <div class="int-logo">📅</div>
                  <div class="int-info">
                    <div class="int-name">Google Calendar</div>
                    <div class="int-desc">AI books appointments directly into your calendar in real time</div>
                    <div class="int-status int-disconnected" id="gcal-status">Not connected</div>
                  </div>
                  <button class="btn btn-outline btn-sm" id="gcal-btn" onclick="connectGoogleCalendar()">Connect</button>
                </div>
                <div class="integration-card">
                  <div class="int-logo">📱</div>
                  <div class="int-info">
                    <div class="int-name">Twilio SMS</div>
                    <div class="int-desc">Powers missed call text-back and automated follow-up messages</div>
                    <div class="int-status int-disconnected" id="twilio-status">Not connected</div>
                  </div>
                  <button class="btn btn-outline btn-sm" id="twilio-btn" onclick="showTwilioSetup()">Configure</button>
                </div>
                <div class="integration-card">
                  <div class="int-logo">🔗</div>
                  <div class="int-info">
                    <div class="int-name">Zapier</div>
                    <div class="int-desc">Connect ServiceFlow AI to 5,000+ apps and custom workflows</div>
                    <div class="int-status int-disconnected">Coming soon</div>
                  </div>
                  <button class="btn btn-outline btn-sm" disabled style="opacity:0.5;cursor:not-allowed;">Soon</button>
                </div>
              </div>
              <!-- Twilio setup panel -->
              <div id="twilio-panel" class="sg" style="display:none;">
                <div class="sg-title">Configure Twilio SMS</div>
                <div class="sg-desc">Add your Twilio credentials to enable missed call text-back. <a href="https://twilio.com" target="_blank" style="color:var(--blue);">Sign up free at twilio.com →</a></div>
                <div class="form-row" style="margin-bottom:12px;">
                  <div class="form-group"><label class="form-label">Account SID</label><input class="form-input" id="tw-sid" placeholder="ACxxxxxxxx..."></div>
                  <div class="form-group"><label class="form-label">Auth Token</label><input class="form-input" id="tw-token" type="password" placeholder="••••••••"></div>
                </div>
                <div class="form-group" style="margin-bottom:16px;"><label class="form-label">Twilio Phone Number</label><input class="form-input" id="tw-phone" placeholder="+18135550100" style="max-width:220px;"></div>
                <div style="background:var(--blue-lt);border:1px solid rgba(24,71,240,0.15);border-radius:var(--r-md);padding:12px 16px;margin-bottom:16px;font-size:12px;color:var(--blue);">
                  <strong>Webhook setup:</strong> In your Twilio console, set the phone number's "A call comes in" webhook to:<br>
                  <code style="background:rgba(24,71,240,0.1);padding:2px 6px;border-radius:4px;margin-top:4px;display:inline-block;">https://your-domain.com/api/twilio/missed-call</code>
                </div>
                <button class="btn btn-primary btn-sm" onclick="saveTwilioSettings()">Save & Connect</button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- TOAST -->
<div id="toast"></div>

<script>
// ══════════════════════════════════════
// CONFIG
// ══════════════════════════════════════
const API = ''; // empty = same origin (server.js serves this file)

// ══════════════════════════════════════
// UTILS
// ══════════════════════════════════════
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = \`toast-item \${type}\`;
  el.textContent = msg;
  t.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return \`\${mins}m ago\`;
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return \`\${hrs}h ago\`;
  return \`\${Math.floor(hrs/24)}d ago\`;
}

function initials(name) {
  return name.split(' ').map(`;

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
      system:`You are ${biz?.aiName||'Sarah'}, AI receptionist for ${biz?.name||'the business'} in ${biz?.serviceArea||'the area'}. ${biz?.description||''} Be warm, professional, concise (2-3 sentences). Always end with a question or next step.${leadContext?' Context: '+leadContext:''}`,
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

// ── SERVE APP ──
app.get('/api/calendar/connect', requireAuth, (req, res) => {
  res.json({ error:'Add GOOGLE_CLIENT_ID to Railway variables to enable Google Calendar.' });
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error:'Not found' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(HTML);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('ServiceFlow AI running on port', PORT);
});
