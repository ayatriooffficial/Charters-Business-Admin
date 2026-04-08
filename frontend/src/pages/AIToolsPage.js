import React, { useState } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import InputField from '../components/Common/InputField';
import { EmptyState, SectionHeader } from '../components/Common/SharedHelpers';
import { aiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiRobotLine, RiMagicLine, RiFileTextLine,
  RiCheckLine, RiCopyleftLine, RiSparklingLine,
  RiEditLine, RiAlignJustify, RiLockLine
} from 'react-icons/ri';

const TABS = [
  { id: 'headline', label: 'Headline AI',     icon: <RiMagicLine /> },
  { id: 'about',    label: 'About Section AI',icon: <RiAlignJustify /> },
  { id: 'grammar',  label: 'Grammar Check',   icon: <RiEditLine /> },
  { id: 'resume',   label: 'Resume Parser',   icon: <RiFileTextLine /> }
];

export default function AIToolsPage() {
  const { user } = useAuth();
  const hasAccess = user?.permissions?.profileBranding?.headlineGenerator;
  const [activeTab, setActiveTab] = useState('headline');

  return (
    <PageLayout
      title="AI Tools"
      subtitle="Use AI to improve your LinkedIn content, check grammar, and parse your resume"
    >
      <div style={{ position: 'relative' }}>
        {!hasAccess && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 12,
            flexDirection: 'column',
            gap: 10
          }}>
            <RiLockLine style={{ fontSize: 32 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Access not granted by admin</div>
          </div>
        )}

        <div style={{ opacity: hasAccess ? 1 : 0.5, pointerEvents: hasAccess ? 'auto' : 'none' }}>
          {/* Tab Bar */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 24,
            background: 'var(--bg-secondary)',
            padding: 6,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            width: 'fit-content'
          }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                disabled={!hasAccess}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--accent)'       : 'transparent',
                  color:      activeTab === tab.id ? '#fff'                 : 'var(--text-secondary)',
                  cursor: hasAccess ? 'pointer' : 'not-allowed',
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  fontWeight: activeTab === tab.id ? 500 : 400,
                  transition: 'all 0.18s ease'
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'headline' && <HeadlineTool hasAccess={hasAccess} />}
          {activeTab === 'about'    && <AboutTool hasAccess={hasAccess} />}
          {activeTab === 'grammar'  && <GrammarTool hasAccess={hasAccess} />}
          {activeTab === 'resume'   && <ResumeTool hasAccess={hasAccess} />}
        </div>
      </div>
    </PageLayout>
  );
}

// ─── Headline Tool ────────────────────────────────────────────────
function HeadlineTool({ hasAccess }) {
  const [headline,    setHeadline]    = useState('');
  const [targetRole,  setTargetRole]  = useState('');
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);

  const handleImprove = async () => {
    if (!headline.trim()) return toast.error('Enter your current headline first');
    setLoading(true);
    setResults([]);
    try {
      const { data } = await aiService.improveHeadline({ currentHeadline: headline, targetRole });
      setResults(data.suggestions || []);
    } catch { toast.error('AI service unavailable. Check your Gemini API key.'); }
    finally  { setLoading(false); }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card>
        <SectionHeader icon={<RiMagicLine />} title="Improve LinkedIn Headline" color="var(--accent)" />
        <InputField
          label="Your Current Headline"
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          placeholder="e.g. Software Engineer at XYZ Corp"
          hint={`${headline.length} / 220 characters`}
        />
        <InputField
          label="Target Role (optional)"
          value={targetRole}
          onChange={e => setTargetRole(e.target.value)}
          placeholder="e.g. Senior Product Manager"
        />
        <Button
          icon={<RiSparklingLine />}
          loading={loading}
          disabled={!hasAccess}
          onClick={handleImprove}
          fullWidth
        >
          Generate 3 Improved Headlines
        </Button>
      </Card>

      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          AI Suggestions
        </h3>
        {results.length === 0 && !loading && (
          <EmptyState icon={<RiRobotLine />} text="Your improved headlines will appear here" />
        )}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} className="shimmer" style={{ height: 60, borderRadius: 8 }} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((r, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>
                {r.replace(/^\d+\.\s*/, '')}
              </p>
              <Button variant="ghost" size="sm" icon={<RiCopyleftLine />} onClick={() => copy(r.replace(/^\d+\.\s*/, ''))}>
                Copy
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── About Section Tool ───────────────────────────────────────────
function AboutTool({ hasAccess }) {
  const [about,      setAbout]      = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [skills,     setSkills]     = useState('');
  const [result,     setResult]     = useState('');
  const [loading,    setLoading]    = useState(false);

  const handleImprove = async () => {
    if (!about.trim()) return toast.error('Paste your current About section first');
    setLoading(true);
    setResult('');
    try {
      const { data } = await aiService.improveAbout({
        currentAbout: about,
        targetRole,
        skills: skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      setResult(data.improvedAbout);
    } catch { toast.error('AI service unavailable. Check your Gemini API key.'); }
    finally  { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card>
        <SectionHeader icon={<RiAlignJustify />} title="Improve About Section" color="var(--green)" />
        <InputField
          label="Your Current About Section"
          type="textarea"
          rows={6}
          value={about}
          onChange={e => setAbout(e.target.value)}
          placeholder="Paste your LinkedIn About section here..."
          hint={`${about.length} characters · ${about.split(/\s+/).filter(Boolean).length} words`}
        />
        <InputField
          label="Target Role (optional)"
          value={targetRole}
          onChange={e => setTargetRole(e.target.value)}
          placeholder="e.g. Full Stack Developer"
        />
        <InputField
          label="Key Skills (optional)"
          value={skills}
          onChange={e => setSkills(e.target.value)}
          placeholder="React, Node.js, AWS (comma separated)"
        />
        <Button icon={<RiSparklingLine />} loading={loading} disabled={!hasAccess} onClick={handleImprove} fullWidth>
          Rewrite with AI
        </Button>
      </Card>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>
            Improved Version
          </h3>
          {result && (
            <Button
              variant="secondary" size="sm" icon={<RiCopyleftLine />}
              onClick={() => { navigator.clipboard.writeText(result); toast.success('Copied!'); }}
            >
              Copy All
            </Button>
          )}
        </div>
        {!result && !loading && (
          <EmptyState icon={<RiAlignJustify />} text="Your improved About section will appear here" />
        )}
        {loading && <div className="shimmer" style={{ height: 200, borderRadius: 8 }} />}
        {result && (
          <div style={{
            padding: 16,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap'
          }}>
            {result}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Grammar Tool ─────────────────────────────────────────────────
function GrammarTool({ hasAccess }) {
  const [text,    setText]    = useState('');
  const [errors,  setErrors]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!text.trim()) return toast.error('Enter some text to check');
    setLoading(true);
    setErrors(null);
    try {
      const { data } = await aiService.checkGrammar({ text });
      setErrors(data.errors);
      if (data.errorCount === 0) toast.success('No grammar issues found!');
    } catch { toast.error('Grammar service unavailable'); }
    finally  { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card>
        <SectionHeader icon={<RiEditLine />} title="Grammar & Style Check" color="var(--orange)" />
        <InputField
          label="Text to Check"
          type="textarea"
          rows={8}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste your LinkedIn headline, about section, or any professional text..."
          hint={`${text.split(/\s+/).filter(Boolean).length} words`}
        />
        <Button icon={<RiCheckLine />} loading={loading} disabled={!hasAccess} onClick={handleCheck} fullWidth>
          Check Grammar
        </Button>
      </Card>

      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          Issues Found
        </h3>
        {errors === null && !loading && (
          <EmptyState icon={<RiCheckLine />} text="Grammar issues will be listed here after checking" />
        )}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 50, borderRadius: 8 }} />)}
          </div>
        )}
        {errors !== null && errors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <RiCheckLine style={{ fontSize: 48, color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />
            <p style={{ color: 'var(--green)', fontWeight: 500 }}>No grammar issues found!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Your text looks great.</p>
          </div>
        )}
        {errors?.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {errors.map((err, i) => (
              <div key={i} style={{
                padding: '12px 14px',
                background: 'var(--red-dim)',
                border: '1px solid rgba(197, 42, 86, 0.16)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500, marginBottom: 4 }}>
                  {err.message}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 6 }}>
                  "…{err.context}…"
                </p>
                {err.replacements?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Suggestions:</span>
                    {err.replacements.map((r, j) => (
                      <span key={j} style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        background: 'var(--green-dim)',
                        color: 'var(--green)',
                        borderRadius: 20
                      }}>
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Resume Tool ──────────────────────────────────────────────────
function ResumeTool({ hasAccess }) {
  const [file,    setFile]    = useState(null);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    if (!file) return toast.error('Select a PDF resume first');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await aiService.parseResume(file);
      setResult(data.parsedData);
      toast.success('Resume parsed successfully!');
    } catch { toast.error('Failed to parse resume. Make sure it is a valid PDF.'); }
    finally  { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Card>
        <SectionHeader icon={<RiFileTextLine />} title="Resume Parser" color="var(--red)" />
        <div style={{
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: 32,
          textAlign: 'center',
          marginBottom: 16,
          background: file ? 'var(--green-dim)' : 'transparent',
          borderColor: file ? 'rgba(45, 122, 96, 0.28)' : 'var(--border)',
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
          onClick={() => hasAccess && document.getElementById('resume-upload').click()}
        >
          <RiFileTextLine style={{ fontSize: 40, color: file ? 'var(--green)' : 'var(--text-muted)', display: 'block', margin: '0 auto 10px' }} />
          {file
            ? <p style={{ color: 'var(--green)', fontWeight: 500 }}>✓ {file.name}</p>
            : <>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
                  Click to upload your resume
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>PDF only · Max 10MB</p>
              </>
          }
          <input
            id="resume-upload"
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])}
          />
        </div>
        <Button icon={<RiSparklingLine />} loading={loading} onClick={handleParse} fullWidth disabled={!hasAccess || !file}>
          Parse Resume
        </Button>
      </Card>

      <Card>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          Parsed Results
        </h3>
        {!result && !loading && (
          <EmptyState icon={<RiFileTextLine />} text="Upload and parse your resume to see extracted skills, experience, and education" />
        )}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height: 50, borderRadius: 8 }} />)}
          </div>
        )}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Resume Score */}
            {result.resume_score && (
              <div style={{
                padding: '14px 16px',
                background: 'var(--accent-dim)',
                border: '1px solid rgba(177, 7, 56, 0.18)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Resume Quality Score</p>
                  <p style={{ fontSize: 24, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--accent-light)' }}>
                    {result.resume_score.score} / 100
                  </p>
                </div>
                <span style={{
                  fontSize: 28,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  color: result.resume_score.grade === 'A' ? 'var(--green)' :
                         result.resume_score.grade === 'B' ? 'var(--accent-light)' :
                         result.resume_score.grade === 'C' ? 'var(--orange)' : 'var(--red)'
                }}>
                  {result.resume_score.grade}
                </span>
              </div>
            )}

            {/* Contact Info */}
            {result.contact_info && Object.keys(result.contact_info).length > 0 && (
              <ResultSection title="Contact Info">
                {Object.entries(result.contact_info).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '3px 0' }}>
                    <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}:</span>{' '}
                    <span style={{ color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </ResultSection>
            )}

            {/* Skills */}
            {result.skills && Object.keys(result.skills).length > 0 && (
              <ResultSection title={`Skills (${result.total_skills_count})`}>
                {Object.entries(result.skills).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      {cat.replace('_', ' ')}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {skills.map(skill => (
                        <span key={skill} style={{
                          fontSize: 12,
                          padding: '2px 10px',
                          background: 'var(--accent-dim)',
                          color: 'var(--accent-light)',
                          borderRadius: 20
                        }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </ResultSection>
            )}

            {/* Feedback */}
            {result.resume_score?.feedback?.length > 0 && (
              <ResultSection title="Improvement Suggestions">
                {result.resume_score.feedback.map((f, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: 'var(--text-secondary)',
                    padding: '6px 0',
                    borderBottom: i < result.resume_score.feedback.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex', gap: 8
                  }}>
                    <span style={{ color: 'var(--orange)', flexShrink: 0 }}>→</span>
                    {f}
                  </div>
                ))}
              </ResultSection>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function ResultSection({ title, children }) {
  return (
    <div>
      <h4 style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-display)', marginBottom: 10 }}>
        {title}
      </h4>
      {children}
    </div>
  );
}


