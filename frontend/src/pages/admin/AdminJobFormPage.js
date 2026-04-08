import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../../components/Layout/PageLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import InputField from '../../components/Common/InputField';
import { recruitmentAdminService } from '../../services/api';
import toast from 'react-hot-toast';

const INITIAL_FORM = {
  title: '',
  company: 'Charters Business',
  location: '',
  jobType: 'Full-time',
  category: '',
  salary: '',
  experience: '',
  description: '',
  isActive: true
};

export default function AdminJobFormPage({ mode = 'create' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit || !id) return;

    const loadPosting = async () => {
      try {
        const posting = await recruitmentAdminService.getJobById(id);
        if (!posting) {
          setError('Job posting not found');
          return;
        }

        setFormData({
          title: posting.title || '',
          company: posting.company || '',
          location: posting.location || '',
          jobType: posting.jobType || 'Full-time',
          category: posting.category || '',
          salary: posting.salary || '',
          experience: posting.experience || '',
          description: posting.description || '',
          isActive: posting.isActive ?? true
        });
      } catch (err) {
        setError(err.message || 'Failed to load job posting');
      } finally {
        setLoading(false);
      }
    };

    loadPosting();
  }, [id, isEdit]);

  const pageTitle = useMemo(() => (isEdit ? 'Edit Job Posting' : 'Create Job Posting'), [isEdit]);

  const handleTextChange = (key) => (event) => {
    setFormData((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!formData.title || !formData.location || !formData.category || !formData.description) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setSubmitting(true);

      if (isEdit && id) {
        await recruitmentAdminService.updateJobPosting(id, formData);
        toast.success('Job posting updated');
      } else {
        await recruitmentAdminService.createJobPosting(formData);
        toast.success('Job posting created');
      }

      navigate('/admin/jobs');
    } catch (err) {
      setError(err.message || 'Failed to save job posting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Manage core role details and keep the posting content clear for applicants."
    >
      {loading ? (
        <div className="shimmer" style={{ height: 320, borderRadius: 14 }} />
      ) : (
        <Card hover={false}>
          <div style={{ marginBottom: 14 }}>
            <Link to="/admin/jobs" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
              Back to Jobs
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                marginBottom: 14,
                background: 'var(--red-dim)',
                border: '1px solid rgba(197, 42, 86, 0.25)',
                color: 'var(--red)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13
              }}>
                {error}
              </div>
            )}

            <InputField label="Job Title" value={formData.title} onChange={handleTextChange('title')} required />
            <InputField label="Company" value={formData.company} onChange={handleTextChange('company')} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="Location" value={formData.location} onChange={handleTextChange('location')} required />
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Job Type <span style={{ color: 'var(--red)' }}>*</span></label>
                <select value={formData.jobType} onChange={handleTextChange('jobType')} style={selectStyle} required>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>

            <InputField label="Category" value={formData.category} onChange={handleTextChange('category')} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="Salary" value={formData.salary} onChange={handleTextChange('salary')} required />
              <InputField label="Experience Required" value={formData.experience} onChange={handleTextChange('experience')} required />
            </div>

            {isEdit && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(formData.isActive)}
                  onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active (visible to applicants)
              </label>
            )}

            <InputField
              label="Description"
              type="textarea"
              rows={10}
              value={formData.description}
              onChange={handleTextChange('description')}
              required
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="submit" loading={submitting}>
                {isEdit ? 'Update Job Posting' : 'Create Job Posting'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/jobs')}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}
    </PageLayout>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6
};

const selectStyle = {
  width: '100%',
  padding: '12px 14px',
  background: 'var(--surface-tint)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 14,
  fontFamily: 'var(--font-body)',
  outline: 'none'
};

