import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  RiArrowRightUpLine,
  RiAwardLine,
  RiBarChartGroupedLine,
  RiGlobalLine,
  RiGithubLine,
  RiLinkedinBoxLine,
  RiLock2Line,
  RiMagicLine,
  RiMedalLine,
  RiRobotLine,
  RiRocket2Line,
  RiSparklingLine,
  RiTeamLine,
  RiTimeLine,
  RiYoutubeLine
} from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import ScoreRing from '../components/Common/ScoreRing';

const readBoolean = (value) => Boolean(value);
const readNumber = (value) => (Number.isFinite(value) ? value : 0);

function formatLastCalculated(value) {
  if (!value) return 'Not calculated yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not calculated yet';
  return date.toLocaleString();
}

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const profilePermissions = user?.permissions?.profileBranding || {};
  const aiPermissions = user?.permissions?.aiInterview || {};
  const profilePermissionCount = Object.values(profilePermissions).filter(readBoolean).length;
  const aiPermissionCount = Object.values(aiPermissions).filter(readBoolean).length;
  const totalPermissionCount = Object.keys(profilePermissions).length + Object.keys(aiPermissions).length;
  const unlockedPermissionCount = profilePermissionCount + aiPermissionCount;

  const hasProfileHubAccess = Object.values(profilePermissions).some(readBoolean);
  const hasAIAccess = Object.values(aiPermissions).some(readBoolean);

  useEffect(() => {
    let alive = true;

    const loadProfile = async () => {
      try {
        const { data } = await profileService.getScore();
        if (alive) setProfile(data?.profile || null);
      } catch (error) {
        if (alive) setProfile(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      alive = false;
    };
  }, []);

  const scores = profile?.scores || {};

  const workspaceCards = useMemo(() => ([
    {
      id: 'profile-branding',
      title: 'Profile Branding',
      subtitle: 'Track and improve your full score',
      description: 'View category-by-category scoring, insights, and completion momentum.',
      to: '/dashboard',
      icon: RiBarChartGroupedLine,
      enabled: hasProfileHubAccess
    },
    {
      id: 'linkedin',
      title: 'LinkedIn Studio',
      subtitle: 'Headline and profile depth',
      description: 'Strengthen discoverability and profile structure with guided checks.',
      to: '/linkedin',
      icon: RiLinkedinBoxLine,
      enabled: readBoolean(profilePermissions.headlineGenerator)
    },
    {
      id: 'github',
      title: 'GitHub Signals',
      subtitle: 'Portfolio quality and relevance',
      description: 'Review repo quality, profile signals, and brand-fit technical visibility.',
      to: '/github',
      icon: RiGithubLine,
      enabled: readBoolean(profilePermissions.keywordOptimizer)
    },
    {
      id: 'website',
      title: 'Website Verifier',
      subtitle: 'Professional web presence',
      description: 'Validate structure, essentials, and impact cues on your personal site.',
      to: '/website',
      icon: RiGlobalLine,
      enabled: readBoolean(profilePermissions.headlineGenerator)
    },
    {
      id: 'networking',
      title: 'Networking',
      subtitle: 'Audience and engagement health',
      description: 'Measure consistency and social proof signals across your professional reach.',
      to: '/networking',
      icon: RiTeamLine,
      enabled: readBoolean(profilePermissions.headlineGenerator)
    },
    {
      id: 'youtube',
      title: 'YouTube Presence',
      subtitle: 'Thought leadership footprint',
      description: 'Analyze educational content signal and how it boosts your brand authority.',
      to: '/youtube',
      icon: RiYoutubeLine,
      enabled: readBoolean(profilePermissions.headlineGenerator)
    },
    {
      id: 'credentials',
      title: 'Credential Vault',
      subtitle: 'Courses and certifications',
      description: 'Organize proof of skill development and keep your profile credibility fresh.',
      to: '/credentials',
      icon: RiAwardLine,
      enabled: true
    },
    {
      id: 'ai-tools',
      title: 'AI Tools',
      subtitle: 'Generation and optimization helpers',
      description: 'Use AI to tighten messaging and profile narrative quality faster.',
      to: '/ai-tools',
      icon: RiMagicLine,
      enabled: readBoolean(profilePermissions.headlineGenerator)
    }
  ]), [hasProfileHubAccess, profilePermissions]);

  const disabledWorkspaceCount = workspaceCards.filter((card) => !card.enabled).length;

  return (
    <PageLayout
      title={`Welcome Back, ${user?.firstName || 'Candidate'}`}
      subtitle="Use this launchpad to jump into the right workspace, monitor your score health, and focus on the next high-impact actions."
      actions={(
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          style={primaryActionStyle}
        >
          Open Profile Dashboard
          <RiArrowRightUpLine style={{ fontSize: 16 }} />
        </button>
      )}
    >
      <section className="fade-up" style={heroStyle}>
        <div style={{ flex: '1 1 360px', minWidth: 0 }}>
          <p style={eyebrowStyle}>Personal Launchpad</p>
          <h2 style={heroTitleStyle}>
            Focus on the next improvement, not the noise.
          </h2>
          <p style={heroTextStyle}>
            Your account is connected to <strong>{user?.selectedCourse || 'your course track'}</strong>.
            Work through the unlocked tools to raise your profile quality and visibility.
          </p>

          <div style={chipRowStyle}>
            <span style={infoChipStyle}>
              <RiRocket2Line />
              {unlockedPermissionCount}/{totalPermissionCount || 0} features unlocked
            </span>
            <span style={infoChipStyle}>
              <RiLock2Line />
              {disabledWorkspaceCount} workspace{disabledWorkspaceCount === 1 ? '' : 's'} locked
            </span>
            <span style={infoChipStyle}>
              <RiTimeLine />
              Last score update: {formatLastCalculated(scores.lastCalculated)}
            </span>
          </div>
        </div>

        <div style={{ flex: '0 1 230px', display: 'flex', justifyContent: 'center' }}>
          {loading ? (
            <div className="shimmer" style={{ width: 190, height: 190, borderRadius: '50%' }} />
          ) : (
            <ScoreRing
              score={readNumber(scores.total)}
              level={scores.level || 'Beginner'}
              size={180}
            />
          )}
        </div>
      </section>

      <section className="fade-up" style={{ animationDelay: '0.06s', marginBottom: 18 }}>
        <div style={metricsGridStyle}>
          <MetricCard
            icon={<RiMedalLine />}
            label="Current Level"
            value={scores.level || 'Beginner'}
            color="var(--accent)"
          />
          <MetricCard
            icon={<RiSparklingLine />}
            label="Total Score"
            value={loading ? '...' : `${readNumber(scores.total)}/100`}
            color="var(--navy)"
          />
          <MetricCard
            icon={<RiRocket2Line />}
            label="Percentile"
            value={loading ? '...' : `${readNumber(scores.percentile)}%`}
            color="var(--gold)"
          />
          <MetricCard
            icon={<RiRobotLine />}
            label="AI Interview Access"
            value={hasAIAccess ? `${aiPermissionCount} enabled` : 'Locked'}
            color={hasAIAccess ? 'var(--green)' : 'var(--text-muted)'}
          />
        </div>
      </section>

      <section className="fade-up" style={{ animationDelay: '0.12s', marginBottom: 18 }}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={sectionEyebrowStyle}>Workspace Hub</p>
            <h3 style={sectionTitleStyle}>Choose a tool and keep moving</h3>
          </div>
        </div>

        <div style={workspaceGridStyle}>
          {workspaceCards.map((card) => (
            <WorkspaceCard
              key={card.id}
              card={card}
              onOpen={(target) => {
                if (!card.enabled) {
                  toast.error('Access not granted by admin');
                  return;
                }
                navigate(target);
              }}
            />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}

function MetricCard({ icon, label, value, color }) {
  return (
    <Card hover={false} padding="14px 16px">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </span>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>
        {value}
      </p>
    </Card>
  );
}

function WorkspaceCard({ card, onOpen }) {
  const Icon = card.icon;
  const locked = !card.enabled;

  return (
    <button
      type="button"
      onClick={() => onOpen(card.to)}
      style={{
        textAlign: 'left',
        border: '1px solid var(--border)',
        borderRadius: 16,
        background: locked
          ? 'linear-gradient(160deg, #faf8f5, #f4efe8)'
          : 'linear-gradient(150deg, #ffffff, #fbf8f4)',
        padding: '16px 16px',
        cursor: 'pointer',
        position: 'relative',
        minHeight: 172,
        transition: 'all 0.2s ease',
        opacity: locked ? 0.75 : 1
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-2px)';
        event.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'none';
        event.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: locked ? '#ece6df' : 'var(--accent-dim)',
          color: locked ? 'var(--text-muted)' : 'var(--accent)',
          fontSize: 20
        }}>
          <Icon />
        </span>

        {locked ? (
          <span style={lockedBadgeStyle}>
            <RiLock2Line style={{ marginRight: 5, verticalAlign: 'text-bottom' }} />
            Locked
          </span>
        ) : (
          <span style={openBadgeStyle}>
            Open
            <RiArrowRightUpLine style={{ marginLeft: 5, verticalAlign: 'text-bottom' }} />
          </span>
        )}
      </div>

      <h4 style={{ fontSize: 19, fontWeight: 800, marginBottom: 4, color: 'var(--text-primary)' }}>
        {card.title}
      </h4>
      <p style={{ fontSize: 13, color: 'var(--navy-soft)', marginBottom: 8 }}>
        {card.subtitle}
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        {card.description}
      </p>
    </button>
  );
}

const primaryActionStyle = {
  border: 'none',
  borderRadius: 12,
  background: 'linear-gradient(180deg, var(--accent-light), var(--accent))',
  color: '#fff',
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8
};

const heroStyle = {
  border: '1px solid var(--border)',
  borderRadius: 24,
  padding: '24px 24px',
  marginBottom: 18,
  background: 'linear-gradient(140deg, #ffffff 0%, #fbf8f4 56%, #f4ede5 100%)',
  boxShadow: 'var(--shadow-md)',
  display: 'flex',
  gap: 20,
  flexWrap: 'wrap',
  alignItems: 'center'
};

const eyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--accent)',
  marginBottom: 9
};

const heroTitleStyle = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(28px, 3.3vw, 40px)',
  lineHeight: 1.06,
  marginBottom: 10
};

const heroTextStyle = {
  color: 'var(--text-secondary)',
  lineHeight: 1.65,
  fontSize: 15,
  maxWidth: 760
};

const chipRowStyle = {
  marginTop: 16,
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap'
};

const infoChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  borderRadius: 999,
  fontSize: 12,
  color: 'var(--navy-soft)',
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid var(--border)'
};

const metricsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12
};

const sectionHeaderStyle = {
  marginBottom: 10,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-end',
  gap: 10,
  flexWrap: 'wrap'
};

const sectionEyebrowStyle = {
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  letterSpacing: '0.08em',
  marginBottom: 5
};

const sectionTitleStyle = {
  fontSize: 24,
  fontWeight: 800,
  color: 'var(--text-primary)'
};

const workspaceGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: 12
};

const lockedBadgeStyle = {
  fontSize: 11,
  color: 'var(--text-muted)',
  border: '1px solid var(--border)',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#fff'
};

const openBadgeStyle = {
  fontSize: 11,
  color: 'var(--green)',
  border: '1px solid var(--green-dim)',
  borderRadius: 999,
  padding: '4px 9px',
  background: '#f7fffb'
};
