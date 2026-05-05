import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from 'shared/api';
import { MODES, MODE_ORDER } from 'shared/modes';
import { LandingModeIcon } from 'features/marketing/landingIcons';

const inputStyle = { width:'100%', fontFamily:'var(--fb)', fontSize:13, color:'var(--t1)', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:9, padding:'10px 13px', outline:'none' };
const errorStyle = { fontSize:12, color:'var(--err)', background:'var(--err-l)', border:'1.5px solid var(--err-b)', borderRadius:8, padding:'8px 12px', marginBottom:14, marginTop:8 };

/** Paired columns — light outline */
function suggestFieldsButtonStyle(m, loading) {
  return {
    fontFamily: 'var(--fm)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    padding: '8px 14px',
    borderRadius: 20,
    border: `1.5px solid ${m.border}`,
    color: m.color,
    background: m.light,
    cursor: loading ? 'wait' : 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    opacity: loading ? 0.88 : 1,
  };
}

/** Depth + recruit — filled */
function suggestDepthButtonStyle(m, loading) {
  return {
    fontFamily: 'var(--fm)',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    padding: '8px 14px',
    borderRadius: 20,
    border: `1.5px solid ${m.color}`,
    color: '#fff',
    background: m.color,
    cursor: loading ? 'wait' : 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    opacity: loading ? 0.88 : 1,
  };
}

export default function NewSurveyPage() {
  const modeFromUrlApplied = useRef(false);
  const [step, setStep]         = useState(1);
  const [mode, setMode]         = useState(null);
  const [values, setValues]     = useState({});
  const [numQ, setNumQ]         = useState(5);
  const [suggest, setSuggest]   = useState(null);
  /** null | 'fields' | 'depth' — only one AI request at a time */
  const [suggestBusy, setSuggestBusy] = useState(null);
  const [fieldReasoning, setFieldReasoning] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const m = mode ? MODES[mode] : null;

  useEffect(() => {
    if (modeFromUrlApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('mode');
    if (raw && MODES[raw]) {
      modeFromUrlApplied.current = true;
      setMode(raw);
      setValues({});
      setStep(2);
      setSuggest(null);
      setFieldReasoning('');
      setError('');
    }
  }, []);

  const setVal = useCallback((id) => (e) => {
    setValues(v => ({ ...v, [id]: e.target.value }));
  }, []);

  const { nonpairs, pairs, custom } = useMemo(() => {
    if (!m) return { nonpairs: [], pairs: [], custom: null };
    const fields = m.setupFields;
    return {
      nonpairs: fields.filter(f => !f.pair && f.id !== 'custom'),
      pairs:    fields.filter(f => f.pair),
      custom:   fields.find(f => f.id === 'custom'),
    };
  }, [m]);

  const firstFieldId = m?.setupFields.find(f => f.type === 'textarea' || f.type === 'text')?.id;
  const topicForSuggest = m && m.suggestKey ? (values[m.suggestKey] || '').trim() : '';

  const buildSuggestPayload = useCallback(() => {
    const targetHint = values.target || values.criteria || values.focus || values.touchpoint || '';
    const ctx = {};
    m.setupFields.forEach((f) => {
      const v = values[f.id];
      if (v != null && String(v).trim()) ctx[f.id] = String(v).trim();
    });
    return { targetHint, ctx };
  }, [m, values]);

  const handleSuggestFields = async () => {
    if (!topicForSuggest || topicForSuggest.length < 10) {
      setError('Add your main topic first (10+ characters).');
      return;
    }
    setSuggestBusy('fields');
    setError('');
    try {
      const { targetHint, ctx } = buildSuggestPayload();
      const { data } = await api.post('/ai/suggest', {
        mode,
        topic: topicForSuggest,
        target: targetHint,
        context: ctx,
        scope: 'fields',
      });
      const keys = m.suggestFieldKeys || [];
      const incoming = data.fields && typeof data.fields === 'object' ? data.fields : {};
      setValues((prev) => {
        const next = { ...prev };
        keys.forEach((k) => {
          const v = incoming[k];
          if (v != null && String(v).trim() !== '') next[k] = String(v).trim();
        });
        return next;
      });
      setFieldReasoning(data.fieldReasoning || '');
    } catch {
      setError('Could not suggest fields');
    } finally {
      setSuggestBusy(null);
    }
  };

  const handleSuggestDepth = async () => {
    if (!topicForSuggest || topicForSuggest.length < 10) {
      setError('Add your main topic first (10+ characters).');
      return;
    }
    setSuggestBusy('depth');
    setError('');
    try {
      const { targetHint, ctx } = buildSuggestPayload();
      const { data } = await api.post('/ai/suggest', {
        mode,
        topic: topicForSuggest,
        target: targetHint,
        context: ctx,
        scope: 'depth',
      });
      const n = Number(data.questions);
      if (!Number.isNaN(n) && n >= 3 && n <= 15) setNumQ(n);
      setSuggest({
        reasoning: data.reasoning || '',
        recruitIdeas: Array.isArray(data.recruitIdeas) ? data.recruitIdeas : [],
      });
    } catch {
      setError('Could not suggest depth');
    } finally {
      setSuggestBusy(null);
    }
  };

  const buildConfig = () => {
    const out = {};
    m.setupFields.forEach(f => {
      const v = values[f.id];
      if (v && String(v).trim()) out[f.id] = String(v).trim();
    });
    return out;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const main = firstFieldId ? (values[firstFieldId] || '').trim() : '';
    if (!main || main.length < 5) { setError('Please fill in the required fields'); return; }
    setLoading(true); setError('');
    try {
      const config = buildConfig();
      const { data } = await api.post('/surveys', { mode, config, numQ: parseInt(numQ, 10) || 5 });
      navigate(`/app/surveys/${data.survey._id}`);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create survey'); }
    finally { setLoading(false); }
  };

  // Step 1: mode grid
  if (step === 1) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 64px' }}>
        <div style={{ fontFamily:'var(--fd)', fontSize:26, marginBottom:6 }}>New survey</div>
        <p style={{ fontSize:13, color:'var(--t2)', marginBottom:28, maxWidth:480 }}>Pick a mode. You write the topic; AI can suggest supporting fields and depth.</p>
        <div style={{ fontFamily:'var(--fm)', fontSize:10, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t3)', textAlign:'center', marginBottom:20 }}>Survey type</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
          {MODE_ORDER.map(key => {
            const mm = MODES[key];
            return (
              <div key={key} onClick={() => { setMode(key); setValues({}); setStep(2); setSuggest(null); setFieldReasoning(''); setError(''); }} style={{
                background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:20, padding:'24px 20px', cursor:'pointer', transition:'all .18s',
              }}
                onMouseOver={e => { e.currentTarget.style.borderColor = mm.border; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sh2)'; }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width:44, height:44, borderRadius:12, background:mm.light, border:`1.5px solid ${mm.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, color:mm.color }}>
                  <LandingModeIcon mode={key} />
                </div>
                <div style={{ fontFamily:'var(--fd)', fontSize:18, marginBottom:6 }}>{mm.label}</div>
                <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.5, marginBottom:12 }}>{mm.desc}</div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {(mm.tags || []).map(t => <span key={t} style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', padding:'3px 9px', borderRadius:20, border:`1px solid ${mm.border}`, color:mm.color, background:mm.light }}>{t}</span>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 2
  return (
    <div className="survey-page">
      <button type="button" onClick={() => { setStep(1); setError(''); }} style={{ background:'none', border:'none', color:'var(--t3)', fontSize:13, cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:5 }}>
        ← Modes
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, background:m.light, border:`1px solid ${m.border}`, borderRadius:20, padding:'3px 10px' }}>{m.label}</span>
      </div>
      <div style={{ fontFamily:'var(--fd)', fontSize:26, marginBottom:6 }}>Set up your <em style={{ color:m.color }}>survey</em></div>
      <p style={{ fontSize:13, color:'var(--t2)', marginBottom:20 }}>Suggest fields fills the pair; suggest depth sets max exchanges and recruit ideas.</p>

      <form onSubmit={handleSubmit}>
        {nonpairs.map((f) => (
          <Card key={f.id}>
            <Label>{f.lbl}{f.opt ? <span style={{ color:'var(--t4)', fontWeight:400 }}> (optional)</span> : ' *'}</Label>
            {f.help ? <FieldHelp>{f.help}</FieldHelp> : null}
            {f.type === 'textarea'
              ? <textarea value={values[f.id] ?? ''} onChange={setVal(f.id)} placeholder={f.ph} style={{ ...inputStyle, height:f.h || 80, resize:'none' }} />
              : <input type="text" value={values[f.id] ?? ''} onChange={setVal(f.id)} placeholder={f.ph} style={inputStyle} />}
          </Card>
        ))}

        {pairs.length >= 2 && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <Label style={{ margin: 0 }}>{m.suggestPairsCardTitle || 'Supporting fields'}</Label>
                <p className="survey-field-help" style={{ marginTop: 6 }}>
                  Fills both inputs from your main topic only—does not change depth or recruit ideas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSuggestFields}
                disabled={suggestBusy !== null}
                aria-busy={suggestBusy === 'fields'}
                style={suggestFieldsButtonStyle(m, suggestBusy === 'fields')}
              >
                {suggestBusy === 'fields' ? '…' : 'Suggest fields'}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {pairs.map((f) => (
                <div key={f.id}>
                  <Label>{f.lbl}</Label>
                  {f.help ? <FieldHelp>{f.help}</FieldHelp> : null}
                  <input type="text" value={values[f.id] ?? ''} onChange={setVal(f.id)} placeholder={f.ph} style={inputStyle} />
                </div>
              ))}
            </div>
            {fieldReasoning ? (
              <div style={{ marginTop: 12, padding: '10px 12px', background: m.light, border: `1px solid ${m.border}`, borderRadius: 10, fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>
                <span style={{ fontFamily: 'var(--fm)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: m.color, display: 'block', marginBottom: 4 }}>Note</span>
                {fieldReasoning}
              </div>
            ) : null}
          </Card>
        )}

        {custom && (
          <Card>
            <Label>{custom.lbl} <span style={{ color:'var(--t4)', fontWeight:400 }}>(optional)</span></Label>
            {custom.help ? <FieldHelp>{custom.help}</FieldHelp> : null}
            <textarea value={values.custom ?? ''} onChange={setVal('custom')} placeholder={custom.ph} style={{ ...inputStyle, height:custom.h || 72, resize:'none' }} />
          </Card>
        )}

        <Card>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0 }}>
              <Label style={{ margin: 0 }}>Survey parameters</Label>
              {m.paramsIntro ? (
                <p className="survey-field-help" style={{ marginTop: 6 }}>{m.paramsIntro}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleSuggestDepth}
              disabled={suggestBusy !== null}
              aria-busy={suggestBusy === 'depth'}
              style={suggestDepthButtonStyle(m, suggestBusy === 'depth')}
            >
              {suggestBusy === 'depth' ? '…' : 'Suggest depth'}
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom: 8 }}>
            <Label style={{ margin:0 }}>Conversation depth (max)</Label>
            <input type="number" min={3} max={15} value={numQ} onChange={(e) => setNumQ(e.target.value)} style={{ ...inputStyle, width:70 }} />
            <span style={{ fontSize:12, color:'var(--t3)' }}>~ exchanges</span>
          </div>
          <FieldHelp>Max turns per session. The AI may finish sooner if it has enough signal.</FieldHelp>
          {suggest && (suggest.reasoning || (suggest.recruitIdeas && suggest.recruitIdeas.length)) ? (
            <div style={{ marginTop:14, background:m.light, border:`1.5px solid ${m.border}`, borderRadius:12, padding:'14px 16px' }}>
              {suggest.reasoning ? (
                <>
                  <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, marginBottom:10 }}>Why this depth</div>
                  <div style={{ fontSize:11, color:'var(--t2)', lineHeight:1.5, marginBottom: suggest.recruitIdeas?.length ? 10 : 0 }}>{suggest.reasoning}</div>
                </>
              ) : null}
              {suggest.recruitIdeas && suggest.recruitIdeas.length > 0 ? (
                <>
                  <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, marginBottom:8 }}>Recruit ideas</div>
                  <ul style={{ margin:0, paddingLeft:16, fontSize:11, color:'var(--t2)', lineHeight:1.5 }}>
                    {suggest.recruitIdeas.map((r, i) => (
                      <li key={i} style={{ marginBottom:6 }}>
                        <strong style={{ color:'var(--t1)' }}>{r.profile || 'Profile'}</strong>
                        {r.why ? <span> — {r.why}</span> : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          ) : null}
        </Card>

        {error && <div style={errorStyle}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding:'12px 24px', background:m.color, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
          {loading && <span style={{ width:13, height:13, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin .65s linear infinite', display:'inline-block' }} />}
          {loading ? 'Building framework…' : 'Create survey →'}
        </button>
      </form>
    </div>
  );
}

function Card({ children }) {
  return <div style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:14, padding:'16px 18px', marginBottom:10 }}>{children}</div>;
}
function Label({ children, style }) {
  return <label style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t2)', display:'block', marginBottom:6, ...style }}>{children}</label>;
}

function FieldHelp({ children }) {
  return <p className="survey-field-help">{children}</p>;
}
