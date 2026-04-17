import React from 'react';
import Sidebar from './Sidebar';
import { RiArrowDownSLine } from 'react-icons/ri';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandMark from '../Common/BrandMark';

export default function PageLayout({ children, title, subtitle, actions, fullWidth = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const homeRoute = user?.role === 'admin' ? '/admin' : '/home';

  const PROFILE_PATHS = [
    '/dashboard',
    '/linkedin',
    '/github',
    '/youtube',
    '/website',
    '/credentials',
    '/networking',
    '/ai-tools'
  ];

  const isProfileWorkspace = PROFILE_PATHS.some((path) => 
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  return (
    <div style={{ height: '100vh', background: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <header
        style={{
          flexShrink: 0,
          zIndex: 120,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderTop: '3px solid var(--accent)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'none'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '14px 24px'
          }}
        >
          {/* LEFT â€” LOGO */}
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(homeRoute)}
          >
            <BrandMark compact />
          </div>

          {/* RIGHT â€” USER PANEL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* ðŸ”¥ Admin Button */}
            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Admin
              </button>
            )}

            {/* ðŸ”¥ Home Button - contextual visibility */}
            {isProfileWorkspace && (
              <button
                onClick={() => navigate(homeRoute)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {user?.role === 'admin' ? 'Admin Home' : 'Dashboard'}
              </button>
            )}

            {/* USER CARD */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 10px 8px 12px',
                borderRadius: 18,
                background: 'var(--surface-tint)',
                border: '1px solid var(--border)'
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(180deg, var(--accent-light), var(--accent))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 15,
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(177, 7, 56, 0.16)'
                }}
              >
                {user?.firstName?.[0]?.toUpperCase() || 'U'}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user?.firstName} {user?.lastName}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {user?.email}
                </div>
              </div>

              <RiArrowDownSLine
                style={{ color: 'var(--text-muted)', fontSize: 18 }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />

        <main
          style={{
            flex: 1,
            padding: fullWidth ? 0 : '34px 36px 52px',
            overflowY: 'auto',
            maxWidth: '100%'
          }}
        >
          <div style={fullWidth ? { width: '100%' } : { maxWidth: 1380, margin: '0 auto' }}>
            
            {/* PAGE HEADER */}
            {title && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginBottom: 28,
                  flexWrap: 'wrap',
                  gap: 18
                }}
              >
                <div>
                  {/* Category Label removed as per request */}

                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 36,
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      marginBottom: 8
                    }}
                  >
                    {title}
                  </h1>

                  {subtitle && (
                    <p
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: 15,
                        maxWidth: 820,
                        lineHeight: 1.6
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                {actions && <div>{actions}</div>}
              </div>
            )}

            {/* PAGE CONTENT */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
