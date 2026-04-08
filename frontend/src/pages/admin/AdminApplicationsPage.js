import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageLayout from '../../components/Layout/PageLayout';
import Card from '../../components/Common/Card';
import { recruitmentAdminService } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminApplicationsPage({ type = 'jobs' }) {
  const { id } = useParams();
  const [posting, setPosting] = useState(null);
  const [applications, setApplications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isJob = type === 'jobs';
  const backTo = isJob ? '/admin/jobs' : '/admin/internships';
  const titlePrefix = isJob ? 'Job' : 'Internship';

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      setError('');
      const postingRequest = isJob
        ? recruitmentAdminService.getJobById(id)
        : recruitmentAdminService.getInternshipById(id);
      const applicationsRequest = isJob
        ? recruitmentAdminService.getApplicationsForJob(id, statusFilter ? { status: statusFilter } : {})
        : recruitmentAdminService.getApplicationsForInternship(id, statusFilter ? { status: statusFilter } : {});

      const [postingData, applicationsData] = await Promise.all([postingRequest, applicationsRequest]);
      setPosting(postingData);
      setApplications(applicationsData);
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [id, isJob, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pageTitle = useMemo(() => {
    const name = posting?.title || titlePrefix;
    return `${name} - Applications`;
  }, [posting, titlePrefix]);

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      setUpdatingStatusId(applicationId);
      await recruitmentAdminService.updateApplicationStatus(applicationId, newStatus);
      setApplications((prev) => prev.map((item) => (
        item._id === applicationId ? { ...item, status: newStatus } : item
      )));
      toast.success('Application status updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update application status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <PageLayout
      title={pageTitle}
      subtitle={`${posting?.company || ''}${posting?.location ? ` - ${posting.location}` : ''}`}
    >
      <div style={{ marginBottom: 16 }}>
        <Link to={backTo} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
          Back
        </Link>
      </div>

      {loading ? (
        <div className="shimmer" style={{ height: 240, borderRadius: 14 }} />
      ) : error ? (
        <Card hover={false}>
          <p style={{ color: 'var(--red)' }}>{error}</p>
        </Card>
      ) : (
        <>
          <Card hover={false} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label htmlFor="status-filter" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{
                  padding: '8px 10px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--bg-card)'
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </Card>

          {applications.length === 0 ? (
            <Card hover={false} style={{ textAlign: 'center', padding: 38 }}>
              <p style={{ color: 'var(--text-secondary)' }}>No applications found.</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {applications.map((application) => (
                <Card key={application._id} hover={false}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 14,
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {application?.user?.name || application?.candidateName || 'Applicant'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
                        {application?.user?.email || application?.email || '-'}
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span>Application #{application.applicationNumber || application._id?.slice(-6) || '-'}</span>
                        <span>
                          Applied: {application.appliedAt ? new Date(application.appliedAt).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {application.resumeUrl && (
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            textDecoration: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: 13
                          }}
                        >
                          Resume
                        </a>
                      )}
                      <select
                        value={application.status || 'pending'}
                        onChange={(event) => handleStatusChange(application._id, event.target.value)}
                        disabled={updatingStatusId === application._id}
                        style={{
                          padding: '8px 10px',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          minWidth: 130,
                          background: 'var(--bg-card)'
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewing">Reviewing</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

