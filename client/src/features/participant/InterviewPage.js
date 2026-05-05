import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from 'shared/api';
import { visibleMessageContent } from 'shared/interviewDisplay';
import { MODES } from 'shared/modes';
import { WelcomeInfoIcon } from './welcomeIcons';
import { CandorLogoMark } from 'components/CandorLogoMark';

const SCREENS = { WELCOME:'welcome', PROFILE:'profile', CHAT:'chat', DONE:'done' };

export default function InterviewPage() {
  const { token } = useParams();

  const [screen, setScreen] = useState(SCREENS.WELCOME);
  const [interview, setInterview] = useState(null);
  const [error, setError]   = useState('');
  const [anon, setAnon]     = useState(false);
  const [profile, setProfile] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput]   = useState('');
  const [pq, setPq]         = useState(0);
  const [loading, setLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [inputVisible, setInputVisible] = useState(true);
  const [recStatus, setRecStatus]       = useState('idle'); // idle|recording|processing
  const msgsRef  = useRef(null);
  const taRef    = useRef(null);
  const recogRef = useRef(null);
  /** Latest transcript from the current speech-recognition session (for mic-used tracking). */
  const lastVoiceTranscriptRef = useRef('');
  /** True → next send counts as using the mic (cleared after send or if input cleared). */
  const voiceLatchRef = useRef(false);

  useEffect(() => {
    api.get(`/interviews/${token}`)
      .then(r => setInterview(r.data))
      .catch(e => {
        if (e.response?.status === 410) setError('already_completed');
        else setError('not_found');
      });
  }, [token]);

  const scrollDown = () => setTimeout(() => {
    msgsRef.current?.scrollTo({ top: msgsRef.current.scrollHeight, behavior:'smooth' });
  }, 50);

  const startInterview = async () => {
    setLoading(true);
    try {
      await api.post(`/interviews/${token}/profile`, { ...profile, anon });
      const { data } = await api.post(`/interviews/${token}/message`, { messages: [], signal:'start' });
      setMessages([{ role:'assistant', content: visibleMessageContent('assistant', data.reply) }]);
      setPq(1); setScreen(SCREENS.CHAT); scrollDown();
    } catch { setError('Failed to start — please try again'); }
    finally { setLoading(false); }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading || isDone) return;
    const userMsg = { role:'user', content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated); setInput('');
    if (taRef.current) taRef.current.style.height = 'auto';
    setLoading(true); scrollDown();

    const numQ = interview?.survey?.numQ || 5;
    const signal = pq >= numQ ? 'at_limit' : 'message';

    const voiceUsedThisTurn = voiceLatchRef.current;
    voiceLatchRef.current = false;

    try {
      const { data } = await api.post(`/interviews/${token}/message`, {
        messages: updated.map(m => ({ role:m.role, content:m.content })),
        signal,
        voiceUsedThisTurn,
      });
      const finalMsgs = [...updated, { role:'assistant', content: visibleMessageContent('assistant', data.reply) }];
      setMessages(finalMsgs);
      if (!data.isClarify) setPq(p => p + 1);
      if (data.isDone) {
        setIsDone(true);
        setTimeout(() => { setInputVisible(false); }, 400);
        setTimeout(() => setScreen(SCREENS.DONE), 2800);
      }
      scrollDown();
    } catch (e) {
      if (voiceUsedThisTurn) voiceLatchRef.current = true;
      if (e.response?.status === 402) {
        setMessages(m => [...m, { role:'system', content:'Interview limit reached. Please upgrade to continue.' }]);
      } else {
        setInput(text); // restore
        setMessages(m => [...m, { role:'system', content:'Connection issue — tap send to try again.' }]);
      }
    } finally { setLoading(false); }
  };

  const toggleVoice = () => {
    if (recStatus === 'recording') { recogRef.current?.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice not supported in this browser — please type.'); return; }
    const recog = new SR(); recogRef.current = recog;
    recog.continuous = false; recog.interimResults = true; recog.lang = 'en-US';
    lastVoiceTranscriptRef.current = '';
    recog.onstart   = () => { setRecStatus('recording'); setInput(''); lastVoiceTranscriptRef.current = ''; };
    recog.onresult  = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join('');
      lastVoiceTranscriptRef.current = t;
      const last = e.results[e.results.length - 1];
      if (last?.isFinal && t.trim()) voiceLatchRef.current = true;
      setInput(t);
      if (taRef.current) {
        taRef.current.style.height = 'auto';
        taRef.current.style.height = `${Math.min(taRef.current.scrollHeight, 100)}px`;
      }
    };
    recog.onend     = () => {
      if (lastVoiceTranscriptRef.current.trim()) voiceLatchRef.current = true;
      setRecStatus('processing');
      setTimeout(() => setRecStatus('idle'), 500);
    };
    recog.onerror   = () => { setRecStatus('idle'); };
    recog.start();
  };

  const m = interview ? (MODES[interview.survey?.mode] || MODES.founder) : MODES.founder;
  const numQ = interview?.survey?.numQ || 5;
  const pct  = Math.min((pq / numQ) * 100, 100);
  const isResearcherTest = !!interview?.isPreview;

  // Error screens
  if (error === 'not_found') return <ErrorScreen msg="This interview link is no longer active. Ask the researcher to share a new link." />;
  if (error === 'already_completed') return <ErrorScreen msg="You have already completed this interview. Thank you for your time." />;
  if (!interview && !error) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}><span style={{ width:20, height:20, border:'2px solid var(--b2)', borderTopColor:m.color, borderRadius:'50%', animation:'spin .65s linear infinite', display:'block' }} /></div>;

  return (
    <div style={{ minHeight:'100vh', width:'100%', background:'var(--s1)' }}>
      <div style={{
        width:'100%',
        maxWidth: 720,
        margin:'0 auto',
        minHeight:'100dvh',
        background:'var(--white)',
        display:'flex',
        flexDirection:'column',
        boxSizing:'border-box',
      }}>

        {/* WELCOME */}
        {screen === SCREENS.WELCOME && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', animation:'fadeUp .3s ease' }}>
            <TopBar m={m} isResearcherTest={isResearcherTest} />
            <div style={{ flex:1, overflowY:'auto', padding:'20px 18px 16px', display:'flex', flexDirection:'column' }}>
              {isResearcherTest && (
                <div style={{ fontSize:12, color:'var(--t1)', background:m.light, border:`1.5px solid ${m.border}`, borderRadius:10, padding:'10px 12px', marginBottom:12, lineHeight:1.55 }}>
                  <strong>Researcher test session.</strong> Nothing here is shown to participants as a real response. Use it to see how questions are generated, then delete the test from Results if you like.
                </div>
              )}
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, background:m.light, border:`1.5px solid ${m.border}`, borderRadius:20, padding:'3px 10px', marginBottom:14, alignSelf:'flex-start' }}>
                <span style={{ width:4, height:4, borderRadius:'50%', background:m.color, animation:'pulse 2s infinite' }} />
                {m.label}
              </div>
              <div style={{ fontFamily:'var(--fd)', fontSize:22, marginBottom:8, lineHeight:1.2 }}>You've been invited to <em style={{ color:m.color }}>share your experience</em></div>
              {interview?.survey?.title && (
                <div style={{ background:m.light, border:`1.5px solid ${m.border}`, borderLeft:`3px solid ${m.color}`, borderRadius:10, padding:'11px 14px', marginBottom:14, fontFamily:'var(--fd)', fontStyle:'italic', fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>
                  {interview.survey.title}
                </div>
              )}
              <p style={{ fontSize:13, color:'var(--t2)', marginBottom:10, lineHeight:1.65 }}>A short conversation — no right answers. We want your real experience.</p>
              <p style={{ fontSize:12, color:m.color, marginBottom:16, lineHeight:1.55, fontWeight:500 }}>{m.participantTagline || 'No login required — optional details, then chat.'}</p>
              <InfoCard title="About 10 minutes" sub="Answer at your own pace, type or speak"><WelcomeInfoIcon variant="time" color={m.color} /></InfoCard>
              <InfoCard title="No right answers" sub="Honest responses are the most valuable"><WelcomeInfoIcon variant="honest" color={m.color} /></InfoCard>
              <InfoCard title="Your answers are private" sub="Used only for research purposes"><WelcomeInfoIcon variant="private" color={m.color} /></InfoCard>
              <div onClick={() => setAnon(!anon)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:10, padding:'10px 13px', marginTop:6, marginBottom:14, cursor:'pointer' }}>
                <div><div style={{ fontSize:12, fontWeight:600 }}>Stay anonymous</div><div style={{ fontSize:10, color:'var(--t3)' }}>Your name won't appear in the report</div></div>
                <Toggle on={anon} color={m.color} />
              </div>
              <button onClick={() => setScreen(SCREENS.PROFILE)} style={{ ...ctaBtn, background:m.color, marginTop:'auto' }}>I'm ready →</button>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {screen === SCREENS.PROFILE && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', animation:'fadeUp .3s ease' }}>
            <TopBar m={m} isResearcherTest={isResearcherTest} />
            <div style={{ flex:1, overflowY:'auto', padding:'20px 18px 80px' }}>
              <div style={{ fontFamily:'var(--fd)', fontSize:20, marginBottom:5 }}>A few quick details</div>
              <p style={{ fontSize:12, color:'var(--t2)', marginBottom:16, lineHeight:1.6 }}>Skip anything you like. This only helps the interviewer ask smarter questions.</p>
              {!anon && <PField label="Name" placeholder="First name or alias" onChange={v => setProfile(p=>({...p,name:v}))} />}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                <PField label="Age" placeholder="e.g. 27" onChange={v => setProfile(p=>({...p,age:v}))} />
                <PField label="Location" placeholder="City" onChange={v => setProfile(p=>({...p,location:v}))} />
              </div>
              <DynamicProfileFields modeKey={interview?.survey?.mode} setProfile={setProfile} />
              <PField label="Anything to share before we start? (optional)" placeholder="Any context that might help…" multiline onChange={v => setProfile(p=>({...p,context:v}))} />
            </div>
            <div style={{ padding:'11px 18px', paddingBottom:'max(11px, env(safe-area-inset-bottom))', borderTop:'1.5px solid var(--b1)', background:'rgba(255,255,255,.95)', backdropFilter:'blur(12px)' }}>
              <button onClick={startInterview} disabled={loading} style={{ ...ctaBtn, background:m.color }}>
                {loading ? <span style={{ width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .65s linear infinite',display:'inline-block' }} /> : null}
                {loading ? 'Starting…' : 'Begin interview →'}
              </button>
            </div>
          </div>
        )}

        {/* CHAT */}
        {screen === SCREENS.CHAT && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', animation:'fadeIn .25s ease' }}>
            {/* Chat top bar */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1.5px solid var(--b1)', background:'var(--white)', flexShrink:0 }}>
              <div style={{ fontFamily:'var(--fd)', fontSize:15, fontWeight:500 }}>Candor</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:110, height:2, background:'var(--b1)', borderRadius:1, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:m.color, borderRadius:1, transition:'width .4s' }} />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={msgsRef} style={{ flex:1, overflowY:'auto', padding:'12px 14px 6px', display:'flex', flexDirection:'column', gap:10 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display:'flex', gap:7, flexDirection:msg.role==='user'?'row-reverse':'row', animation:'msgIn .22s ease both' }}>
                  {msg.role !== 'system' && (
                    <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fm)', fontSize:9, alignSelf:'flex-start', marginTop:2, ...(msg.role==='user' ? { background:m.light, border:`1.5px solid ${m.border}`, color:m.color } : { background:'var(--s1)', border:'1.5px solid var(--b1)', color:'var(--t3)' }) }}>
                      {msg.role === 'user' ? (profile.name?profile.name[0].toUpperCase():(anon?'A':'Y')) : 'AI'}
                    </div>
                  )}
                  <div style={{ maxWidth:'82%', padding:'10px 13px', borderRadius:14, fontSize:13, lineHeight:1.6,
                    ...(msg.role==='user' ? { background:m.color, color:'white', fontWeight:500, borderTopRightRadius:3 } :
                       msg.role==='system' ? { background:'var(--s1)', color:'var(--t3)', fontStyle:'italic', fontSize:12 } :
                       { background:'var(--s1)', border:'1.5px solid var(--b1)', color:'var(--t1)', borderTopLeftRadius:3 }) }}>
                    {visibleMessageContent(msg.role, msg.content)}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:7 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--s1)', border:'1.5px solid var(--b1)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)' }}>AI</div>
                  <div style={{ background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:14, borderTopLeftRadius:3, padding:'10px 14px', display:'flex', gap:3, alignItems:'center' }}>
                    {[0,150,300].map(d => <span key={d} style={{ width:5, height:5, borderRadius:'50%', background:'var(--t3)', animation:`bounce 1.1s ${d}ms ease-in-out infinite`, display:'inline-block' }} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            {inputVisible && (
              <div style={{ flexShrink:0, padding:'10px 14px', paddingBottom:'max(10px,env(safe-area-inset-bottom))', borderTop:'1.5px solid var(--b1)', background:'rgba(255,255,255,.95)', backdropFilter:'blur(12px)', opacity: isDone ? 0 : 1, transition:'opacity .4s' }}>
                {recStatus === 'recording' && (
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--fm)', fontSize:9, color:'var(--err)', marginBottom:5 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--err)', animation:'pulse 1.2s infinite' }} />
                    Listening — tap mic to stop
                  </div>
                )}
                <div style={{ display:'flex', alignItems:'flex-end', gap:7, background:'var(--s1)', border:`1.5px solid ${input?m.border:'var(--b1)'}`, borderRadius:12, padding:'8px 10px', transition:'border-color .15s' }}>
                  <textarea ref={taRef} value={input} onChange={(e) => {
                    const v = e.target.value;
                    if (!v.trim()) voiceLatchRef.current = false;
                    setInput(v);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                  }}
                    onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(input);} }}
                    placeholder="Type or tap the mic to speak…"
                    rows={1} style={{ flex:1, background:'none', border:'none', outline:'none', fontFamily:'var(--fb)', fontSize:14, color:'var(--t1)', resize:'none', minHeight:22, maxHeight:100, lineHeight:1.5 }} />
                  <button onClick={toggleVoice} style={{ width:30, height:30, borderRadius:8, border:`1.5px solid var(--b2)`, background: recStatus==='recording'?'var(--err-l)':recStatus==='processing'?m.light:'var(--s2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:'pointer', animation:recStatus==='recording'?'recPulse 1.2s ease-in-out infinite':undefined }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="4" y="1" width="4" height="6" rx="2" stroke={recStatus==='recording'?'var(--err)':recStatus==='processing'?m.color:'var(--t2)'} strokeWidth="1.3"/><path d="M2 6.5a4 4 0 008 0" stroke={recStatus==='recording'?'var(--err)':recStatus==='processing'?m.color:'var(--t2)'} strokeWidth="1.3" strokeLinecap="round"/><path d="M6 10.5v1" stroke={recStatus==='recording'?'var(--err)':recStatus==='processing'?m.color:'var(--t2)'} strokeWidth="1.3" strokeLinecap="round"/></svg>
                  </button>
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading} style={{ width:30, height:30, background:input.trim()&&!loading?m.color:'var(--s3)', border:'none', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor:input.trim()&&!loading?'pointer':'not-allowed', transition:'all .15s' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 6h10M11 6L7.5 2.5M11 6L7.5 9.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DONE */}
        {screen === SCREENS.DONE && (
          <div style={{ display:'flex', flexDirection:'column', height:'100%', animation:'fadeIn .4s ease' }}>
            <TopBar m={m} isResearcherTest={isResearcherTest} />
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'28px 22px', textAlign:'center' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:m.light, border:`2px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, animation:'checkIn .5s .3s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12l5 5L20 7" stroke={m.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div style={{ fontFamily:'var(--fd)', fontSize:24, marginBottom:8, animation:'fadeUp .5s .4s both', opacity:0 }}>Interview complete.</div>
              <p style={{ fontSize:13, color:'var(--t2)', marginBottom:20, maxWidth:280, lineHeight:1.65, animation:'fadeUp .5s .5s both', opacity:0 }}>
                {isResearcherTest
                  ? 'Test session saved for your review only. It is excluded from participant results. You can delete it from the Results page in your dashboard.'
                  : 'Your responses have been recorded. Thank you for your honesty and time.'}
              </p>
              <div style={{ background:m.light, border:`1.5px solid ${m.border}`, borderLeft:`3px solid ${m.color}`, borderRadius:10, padding:'13px 15px', textAlign:'left', width:'100%', marginBottom:14, animation:'fadeUp .5s .55s both', opacity:0 }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, marginBottom:5 }}>What happens next</div>
                <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.6, fontFamily:'var(--fd)', fontStyle:'italic' }}>
                  {isResearcherTest
                    ? 'Open Results in Candor to remove this test run or run another test with a fresh link.'
                    : 'Your responses are being synthesised alongside others. The patterns you helped reveal will directly shape what gets built or changed.'}
                </div>
              </div>
              {isResearcherTest && (
                <button type="button" onClick={() => window.close()} style={{ width:'100%', padding:13, background:m.color, color:'white', border:'none', borderRadius:10, fontFamily:'var(--fb)', fontSize:13, fontWeight:700, cursor:'pointer', animation:'fadeUp .5s .6s both', opacity:0 }}>
                  Close tab →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DynamicProfileFields({ modeKey, setProfile }) {
  const sm = MODES[modeKey] || MODES.founder;
  const fields = sm.profileFields || [];
  if (fields.length === 0) return null;
  if (fields.length === 1) {
    const f = fields[0];
    return (
      <PField key={f.key} label={f.lbl} placeholder={f.ph} onChange={v => setProfile(p => ({ ...p, [f.key]: v }))} />
    );
  }
  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
        <PField label={fields[0].lbl} placeholder={fields[0].ph} onChange={v => setProfile(p => ({ ...p, [fields[0].key]: v }))} />
        <PField label={fields[1].lbl} placeholder={fields[1].ph} onChange={v => setProfile(p => ({ ...p, [fields[1].key]: v }))} />
      </div>
      {fields[2] && (
        <PField label={fields[2].lbl} placeholder={fields[2].ph} onChange={v => setProfile(p => ({ ...p, [fields[2].key]: v }))} />
      )}
    </>
  );
}

function TopBar({ m, isResearcherTest }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1.5px solid var(--b1)', background:'var(--white)', flexShrink:0 }}>
      <div style={{ fontFamily:'var(--fd)', fontSize:15, fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
        <CandorLogoMark size={22} title="Candor" style={{ flexShrink: 0 }} />
        Candor
      </div>
      <span style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', background:'var(--s1)', border:'1px solid var(--b1)', borderRadius:20, padding:'2px 9px' }}>
        {isResearcherTest ? 'Researcher test' : 'No login · Private'}
      </span>
    </div>
  );
}

function InfoCard({ title, sub, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:11, padding:'10px 12px', marginBottom:8 }}>
      <div style={{ width:28, height:28, borderRadius:7, background:'var(--white)', border:'1.5px solid var(--b1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        {children}
      </div>
      <div><div style={{ fontSize:12, fontWeight:600, marginBottom:1 }}>{title}</div><div style={{ fontSize:11, color:'var(--t3)', lineHeight:1.4 }}>{sub}</div></div>
    </div>
  );
}

function PField({ label, placeholder, onChange, multiline }) {
  return (
    <div style={{ marginBottom:10 }}>
      <label style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t3)', display:'block', marginBottom:4 }}>{label}</label>
      {multiline
        ? <textarea placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={pInputStyle} rows={2} />
        : <input type="text" placeholder={placeholder} onChange={e=>onChange(e.target.value)} style={pInputStyle} />}
    </div>
  );
}

function Toggle({ on, color }) {
  return (
    <div style={{ width:36, height:20, borderRadius:10, background:on?color:'var(--s2)', border:`1px solid ${on?color:'var(--b2)'}`, position:'relative', transition:'all .2s', flexShrink:0 }}>
      <div style={{ width:14, height:14, background:on?'white':'var(--t3)', borderRadius:'50%', position:'absolute', top:2, left:on?18:2, transition:'all .2s', boxShadow:'0 1px 3px rgba(28,25,23,.2)' }} />
    </div>
  );
}

function ErrorScreen({ msg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)', padding:32, textAlign:'center' }}>
      <div>
        <div style={{ width:52, height:52, borderRadius:14, background:'var(--err-l)', border:'1.5px solid var(--err-b)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="var(--err)" strokeWidth="1.5"/><path d="M11 7v5m0 4v.5" stroke="var(--err)" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
        <div style={{ fontFamily:'var(--fd)', fontSize:22, marginBottom:8 }}>Interview unavailable</div>
        <p style={{ fontSize:14, color:'var(--t2)', lineHeight:1.7, maxWidth:320 }}>{msg}</p>
      </div>
    </div>
  );
}

const ctaBtn = { width:'100%', padding:13, color:'white', fontFamily:'var(--fb)', fontSize:14, fontWeight:700, border:'none', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'all .15s' };
const pInputStyle = { width:'100%', fontFamily:'var(--fb)', fontSize:12, color:'var(--t1)', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:8, padding:'9px 11px', outline:'none', resize:'none' };
