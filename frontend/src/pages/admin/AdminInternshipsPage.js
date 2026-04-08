import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../../components/Layout/PageLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import { recruitmentAdminService } from '../../services/api';
import toast from 'react-hot-toast';
import {
  RiAddLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiFileList3Line,
  RiEyeLine
} from 'react-icons/ri';

export default function AdminInternshipsPage() {
  const navigate = useNavigate();
  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadInternships = useCallback(async () => {
    try {
      setError('');
      const data = await recruitmentAdminService.getMyInternshipPostings();
      setInternships(data);
    } catch (err) {
      setError(err.message || 'Failed to load internship postings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this internship posting?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await recruitmentAdminService.deleteInternshipPosting(id);
      setInternships((prev) => prev.filter((internship) => internship._id !== id));
      toast.success('Internship posting deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete internship posting');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageLayout
      title="Internship Postings"
      subtitle="Create and manage internship opportunities."
      actions={(
        <Button icon={<RiAddLine />} onClick={() => navigate('/admin/internships/create')}>
          Create Internship
        </Button>
      )}
    >
      {loading ? (
        <div className="shimmer" style={{ height: 260, borderRadius: 14 }} />
      ) : error ? (
        <Card hover={false}>
          <p style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            If this backend does not expose recruitment endpoints yet, the internships module will remain unavailable until those routes are added.
          </p>
        </Card>
      ) : internships.length === 0 ? (
        <Card hover={false} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-secondary)' }}>No internships posted yet.</p>
        </Card>
      ) : (
        <Card hover={false} padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-tint)' }}>
                  {['Title', 'Location', 'Applications', 'Status', 'Actions'].map((head) => (
                    <th
                      key={head}
                      style={{
                        textAlign: 'left',
                        padding: '12px 16px',
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {internships.map((internship) => (
                  <tr key={internship._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{internship.title || 'Untitled Internship'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{internship.company || '-'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{internship.location || '-'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {internship.applicationsCount ?? internship.applications?.length ?? 0}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 12,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: internship.isActive ? 'var(--green-dim)' : 'var(--red-dim)',
                        color: internship.isActive ? 'var(--green)' : 'var(--red)'
                      }}>
                        {internship.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link
                          to={`/admin/internships/${internship._id}/applications`}
                          style={linkButtonStyle}
                          title="Applications"
                        >
                          <RiFileList3Line />
                        </Link>
                        <Link to={`/admin/internships/${internship._id}/edit`} style={linkButtonStyle} title="Edit">
                          <RiPencilLine />
                        </Link>
                        {internship.slug && (
                          <a
                            href={`/careers/internships/${internship._id}`}
                            style={linkButtonStyle}
                            title="View"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <RiEyeLine />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(internship._id)}
                          disabled={deletingId === internship._id}
                          style={{ ...iconButtonStyle, color: 'var(--red)' }}
                          title="Delete"
                        >
                          <RiDeleteBinLine />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageLayout>
  );
}

const iconButtonStyle = {
  width: 32,
  height: 32,
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-card)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  fontSize: 16
};

const linkButtonStyle = {
  ...iconButtonStyle,
  textDecoration: 'none'
};

