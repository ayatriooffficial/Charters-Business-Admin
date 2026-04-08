import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '../../components/Layout/PageLayout';
import Card from '../../components/Common/Card';
import {
  RiBriefcaseLine,
  RiBookOpenLine,
  RiSettings3Line,
  RiArrowRightLine
} from 'react-icons/ri';

const ITEMS = [
  {
    title: 'Jobs',
    description: 'Create, edit, and track job postings with application workflows.',
    to: '/admin/jobs',
    icon: RiBriefcaseLine
  },
  {
    title: 'Internships',
    description: 'Manage internship opportunities and incoming applications.',
    to: '/admin/internships',
    icon: RiBookOpenLine
  },
  {
    title: 'Users & Permissions',
    description: 'Control profile-branding and AI feature access for users.',
    to: '/admin',
    icon: RiSettings3Line
  }
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  return (
    <PageLayout
      title="Admin Dashboard"
      subtitle="Manage recruitment content and user-level permissions from a single place."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {ITEMS.map(({ title, description, to, icon: Icon }) => (
          <Card key={title} onClick={() => navigate(to)} style={{ minHeight: 170 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                fontSize: 20
              }}>
                <Icon />
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                <RiArrowRightLine />
              </span>
            </div>

            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{title}</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
              {description}
            </p>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
