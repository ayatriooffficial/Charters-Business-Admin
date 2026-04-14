import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import InputField from '../components/Common/InputField';
import {
  AI_INTERVIEW_PERMISSION_TEMPLATE,
  PROFILE_BRANDING_PERMISSION_LABELS,
  PROFILE_BRANDING_PERMISSION_TEMPLATE,
  normalizePermissions as normalizePermissionSet,
} from '../utils/permissions';
import {
  RiArrowRightLine,
  RiDeleteBinLine,
  RiFilter3Line,
  RiLineChartLine,
  RiSearchLine,
  RiShieldUserLine,
  RiTeamLine,
  RiTrophyLine,
  RiUserSettingsLine
} from 'react-icons/ri';

function normalizePermissions(permissions = {}) {
  return normalizePermissionSet(permissions);
}

const PERMISSION_TEMPLATE = {
  profileBranding: PROFILE_BRANDING_PERMISSION_TEMPLATE,
  aiInterview: AI_INTERVIEW_PERMISSION_TEMPLATE,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeUser(entry = {}) {
  return {
    ...entry,
    permissions: normalizePermissions(entry.permissions),
    profileScores: normalizeProfileScores(entry.profileScores)
  };
}

function normalizeProfileScores(scores) {
  if (!scores || typeof scores !== 'object') return null;

  const readScore = (value) => (Number.isFinite(value) ? value : 0);

  return {
    total: readScore(scores.total),
    level: scores.level || 'Beginner',
    percentile: readScore(scores.percentile),
    personalPresence: readScore(scores.personalPresence),
    professionalProfiles: readScore(scores.professionalProfiles),
    networking: readScore(scores.networking),
    credentials: readScore(scores.credentials),
    thoughtLeadership: readScore(scores.thoughtLeadership),
    lastCalculated: scores.lastCalculated || null
  };
}

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [expandedScores, setExpandedScores] = useState({});
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setError('');

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data } = await api.get('/admin/users');
        setUsers((data.users || []).map(normalizeUser));
        setLoading(false);
        return;
      } catch (err) {
        const status = err?.response?.status;
        const isFinalAttempt = attempt === maxAttempts;

        if (status === 429 && !isFinalAttempt) {
          await sleep(1200 * attempt);
          continue;
        }

        const message = err?.message || 'Failed to load users';
        setError(message);
        setLoading(false);
        return;
      }
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((candidate) => {
      const roleMatch = roleFilter === 'all' || candidate.role === roleFilter;
      if (!roleMatch) return false;
      if (!search) return true;

      const haystack = `${candidate.firstName || ''} ${candidate.lastName || ''} ${candidate.email || ''} ${candidate.role || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }, [users, query, roleFilter]);

  const roleOptions = useMemo(() => {
    const roles = new Set(users.map((entry) => entry.role || 'candidate'));
    return ['all', ...Array.from(roles)];
  }, [users]);

  const summary = useMemo(() => {
    const totals = {
      total: users.length,
      admins: users.filter((entry) => entry.role === 'admin').length,
      candidates: users.filter((entry) => entry.role !== 'admin').length,
      profileBrandingEnabled: 0,
      aiInterviewEnabled: 0,
      scoredCandidates: 0,
      averageCandidateScore: 0
    };
    let totalCandidateScore = 0;

    users.forEach((entry) => {
      const profilePermissions = Object.values(entry?.permissions?.profileBranding || {});
      const aiPermissions = Object.values(entry?.permissions?.aiInterview || {});
      const totalScore = entry?.profileScores?.total;

      if (profilePermissions.some(Boolean)) totals.profileBrandingEnabled += 1;
      if (aiPermissions.some(Boolean)) totals.aiInterviewEnabled += 1;

      if (entry.role !== 'admin' && Number.isFinite(totalScore)) {
        totals.scoredCandidates += 1;
        totalCandidateScore += totalScore;
      }
    });

    totals.averageCandidateScore = totals.scoredCandidates
      ? Math.round(totalCandidateScore / totals.scoredCandidates)
      : 0;

    return totals;
  }, [users]);

  const updateToolPermissions = async (userId, tool, nextToolPermissions, successMessage) => {
    const key = `${userId}-${tool}`;
    setSavingKey(key);

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data } = await api.patch(`/admin/users/${userId}/permissions`, {
          permissions: {
            [tool]: nextToolPermissions
          }
        });

        setUsers((prev) => prev.map((entry) => {
          if (entry._id !== userId) return entry;
          return {
            ...entry,
            permissions: normalizePermissions(
              data?.user?.permissions || {
                ...entry.permissions,
                [tool]: nextToolPermissions
              }
            )
          };
        }));

        if (successMessage) toast.success(successMessage);
        setSavingKey('');
        return;
      } catch (err) {
        const status = err?.response?.status;
        const isFinalAttempt = attempt === maxAttempts;

        if (status === 429 && !isFinalAttempt) {
          await sleep(1200 * attempt);
          continue;
        }

        toast.error(err?.message || 'Failed to update permissions');
        setSavingKey('');
        return;
      }
    }
  };

  const togglePermission = (entry, tool, feature, currentValue) => {
    const currentToolPermissions = entry?.permissions?.[tool] || {};
    const nextToolPermissions = {
      ...currentToolPermissions,
      [feature]: !currentValue
    };
    updateToolPermissions(entry._id, tool, nextToolPermissions);
  };

  const setAllPermissionsForTool = (entry, tool, enabled) => {
    const currentToolPermissions = entry?.permissions?.[tool] || {};
    const permissionSource = {
      ...(PERMISSION_TEMPLATE[tool] || {}),
      ...currentToolPermissions
    };

    const nextToolPermissions = Object.keys(permissionSource).reduce((acc, feature) => {
      acc[feature] = enabled;
      return acc;
    }, {});

    updateToolPermissions(
      entry._id,
      tool,
      nextToolPermissions,
      enabled ? 'All permissions enabled' : 'All permissions disabled'
    );
  };

  const toggleScoreView = (userId) => {
    setExpandedScores((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const removeCandidate = async (entry) => {
    if (entry.role === 'admin') {
      toast.error('Admin accounts cannot be removed');
      return;
    }

    const fullName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || entry.email || 'this candidate';
    const confirmed = window.confirm(`Remove ${fullName}? This action disables the account and blocks login access.`);

    if (!confirmed) return;

    setDeletingId(entry._id);

    try {
      await api.delete(`/admin/users/${entry._id}`);
      setUsers((prev) => prev.filter((candidate) => candidate._id !== entry._id));
      toast.success('Candidate disabled successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to remove candidate');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <PageLayout
      title="Admin Control Center"
      subtitle="Manage feature access for each user with fast, auditable permission controls."
      actions={(
        <Link
          to="/admin/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          Recruiter Workspace
          <RiArrowRightLine />
        </Link>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <StatCard icon={<RiTeamLine />} label="Total Users" value={summary.total} accent="var(--navy)" />
        <StatCard icon={<RiShieldUserLine />} label="Admins" value={summary.admins} accent="var(--accent)" />
        <StatCard icon={<RiUserSettingsLine />} label="Candidates" value={summary.candidates} accent="var(--gold)" />
        <StatCard icon={<RiTrophyLine />} label="Avg Candidate Score" value={`${summary.averageCandidateScore}/100`} accent="var(--navy-soft)" />
        <StatCard icon={<RiShieldUserLine />} label="Profile Branding Enabled" value={summary.profileBrandingEnabled} accent="var(--green)" />
        <StatCard icon={<RiShieldUserLine />} label="AI Interview Enabled" value={summary.aiInterviewEnabled} accent="var(--orange)" />
      </div>

      <Card hover={false} style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <InputField
            label="Search Users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email..."
            icon={<RiSearchLine />}
            style={{ marginBottom: 0 }}
          />

          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 6
            }}>
              <RiFilter3Line style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Filter by Role
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--surface-tint)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: 14
              }}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role === 'all' ? 'All Roles' : toTitle(role)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="shimmer" style={{ height: 260, borderRadius: 14 }} />
      ) : error ? (
        <Card hover={false}>
          <p style={{ color: 'var(--red)' }}>{error}</p>
        </Card>
      ) : filteredUsers.length === 0 ? (
        <Card hover={false} style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No users match your current filter.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredUsers.map((entry) => {
            const profilePermissions = entry?.permissions?.profileBranding || {};
            const aiPermissions = entry?.permissions?.aiInterview || {};
            const profileEnabled = Object.values(profilePermissions).filter(Boolean).length;
            const aiEnabled = Object.values(aiPermissions).filter(Boolean).length;
            const isCandidate = entry.role !== 'admin';
            const scores = entry.profileScores;
            const isDeleting = deletingId === entry._id;
            const isBusy = savingKey.startsWith(`${entry._id}-`) || isDeleting;
            const isScoreOpen = Boolean(expandedScores[entry._id]);

            return (
              <Card key={entry._id} hover={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'linear-gradient(180deg, var(--accent-light), var(--accent))',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800
                    }}>
                      {`${entry.firstName?.[0] || ''}${entry.lastName?.[0] || ''}`.toUpperCase() || 'U'}
                    </div>

                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800 }}>
                        {entry.firstName} {entry.lastName}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{entry.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {isCandidate && (
                      <button
                        type="button"
                        onClick={() => toggleScoreView(entry._id)}
                        disabled={isDeleting}
                        style={bulkActionStyle}
                      >
                        <RiLineChartLine style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                        {isScoreOpen ? 'Hide Scores' : 'View Scores'}
                      </button>
                    )}
                    {isCandidate && (
                      <button
                        type="button"
                        onClick={() => removeCandidate(entry)}
                        disabled={isDeleting}
                        style={{
                          ...dangerActionStyle,
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          opacity: isDeleting ? 0.7 : 1
                        }}
                      >
                        <RiDeleteBinLine style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
                        {isDeleting ? 'Removing...' : 'Remove Candidate'}
                      </button>
                    )}
                    <RoleBadge role={entry.role} />
                    {isBusy && !isDeleting && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Saving...</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                  <MiniStat label="Profile Branding" value={`${profileEnabled}/${Object.keys(profilePermissions).length}`} />
                  <MiniStat label="AI Interview" value={`${aiEnabled}/${Object.keys(aiPermissions).length}`} />
                  {isCandidate && (
                    <MiniStat label="Total Score" value={scores ? `${scores.total}/100` : 'Not Calculated'} />
                  )}
                </div>

                {isCandidate && isScoreOpen && (
                  <ScoreBreakdown scores={scores} />
                )}

                <PermissionGroup
                  title="Profile Branding"
                  tool="profileBranding"
                  permissions={profilePermissions}
                  entry={entry}
                  disabled={isBusy}
                  onToggle={togglePermission}
                  onEnableAll={() => setAllPermissionsForTool(entry, 'profileBranding', true)}
                  onDisableAll={() => setAllPermissionsForTool(entry, 'profileBranding', false)}
                />

                <PermissionGroup
                  title="AI Interview"
                  tool="aiInterview"
                  permissions={aiPermissions}
                  entry={entry}
                  disabled={isBusy}
                  onToggle={togglePermission}
                  onEnableAll={() => setAllPermissionsForTool(entry, 'aiInterview', true)}
                  onDisableAll={() => setAllPermissionsForTool(entry, 'aiInterview', false)}
                />
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}

function PermissionGroup({
  title,
  tool,
  permissions,
  entry,
  disabled,
  onToggle,
  onEnableAll,
  onDisableAll
}) {
  const features = Object.entries(permissions);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
        flexWrap: 'wrap'
      }}>
        <h4 style={{
          fontSize: 12,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em'
        }}>
          {title}
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={onEnableAll}
            disabled={disabled}
            style={bulkActionStyle}
          >
            Enable All
          </button>
          <button
            type="button"
            onClick={onDisableAll}
            disabled={disabled}
            style={bulkActionStyle}
          >
            Disable All
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 8 }}>
        {features.map(([feature, currentValue]) => (
          <button
            key={`${entry._id}-${tool}-${feature}`}
            type="button"
            onClick={() => onToggle(entry, tool, feature, Boolean(currentValue))}
            disabled={disabled}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: currentValue ? 'var(--green-dim)' : 'var(--bg-secondary)',
              color: currentValue ? 'var(--green)' : 'var(--text-secondary)',
              padding: '10px 12px',
              fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              textTransform: 'none',
              opacity: disabled ? 0.6 : 1
            }}
          >
            <span>
              {tool === 'profileBranding'
                ? (PROFILE_BRANDING_PERMISSION_LABELS[feature] || toTitle(feature))
                : toTitle(feature)}
            </span>
            <ToggleVisual checked={Boolean(currentValue)} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleVisual({ checked }) {
  return (
    <span style={{
      width: 34,
      height: 20,
      borderRadius: 999,
      background: checked ? 'var(--green)' : '#c6cdd7',
      position: 'relative',
      transition: 'all 0.18s ease'
    }}>
      <span style={{
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: '#fff',
        position: 'absolute',
        top: 3,
        left: checked ? 17 : 3,
        transition: 'left 0.18s ease'
      }} />
    </span>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <Card hover={false} padding="14px 16px" style={{ minHeight: 84 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {label}
        </span>
        <span style={{ color: accent, fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1 }}>
        {value}
      </div>
    </Card>
  );
}

function MiniStat({ label, value }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 12,
      color: 'var(--text-secondary)',
      padding: '6px 10px',
      borderRadius: 999,
      background: 'var(--surface-tint)',
      border: '1px solid var(--border)'
    }}>
      <strong style={{ color: 'var(--text-primary)' }}>{label}</strong>
      <span>{value}</span>
    </span>
  );
}

function ScoreBreakdown({ scores }) {
  if (!scores) {
    return (
      <div style={scorePanelStyle}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
          No score is available yet. Candidate needs to complete profile scoring first.
        </p>
      </div>
    );
  }

  const metrics = [
    { label: 'Total', value: `${scores.total}/100` },
    { label: 'Level', value: scores.level || 'Beginner' },
    { label: 'Percentile', value: `${scores.percentile}%` },
    { label: 'Personal Presence', value: `${scores.personalPresence}/25` },
    { label: 'Professional Profiles', value: `${scores.professionalProfiles}/25` },
    { label: 'Networking', value: `${scores.networking}/20` },
    { label: 'Credentials', value: `${scores.credentials}/20` },
    { label: 'Thought Leadership', value: `${scores.thoughtLeadership}/10` }
  ];

  return (
    <div style={scorePanelStyle}>
      <h4 style={scoreTitleStyle}>Candidate Score Breakdown</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={scoreMetricCardStyle}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {metric.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>
        Last calculated: {formatDate(scores.lastCalculated)}
      </p>
    </div>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span style={{
      fontSize: 11,
      padding: '4px 8px',
      borderRadius: 999,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      background: isAdmin ? 'var(--accent-dim)' : 'var(--gold-dim)',
      color: isAdmin ? 'var(--accent)' : 'var(--gold)',
      fontWeight: 700
    }}>
      {role || 'user'}
    </span>
  );
}

function toTitle(value = '') {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function formatDate(value) {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return date.toLocaleString();
}

const bulkActionStyle = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer'
};

const dangerActionStyle = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid rgba(197, 42, 86, 0.34)',
  background: 'var(--red-dim)',
  color: 'var(--red)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer'
};

const scorePanelStyle = {
  border: '1px solid var(--border)',
  borderRadius: 12,
  background: 'var(--surface-tint)',
  padding: 12,
  marginBottom: 12
};

const scoreTitleStyle = {
  fontSize: 12,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 10
};

const scoreMetricCardStyle = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--bg-secondary)',
  padding: '8px 10px'
};

