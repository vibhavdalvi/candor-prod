import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import api, { downloadSurveyExport } from 'shared/api';
import { visibleMessageContent } from 'shared/interviewDisplay';
import { MODES, INSIGHT_ICONS, INSIGHT_COLORS } from 'shared/theme';
import { ShareUiIcon } from './shareChannelIcons';
import { useAuthStore } from 'store/authStore';

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const initAuth = useAuthStore((s) => s.init);
  const [survey, setSurvey]         = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [synth, setSynth]           = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const dashRef = useRef(null);

  const load = useCallback(() => {
    api.get(`/surveys/${id}`).then(r => {
      setSurvey(r.data.survey);
      setInterviews(r.data.interviews || []);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const runSynthesis = async () => {
    setSynth(true);
    try {
      const { data } = await api.post(`/surveys/${id}/synthesise`);
      setSurvey(s => ({ ...s, synthesis: data.synthesis, saturationReached: true }));
    } catch (e) { alert(e.response?.data?.error || 'Synthesis failed'); }
    finally { setSynth(false); }
  };

  const downloadPNG = async () => {
    if (!dashRef.current) return;
    const url = await toPng(dashRef.current, { quality:1, pixelRatio:2, backgroundColor:'#f3f4f6' });
    const a = document.createElement('a'); a.download = `candor-${survey.title}.png`; a.href = url; a.click();
  };

  const downloadPDF = () => window.print();

  const openTestInterview = async () => {
    try {
      const { data } = await api.post(`/surveys/${id}/preview-interview`);
      window.open(`${window.location.origin}/i/${data.token}`, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Could not start a test session');
    }
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

  const deleteInterview = async (iv) => {
    if (!window.confirm('Delete this interview and its transcript? This cannot be undone.')) return;
    setDeletingId(iv._id);
    try {
      await api.delete(`/surveys/${id}/interviews/${iv._id}`);
      if (transcript?._id === iv._id) setTranscript(null);
      await load();
      await initAuth();
    } catch (e) {
      alert(e.response?.data?.error || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="app-loading">Loading results</div>;
  if (!survey) return <div className="app-page" style={{ color: 'var(--t3)' }}>Survey not found</div>;

  const m = MODES[survey.mode] || MODES.founder;
  const completed = interviews.filter((i) => i.completed && !i.isPreview);
  const previewSessions = interviews.filter((i) => i.isPreview);
  const syn = survey.synthesis;

  // Empty state (no real participant completions yet)
  if (!completed.length) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:40, textAlign:'center', maxWidth:440, margin:'0 auto' }}>
      <div style={{ width:56, height:56, borderRadius:'50%', background:m.light, border:`1.5px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <ShareUiIcon name="link" color={m.color} size={24} />
      </div>
      <div style={{ fontFamily:'var(--fd)', fontSize:22, marginBottom:8 }}>No participant responses yet</div>
      <p style={{ fontSize:14, color:'var(--t2)', marginBottom:16, lineHeight:1.6 }}>Share your survey link to collect interviews. Use a test session to see how the AI asks questions — tests are stored separately and do not appear in results.</p>
      {previewSessions.length > 0 && (
        <div style={{ width:'100%', textAlign:'left', marginBottom:18, background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:8 }}>Your test sessions</div>
          {previewSessions.map((iv) => (
            <div key={iv._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, fontSize:12, color:'var(--t2)', padding:'6px 0', borderTop:'1px solid var(--b1)' }}>
              <span>{iv.completed ? 'Completed test' : 'Open test'}{iv.completedAt ? ` · ${new Date(iv.completedAt).toLocaleString()}` : ''}</span>
              <button type="button" disabled={deletingId === iv._id} onClick={() => deleteInterview(iv)} style={{ padding:'4px 10px', background:'none', border:'1.5px solid var(--b2)', borderRadius:6, fontSize:11, cursor:'pointer', color:'var(--err)' }}>
                {deletingId === iv._id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center' }}>
        <button type="button" onClick={() => navigate(`/app/surveys/${id}`)} style={{ padding:'10px 16px', background:m.color, color:'white', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8 }}>
          <ShareUiIcon name="arrowLeft" color="white" size={15} />
          Share link
        </button>
        <button type="button" onClick={openTestInterview} style={{ padding:'10px 16px', background:'var(--white)', color:'var(--t1)', border:'1.5px solid var(--b2)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Test interview flow
        </button>
        <button type="button" onClick={() => navigate(`/app/surveys/${id}/edit`)} style={{ padding:'10px 16px', background:'var(--white)', color:'var(--t1)', border:'1.5px solid var(--b2)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
          Edit survey details
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-page" style={{ paddingBottom: 80 }}>
      {/* Top bar */}
      <div className="no-print" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'var(--fd)', fontSize:24 }}>{survey.title}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            <span style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:m.color, background:m.light, border:`1px solid ${m.border}`, borderRadius:20, padding:'2px 9px' }}>{m.label}</span>
            <span style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--t3)' }}>{completed.length} participant{completed.length!==1?'s':''} · ~{survey.numQ} exchanges targeted</span>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {completed.length > 0 && (
            <button type="button" disabled={synth} onClick={runSynthesis} title={syn ? 'Re-run AI analysis on all transcripts (updates themes, coverage, and labels)' : 'Generate charts and findings from transcripts'} style={{ padding:'8px 14px', background:m.color, color:'white', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor: synth ? 'wait' : 'pointer', display:'inline-flex', alignItems:'center', gap:6, opacity: synth ? 0.85 : 1 }}>
              {synth ? '…analysing' : <><ShareUiIcon name="refresh" color="white" size={13} />{syn ? 'Refresh analysis' : 'Run analysis'}</>}
            </button>
          )}
          <button type="button" onClick={downloadPDF} style={{ ...ghostBtn, display:'inline-flex', alignItems:'center', gap:5 }}>
            <ShareUiIcon name="download" color="var(--t2)" size={13} />
            PDF
          </button>
          <button type="button" onClick={downloadPNG} style={{ ...ghostBtn, display:'inline-flex', alignItems:'center', gap:5 }}>
            <ShareUiIcon name="download" color="var(--t2)" size={13} />
            PNG
          </button>
          <button type="button" onClick={() => downloadSurveyExport(id, 'json').catch(() => alert('Export failed'))} style={ghostBtn}>JSON</button>
          <button type="button" onClick={() => downloadSurveyExport(id, 'excel').catch(() => alert('Export failed'))} style={ghostBtn}>Excel</button>
          <button type="button" onClick={() => navigate(`/app/surveys/${id}`)} style={{ ...ghostBtn, display:'inline-flex', alignItems:'center', gap:5 }}>
            <ShareUiIcon name="link" color="var(--t2)" size={13} />
            Share
          </button>
          <button type="button" onClick={() => navigate(`/app/surveys/${id}/edit`)} style={{ ...ghostBtn, display:'inline-flex', alignItems:'center', gap:5 }}>
            Edit details
          </button>
        <button type="button" onClick={deleteStudy} style={{ ...ghostBtn, color:'var(--err)', borderColor:'var(--err-b)' }}>
          Delete study
        </button>
        </div>
      </div>

      {/* Synthesis loading */}
      {synth && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', background:m.light, border:`1.5px solid ${m.border}`, borderRadius:12, marginBottom:18 }}>
          <span style={{ width:14, height:14, border:'2px solid var(--b2)', borderTopColor:m.color, borderRadius:'50%', animation:'spin .65s linear infinite', display:'inline-block', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'var(--t2)' }}>Analysing {completed.length} interview{completed.length!==1?'s':''}…</span>
        </div>
      )}

      {/* Saturation signal */}
      {!survey.saturationReached && completed.length < 6 && (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'var(--warn-l)', border:'1.5px solid var(--warn-b)', borderRadius:12, marginBottom:18 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--warn)', animation:'pulse 2s infinite', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'var(--t1)' }}>
            Early patterns forming — <strong>{6 - completed.length} more interview{6-completed.length!==1?'s':''}</strong> will confirm them. Use <strong>Refresh analysis</strong> above when you&apos;re ready.
          </span>
        </div>
      )}

      {/* Dashboard canvas — research answers first, then KPIs, themes, charts, transcripts */}
      <div ref={dashRef} id="dashboard-canvas">

        {syn && <>
          {/* Layer 1 — What the researcher came to learn (primary product value) */}
          {syn.question_coverage?.length > 0 && (
            <Section label="Answers to your research questions" sub="Headline, narrative, and a quote for each topic you set. Evidence strength is how well participant language backs the takeaway — not chat length.">
              <ResearcherQuestionEvidence rows={syn.question_coverage} color={m.color} />
            </Section>
          )}

          {/* Layer 2 — At-a-glance counts */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:16 }}>
            {(() => {
              const dist = syn.signal_distribution;
              const n = completed.length;
              const signalPct = computeSignalRatePct(dist, n);
              const rqTotal = syn.dashboard?.researcher_questions_total != null
                ? syn.dashboard.researcher_questions_total
                : researcherTargetsCount(survey.config);
              const rqEv = syn.dashboard?.researcher_questions_with_evidence != null
                ? syn.dashboard.researcher_questions_with_evidence
                : (syn.question_coverage?.length || 0);
              return [
                { l: 'Participants', v: String(n), s: 'Completed sessions' },
                { l: 'Supportive share', v: `${signalPct}%`, s: 'Sessions that read supportive or strongly validating on your core topic (model review of transcripts).' },
                { l: 'Avg messages', v: `${avgDepth(completed)}`, s: 'Average messages per session (all roles).' },
                {
                  l: 'Topics covered',
                  v: rqTotal > 0 ? `${rqEv} / ${rqTotal}` : '—',
                  s: rqTotal > 0 ? 'Topics with synthesis / topics in your brief' : 'Add topics under survey setup',
                },
              ].map((c) => (
                <div key={c.l} className="dashboard-card" style={statCard}>
                  <div style={statLabel}>{c.l}</div>
                  <div style={{ fontFamily:'var(--fd)', fontSize:28, color:'var(--t1)', marginBottom:2 }}>{c.v}</div>
                  <div style={statSub}>{c.s}</div>
                </div>
              ));
            })()}
          </div>

          {/* Layer 3 — Themes: declarative headline, bars + quote per theme, then narrative */}
          {syn.themes?.length > 0 && (
            <Section
              label={syn.dashboard?.themes_headline || 'Themes that emerged across interviews'}
              sub="Insight first, then frequency; each bar includes supporting language from participants."
            >
              <ThemeChart themes={syn.themes} total={completed.length} color={m.color} />
              {syn.dashboard?.themes_narrative ? (
                <p style={{ marginTop:16, fontSize:14, color:'var(--t2)', lineHeight:1.75, paddingTop:14, borderTop:'1.5px solid var(--b1)' }}>{syn.dashboard.themes_narrative}</p>
              ) : null}
            </Section>
          )}

          {/* Layer 4 — Charts and synthesis detail (no word-count / exchange scatter) */}
          <Section label="Supporting visuals" sub="Ring and bar chart for session alignment; pie and bars for how strongly your topics are backed by what people said. Then pattern, findings, and quotes.">
            <div style={{ display:'grid', gridTemplateColumns:'minmax(300px,1fr) 1fr', gap:20, alignItems:'start', marginBottom:18 }}>
              <InterviewStanceCharts
                dist={syn.signal_distribution}
                total={completed.length}
                color={m.color}
                pairQuote={syn.dashboard?.signal_pair_quote}
              />
              {syn.pattern ? (
                <div style={{ fontSize:14, color:'var(--t2)', lineHeight:1.75, background:'var(--s1)', border:'1.5px solid var(--b1)', borderLeft:`3px solid ${m.color}`, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:8 }}>Cross-interview pattern</div>
                  {syn.pattern}
                </div>
              ) : <div />}
            </div>

            {syn.question_coverage?.length > 0 ? (
              <div style={{ marginBottom:18, paddingTop:16, borderTop:'1.5px solid var(--b1)' }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:10 }}>Evidence strength across your topics</div>
                <EvidenceConfidenceCharts rows={syn.question_coverage} color={m.color} />
              </div>
            ) : null}

            {syn.insights?.length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:10 }}>Findings (with evidence strength)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:8 }}>
                  {syn.insights.map((ins, i) => {
                    const ic = INSIGHT_COLORS[ins.type] || INSIGHT_COLORS.opportunity;
                    return (
                      <div key={i} className="dashboard-card" style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderLeft:`3px solid ${ic.border}`, borderRadius:10, padding:'12px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:14 }}>{INSIGHT_ICONS[ins.type]}</span>
                          <span style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--t3)', background:'var(--s1)', padding:'2px 8px', borderRadius:20 }}>{ins.confidence || 'moderate'} evidence</span>
                        </div>
                        <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6 }}>{ins.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {syn.quotes?.length > 0 && (
              <div style={{ marginBottom:18 }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:10 }}>Supporting quotes (by emotional intensity)</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:10 }}>
                  {syn.quotes.sort((a,b) => intensityOrder(b.emotional_intensity)-intensityOrder(a.emotional_intensity)).map((q,i) => (
                    <div key={i} style={{ background:'var(--s1)', border:'1.5px solid var(--b1)', borderLeft:`3px solid ${m.color}`, borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontFamily:'var(--fd)', fontStyle:'italic', fontSize:14, color:'var(--t1)', lineHeight:1.7, marginBottom:8 }}>&ldquo;{q.q}&rdquo;</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                        <span style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)' }}>{q.speaker}</span>
                        <span style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.07em', padding:'2px 8px', borderRadius:20, background:'var(--s2)', color:'var(--t3)' }}>{q.emotional_intensity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Layer 5 — Transcripts (raw evidence, secondary placement) */}
          <Section label="Transcripts & participants" sub="Open a row for the full conversation. The tag summarizes how that session lined up with your study topic.">
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {completed.map((iv, i) => {
                const depth = syn.per_interview_depth?.find((d) => String(d.interview_id) === String(iv._id));
                const ini = (iv.profile?.anon ? 'A' : (iv.profile?.name?.[0] || 'P')).toUpperCase();
                return (
                  <div key={iv._id} onClick={() => setTranscript(iv)} className="dashboard-card" style={{ display:'flex', alignItems:'center', gap:11, padding:'11px 14px', background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:12, cursor:'pointer', transition:'all .15s' }}
                    onMouseOver={e=>e.currentTarget.style.borderColor=m.border}
                    onMouseOut={e=>e.currentTarget.style.borderColor='var(--b1)'}
                  >
                    <div style={{ width:32, height:32, borderRadius:'50%', background:m.light, border:`1.5px solid ${m.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fm)', fontSize:10, color:m.color, flexShrink:0 }}>{ini}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{iv.profile?.anon ? 'Anonymous' : (iv.profile?.name || 'Participant ' + (i+1))}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', marginTop:1 }}>
                        {[iv.profile?.role || iv.profile?.occupation, iv.profile?.age&&`${iv.profile.age}y`, iv.profile?.industry].filter(Boolean).join(' · ') || 'No profile'}
                      </div>
                    </div>
                    <span title="From transcript review: whether this session tended to support your core topic" style={{ fontFamily:'var(--fb)', fontSize:11, fontWeight:500, padding:'3px 9px', borderRadius:20, background:m.light, color:m.color, border:`1px solid ${m.border}`, whiteSpace:'nowrap' }}>{participantSignalLabel(depth?.signal)}</span>
                    <button className="no-print" onClick={e=>{e.stopPropagation();setTranscript(iv);}} style={{ padding:'4px 10px', background:'none', border:'1.5px solid var(--b2)', borderRadius:6, fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', cursor:'pointer' }}>Transcript</button>
                    <button className="no-print" type="button" disabled={deletingId === iv._id} onClick={(e) => { e.stopPropagation(); deleteInterview(iv); }} style={{ padding:'4px 10px', background:'none', border:'1.5px solid var(--err-b)', borderRadius:6, fontFamily:'var(--fm)', fontSize:9, color:'var(--err)', cursor:'pointer' }}>
                      {deletingId === iv._id ? '…' : 'Delete'}
                    </button>
                  </div>
                );
              })}
            </div>
          </Section>

          {previewSessions.length > 0 && (
            <Section label="Test sessions (researcher)" sub="Excluded from participant counts and synthesis. Delete when finished.">
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {previewSessions.map((iv) => (
                  <div key={iv._id} className="no-print" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'10px 12px', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:10 }}>
                    <div style={{ fontSize:12, color:'var(--t2)' }}>
                      {iv.completed ? 'Completed test' : 'In progress'}{iv.completedAt ? ` · ${new Date(iv.completedAt).toLocaleString()}` : ''}
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      {iv.messages?.length > 0 && (
                        <button type="button" onClick={() => setTranscript(iv)} style={{ padding:'4px 10px', background:'none', border:'1.5px solid var(--b2)', borderRadius:6, fontSize:11, cursor:'pointer', color:'var(--t2)' }}>Transcript</button>
                      )}
                      <button type="button" disabled={deletingId === iv._id} onClick={() => deleteInterview(iv)} style={{ padding:'4px 10px', background:'none', border:'1.5px solid var(--err-b)', borderRadius:6, fontSize:11, cursor:'pointer', color:'var(--err)' }}>
                        {deletingId === iv._id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Sentinel alerts */}
          {survey.sentinelAlerts?.length > 0 && (
            <Section label="Study alerts — detected mid-study">
              {survey.sentinelAlerts.map((a, i) => (
                <div key={i} style={{ display:'flex', gap:10, background:'var(--warn-l)', border:'1.5px solid var(--warn-b)', borderLeft:`3px solid var(--warn)`, borderRadius:10, padding:'12px 14px', marginBottom:7 }}>
                  <span style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--warn)', background:'rgba(122,92,46,.1)', padding:'2px 8px', borderRadius:20, flexShrink:0, alignSelf:'flex-start', marginTop:2 }}>{a.type}</span>
                  <div style={{ fontSize:13, color:'var(--t1)', lineHeight:1.65 }}>{a.message}</div>
                </div>
              ))}
            </Section>
          )}
        </>}

        {/* No synthesis yet */}
        {!syn && !synth && completed.length > 0 && (
          <div style={{ textAlign:'center', padding:'40px 24px' }}>
            <div style={{ fontFamily:'var(--fd)', fontSize:20, marginBottom:8 }}>Ready to synthesise</div>
            <p style={{ fontSize:13, color:'var(--t2)', marginBottom:20 }}>You have {completed.length} completed interview{completed.length!==1?'s':''}. Click below to generate the full analysis.</p>
            <button onClick={runSynthesis} style={{ padding:'12px 24px', background:m.color, color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' }}>Analyse interviews →</button>
          </div>
        )}

      </div>

      {/* Transcript modal */}
      {transcript && (
        <div onClick={() => setTranscript(null)} style={{ position:'fixed', inset:0, background:'rgba(28,25,23,.4)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'var(--white)', borderRadius:20, padding:28, maxWidth:560, width:'100%', maxHeight:'80vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'var(--sh2)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexShrink:0 }}>
              <div>
                <div style={{ fontFamily:'var(--fd)', fontSize:18 }}>{transcript.isPreview ? 'Test session' : (transcript.profile?.anon?'Anonymous':(transcript.profile?.name||'Participant'))}</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:9, color:'var(--t3)', marginTop:2 }}>{transcript.isPreview ? 'Researcher preview — not a participant response' : ([transcript.profile?.role,transcript.profile?.age&&`${transcript.profile.age}y`].filter(Boolean).join(' · ')||'No profile')}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button type="button" disabled={deletingId === transcript._id} onClick={() => deleteInterview(transcript)} style={{ padding:'6px 12px', background:'none', border:'1.5px solid var(--err-b)', borderRadius:7, fontSize:12, color:'var(--err)', cursor:'pointer' }}>
                  {deletingId === transcript._id ? '…' : (transcript.isPreview ? 'Delete test' : 'Delete')}
                </button>
                <button type="button" onClick={()=>setTranscript(null)} style={{ width:28,height:28,borderRadius:7,border:'1.5px solid var(--b2)',background:'none',cursor:'pointer',fontSize:14,color:'var(--t2)' }}>×</button>
              </div>
            </div>
            <div style={{ overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10 }}>
              {transcript.messages?.map((msg, i) => (
                <div key={i}>
                  <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color: msg.role==='user'?m.color:'var(--t3)', marginBottom:4 }}>{msg.role==='user'?'Participant':'Interviewer'}</div>
                  <div style={{ fontSize:13, color:'var(--t1)', lineHeight:1.65, background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:10, padding:'10px 13px' }}>{visibleMessageContent(msg.role, msg.content)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Chart components ── */

function pieSlice(cx, cy, r, a0, a1) {
  if (a1 - a0 <= 0.0001) return '';
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

function donutSegment(cx, cy, rIn, rOut, a0, a1) {
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  const p0o = { x: cx + rOut * Math.cos(a0), y: cy + rOut * Math.sin(a0) };
  const p1o = { x: cx + rOut * Math.cos(a1), y: cy + rOut * Math.sin(a1) };
  const p0i = { x: cx + rIn * Math.cos(a1), y: cy + rIn * Math.sin(a1) };
  const p1i = { x: cx + rIn * Math.cos(a0), y: cy + rIn * Math.sin(a0) };
  return `M ${p0o.x} ${p0o.y} A ${rOut} ${rOut} 0 ${largeArc} 1 ${p1o.x} ${p1o.y} L ${p0i.x} ${p0i.y} A ${rIn} ${rIn} 0 ${largeArc} 0 ${p1i.x} ${p1i.y} Z`;
}

function stanceChartItems(dist, color) {
  if (!dist) return [];
  return [
    { key: 'strong_positive', label: 'Strong validation', val: dist.strong_positive || 0, fill: color, fillOpacity: 1 },
    { key: 'positive', label: 'Supportive', val: dist.positive || 0, fill: color, fillOpacity: 0.62 },
    { key: 'mixed', label: 'Mixed / unclear', val: dist.mixed || 0, fill: '#9ca3af', fillOpacity: 1 },
    { key: 'negative', label: 'Little traction', val: dist.negative || 0, fill: '#8b3a3a', fillOpacity: 1 },
  ];
}

/** Ring + horizontal bars for per-session alignment (plain language; legacy JSON field is still `signal`). */
function InterviewStanceCharts({ dist, total, color, pairQuote }) {
  const items = stanceChartItems(dist, color);
  const sumModel = items.reduce((a, b) => a + b.val, 0);
  const denom = sumModel > 0 ? sumModel : total;
  if (!denom) {
    return <div style={{ fontSize:13, color:'var(--t3)' }}>No session alignment breakdown in this analysis.</div>;
  }
  const cx = 100;
  const cy = 100;
  const pctOfTotal = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const hasPair = pairQuote && String(pairQuote.q || '').trim();

  let angleRing = -Math.PI / 2;
  const ringSlices = [];
  items.forEach((it) => {
    if (!it.val) return;
    const sweep = (it.val / denom) * Math.PI * 2;
    const a0 = angleRing;
    const a1 = angleRing + sweep;
    ringSlices.push(
      <path
        key={`ring-${it.key}`}
        d={donutSegment(cx, cy, 46, 76, a0, a1)}
        fill={it.fill}
        fillOpacity={it.fillOpacity}
        stroke="var(--white)"
        strokeWidth={2}
      />,
    );
    angleRing = a1;
  });

  const maxBar = Math.max(...items.map((i) => i.val), 1);

  return (
    <div>
      <div style={{ fontFamily:'var(--fd)', fontSize:15, color:'var(--t1)', marginBottom:6 }}>How sessions lined up with your study</div>
      <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, marginBottom:14 }}>
        Each completed interview is classified from the transcript: whether participants&apos; answers tended to <strong>validate</strong> what you&apos;re exploring, were <strong>mixed</strong>, or showed <strong>little traction</strong> on the core topic. This is not a score of eloquence or length.
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20, alignItems:'center', marginBottom:16 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:6 }}>Share of sessions (ring)</div>
          <svg width={200} height={200} viewBox="0 0 200 200" style={{ display:'block', margin:'0 auto' }}>
            <g>{ringSlices}</g>
            <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontFamily:'var(--fd)', fontSize:20, fill:'var(--t1)' }}>{total}</text>
            <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontFamily:'var(--fm)', fontSize:8, fill:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>sessions</text>
          </svg>
        </div>
        <div style={{ minWidth:180 }}>
          <div style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:10 }}>Counts (bars)</div>
          {items.map((it) => (
            <div key={it.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:118, fontFamily:'var(--fm)', fontSize:11, color:'var(--t2)', flexShrink:0 }}>{it.label}</div>
              <div style={{ flex:1, height:18, background:'var(--s1)', borderRadius:4, overflow:'hidden', minWidth:40 }}>
                <div
                  style={{
                    height:'100%',
                    width:`${(it.val / maxBar) * 100}%`,
                    background: it.fill,
                    opacity: it.fillOpacity,
                    borderRadius:4,
                    transition:'width .45s ease',
                  }}
                />
              </div>
              <div style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--t3)', width:52, textAlign:'right', flexShrink:0 }}>
                {it.val}{total ? ` (${pctOfTotal(it.val)}%)` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      {hasPair ? (
        <div style={{ marginTop:14, padding:'12px 14px', background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:10, borderLeft:`3px solid ${color}` }}>
          <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:6 }}>Quote that typifies the pattern</div>
          <div style={{ fontFamily:'var(--fd)', fontStyle:'italic', fontSize:14, color:'var(--t1)', lineHeight:1.65 }}>&ldquo;{pairQuote.q}&rdquo;</div>
          <div style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--t3)', marginTop:8 }}>{pairQuote.speaker}</div>
        </div>
      ) : null}
    </div>
  );
}

function evidenceConfidenceBuckets(rows) {
  const c = { strong: 0, moderate: 0, thin: 0 };
  for (const r of rows || []) {
    const raw = String(r?.evidence_confidence || 'moderate').toLowerCase();
    if (raw.includes('strong') || raw === 'high') c.strong++;
    else if (raw.includes('spec') || raw.includes('thin') || raw.includes('weak') || raw === 'low') c.thin++;
    else c.moderate++;
  }
  return c;
}

/** Pie + bars for how well each research topic is backed by participant language. */
function EvidenceConfidenceCharts({ rows, color }) {
  const c = evidenceConfidenceBuckets(rows);
  const items = [
    { key: 'strong', label: 'Strong evidence', val: c.strong, fill: color, fillOpacity: 1 },
    { key: 'moderate', label: 'Moderate', val: c.moderate, fill: color, fillOpacity: 0.55 },
    { key: 'thin', label: 'Thin / early', val: c.thin, fill: '#9ca3af', fillOpacity: 1 },
  ];
  const n = items.reduce((a, b) => a + b.val, 0);
  if (!n) return <div style={{ fontSize:13, color:'var(--t3)' }}>No topic-level evidence data.</div>;

  const cx = 100;
  const cy = 100;
  const rPie = 78;
  let ang = -Math.PI / 2;
  const piePaths = [];
  items.forEach((it) => {
    if (!it.val) return;
    const sweep = (it.val / n) * Math.PI * 2;
    const a0 = ang;
    const a1 = ang + sweep;
    piePaths.push(
      <path
        key={it.key}
        d={pieSlice(cx, cy, rPie, a0, a1)}
        fill={it.fill}
        fillOpacity={it.fillOpacity}
        stroke="var(--white)"
        strokeWidth={1.5}
      />,
    );
    ang = a1;
  });

  const maxBar = Math.max(...items.map((i) => i.val), 1);
  const pct = (v) => Math.round((v / n) * 100);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:20, alignItems:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:6 }}>By topic (pie)</div>
        <svg width={210} height={210} viewBox="0 0 200 200" style={{ display:'block', margin:'0 auto' }}>
          <g>{piePaths}</g>
        </svg>
      </div>
      <div>
        <div style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:10 }}>By topic (bar)</div>
        {items.map((it) => (
          <div key={it.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ width:104, fontFamily:'var(--fm)', fontSize:11, color:'var(--t2)', flexShrink:0 }}>{it.label}</div>
            <div style={{ flex:1, height:18, background:'var(--s1)', borderRadius:4, overflow:'hidden', minWidth:40 }}>
              <div
                style={{
                  height:'100%',
                  width:`${(it.val / maxBar) * 100}%`,
                  background: it.fill,
                  opacity: it.fillOpacity,
                  borderRadius:4,
                }}
              />
            </div>
            <div style={{ fontFamily:'var(--fm)', fontSize:11, color:'var(--t3)', width:56, textAlign:'right', flexShrink:0 }}>
              {it.val} ({pct(it.val)}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThemeChart({ themes, total, color }) {
  const sorted = [...(themes || [])].sort((a, b) => (b.count || 0) - (a.count || 0));
  const max = Math.max(...sorted.map((t) => t.count), 1);
  return (
    <div>
      {sorted.map((t, i) => {
        const q = t.representative_quote ? String(t.representative_quote) : '';
        const qShort = q.length > 160 ? `${q.slice(0, 160)}…` : q;
        return (
          <div key={i} style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)', lineHeight:1.35, marginBottom:6 }}>{t.label}</div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ flex:1, height:22, background:'var(--s1)', borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(t.count / max) * 100}%`, background:color, borderRadius:5, animation:'barIn .6s ease both', transition:'width .6s' }} />
              </div>
              <div style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--t3)', width:64, flexShrink:0, textAlign:'right' }}>{t.count}/{total}</div>
            </div>
            {q ? (
              <div style={{ marginTop:8, fontSize:12, color:'var(--t2)', lineHeight:1.55, fontStyle:'italic' }}>
                &ldquo;{qShort}&rdquo;
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ResearcherQuestionEvidence({ rows, color }) {
  const list = (rows || []).filter((r) => r && (r.question || r.summary || r.findings || r.declarative_title));
  if (!list.length) return <p style={{ fontSize:13, color:'var(--t3)' }}>No narrative available for custom topics yet. Run Refresh analysis.</p>;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {list.map((row, i) => {
        const body = row.summary || row.findings || '';
        const title = row.declarative_title || row.question || 'Finding';
        const conf = row.evidence_confidence || 'moderate';
        const quote = row.supporting_quote;
        const speaker = row.supporting_speaker;
        return (
          <div key={i} style={{ border:'1.5px solid var(--b1)', borderRadius:14, overflow:'hidden', background:'var(--white)', borderLeft:`4px solid ${color}` }}>
            <div style={{ padding:'14px 18px', background:'var(--s1)', borderBottom:'1px solid var(--b1)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                <div style={{ fontFamily:'var(--fd)', fontSize:17, color:'var(--t1)', lineHeight:1.35, flex:1, minWidth:200 }}>{title}</div>
                <span style={{ fontFamily:'var(--fm)', fontSize:8, textTransform:'uppercase', letterSpacing:'.08em', padding:'4px 10px', borderRadius:20, background:`${color}22`, color, border:`1px solid ${color}`, flexShrink:0 }}>{conf} evidence</span>
              </div>
              {row.declarative_title && row.question && row.declarative_title.trim() !== row.question.trim() ? (
                <div style={{ fontFamily:'var(--fm)', fontSize:10, color:'var(--t3)', marginTop:8, lineHeight:1.4 }}>Topic you set: {row.question}</div>
              ) : null}
            </div>
            <div style={{ padding:'16px 18px', fontSize:14, color:'var(--t2)', lineHeight:1.7 }}>{body || '—'}</div>
            {quote ? (
              <div style={{ padding:'0 18px 16px' }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.07em', color:'var(--t3)', marginBottom:6 }}>Supporting quote</div>
                <div style={{ fontFamily:'var(--fd)', fontStyle:'italic', fontSize:14, color:'var(--t1)', lineHeight:1.65, background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:10, padding:'12px 14px' }}>
                  &ldquo;{quote}&rdquo;
                  {speaker ? <div style={{ fontFamily:'var(--fm)', fontSize:10, fontStyle:'normal', color:'var(--t3)', marginTop:10 }}>{speaker}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── Helpers ── */
function computeSignalRatePct(dist, n) {
  if (!dist || !n) return 0;
  const sp = dist.strong_positive || 0;
  const p = dist.positive || 0;
  return Math.round(((sp + p) / n) * 100);
}

function researcherTargetsCount(config) {
  const raw = config?.custom != null ? String(config.custom).trim() : '';
  if (!raw) return 0;
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return lines.length > 0 ? lines.length : 1;
}

function Section({ label, sub, children }) {
  return (
    <div className="dashboard-card" style={{ background:'var(--white)', border:'1.5px solid var(--b1)', borderRadius:16, padding:'20px 22px', marginBottom:14 }}>
      <div style={{ marginBottom:12, paddingBottom:10, borderBottom:'1.5px solid var(--b1)' }}>
        <div style={{ fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.1em', color:'var(--t3)' }}>{label}</div>
        {sub && <div style={{ fontSize:11, color:'var(--t3)', marginTop:3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function avgDepth(interviews) {
  if (!interviews.length) return 0;
  const avg = interviews.reduce((a,iv) => a + (iv.messages?.length||0), 0) / interviews.length;
  return Math.round(avg);
}

function intensityOrder(i) {
  return { high:2, medium:1, low:0 }[i] || 0;
}

/** Human-readable label for per-interview alignment (internal JSON still uses legacy keys). */
function participantSignalLabel(signal) {
  if (!signal || typeof signal !== 'string') return '—';
  const map = {
    strong_positive: 'Strong validation',
    positive: 'Supportive',
    mixed: 'Mixed',
    negative: 'Little traction',
  };
  return map[signal] || signal.replace(/_/g, ' ');
}

const ghostBtn = { padding:'7px 13px', background:'none', border:'1.5px solid var(--b2)', borderRadius:8, fontFamily:'var(--fb)', fontSize:12, fontWeight:500, color:'var(--t2)', cursor:'pointer', textDecoration:'none', display:'inline-block' };
const statCard  = { background:'var(--s1)', border:'1.5px solid var(--b1)', borderRadius:12, padding:'14px 16px' };
const statLabel = { fontFamily:'var(--fm)', fontSize:9, textTransform:'uppercase', letterSpacing:'.08em', color:'var(--t3)', marginBottom:4 };
const statSub   = { fontSize:11, color:'var(--t3)' };
