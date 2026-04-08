import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import InputField from '../components/Common/InputField';
import { SectionHeader, ScorePreviewCard } from '../components/Common/SharedHelpers';
import { profileService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  RiGithubLine, RiSearchLine, RiCodeLine,
  RiGitRepositoryLine, RiTimeLine
} from 'react-icons/ri';

export default function GitHubPage() {
  const { user } = useAuth();

  const [username, setUsername] = useState('');
  const [github, setGithub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  // 🔒 Permission check (GLOBAL for this page)
  const hasAccess =
    user?.permissions?.profileBranding?.keywordOptimizer ?? false;

  const load = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      const gh = data.profile?.github || {};
      if (gh.username) {
        setUsername(gh.username);
        setGithub(gh);
      }
    } catch {
      toast.error('Failed to load GitHub data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFetch = async () => {
    if (!hasAccess) {
      return toast.error('Access not granted by admin');
    }

    const normalizedUsername = normalizeGithubUsername(username);

    if (!normalizedUsername) return toast.error('Enter a GitHub username or profile URL');
    if (normalizedUsername.length > 39) {
      return toast.error('GitHub usernames must be 39 characters or fewer');
    }
    if (!isValidGithubUsername(normalizedUsername)) {
      return toast.error('Enter a valid GitHub username or profile URL');
    }

    setFetching(true);

    try {
      const { data } = await profileService.fetchGitHub({ username: normalizedUsername });
      setGithub(data.github);
      setUsername(normalizedUsername);

      await profileService.calculateScore();

      toast.success('GitHub profile fetched & score updated!');
    } catch (err) {
      const message = err.response?.data?.message || err.message || '';
      const normalizedMessage = message.toLowerCase();

      if (normalizedMessage.includes('not found')) {
        toast.error(`GitHub user "${normalizedUsername}" not found.`);
      } else if (normalizedMessage.includes('rate limit')) {
        toast.error('GitHub API rate limit hit.');
      } else {
        toast.error(message || 'Failed to fetch GitHub profile.');
      }
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="GitHub Profile">
        <div className="shimmer" style={{ height: 400, borderRadius: 14 }} />
      </PageLayout>
    );
  }

  const score = calcGitHubScore(github);

  return (
    <PageLayout
      title="GitHub Profile"
      subtitle="Connect your GitHub to fetch repository and contribution data"
    >
      <div style={{ position: 'relative' }}>

        {/* 🔥 LOCK OVERLAY */}
        {!hasAccess && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12
          }}>
            <div style={{
              background: '#111',
              color: '#fff',
              padding: '20px 30px',
              borderRadius: 10,
              textAlign: 'center'
            }}>
              🔒 Access not granted by admin
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 20,
          alignItems: 'start',
          opacity: hasAccess ? 1 : 0.5,
          pointerEvents: hasAccess ? 'auto' : 'none'
        }}>

          {/* LEFT SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Fetch Card */}
            <Card>
              <SectionHeader icon={<RiGithubLine />} title="Connect GitHub" />

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <InputField
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. torvalds or github.com/torvalds"
                    icon={<RiGithubLine />}
                  />
                </div>

                <Button
                  icon={<RiSearchLine />}
                  loading={fetching}
                  onClick={handleFetch}
                >
                  Fetch
                </Button>
              </div>
            </Card>

            {/* DATA */}
            {github && (
              <>
                <Card>
                  <SectionHeader icon={<RiGitRepositoryLine />} title="Repository Stats" />

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 14
                  }}>
                    <StatBox label="Repos" value={github.publicRepos || 0} />
                    <StatBox label="Total" value={github.repositoriesCount || 0} />
                    <StatBox label="Contributions" value={github.contributionsLastYear || 0} />
                    <StatBox label="Followers" value={github.followers || 0} />
                    <StatBox label="Following" value={github.following || 0} />
                    <StatBox label="README" value={github.hasReadme ? 'Yes' : 'No'} />
                  </div>
                </Card>

                {/* Languages */}
                {github.topLanguages?.length > 0 && (
                  <Card>
                    <SectionHeader icon={<RiCodeLine />} title="Top Languages" />

                    {github.topLanguages.map(({ language, percentage }) => (
                      <div key={language} style={{ marginBottom: 10 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 13
                        }}>
                          <span>{language}</span>
                          <span>{percentage}%</span>
                        </div>

                        <div style={{ height: 6, background: '#eee', borderRadius: 3 }}>
                          <div style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: '#B30437'
                          }} />
                        </div>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}

            {!github && (
              <Card style={{ textAlign: 'center' }}>
                <RiGithubLine style={{ fontSize: 40 }} />
                <p>Enter username and fetch data</p>
              </Card>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <ScorePreviewCard
              title="GitHub Score"
              score={score}
              max={8}
              items={[
                { label: 'Connected', done: !!github?.username, pts: 2 },
                { label: 'Repos ≥10', done: (github?.publicRepos || 0) >= 10, pts: 2 },
                { label: 'Contributions ≥100', done: (github?.contributionsLastYear || 0) >= 100, pts: 2 },
                { label: 'README', done: github?.hasReadme, pts: 1 },
                { label: 'Followers ≥50', done: (github?.followers || 0) >= 50, pts: 1 }
              ]}
            />

            <Card>
              <p style={{ fontSize: 13 }}>
                <RiTimeLine /> Auto-fetched from GitHub API
              </p>
            </Card>
          </div>

        </div>
      </div>
    </PageLayout>
  );
}

// 🔢 Score logic
function calcGitHubScore(gh) {
  if (!gh) return 0;
  let s = 0;
  if (gh.username) s += 2;
  if ((gh.publicRepos || 0) >= 10) s += 2;
  if ((gh.contributionsLastYear || 0) >= 100) s += 2;
  if (gh.hasReadme) s += 1;
  if ((gh.followers || 0) >= 50) s += 1;
  return Math.min(8, s);
}

// 🧹 Normalize username
function normalizeGithubUsername(value) {
  let v = (value || '').trim();
  if (!v) return '';
  v = v.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
  v = v.replace(/^@/, '');
  return v.split(/[/?#]/)[0];
}

// ✅ Validate username
function isValidGithubUsername(value) {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(value);
}

// 📦 Stat Box
function StatBox({ label, value }) {
  return (
    <div style={{
      padding: 12,
      border: '1px solid #eee',
      borderRadius: 6
    }}>
      <div style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}