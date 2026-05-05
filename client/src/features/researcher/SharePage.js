import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import api from 'shared/api';
import { MODES } from 'shared/theme';
import { ShareWhereIcon, ShareUiIcon } from './shareChannelIcons';
import { useAuthStore } from 'store/authStore';

export default function SharePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initAuth = useAuthStore((s) => s.init);
  const [survey, setSurvey]   = useState(null);
  const [token, setToken]     = useState('');
  const [tab, setTab]         = useState('link');
  const [copied, setCopied]   = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api.get(`/surveys/${id}`)
      .then(r => {
        if (cancelled) return;
        setSurvey(r.data.survey);
        const pending = r.data.interviews.find(i => !i.isPreview && !i.completed && !i.profile?.name && !i.profile?.anon);
        if (pending) { setToken(pending.token); setLoading(false); }
        else {
          api.post(`/surveys/${id}/interviews`).then(r2 => {
            if (!cancelled) setToken(r2.data.token);
          }).finally(() => { if (!cancelled) setLoading(false); });
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (tab === 'qr' && token && canvasRef.current) {
      const url = `${window.location.origin}/i/${token}`;
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200, margin: 1, color: { dark: '#111827', light: '#ffffff' },
      });
    }
  }, [tab, token]);

  if (loading || !survey) return <div className="app-loading">Loading share page</div>;

  const m = MODES[survey.mode] || MODES.founder;
  const interviewUrl = `${window.location.origin}/i/${token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(interviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url;
    a.download = `candor-qr-${survey.title}.png`; a.click();
  };

  const deleteStudy = async () => {
    if (!window.confirm('Delete this study and all interviews/transcripts from the database? This cannot be undone.')) return;
    try {
      await api.delete(`/surveys/${id}`);
      await initAuth();
      navigate('/app');
    } catch (e) {
      alert(e.response?.data?.error || 'Could not delete study');
    }
  };

  const WHERE = {
    founder: [
      { label:'WhatsApp', desc:'Paste in a group or DM', icon:'whatsapp' },
      { label:'Email', desc:'Include in an outreach', icon:'email' },
      { label:'LinkedIn', desc:'Add to your post caption', icon:'linkedin' },
      { label:'Slack', desc:'Drop in a channel', icon:'slack' },
    ],
    researcher: [
      { label:'Participant pool', desc:'Email lists, campus boards, panels', icon:'users' },
      { label:'Slack / Teams', desc:'Share with context in a channel', icon:'slack' },
      { label:'Survey recruitment', desc:'Link from screening form', icon:'clipboard' },
      { label:'Snowball', desc:'Ask participants to forward', icon:'forward' },
    ],
    product: [
      { label:'In-app message', desc:'Banner or modal after key actions', icon:'smartphone' },
      { label:'Email', desc:'Targeted to recent users', icon:'email' },
      { label:'SMS', desc:'Short link to mobile users', icon:'sms' },
      { label:'Community', desc:'Slack or Discord with context', icon:'messages' },
    ],
    event: [
      { label:'Last slide', desc:'QR on your closing slide', icon:'presentation' },
      { label:'Exit print', desc:'Poster at the door', icon:'poster' },
      { label:'WhatsApp', desc:'Drop in event chat', icon:'whatsapp' },
      { label:'Email follow-up', desc:'Within 30 minutes of wrap', icon:'email' },
    ],
    hr: [
      { label:'Slack / Teams', desc:'Anonymous survey bot or link', icon:'slack' },
      { label:'All-hands QR', desc:'Live slide during meeting', icon:'qr' },
      { label:'Email', desc:'Neutral subject line, explain anonymity', icon:'email' },
      { label:'SMS', desc:'If your org allows short links', icon:'sms' },
    ],
    csat: [
      { label:'Receipt / packaging', desc:'Print QR on the bill', icon:'receipt' },
      { label:'SMS', desc:'Text directly to customers', icon:'sms' },
      { label:'Post-purchase email', desc:'Add to your flow', icon:'email' },
      { label:'Point of sale', desc:'QR at checkout', icon:'store' },
    ],
  };

  return (
    <div className="survey-page" style={{ paddingTop: 36, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:22 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:m.light, border:`1.5px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke={m.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700 }}>Survey created</div>
          <div style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--t3)' }}>{survey.title.slice(0,52)}</div>
        </div>
      </div>

      <div style={{ fontFamily:'var(--fd)', fontSize:28, marginBottom:6 }}>Share your <em style={{ color:m.color }}>survey</em></div>
      <p style={{ fontSize:13, color:'var(--t2)', marginBottom:22 }}>Participants open your link on any device — no download, no login required.</p>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {['link','qr'].map(t => (
          <button key={t} type="button" onClick={() => setTab(t)} style={{
            flex:1, padding:10, borderRadius:9,
            border:`1.5px solid ${tab===t ? m.border : 'var(--b1)'}`,
            background: tab===t ? m.light : 'none',
            fontFamily:'var(--fm)', fontSize:10, textTransform:'uppercase', letterSpacing:'.07em',
            color: tab===t ? m.color : 'var(--t3)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:7,
          }}>
            <ShareUiIcon name={t === 'link' ? 'link' : 'qrcode'} color={tab === t ? m.color : 'var(--t3)'} />
            {t === 'link' ? 'Link' : 'QR'}
          </button>
        ))}
      </div>

      {/* Link panel */}
      {tab === 'link' && (
        <div style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:14, padding:20, marginBottom:12 }}>
          <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t3)', marginBottom:8 }}>Your interview link</div>
          <div style={{ background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:9, padding:'10px 14px', fontFamily:'var(--fm)', fontSize:11, color:'var(--t2)', wordBreak:'break-all', marginBottom:10 }}>{interviewUrl}</div>
          <button type="button" onClick={copyLink} style={{ width:'100%', padding:12, background:m.color, color:'white', border:'none', borderRadius:9, fontFamily:'var(--fb)', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {copied ? <><ShareUiIcon name="check" color="white" /><span>Copied!</span></> : <><ShareUiIcon name="link" color="white" /><span>Copy link</span></>}
          </button>
        </div>
      )}

      {/* QR panel */}
      {tab === 'qr' && (
        <div style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:14, padding:20, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
            <canvas ref={canvasRef} style={{ borderRadius:10, border:'1.5px solid var(--b1)', padding:10 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button type="button" onClick={downloadQR} style={{ ...ghostBtn, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <ShareUiIcon name="download" color="var(--t2)" />
              Download PNG
            </button>
            <button type="button" onClick={copyLink} style={{ ...ghostBtn, background:m.color, color:'white', border:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              {copied ? <><ShareUiIcon name="check" color="white" />Copied!</> : <><ShareUiIcon name="link" color="white" />Copy link</>}
            </button>
          </div>
        </div>
      )}

      {/* Where to share */}
      <div style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:14, padding:20, marginBottom:12 }}>
        <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t3)', marginBottom:10 }}>Where to share</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
          {WHERE[survey.mode]?.map(w => (
            <div key={w.label} style={{ display:'flex', gap:8, background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:9, padding:'9px 11px' }}>
              <div style={{ width:30, height:30, borderRadius:7, background:m.light, border:`1px solid ${m.border}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:m.color }}>
                <ShareWhereIcon name={w.icon} color={m.color} />
              </div>
              <div><div style={{ fontSize:11, fontWeight:600, marginBottom:1 }}>{w.label}</div><div style={{ fontSize:10, color:'var(--t3)' }}>{w.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* Waiting state */}
      <div style={{ background:m.light, border:`1.5px solid ${m.border}`, borderRadius:12, padding:'13px 16px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background:m.color, animation:'pulse 2s infinite', flexShrink:0 }} />
        <div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Waiting for responses</div>
          <div style={{ fontSize:12, color:'var(--t2)' }}>Results update automatically as participants complete their interview.</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:9, flexWrap:'wrap' }}>
        <button onClick={() => navigate(`/app/surveys/${id}/results`)} style={{ padding:'10px 18px', background:m.color, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          View results
        </button>
        <button type="button" onClick={async () => { try { const { data } = await api.post(`/surveys/${id}/preview-interview`); window.open(`${window.location.origin}/i/${data.token}`, '_blank', 'noopener,noreferrer'); } catch { alert('Could not start test session'); } }} style={ghostBtn}>
          Test interview flow
        </button>
        <button type="button" onClick={() => navigate(`/app/surveys/${id}/edit`)} style={ghostBtn}>
          Edit survey details
        </button>
        <button type="button" onClick={deleteStudy} style={{ ...ghostBtn, color:'var(--err)', borderColor:'var(--err-b)' }}>
          Delete study
        </button>
      </div>
    </div>
  );
}

const ghostBtn = { padding:'10px 16px', background:'none', border:'1.5px solid var(--b2)', borderRadius:9, fontFamily:'var(--fb)', fontSize:13, fontWeight:500, color:'var(--t2)', cursor:'pointer' };
