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
  RiGlobalLine, RiSearchLine, RiFileTextLine,
  RiBriefcaseLine, RiNewspaperLine, RiMailLine,
  RiCheckLine, RiCloseLine, RiLockLine
} from 'react-icons/ri';

const PAGE_CHECKS = [
  { key: 'hasAboutPage',    label: 'About Page',    icon: <RiFileTextLine />,    pts: 3, desc: 'A page about you, your story, and background' },
  { key: 'hasPortfolio',    label: 'Portfolio',     icon: <RiBriefcaseLine />,   pts: 5, desc: 'Projects, case studies, or work samples' },
  { key: 'hasBlog',         label: 'Blog / Articles',icon: <RiNewspaperLine />,  pts: 4, desc: 'Published articles or blog posts' },
  { key: 'hasContactPage',  label: 'Contact Page',  icon: <RiMailLine />,        pts: 2, desc: 'A way for people to reach you' }
];

export default function WebsitePage() {
  const { user } = useAuth();

  // 🔒 Permission check
  const hasAccess =
    user?.permissions?.profileBranding?.headlineGenerator;

  const [url,        setUrl]        = useState('');
  const [website,    setWebsite]    = useState(null);
  const [verifying,  setVerifying]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      const w = data.profile?.personalWebsite || {};
      if (w.url) {
        setUrl(w.url);
        setWebsite(w);
      }
    } catch {
      toast.error('Failed to load website data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async () => {
    if (!hasAccess) return;

    if (!url.trim()) {
      return toast.error('Enter your website URL');
    }

    setVerifying(true);

    try {
      const { data } = await profileService.updateWebsite({
        url: url.trim()
      });

      setWebsite(data.profile?.personalWebsite || {});
      toast.success('Website verified & score updated!');
    } catch {
      toast.error('Failed to verify website. Make sure it is publicly accessible.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Personal Website">
        <div className="shimmer" style={{ height: 400, borderRadius: 14 }} />
      </PageLayout>
    );
  }

  const score = calcWebsiteScore(website);

  return (
    <PageLayout
      title="Personal Website"
      subtitle="Verify your personal website to automatically detect pages and content"
    >
      <div style={{ position: 'relative' }}>

        {/* 🔒 LOCK OVERLAY */}
        {!hasAccess && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.65)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            borderRadius: 12,
            flexDirection: 'column',
            gap: 10
          }}>
            <RiLockLine style={{ fontSize: 32 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Access Restricted
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              Admin has not enabled this feature for your account
            </div>
          </div>
        )}

        {/* 🔥 MAIN CONTENT */}
        <div
          style={{
            opacity: hasAccess ? 1 : 0.5,
            pointerEvents: hasAccess ? 'auto' : 'none'
          }}
        >
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: 20,
            alignItems: 'start'
          }}>

            {/* LEFT PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* URL INPUT */}
              <Card>
                <SectionHeader icon={<RiGlobalLine />} title="Verify Your Website" color="var(--accent)" />
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <InputField
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://yourname.dev"
                      icon={<RiGlobalLine />}
                      hint="Must be publicly accessible. Our scanner checks for key pages automatically."
                    />
                  </div>

                  <Button
                    icon={<RiSearchLine />}
                    loading={verifying}
                    onClick={handleVerify}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Verify
                  </Button>
                </div>
              </Card>

              {/* RESULTS */}
              {website?.url && (
                <Card>
                  <SectionHeader icon={<RiCheckLine />} title="Scan Results" color="var(--green)" />

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 20
                  }}>
                    {PAGE_CHECKS.map(({ key, label, icon, pts, desc }) => {
                      const found = website[key];

                      return (
                        <div key={key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '12px 16px',
                          background: found ? 'var(--green-dim)' : 'var(--bg-secondary)',
                          border: `1px solid ${found ? 'rgba(45, 122, 96, 0.2)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <span style={{
                            color: found ? 'var(--green)' : 'var(--text-muted)',
                            fontSize: 18
                          }}>
                            {icon}
                          </span>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {desc}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12 }}>+{pts} pts</span>
                            {found
                              ? <RiCheckLine style={{ color: 'var(--green)' }} />
                              : <RiCloseLine style={{ color: 'var(--text-muted)' }} />
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {website.hasBlog && (
                    <div style={{
                      padding: '12px 16px',
                      background: 'var(--accent-dim)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      📝 Found <strong>{website.blogPostCount || 0}</strong> blog posts.
                    </div>
                  )}
                </Card>
              )}

            </div>

            {/* RIGHT PANEL */}
            <div style={{
              position: 'sticky',
              top: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              <ScorePreviewCard
                title="Website Score"
                score={score}
                max={19}
                color="var(--accent)"
                items={[
                  { label: 'Website exists', done: !!website?.url, pts: 5 },
                  { label: 'About page', done: website?.hasAboutPage, pts: 3 },
                  { label: 'Portfolio page', done: website?.hasPortfolio, pts: 5 },
                  { label: 'Blog exists', done: website?.hasBlog, pts: 4 },
                  { label: 'Contact page', done: website?.hasContactPage, pts: 2 }
                ]}
              />
            </div>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function calcWebsiteScore(w) {
  if (!w?.url) return 0;

  let s = 5;
  if (w.hasAboutPage) s += 3;
  if (w.hasPortfolio) s += 5;
  if (w.hasBlog) s += 4;
  if (w.hasContactPage) s += 2;

  return Math.min(19, s);
}