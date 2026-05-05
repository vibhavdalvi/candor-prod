import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from 'shared/api';
import { MODES } from 'shared/modes';
import { useAuthStore } from 'store/authStore';

const inputStyle = { width:'100%', fontFamily:'var(--fb)', fontSize:13, color:'var(--t1)', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:9, padding:'10px 13px', outline:'none' };
const errorStyle = { fontSize:12, color:'var(--err)', background:'var(--err-l)', border:'1.5px solid var(--err-b)', borderRadius:8, padding:'8px 12px', marginBottom:14, marginTop:8 };

export default function EditSurveyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const init = useAuthStore((s) => s.init);
  const [survey, setSurvey] = useState(null);
  const [values, setValues] = useState({});
  const [title, setTitle] = useState('');
  const [numQ, setNumQ] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/surveys/${id}`)
      .then((r) => {
        if (cancelled) return;
        const s = r.data.survey;
        setSurvey(s);
        setTitle(s.title || '');
        setNumQ(s.numQ || 5);
        setValues({ ...(s.config || {}) });
      })
      .catch(() => { if (!cancelled) setError('Could not load survey'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const m = survey ? (MODES[survey.mode] || MODES.founder) : null;
  const lockedKey = m?.suggestKey;
  const setVal = useCallback((fid) => (e) => {
    setValues((v) => ({ ...v, [fid]: e.target.value }));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!survey) return;
    setSaving(true);
    setError('');
    try {
      const config = {};
      m.setupFields.forEach((f) => {
        if (f.id === lockedKey) return;
        const raw = values[f.id];
        config[f.id] = raw != null ? String(raw) : '';
      });
      await api.patch(`/surveys/${id}`, { title: title.trim(), numQ: parseInt(numQ, 10) || 5, config });
      await init();
      navigate(`/app/surveys/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="app-loading">Loading survey</div>;
  if (!survey || !m) return <div className="app-page">Survey not found</div>;

  const { nonpairs, pairs, custom } = (() => {
    const fields = m.setupFields;
    return {
      nonpairs: fields.filter((f) => !f.pair && f.id !== 'custom'),
      pairs: fields.filter((f) => f.pair),
      custom: fields.find((f) => f.id === 'custom'),
    };
  })();

  const lockedField = m.setupFields.find((f) => f.id === lockedKey);

  return (
    <div className="survey-page">
      <button type="button" onClick={() => navigate(`/app/surveys/${id}`)} style={{ background:'none', border:'none', color:'var(--t3)', fontSize:13, cursor:'pointer', marginBottom:16, display:'flex', alignItems:'center', gap:5 }}>
        ← Back
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:m.color, background:m.light, border:`1px solid ${m.border}`, borderRadius:20, padding:'3px 10px' }}>{m.label}</span>
      </div>
      <div style={{ fontFamily:'var(--fd)', fontSize:26, marginBottom:6 }}>Edit <em style={{ color:m.color }}>details</em></div>
      <p className="survey-field-help" style={{ marginBottom: 16 }}>
        Supporting fields and depth only. {lockedField?.lbl || 'Core topic'} is fixed—new survey for a new topic.
      </p>

      <form onSubmit={handleSave}>
        <Card>
          <Label>Survey title</Label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </Card>

        {lockedField && (
          <Card>
            <Label>{lockedField.lbl} <span style={{ color:'var(--t3)', fontWeight:400 }}>(locked)</span></Label>
            {lockedField.help ? <FieldHelp>{lockedField.help}</FieldHelp> : null}
            <textarea readOnly value={values[lockedKey] || ''} style={{ ...inputStyle, height: lockedField.type === 'textarea' ? (lockedField.h || 80) : 44, resize:'none', opacity:0.92, cursor:'not-allowed' }} />
          </Card>
        )}

        {nonpairs.filter((f) => f.id !== lockedKey).map((f) => (
          <Card key={f.id}>
            <Label>{f.lbl}{f.opt ? <span style={{ color:'var(--t4)', fontWeight:400 }}> (optional)</span> : ''}</Label>
            {f.help ? <FieldHelp>{f.help}</FieldHelp> : null}
            {f.type === 'textarea'
              ? <textarea value={values[f.id] || ''} onChange={setVal(f.id)} placeholder={f.ph} style={{ ...inputStyle, height:f.h || 80, resize:'none' }} />
              : <input type="text" value={values[f.id] || ''} onChange={setVal(f.id)} placeholder={f.ph} style={inputStyle} />}
          </Card>
        ))}

        {pairs.length >= 2 && (
          <Card>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              {pairs.map((f) => (
                <div key={f.id}>
                  <Label>{f.lbl}</Label>
                  {f.help ? <FieldHelp>{f.help}</FieldHelp> : null}
                  <input type="text" value={values[f.id] || ''} onChange={setVal(f.id)} placeholder={f.ph} style={inputStyle} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {custom && (
          <Card>
            <Label>{custom.lbl} <span style={{ color:'var(--t4)', fontWeight:400 }}>(optional)</span></Label>
            {custom.help ? <FieldHelp>{custom.help}</FieldHelp> : null}
            <textarea value={values.custom || ''} onChange={setVal('custom')} placeholder={custom.ph} style={{ ...inputStyle, height:custom.h || 72, resize:'none' }} />
          </Card>
        )}

        <Card>
          <Label>Conversation depth (max)</Label>
          <FieldHelp>Max turns per session; the AI may end sooner.</FieldHelp>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="number" min={3} max={15} value={numQ} onChange={(e) => setNumQ(e.target.value)} style={{ ...inputStyle, width:70 }} />
            <span style={{ fontSize:12, color:'var(--t3)' }}>~ exchanges</span>
          </div>
        </Card>

        {error && <div style={errorStyle}>{error}</div>}
        <button type="submit" disabled={saving} style={{ padding:'12px 24px', background:m.color, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}

function Card({ children }) {
  return <div style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:14, padding:'16px 18px', marginBottom:10 }}>{children}</div>;
}
function Label({ children }) {
  return <label style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t2)', display:'block', marginBottom:6 }}>{children}</label>;
}

function FieldHelp({ children }) {
  return <p className="survey-field-help">{children}</p>;
}
