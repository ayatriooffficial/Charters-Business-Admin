import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  RiDashboardLine, RiLinkedinBoxLine, RiGithubLine,
  RiGlobalLine, RiAwardLine, RiGroupLine, RiYoutubeLine,
  RiRobotLine, RiLogoutBoxLine, RiMenuFoldLine,
  RiMenuUnfoldLine, RiUser3Line, RiSettings3Line,
  RiBriefcaseLine, RiBookOpenLine, RiLock2Line
} from 'react-icons/ri';

const PROFILE_NAV_ITEMS = [
  { to: '/dashboard',   icon: RiDashboardLine,    label: 'Dashboard'    },
  { to: '/linkedin',    icon: RiLinkedinBoxLine,   label: 'LinkedIn'     },
  { to: '/github',      icon: RiGithubLine,        label: 'GitHub'       },
  { to: '/youtube',     icon: RiYoutubeLine,       label: 'YouTube'      },
  { to: '/website',     icon: RiGlobalLine,        label: 'Website'      },
  { to: '/credentials', icon: RiAwardLine,         label: 'Credentials'  },
  { to: '/networking',  icon: RiGroupLine,         label: 'Networking'   },
  { to: '/ai-tools',    icon: RiRobotLine,         label: 'AI Tools'     }
];

const HOME_NAV_ITEMS = [
  { to: '/home', icon: RiUser3Line, label: 'Account' },
  { to: '/dashboard', icon: RiDashboardLine, label: 'Profile Dashboard' },
  { icon: RiRobotLine, label: 'AI Interview', disabled: true, note: 'Coming soon' }
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin', icon: RiSettings3Line, label: 'Users & Permissions' },
  { to: '/admin/dashboard', icon: RiDashboardLine, label: 'Admin Dashboard' },
  { to: '/admin/jobs', icon: RiBriefcaseLine, label: 'Jobs' },
  { to: '/admin/internships', icon: RiBookOpenLine, label: 'Internships' }
];

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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = location.pathname || '';

  const isHome = pathname === '/home';
  const isProfileWorkspace = PROFILE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isAdmin = user?.role === 'admin' || pathname.startsWith('/admin');

  const mode = isHome ? 'home' : isProfileWorkspace ? 'profile' : isAdmin ? 'admin' : 'home';

  const navItems = mode === 'profile'
    ? PROFILE_NAV_ITEMS
    : mode === 'admin'
      ? ADMIN_NAV_ITEMS
      : HOME_NAV_ITEMS;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const headerCopy = mode === 'profile'
    ? { title: 'Navigation', subtitle: 'Explore your branding profile' }
    : mode === 'admin'
      ? { title: 'Admin', subtitle: 'Manage platform modules' }
      : { title: 'Quick Access', subtitle: 'Account and core modules' };

  const getItemStyle = ({ isActive, disabled }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: collapsed ? '14px 0' : '14px 18px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    margin: '4px 12px',
    borderRadius: 14,
    textDecoration: 'none',
    fontFamily: 'var(--font-body)',
    fontSize: 15,
    fontWeight: isActive ? 700 : 600,
    color: disabled ? 'var(--text-muted)' : isActive ? '#fff' : 'var(--navy-soft)',
    background: isActive
      ? 'linear-gradient(180deg, var(--accent-light), var(--accent))'
      : disabled
        ? 'rgba(143, 154, 168, 0.09)'
        : 'transparent',
    boxShadow: isActive ? '0 12px 26px rgba(177, 7, 56, 0.18)' : 'none',
    transition: 'all 0.18s ease',
    opacity: disabled ? 0.78 : 1,
    border: 'none',
    width: collapsed ? 'calc(100% - 24px)' : 'auto',
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  return (
    <aside style={{
      width: collapsed ? 84 : 260,
      minHeight: 'calc(100vh - 74px)',
      background: 'rgba(255,255,255,0.68)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      position: 'sticky',
      top: 74,
      flexShrink: 0,
      zIndex: 100,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)'
    }}>
      <div style={{
        padding: collapsed ? '20px 0' : '20px 18px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--border)'
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)'
            }}>
              {headerCopy.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {headerCopy.subtitle}
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'var(--surface-tint)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            fontSize: 18,
            transition: 'all 0.2s'
          }}
        >
          {collapsed ? <RiMenuUnfoldLine /> : <RiMenuFoldLine />}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '16px 0' }}>
        {navItems.map(({ to, icon: Icon, label, disabled, note }) => {
          if (disabled || !to) {
            return (
              <button
                key={label}
                type="button"
                disabled
                style={getItemStyle({ isActive: false, disabled: true })}
                title={collapsed ? `${label}${note ? ` (${note})` : ''}` : undefined}
              >
                <Icon style={{ fontSize: 18, flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{label}</span>
                    {note && (
                      <small style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        <RiLock2Line style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                        {note}
                      </small>
                    )}
                  </span>
                )}
              </button>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => getItemStyle({ isActive, disabled: false })}
              title={collapsed ? label : undefined}
            >
              <Icon style={{ fontSize: 18, flexShrink: 0 }} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div style={{
        borderTop: '1px solid var(--border)',
        padding: collapsed ? '16px 0' : '16px'
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            padding: collapsed ? '12px 0' : '12px 18px',
            background: 'transparent',
            border: 'none',
            borderRadius: 14,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 15,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.background = 'var(--accent-dim)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
          title={collapsed ? 'Logout' : undefined}
        >
          <RiLogoutBoxLine style={{ fontSize: 18 }} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

