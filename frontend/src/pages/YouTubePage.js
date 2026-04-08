import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  RiYoutubeLine,
  RiSearchLine,
  RiTimeLine,
  RiBarChartLine,
  RiExternalLinkLine,
  RiCheckboxCircleLine,
  RiPlayLine,
  RiLockLine
} from 'react-icons/ri';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/api';
import PageLayout from '../components/Layout/PageLayout';
import Card from '../components/Common/Card';
import Button from '../components/Common/Button';
import InputField from '../components/Common/InputField';
import { EmptyState, ScorePreviewCard, SectionHeader } from '../components/Common/SharedHelpers';

export default function YouTubePage() {
  const { user } = useAuth();
  const hasAccess = user?.permissions?.profileBranding?.headlineGenerator;
  const [channelUrl, setChannelUrl] = useState('');
  const [youtube, setYoutube] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      const yt = data.profile?.youtube || null;

      if (yt?.channelUrl) {
        setChannelUrl(yt.channelUrl);
        setYoutube(yt);
      } else {
        setYoutube(null);
      }
    } catch {
      toast.error('Failed to load YouTube data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAnalyze = async () => {
    if (!hasAccess) {
      return toast.error('Access not granted by admin');
    }

    if (!channelUrl.trim()) {
      return toast.error('Enter your YouTube channel link');
    }
    if (!user?.selectedCourse) {
      return toast.error('No selected course was found on your account');
    }

    setAnalyzing(true);
    try {
      const { data } = await profileService.analyzeYouTube({
        channelUrl: channelUrl.trim()
      });
      setYoutube(data.youtube);
      await profileService.calculateScore();
      await load();
      toast.success('YouTube channel analyzed and score updated');
    } catch (err) {
      toast.error(err.message || 'Failed to analyze YouTube channel');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="YouTube Channel">
        <div className="shimmer" style={{ height: 400, borderRadius: 14 }} />
      </PageLayout>
    );
  }

  const averageLengthSeconds = youtube?.averageLengthSeconds || 0;
  const averageRelevanceScore = youtube?.averageRelevanceScore || 0;
  const totalVideos = youtube?.totalVideos || 0;
  const thoughtLeadershipBonus = youtube?.metrics?.thoughtLeadershipBonus || 0;
  const overallScore = youtube?.metrics?.overall || 0;

  return (
    <PageLayout
      title="YouTube Channel"
      subtitle={`We compare your public video titles with your selected course: ${user?.selectedCourse || 'Not selected'}`}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionHeader icon={<RiYoutubeLine />} title="Analyze Channel" color="#ff5e57" />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <InputField
                  value={channelUrl}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  placeholder="https://www.youtube.com/@yourchannel"
                  icon={<RiYoutubeLine />}
                  hint="Use a public YouTube channel URL. We analyze the channel videos page."
                />
              </div>
              <Button
                icon={<RiSearchLine />}
                loading={analyzing}
                disabled={!hasAccess}
                onClick={handleAnalyze}
                style={{ alignSelf: 'flex-start' }}
              >
                Analyze
              </Button>
            </div>
          </Card>

          {youtube ? (
            <>
              <Card>
                <SectionHeader icon={<RiBarChartLine />} title="Channel Metrics" color="var(--accent)" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                  <StatBox label="Channel" value={youtube.channelName || 'YouTube Channel'} color="#ff5e57" />
                  <StatBox label="Videos Analyzed" value={totalVideos} color="var(--green)" />
                  <StatBox label="Avg Title Relevance" value={`${averageRelevanceScore}%`} color="var(--gold)" />
                  <StatBox label="Avg Video Length" value={formatDuration(averageLengthSeconds)} color="var(--accent)" />
                  <StatBox label="Relevant Videos" value={youtube.relevantVideoCount || 0} color="var(--orange)" />
                  <StatBox label="Thought Leadership Bonus" value={`+${thoughtLeadershipBonus}`} color="var(--green)" />
                </div>
              </Card>

              <Card>
                <SectionHeader icon={<RiPlayLine />} title="Recent Video Titles" color="var(--green)" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {youtube.videos?.map((video, index) => (
                    <div
                      key={`${video.url || video.title}-${index}`}
                      style={{
                        padding: '14px 16px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: 6,
                            lineHeight: 1.5
                          }}>
                            {video.title}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            <Badge color={relevanceColor(video.relevanceScore)}>
                              Relevance {video.relevanceScore}%
                            </Badge>
                            <Badge color="var(--accent-light)">
                              {video.lengthText || 'N/A'}
                            </Badge>
                          </div>
                          {video.matchedKeywords?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {video.matchedKeywords.map((keyword) => (
                                <span
                                  key={`${video.title}-${keyword}`}
                                  style={{
                                    fontSize: 11,
                                    padding: '3px 8px',
                                    background: 'var(--gold-dim)',
                                    color: 'var(--gold)',
                                    borderRadius: 20
                                  }}
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {video.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<RiExternalLinkLine />}
                            onClick={() => window.open(video.url, '_blank')}
                          >
                            Open
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
              <EmptyState
                icon={<RiYoutubeLine />}
                text="Add your public YouTube channel and we will score title relevancy, average video length, and channel activity."
              />
            </Card>
          )}
        </div>

        <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ScorePreviewCard
            title="YouTube Score"
            score={overallScore}
            max={10}
            color="#ff5e57"
            items={[
              { label: 'Avg title relevance 45%+', done: averageRelevanceScore >= 45, pts: 2 },
              { label: 'Avg title relevance 70%+', done: averageRelevanceScore >= 70, pts: 3 },
              { label: 'Avg video length 3-40 min', done: averageLengthSeconds >= 180 && averageLengthSeconds <= 2400, pts: 3 },
              { label: '8+ videos analyzed', done: totalVideos >= 8, pts: 1 },
              { label: '18+ videos analyzed', done: totalVideos >= 18, pts: 1 }
            ]}
          />

          <Card padding="16px" style={{ background: 'var(--accent-dim)', border: '1px solid rgba(177, 7, 56, 0.18)' }}>
            <p style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 500, marginBottom: 6 }}>
              <RiCheckboxCircleLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Thought Leadership Impact
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your YouTube analysis can contribute up to <strong style={{ color: 'var(--text-primary)' }}>3 bonus points</strong> to the Thought Leadership part of your overall score.
            </p>
          </Card>

          <Card padding="16px">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 8 }}>
              <RiTimeLine style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Course Match
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Titles are compared against your selected course keywords:
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 10, fontWeight: 600 }}>
              {user?.selectedCourse || 'No course selected'}
            </p>
          </Card>
        </div>
      </div>
        </div>
      </div>
    </PageLayout>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '14px 16px'
    }}>
      <div style={{
        fontSize: 12,
        color: 'var(--text-muted)',
        marginBottom: 6
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        fontWeight: 700,
        color,
        lineHeight: 1.35
      }}>
        {value}
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 11,
      padding: '3px 8px',
      borderRadius: 20,
      background: 'var(--bg-hover)',
      color
    }}>
      {children}
    </span>
  );
}

function relevanceColor(score) {
  if (score >= 70) return 'var(--green)';
  if (score >= 45) return 'var(--orange)';
  return 'var(--red)';
}

function formatDuration(totalSeconds) {
  if (!totalSeconds) return 'N/A';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
