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

export default function AdminJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      setError('');
      const data = await recruitmentAdminService.getMyJobPostings();
      setJobs(data);
    } catch (err) {
      const message = err.message || 'Failed to load job postings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this job posting?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await recruitmentAdminService.deleteJobPosting(id);
      setJobs((prev) => prev.filter((job) => job._id !== id));
      toast.success('Job posting deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete job posting');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageLayout
      title="Job Postings"
      subtitle="Create and manage job opportunities."
      actions={(
        <Button icon={<RiAddLine />} onClick={() => navigate('/admin/jobs/create')}>
          Create Job
        </Button>
      )}
    >
      {loading ? (
        <div className="shimmer" style={{ height: 260, borderRadius: 14 }} />
      ) : error ? (
        <Card hover={false}>
          <p style={{ color: 'var(--red)', marginBottom: 10 }}>{error}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            If this backend does not expose recruitment endpoints yet, the admin jobs module will remain unavailable until those routes are added.
          </p>
        </Card>
      ) : jobs.length === 0 ? (
        <Card hover={false} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-secondary)' }}>No jobs posted yet.</p>
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
                {jobs.map((job) => (
                  <tr key={job._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{job.title || 'Untitled Job'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{job.company || '-'}</div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{job.location || '-'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {job.applicationsCount ?? job.applications?.length ?? 0}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 12,
                        padding: '4px 9px',
                        borderRadius: 999,
                        background: job.isActive ? 'var(--green-dim)' : 'var(--red-dim)',
                        color: job.isActive ? 'var(--green)' : 'var(--red)'
                      }}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link
                          to={`/admin/jobs/${job._id}/applications`}
                          style={linkButtonStyle}
                          title="Applications"
                        >
                          <RiFileList3Line />
                        </Link>
                        <Link to={`/admin/jobs/${job._id}/edit`} style={linkButtonStyle} title="Edit">
                          <RiPencilLine />
                        </Link>
                        {job.slug && (
                          <a
                            href={`/careers/jobs/${job._id}`}
                            style={linkButtonStyle}
                            title="View"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <RiEyeLine />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(job._id)}
                          disabled={deletingId === job._id}
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

