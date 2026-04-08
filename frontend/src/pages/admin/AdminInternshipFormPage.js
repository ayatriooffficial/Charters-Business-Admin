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
  internshipType: 'Hybrid',
  category: '',
  stipend: '',
  duration: '',
  description: '',
  isActive: true
};

export default function AdminInternshipFormPage({ mode = 'create' }) {
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
        const posting = await recruitmentAdminService.getInternshipById(id);
        if (!posting) {
          setError('Internship posting not found');
          return;
        }

        setFormData({
          title: posting.title || '',
          company: posting.company || '',
          location: posting.location || '',
          internshipType: posting.internshipType || 'Hybrid',
          category: posting.category || '',
          stipend: posting.stipend || '',
          duration: posting.duration || '',
          description: posting.description || '',
          isActive: posting.isActive ?? true
        });
      } catch (err) {
        setError(err.message || 'Failed to load internship posting');
      } finally {
        setLoading(false);
      }
    };

    loadPosting();
  }, [id, isEdit]);

  const pageTitle = useMemo(() => (isEdit ? 'Edit Internship Posting' : 'Create Internship Posting'), [isEdit]);

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
        await recruitmentAdminService.updateInternshipPosting(id, formData);
        toast.success('Internship posting updated');
      } else {
        await recruitmentAdminService.createInternshipPosting(formData);
        toast.success('Internship posting created');
      }

      navigate('/admin/internships');
    } catch (err) {
      setError(err.message || 'Failed to save internship posting');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Define key internship details and keep expectations clear for applicants."
    >
      {loading ? (
        <div className="shimmer" style={{ height: 320, borderRadius: 14 }} />
      ) : (
        <Card hover={false}>
          <div style={{ marginBottom: 14 }}>
            <Link to="/admin/internships" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>
              Back to Internships
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

            <InputField label="Internship Title" value={formData.title} onChange={handleTextChange('title')} required />
            <InputField label="Company" value={formData.company} onChange={handleTextChange('company')} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="Location" value={formData.location} onChange={handleTextChange('location')} required />
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Internship Type <span style={{ color: 'var(--red)' }}>*</span></label>
                <select value={formData.internshipType} onChange={handleTextChange('internshipType')} style={selectStyle} required>
                  <option value="Remote">Remote</option>
                  <option value="In-office">In-office</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            <InputField label="Category" value={formData.category} onChange={handleTextChange('category')} required />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputField label="Stipend" value={formData.stipend} onChange={handleTextChange('stipend')} required />
              <InputField label="Duration" value={formData.duration} onChange={handleTextChange('duration')} required />
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
                {isEdit ? 'Update Internship Posting' : 'Create Internship Posting'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/internships')}>
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

