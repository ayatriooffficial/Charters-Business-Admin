import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { RiEyeLine, RiEyeOffLine, RiLockLine, RiMailLine } from 'react-icons/ri';
import Button from '../components/Common/Button';
import InputField from '../components/Common/InputField';
import BrandMark from '../components/Common/BrandMark';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.value
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      return toast.error('Please fill in all fields');
    }

    setLoading(true);

    try {
      const res = await login(form.email, form.password);

      toast.success('Welcome back!');

      // ðŸ”¥ Redirect to NEW dashboard
      const destination = res?.user?.role === 'admin' ? '/admin' : '/home';
      navigate(destination);
    } catch (err) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
        err.message ||
        'Invalid credentials'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: 28 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <BrandMark />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 28,
            alignItems: 'stretch'
          }}
        >

          {/* LEFT PANEL */}
          <section
            style={{
              flex: '1 1 420px',
              minHeight: 560,
              borderRadius: 28,
              padding: '44px 42px',
              background:
                'linear-gradient(160deg, var(--accent-light), var(--accent-strong))',
              color: '#fff',
              boxShadow: '0 28px 56px rgba(177, 7, 56, 0.18)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at top right, rgba(255,255,255,0.15), transparent 30%)',
                pointerEvents: 'none'
              }}
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.9,
                  marginBottom: 18
                }}
              >
                Career Branding Platform
              </p>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 52,
                  lineHeight: 1.02,
                  fontWeight: 800,
                  maxWidth: 470,
                  marginBottom: 18
                }}
              >
                Build a profile that stands out with clarity and confidence.
              </h1>

              <p
                style={{
                  maxWidth: 500,
                  fontSize: 17,
                  lineHeight: 1.75,
                  color: 'rgba(255,255,255,0.88)'
                }}
              >
                Track your professional presence, score your branding profile,
                and turn weak spots into focused next steps.
              </p>

              <div
                style={{
                  marginTop: 34,
                  display: 'grid',
                  gap: 14,
                  maxWidth: 500
                }}
              >
                {[
                  'Measure LinkedIn, GitHub, website, credentials, networking, and thought leadership in one place.',
                  'Get actionable suggestions you can actually complete, not just static analytics.',
                  'Work inside a cleaner, more structured experience inspired by modern academic platforms.'
                ].map((item) => (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      padding: '14px 16px',
                      borderRadius: 18,
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.14)'
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#fff',
                        marginTop: 9,
                        flexShrink: 0
                      }}
                    />
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT PANEL */}
          <section
            style={{
              flex: '0 1 440px',
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 28,
              padding: '40px 36px',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ marginBottom: 30 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                  marginBottom: 10
                }}
              >
                Welcome Back
              </p>

              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 32,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: 8
                }}
              >
                Sign in to continue
              </h2>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 15,
                  lineHeight: 1.6
                }}
              >
                Access your dashboard and continue improving your profile.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <InputField
                label="Email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="you@example.com"
                icon={<RiMailLine />}
                required
              />

              <div style={{ position: 'relative' }}>
                <InputField
                  label="Password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Enter your password"
                  icon={<RiLockLine />}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: 38,
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 16
                  }}
                >
                  {showPass ? <RiEyeOffLine /> : <RiEyeLine />}
                </button>
              </div>

              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                style={{ marginTop: 10 }}
              >
                Sign In
              </Button>
            </form>

            <p
              style={{
                marginTop: 22,
                fontSize: 14,
                color: 'var(--text-secondary)'
              }}
            >
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontWeight: 700
                }}
              >
                Create one
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

