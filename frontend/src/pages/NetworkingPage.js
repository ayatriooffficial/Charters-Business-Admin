import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import InputField from '../components/Common/InputField';
import { SectionHeader } from '../components/Common/SharedHelpers';
import { profileService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiArticleLine,
  RiBarChartLine,
  RiGlobalLine,
  RiGroupLine,
  RiLinksLine,
  RiLockLine,
  RiSaveLine,
  RiShareLine,
  RiUserFollowLine
} from 'react-icons/ri';

const INITIAL_FORM = {
  platform: 'Twitter / X',
  profileUrl: '',
  followersCount: 0,
  longFormArticles: 0,
  engagementRate: 0,
  postsLast60Days: 0,
  groupsJoined: 0
};

const METRICS = [
  {
    key: 'followersCount',
    label: 'Followers / Connections',
    max: 500,
    hint: 'Use the audience size from your strongest social or blogging platform.'
  },
  {
    key: 'longFormArticles',
    label: 'Long-Form Articles Published',
    max: 100,
    hint: 'Deep-dive articles, newsletters, case studies, or blog posts you authored.'
  },
  {
    key: 'engagementRate',
    label: 'Avg. Engagement Rate %',
    max: 100,
    hint: 'Average engagement rate across your recent posts.'
  },
  {
    key: 'postsLast60Days',
    label: 'Posts Created / Shared in Past 60 Days',
    max: 120,
    hint: 'Count original posts plus curated shares from the last 60 days.'
  },
  {
    key: 'groupsJoined',
    label: 'Groups / Communities Joined',
    max: 100,
    hint: 'Communities, circles, Discords, Slack groups, or platform-native groups.'
  }
];

export default function NetworkingPage() {
  const { user } = useAuth();
  const hasAccess = user?.permissions?.profileBranding?.headlineGenerator;
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      const networking = data.profile?.networking || {};

      setForm({
        platform: networking.platform || 'Twitter / X',
        profileUrl: networking.profileUrl || '',
        followersCount: networking.followersCount ?? networking.connectionsCount ?? 0,
        longFormArticles: networking.longFormArticles ?? networking.articlesPublished ?? 0,
        engagementRate: networking.engagementRate ?? 0,
        postsLast60Days: networking.postsLast60Days ?? networking.postsShared ?? 0,
        groupsJoined: networking.groupsJoined ?? 0
      });
    } catch {
      toast.error('Failed to load social media metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setText = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setNumber = (key) => (e) => {
    const rawValue = e.target.value;
    const nextValue = rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0);
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const handleSave = async () => {
    if (!hasAccess) {
      toast.error('Access not granted by admin');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        platform: form.platform.trim() || 'Twitter / X',
        profileUrl: form.profileUrl.trim()
      };

      await profileService.updateNetworking(payload);
      await profileService.calculateScore();
      toast.success('Social media metrics saved and score updated!');
    } catch {
      toast.error('Failed to save social media metrics');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Networking">
        <div className="shimmer" style={{ height: 420, borderRadius: 14 }} />
      </PageLayout>
    );
  }

  const breakdown = getNetworkingBreakdown(form);

  return (
    <PageLayout
      title="Networking"
      subtitle="Track your reach and content activity on Twitter / X, Medium, Substack, Dev.to, LinkedIn, or any other social / blogging platform."
      actions={(
        <Button
          icon={<RiSaveLine />}
          loading={saving}
          onClick={handleSave}
          disabled={!hasAccess}
          style={{ opacity: hasAccess ? 1 : 0.5, pointerEvents: hasAccess ? 'auto' : 'none' }}
        >
          Save & Recalculate
        </Button>
      )}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionHeader icon={<RiGlobalLine />} title="Platform Source" color="var(--gold)" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <InputField
                label="Platform / Site Name"
                value={form.platform}
                onChange={setText('platform')}
                placeholder="Twitter / X, Medium, Substack, Dev.to..."
                hint="Use the platform where your content and audience are strongest."
                icon={<RiGlobalLine />}
                style={{ marginBottom: 0 }}
              />
              <InputField
                label="Profile / Blog URL"
                value={form.profileUrl}
                onChange={setText('profileUrl')}
                placeholder="https://x.com/yourhandle or https://medium.com/@you"
                hint="Optional, but useful for keeping your source profile documented."
                icon={<RiLinksLine />}
                style={{ marginBottom: 0 }}
              />
            </div>
          </Card>

          <Card>
            <SectionHeader icon={<RiGroupLine />} title="Audience & Activity Metrics" color="var(--gold)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {METRICS.map(({ key, label, max, hint }) => (
                <div key={key}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: 6
                  }}>
                    {label}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="number"
                      min={0}
                      max={max}
                      step={key === 'engagementRate' ? '0.1' : '1'}
                      value={form[key]}
                      onChange={setNumber(key)}
                      style={{
                        width: 140,
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: 15,
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        outline: 'none'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, (form[key] / max) * 100)}%`,
                          background: 'linear-gradient(90deg, var(--gold), var(--orange))',
                          borderRadius: 3,
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{hint}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader icon={<RiBarChartLine />} title="Growth Tips" color="var(--orange)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Pick one primary platform and post consistently there before spreading yourself across many channels.',
                'Aim for at least 10 posts every 60 days so your audience sees a steady stream of activity.',
                'Turn wins, experiments, project breakdowns, and lessons learned into long-form articles.',
                'Join niche communities where your target audience already gathers and participate thoughtfully.'
              ].map((tip, index) => (
                <div
                  key={tip}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: index < 3 ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <span style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    background: 'var(--gold-dim)',
                    border: '1px solid rgba(179, 138, 88, 0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: 'var(--gold)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700
                  }}>
                    {index + 1}
                  </span>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--gold-dim)',
                border: '1px solid rgba(179, 138, 88, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                fontSize: 18
              }}>
                <RiShareLine />
              </span>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>
                  Networking Score
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {form.platform.trim() || 'Twitter / X'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 38,
                fontWeight: 800,
                color: 'var(--gold)'
              }}>
                {breakdown.total}
              </span>
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 20</span>
            </div>

            <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3, marginBottom: 18 }}>
              <div style={{
                height: '100%',
                width: `${(breakdown.total / 20) * 100}%`,
                background: 'linear-gradient(90deg, var(--gold), var(--orange))',
                borderRadius: 3,
                transition: 'width 0.8s ease'
              }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ScoreRow
                icon={<RiUserFollowLine />}
                label="Followers / Connections"
                value={form.followersCount}
                target="50 / 100 / 300 / 500+"
                points={breakdown.audience}
                maxPoints={8}
              />
              <ScoreRow
                icon={<RiArticleLine />}
                label="Long-Form Articles"
                value={form.longFormArticles}
                target="3+ target"
                points={breakdown.articles}
                maxPoints={4}
              />
              <ScoreRow
                icon={<RiBarChartLine />}
                label="Avg. Engagement Rate"
                value={`${form.engagementRate}%`}
                target="5%+ target"
                points={breakdown.engagement}
                maxPoints={2}
              />
              <ScoreRow
                icon={<RiShareLine />}
                label="Posts in Past 60 Days"
                value={form.postsLast60Days}
                target="10+ target"
                points={breakdown.posts}
                maxPoints={3}
              />
              <ScoreRow
                icon={<RiGroupLine />}
                label="Groups / Communities"
                value={form.groupsJoined}
                target="5+ target"
                points={breakdown.groups}
                maxPoints={3}
              />
            </div>
          </Card>

          <Card padding="16px" style={{ background: 'var(--green-dim)', border: '1px solid rgba(45, 122, 96, 0.14)' }}>
            <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 500, marginBottom: 6 }}>
              Focus on one channel
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Strong audience, consistent posting, and a few good long-form pieces usually beat spreading thin across many platforms.
            </p>
          </Card>
        </div>
      </div>
        </div>
      </div>
    </PageLayout>
  );
}

function getNetworkingBreakdown(form) {
  const audience =
    form.followersCount >= 500 ? 8 :
    form.followersCount >= 300 ? 6 :
    form.followersCount >= 100 ? 4 :
    form.followersCount >= 50 ? 2 : 0;

  const groups = form.groupsJoined >= 5 ? 3 : 0;
  const posts = form.postsLast60Days >= 10 ? 3 : 0;
  const articles = form.longFormArticles >= 3 ? 4 : 0;
  const engagement = form.engagementRate >= 5 ? 2 : 0;

  return {
    audience,
    groups,
    posts,
    articles,
    engagement,
    total: Math.min(20, audience + groups + posts + articles + engagement)
  };
}

function ScoreRow({ icon, label, value, target, points, maxPoints }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '22px 1fr auto',
      gap: 10,
      alignItems: 'center',
      padding: '10px 12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)'
    }}>
      <span style={{ color: 'var(--gold)', fontSize: 16 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          Current: {value} · Target: {target}
        </p>
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color: points > 0 ? 'var(--gold)' : 'var(--text-muted)'
      }}>
        {points}/{maxPoints}
      </span>
    </div>
  );
}


