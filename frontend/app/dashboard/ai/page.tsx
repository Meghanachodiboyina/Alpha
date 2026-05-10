'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';

export default function AIBuilderPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scope, setScope] = useState('today');
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setLoading(true);
        setError('');
        try {
          const fd = new FormData();
          fd.append('audio', blob, 'voice.webm');
          const res = await api.post('/transcribe-audio', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          setInputText(prev => prev + (prev ? ' ' : '') + res.data.text);
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Transcription failed. Check GROQ_API_KEY in backend .env.');
        } finally { setLoading(false); }
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setError('');
    } catch { setError('Microphone access denied. Please allow microphone permissions.'); }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  const generatePlan = async () => {
    if (!inputText.trim()) return;
    setLoading(true); setError(''); setPlan(null);
    try {
      const res = await api.post('/generate-routine', { input_text: inputText, plan_scope: scope });
      setPlan(res.data);
    } catch { setError('AI generation failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const saveRoutines = async () => {
    if (!plan?.routines?.length) return;
    setLoading(true);
    try {
      await Promise.all(plan.routines.map((r: any) => api.post('/routines', r)));
      setSuccess('Routines saved to your schedule!');
      setPlan(null); setInputText('');
      setTimeout(() => setSuccess(''), 3000);
    } catch { setError('Failed to save routines.'); }
    finally { setLoading(false); }
  };

  const S = {
    card: { background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: 'var(--shadow)' } as React.CSSProperties,
    btnPrimary: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
      background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
      boxShadow: '0 4px 16px var(--orange-glow)', transition: 'all 0.2s',
    } as React.CSSProperties,
    btnGhost: {
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '10px 24px', borderRadius: 12, cursor: 'pointer',
      background: 'var(--surface)', color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem',
      border: '1px solid var(--border)', transition: 'all 0.2s',
    } as React.CSSProperties,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 820, animation: 'fadeUp 0.5s var(--ease-out) both' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 99, background: 'var(--orange-light)', border: '1px solid rgba(255,107,53,0.2)', marginBottom: 12 }}>
          <span style={{ color: 'var(--orange-2)', fontSize: '0.8rem', fontWeight: 700 }}>✦ Powered by Groq AI</span>
        </div>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text)' }}>AI Routine Builder</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>Describe your day or speak your tasks — Routinely builds your optimized routine instantly.</p>
        </div>
      </div>

      {/* Scope toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--bg-3)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {['today', 'weekly'].map(s => (
          <button key={s} onClick={() => setScope(s)} style={{
            padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: '0.8125rem', fontWeight: 700,
            background: scope === s ? 'var(--orange)' : 'transparent',
            color: scope === s ? '#fff' : 'var(--text-3)',
            transition: 'all 0.2s',
          }}>
            {s === 'today' ? "Today's Plan" : 'Weekly Routine'}
          </button>
        ))}
      </div>

      {/* Input card */}
      <div style={{ ...S.card, padding: 24 }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Example: I need to wake up at 7am, study React until 10, then go to the gym at 6pm..."
            style={{
              width: '100%', minHeight: 160, padding: '16px 70px 16px 16px',
              background: 'var(--bg-3)', border: '1.5px solid var(--border)',
              borderRadius: 14, color: 'var(--text)', fontSize: '0.9375rem',
              outline: 'none', resize: 'none', transition: 'all 0.2s',
              fontFamily: 'var(--font-sans)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 4px var(--orange-light)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
          />
          {/* Mic button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={loading}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            style={{
              position: 'absolute', right: 12, bottom: 12,
              width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: isRecording ? '#ef4444' : 'var(--orange)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isRecording ? '0 0 0 6px rgba(239,68,68,0.2)' : '0 4px 12px var(--orange-glow)',
              animation: isRecording ? 'pulse-ring 1.5s ease infinite' : 'none',
              transition: 'all 0.2s', fontSize: 20,
            }}
          >
            {isRecording ? '⏹' : '🎙'}
          </button>
        </div>

        {isRecording && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-ring 1s ease infinite' }} />
            <span style={{ fontSize: '0.8125rem', color: '#ef4444', fontWeight: 600 }}>Recording… Click ⏹ to stop</span>
          </div>
        )}

        {/* Alerts */}
        {error && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8125rem', fontWeight: 500 }}>{error}</div>}
        {success && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green)', fontSize: '0.8125rem', fontWeight: 500 }}>{success}</div>}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button onClick={() => { setInputText(''); setPlan(null); setError(''); }} style={{ ...S.btnGhost, padding: '8px 16px', fontSize: '0.8125rem' }}>↺ Reset</button>
          <button
            onClick={generatePlan}
            disabled={loading || !inputText.trim()}
            style={{ ...S.btnPrimary, opacity: (loading || !inputText.trim()) ? 0.6 : 1 }}
          >
            {loading ? '⏳ Generating…' : '✦ Generate Routine'}
          </button>
        </div>
      </div>

      {/* Plan results */}
      {plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeUp 0.4s var(--ease-out) both' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)' }}>Routinely</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>Generated Routine</h2>
            <button onClick={saveRoutines} disabled={loading} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'var(--green)', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
              boxShadow: '0 4px 12px rgba(34,197,94,0.3)', transition: 'all 0.2s',
              opacity: loading ? 0.6 : 1,
            }}>
              💾 Save to Schedule
            </button>
          </div>

          {/* Summary */}
          <div style={{ ...S.card, padding: 20, borderLeft: '4px solid var(--orange)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-2)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>AI Summary</div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>{plan.summary}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {plan.productivity_tips?.map((tip: string, i: number) => (
                <div key={i} style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600,
                  background: 'var(--orange-light)', color: 'var(--orange-2)', border: '1px solid rgba(255,107,53,0.2)',
                }}>
                  ✦ {tip}
                </div>
              ))}
            </div>
          </div>

          {/* Routine items */}
          <div style={{ ...S.card, overflow: 'hidden' }}>
            {plan.routines?.map((r: any, i: number) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', gap: 16,
                borderBottom: i < plan.routines.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--surface)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', fontWeight: 700 }}>{r.start_time?.slice(0, 5)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{r.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>
                      📅 {r.date} &nbsp;•&nbsp; 🕐 {r.start_time} – {r.end_time} &nbsp;•&nbsp; ⏱ {r.estimated_time}min
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                  color: r.priority === 'High' ? '#ef4444' : r.priority === 'Low' ? 'var(--green)' : '#f59e0b',
                  background: r.priority === 'High' ? 'rgba(239,68,68,0.12)' : r.priority === 'Low' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                }}>{r.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
