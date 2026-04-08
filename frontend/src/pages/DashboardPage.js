import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';
import PageLayout from '../components/Layout/PageLayout';
import ScoreRing from '../components/Common/ScoreRing';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import {
  RiArrowDownLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiCheckboxCircleLine,
  RiRefreshLine,
  RiTimeLine
} from 'react-icons/ri';

const CATEGORY_COLORS = {
  'Personal Presence': 'var(--accent)',
  'Professional Profile': 'var(--navy)',
  'Networking': 'var(--gold)',
  'Credentials': 'var(--orange)',
  'Thought Leadership': 'var(--green)'
};

const CATEGORY_ROUTES = {
  'Personal Presence': '/website',
  'Professional Profile': '/linkedin',
  'Networking': '/networking',
  'Credentials': '/credentials',
  'Thought Leadership': '/youtube'
};

const BREAKDOWN_ITEMS = [
  { label: 'Personal Presence', key: 'personalPresence', max: 25, color: 'var(--accent)' },
  { label: 'Professional Profiles', key: 'professionalProfiles', max: 25, color: 'var(--navy)' },
  { label: 'Networking', key: 'networking', max: 20, color: 'var(--gold)' },
  { label: 'Credentials', key: 'credentials', max: 20, color: 'var(--orange)' },
  { label: 'Thought Leadership', key: 'thoughtLeadership', max: 10, color: 'var(--green)' }
];

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      setProfile(data.profile);
    } catch {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await profileService.calculateScore();
      await loadProfile();
      toast.success('Score recalculated!');
    } catch {
      toast.error('Failed to recalculate score');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCompleteSuggestion = async (id) => {
    try {
      await profileService.completeSuggestion(id);
      await loadProfile();
      toast.success('Marked as complete!');
    } catch {
      toast.error('Failed to update suggestion');
    }
  };

  if (loading) return <DashboardSkeleton />;

  const scores = profile?.scores || {};
  const history = profile?.scoreHistory || [];
  const suggestions = (profile?.suggestions || []).filter((item) => !item.completed);
  const completed = (profile?.suggestions || []).filter((item) => item.completed);
  const prevScore = history.length >= 2 ? history[history.length - 2]?.total : null;
  const scoreDelta = prevScore !== null ? (scores.total || 0) - prevScore : null;

  const radarData = [
    { subject: 'Personal', value: scores.personalPresence || 0 },
    { subject: 'Profiles', value: scores.professionalProfiles || 0 },
    { subject: 'Networking', value: scores.networking || 0 },
    { subject: 'Credentials', value: scores.credentials || 0 },
    { subject: 'Leadership', value: scores.thoughtLeadership || 0 }
  ];

  const historyData = history.slice(-14).map((item) => ({
    date: format(new Date(item.date), 'MMM d'),
    score: item.total
  }));

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Track your branding score, monitor category performance, and focus on the next improvements that matter."
      actions={(
        <Button
          variant="secondary"
          icon={<RiRefreshLine style={{ fontSize: 16 }} />}
          loading={refreshing}
          onClick={handleRecalculate}
        >
          Recalculate
        </Button>
      )}
    >
      <section style={{
        marginBottom: 22,
        padding: '30px 34px',
        borderRadius: 26,
        background: 'linear-gradient(135deg, var(--accent-light), var(--accent-strong))',
        color: '#fff',
        boxShadow: '0 22px 46px rgba(177, 7, 56, 0.16)'
      }}>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.78)',
          marginBottom: 10
        }}>
          Performance Snapshot
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 40,
          fontWeight: 800,
          marginBottom: 10
        }}>
          Welcome back, {user?.firstName}
        </h2>
        <p style={{ maxWidth: 760, fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.86)' }}>
          Review your current brand score, compare category strengths, and use the suggestion queue to improve weaker signals steadily.
        </p>
      </section>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 320px) 1fr',
        gap: 20,
        marginBottom: 20
      }}>
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <ScoreRing
            score={scores.total || 0}
            level={scores.level || 'Beginner'}
            size={170}
          />

          <div style={{ width: '100%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Percentile</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 15,
                color: 'var(--gold)'
              }}>
                Top {100 - (scores.percentile || 0)}%
              </span>
            </div>

            <div style={{
              height: 6,
              background: 'var(--bg-hover)',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${scores.percentile || 0}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--gold))',
                borderRadius: 3,
                transition: 'width 1s ease'
              }} />
            </div>

            {scoreDelta !== null && (
              <div style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: scoreDelta >= 0 ? 'var(--green)' : 'var(--red)'
              }}>
                {scoreDelta >= 0 ? <RiArrowUpLine /> : <RiArrowDownLine />}
                {Math.abs(scoreDelta)} points since last update
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 20,
            color: 'var(--text-primary)'
          }}>
            Score Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {BREAKDOWN_ITEMS.map(({ label, key, max, color }) => {
              const value = scores[key] || 0;
              const percent = Math.round((value / max) * 100);

              return (
                <div key={key}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                    fontSize: 13
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ color, fontWeight: 700 }}>
                      {value} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/ {max}</span>
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    background: 'var(--bg-hover)',
                    borderRadius: 3,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${percent}%`,
                      background: color,
                      borderRadius: 3,
                      opacity: 0.9
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 20,
        marginBottom: 20
      }}>
        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 20
          }}>
            Score History
          </h3>

          {historyData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                    fontSize: 13
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{
              height: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: 8
            }}>
              <RiTimeLine style={{ fontSize: 32 }} />
              <p style={{ fontSize: 13 }}>Score history will appear after multiple recalculations.</p>
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 800,
            marginBottom: 20
          }}>
            Skill Radar
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Radar
                name="Score"
                dataKey="value"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.18}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800 }}>
              Improvement Suggestions
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {suggestions.length} pending · {completed.length} completed
            </p>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 0',
            color: 'var(--text-muted)'
          }}>
            <RiCheckboxCircleLine style={{ fontSize: 40, color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 14 }}>All suggestions completed - great work!</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Recalculate your score to get fresh suggestions.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion._id || index}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--surface-tint)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${
                    suggestion.priority === 'high'
                      ? 'var(--accent)'
                      : suggestion.priority === 'medium'
                        ? 'var(--gold)'
                        : 'var(--text-muted)'
                  }`,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4
                  }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: CATEGORY_COLORS[suggestion.category] || 'var(--accent)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {suggestion.category}
                    </span>
                    <span style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 999,
                      background:
                        suggestion.priority === 'high'
                          ? 'var(--accent-dim)'
                          : suggestion.priority === 'medium'
                            ? 'var(--gold-dim)'
                            : 'var(--bg-hover)',
                      color:
                        suggestion.priority === 'high'
                          ? 'var(--accent)'
                          : suggestion.priority === 'medium'
                            ? 'var(--gold)'
                            : 'var(--text-muted)',
                      textTransform: 'capitalize'
                    }}>
                      {suggestion.priority}
                    </span>
                  </div>

                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>
                    {suggestion.text}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Impact: {suggestion.impact}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RiArrowRightLine />}
                    onClick={() => navigate(CATEGORY_ROUTES[suggestion.category] || '/dashboard')}
                  >
                    Fix
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    icon={<RiCheckboxCircleLine />}
                    onClick={() => handleCompleteSuggestion(suggestion._id)}
                  >
                    Done
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageLayout>
  );
}

function DashboardSkeleton() {
  return (
    <PageLayout title="Dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 20 }}>
        {[280, 'auto'].map((width, index) => (
          <div
            key={index}
            className="shimmer"
            style={{
              height: 300,
              borderRadius: 'var(--radius)',
              width: typeof width === 'number' ? width : '100%'
            }}
          />
        ))}
      </div>
    </PageLayout>
  );
}

