import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import PageLayout from '../../../components/Layout/PageLayout';
import Card from '../../../components/Common/Card';
import Button from '../../../components/Common/Button';
import InputField from '../../../components/Common/InputField';
import { profileService, aiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { hasProfileBrandingAccess } from '../../../utils/permissions';
import {
  normalizeLinkedInUrl,
  validateLinkedInUrl,
  parseFormattedNumber,
  formatNumberForDisplay,
  validateSkill,
  validateTitle,
  validateCompany,
  validateDateRange,
} from '../utils/credentialScorer';

/* Inlined components for LinkedIn page to reduce fragmentation
   SkillTagger, ExperienceForm, CertificationForm */

function SkillTagger({ skills = [], onChange, maxSkills = 50, source = 'user' }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleAddSkill = () => {
    if (!input.trim()) {
      setError('Skill cannot be empty');
      return;
    }
    if (!validateSkill(input)) {
      setError('Skill must be 2-50 characters (alphanumeric)');
      return;
    }
    const trimmedSkill = input.trim();
    if (skills.some(s => s.name.toLowerCase() === trimmedSkill.toLowerCase())) {
      setError('Skill already added');
      return;
    }
    if (skills.length >= maxSkills) {
      setError(`Maximum ${maxSkills} skills allowed`);
      return;
    }
    onChange([
      ...skills,
      { name: trimmedSkill, source, addedAt: new Date().toISOString() }
    ]);
    setInput('');
    setError('');
  };

  const handleRemoveSkill = (index) => onChange(skills.filter((_, i) => i !== index));
  const handleKeyPress = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } };

  return (
    <div className="skill-tagger">
      <label className="skill-tagger-label">Skills ({skills.length}/{maxSkills})</label>
      <div className="skill-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type skill and press Enter"
          className="skill-input"
        />
        <button onClick={handleAddSkill} type="button" className="skill-add-btn">Add</button>
      </div>
      {error && <div className="skill-error">{error}</div>}
      <div className="skills-container">
        {skills.map((skill, index) => (
          <div key={index} className={`skill-tag skill-tag-${skill.source}`} title={skill.source === 'auto' ? 'Auto-filled from LinkedIn' : 'User-entered'}>
            <span>{skill.name}</span>
            <button onClick={() => handleRemoveSkill(index)} className="skill-remove-btn" type="button" aria-label="Remove skill">Ãƒâ€”</button>
            {skill.source === 'auto' && <span className="skill-source-badge">auto</span>}
          </div>
        ))}
      </div>
      {skills.length === 0 && <p className="skill-empty">No skills added yet. Add some to get started!</p>}
    </div>
  );
}

function ExperienceForm({ experiences = [], onChange, maxExperiences = 20, source = 'user' }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ title: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' });
  const [errors, setErrors] = useState({});

  const resetForm = () => { setForm({ title: '', company: '', startDate: '', endDate: '', isCurrent: false, description: '' }); setErrors({}); setEditingIndex(null); };

  const validateForm = () => {
    const newErrors = {};
    if (!validateTitle(form.title)) newErrors.title = 'Title is required (2-100 characters)';
    if (!validateCompany(form.company)) newErrors.company = 'Company is required (2-100 characters)';
    if (!form.startDate) newErrors.startDate = 'Start date is required';
    if (!form.isCurrent && !form.endDate) newErrors.endDate = 'End date is required (or mark as current)';
    if (form.startDate && form.endDate && !form.isCurrent) {
      if (!validateDateRange(form.startDate, form.endDate)) newErrors.dateRange = 'Start date must be before end date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOrUpdate = () => {
    if (!validateForm()) return;
    const newExperience = {
      title: form.title.trim(),
      company: form.company.trim(),
      startDate: form.startDate,
      endDate: form.isCurrent ? null : form.endDate,
      isCurrent: form.isCurrent,
      description: form.description.trim(),
      source: editingIndex !== null ? experiences[editingIndex].source : source,
      updatedAt: new Date().toISOString()
    };
    let updated;
    if (editingIndex !== null) {
      updated = experiences.map((exp, i) => (i === editingIndex ? newExperience : exp));
      setEditingIndex(null);
    } else {
      if (experiences.length >= maxExperiences) { setErrors({ general: `Maximum ${maxExperiences} experiences allowed` }); return; }
      updated = [...experiences, newExperience];
    }
    onChange(updated);
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (index) => {
    const exp = experiences[index];
    setForm({ title: exp.title, company: exp.company, startDate: exp.startDate, endDate: exp.endDate || '', isCurrent: exp.isCurrent || false, description: exp.description || '' });
    setEditingIndex(index);
    setShowForm(true);
  };
  const handleRemove = (index) => onChange(experiences.filter((_, i) => i !== index));

  return (
    <div className="experience-form">
      <div className="experience-header">
        <label className="experience-label">Experience ({experiences.length}/{maxExperiences})</label>
        {!showForm && <button onClick={() => setShowForm(true)} className="experience-add-btn" type="button">+ Add Experience</button>}
      </div>
      {errors.general && <div className="experience-error">{errors.general}</div>}
      {showForm && (
        <div className="experience-form-container">
          <div className="form-row">
            <div className="form-group">
              <label>Job Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Senior Software Engineer" className={errors.title ? 'input-error' : ''} />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>
            <div className="form-group">
              <label>Company *</label>
              <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g., Google" className={errors.company ? 'input-error' : ''} />
              {errors.company && <span className="error-text">{errors.company}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date (YYYY-MM-DD) *</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={errors.startDate ? 'input-error' : ''} />
              {errors.startDate && <span className="error-text">{errors.startDate}</span>}
            </div>
            <div className="form-group">
              <label>End Date (YYYY-MM-DD)</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} disabled={form.isCurrent} className={errors.endDate ? 'input-error' : ''} />
              {errors.endDate && <span className="error-text">{errors.endDate}</span>}
            </div>
            <div className="form-group-checkbox">
              <label>
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: '' })} />
                Still working here
              </label>
            </div>
          </div>
          {errors.dateRange && <div className="experience-error">{errors.dateRange}</div>}
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your responsibilities and achievements..." rows="3" />
          </div>
          <div className="form-actions">
            <button onClick={handleAddOrUpdate} className="btn-primary" type="button">{editingIndex !== null ? 'Update' : 'Add'} Experience</button>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary" type="button">Cancel</button>
          </div>
        </div>
      )}
      <div className="experiences-list">
        {experiences.map((exp, index) => (
          <div key={index} className={`experience-item experience-item-${exp.source}`}>
            <div className="exp-header">
              <h4>{exp.title}</h4>
              <span className={`exp-source ${exp.source}`}>{exp.source === 'auto' ? 'Ã°Å¸â€â€” Auto-filled' : 'Ã¢Å“ÂÃ¯Â¸Â User-entered'}</span>
            </div>
            <p className="exp-company">{exp.company}</p>
            <p className="exp-date">{new Date(exp.startDate).toLocaleDateString()}{exp.isCurrent ? ' - Present' : exp.endDate ? ` - ${new Date(exp.endDate).toLocaleDateString()}` : ''}</p>
            {exp.description && <p className="exp-description">{exp.description}</p>}
            <div className="exp-actions">
              <button onClick={() => handleEdit(index)} className="btn-edit">Ã¢Å“Å½ Edit</button>
              <button onClick={() => handleRemove(index)} className="btn-delete">Ã°Å¸â€”â€˜ Remove</button>
            </div>
          </div>
        ))}
      </div>
      {experiences.length === 0 && !showForm && <p className="exp-empty">No experience added yet. Click "Add Experience" to get started!</p>}
    </div>
  );
}

function CertificationForm({ certifications = [], onChange, maxCertifications = 50, source = 'user' }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [form, setForm] = useState({ title: '', issuer: '', issueDate: '', expiryDate: '', noExpiry: true, credentialId: '', credentialUrl: '' });
  const [errors, setErrors] = useState({});

  const resetForm = () => { setForm({ title: '', issuer: '', issueDate: '', expiryDate: '', noExpiry: true, credentialId: '', credentialUrl: '' }); setErrors({}); setEditingIndex(null); };

  const validateForm = () => {
    const newErrors = {};
    if (!validateTitle(form.title)) newErrors.title = 'Certification title is required (2-100 characters)';
    if (!form.issuer || form.issuer.trim().length < 2) newErrors.issuer = 'Issuer is required';
    if (!form.issueDate) newErrors.issueDate = 'Issue date is required';
    if (!form.noExpiry && form.expiryDate) { if (new Date(form.issueDate) > new Date(form.expiryDate)) newErrors.dateRange = 'Issue date must be before expiry date'; }
    if (form.credentialUrl && !form.credentialUrl.startsWith('http')) newErrors.credentialUrl = 'Credential URL must start with http or https';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddOrUpdate = () => {
    if (!validateForm()) return;
    const newCertification = {
      title: form.title.trim(),
      issuer: form.issuer.trim(),
      issueDate: form.issueDate,
      expiryDate: form.noExpiry ? null : form.expiryDate,
      noExpiry: form.noExpiry,
      credentialId: form.credentialId.trim(),
      credentialUrl: form.credentialUrl.trim(),
      source: editingIndex !== null ? certifications[editingIndex].source : source,
      updatedAt: new Date().toISOString()
    };
    let updated;
    if (editingIndex !== null) { updated = certifications.map((cert, i) => (i === editingIndex ? newCertification : cert)); setEditingIndex(null); }
    else {
      if (certifications.length >= maxCertifications) { setErrors({ general: `Maximum ${maxCertifications} certifications allowed` }); return; }
      updated = [...certifications, newCertification];
    }
    onChange(updated);
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (index) => { const cert = certifications[index]; setForm({ title: cert.title, issuer: cert.issuer, issueDate: cert.issueDate, expiryDate: cert.expiryDate || '', noExpiry: cert.noExpiry !== false, credentialId: cert.credentialId || '', credentialUrl: cert.credentialUrl || '' }); setEditingIndex(index); setShowForm(true); };
  const handleRemove = (index) => onChange(certifications.filter((_, i) => i !== index));

  return (
    <div className="certification-form">
      <div className="cert-header">
        <label className="cert-label">Certifications ({certifications.length}/{maxCertifications})</label>
        {!showForm && <button onClick={() => setShowForm(true)} className="cert-add-btn" type="button">+ Add Certification</button>}
      </div>
      {errors.general && <div className="cert-error">{errors.general}</div>}
      {showForm && (
        <div className="cert-form-container">
          <div className="form-row">
            <div className="form-group">
              <label>Certification Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., AWS Certified Solutions Architect" className={errors.title ? 'input-error' : ''} />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>
            <div className="form-group">
              <label>Issuer *</label>
              <input type="text" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} placeholder="e.g., Amazon Web Services" className={errors.issuer ? 'input-error' : ''} />
              {errors.issuer && <span className="error-text">{errors.issuer}</span>}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Issue Date (YYYY-MM-DD) *</label>
              <input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} className={errors.issueDate ? 'input-error' : ''} />
              {errors.issueDate && <span className="error-text">{errors.issueDate}</span>}
            </div>
            <div className="form-group">
              <label>Expiry Date (YYYY-MM-DD)</label>
              <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} disabled={form.noExpiry} className={errors.expiryDate ? 'input-error' : ''} />
              {errors.expiryDate && <span className="error-text">{errors.expiryDate}</span>}
            </div>
            <div className="form-group-checkbox">
              <label>
                <input type="checkbox" checked={form.noExpiry} onChange={(e) => setForm({ ...form, noExpiry: e.target.checked, expiryDate: '' })} />
                No expiry
              </label>
            </div>
          </div>
          {errors.dateRange && <div className="cert-error">{errors.dateRange}</div>}
          <div className="form-row">
            <div className="form-group">
              <label>Credential ID</label>
              <input type="text" value={form.credentialId} onChange={(e) => setForm({ ...form, credentialId: e.target.value })} placeholder="e.g., AWS-123456789" />
            </div>
            <div className="form-group">
              <label>Credential URL</label>
              <input type="url" value={form.credentialUrl} onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })} placeholder="https://www.credly.com/badges/..." className={errors.credentialUrl ? 'input-error' : ''} />
              {errors.credentialUrl && <span className="error-text">{errors.credentialUrl}</span>}
            </div>
          </div>
          <div className="form-actions">
            <button onClick={handleAddOrUpdate} className="btn-primary" type="button">{editingIndex !== null ? 'Update' : 'Add'} Certification</button>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="btn-secondary" type="button">Cancel</button>
          </div>
        </div>
      )}
      <div className="certifications-list">
        {certifications.map((cert, index) => (
          <div key={index} className={`cert-item cert-item-${cert.source}`}>
            <div className="cert-header-item">
              <h4>{cert.title}</h4>
              <span className={`cert-source ${cert.source}`}>{cert.source === 'auto' ? 'Ã°Å¸â€â€” Auto-filled' : 'Ã¢Å“ÂÃ¯Â¸Â User-entered'}</span>
            </div>
            <p className="cert-issuer">{cert.issuer}</p>
            <p className="cert-date">Issued: {new Date(cert.issueDate).toLocaleDateString()}{cert.noExpiry ? ' Ã¢â‚¬Â¢ No expiry' : cert.expiryDate ? ` Ã¢â‚¬Â¢ Expires: ${new Date(cert.expiryDate).toLocaleDateString()}` : ''}</p>
            {cert.credentialId && <p className="cert-credential">ID: {cert.credentialId}</p>}
            {cert.credentialUrl && <p className="cert-url"><a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer">View Credential Ã¢â€ â€™</a></p>}
            <div className="cert-actions">
              <button onClick={() => handleEdit(index)} className="btn-edit">Ã¢Å“Å½ Edit</button>
              <button onClick={() => handleRemove(index)} className="btn-delete">Ã°Å¸â€”â€˜ Remove</button>
            </div>
          </div>
        ))}
      </div>
      {certifications.length === 0 && !showForm && <p className="cert-empty">No certifications added yet. Click "Add Certification" to get started!</p>}
    </div>
  );
}

export default function LinkedInPage() {
  const { user } = useAuth();
  const hasAccess = hasProfileBrandingAccess(user?.permissions?.profileBranding, 'linkedin');
  // Apify-based fetch Ã¢â‚¬â€ no manual browser login required
  const [isLoggedIn] = useState(true);

  // Form states
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  // Manual data entry
  const [profileInfo, setProfileInfo] = useState({
    name: '',
    headline: '',
    about: '',
    location: '',
    industry: ''
  });

  const [profileDoc, setProfileDoc] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  const [connectionsInput, setConnectionsInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [networking, setNetworking] = useState({
    endorsements: '',
    recommendations: ''
  });

  // Auto-fill data from scraping
  useEffect(() => {
    if (scrapedData) {
      // Populate profile info from scraped data
      setProfileInfo(prev => ({
        ...prev,
        name: scrapedData.profileInfo?.name || prev.name,
        headline: scrapedData.profileInfo?.headline || prev.headline,
        about: scrapedData.profileInfo?.about || prev.about,
        location: scrapedData.profileInfo?.location || prev.location
      }));

      // Set connections count
      if (scrapedData.connectionsCount) {
        setConnectionsInput(formatNumberForDisplay(scrapedData.connectionsCount));
      }

      // Set skills, experiences, certifications from scraping
      if (scrapedData.skills && scrapedData.skills.length > 0) {
        setSkills(prev => {
          const existing = prev.filter(s => s.source === 'user');
          const newSkills = scrapedData.skills.filter(
            s => !existing.some(e => e.name.toLowerCase() === s.name.toLowerCase())
          );
          return [...existing, ...newSkills];
        });
      }

      if (scrapedData.experiences && scrapedData.experiences.length > 0) {
        setExperiences(prev => [...prev, ...scrapedData.experiences]);
      }

      if (scrapedData.certifications && scrapedData.certifications.length > 0) {
        setCertifications(prev => [...prev, ...scrapedData.certifications]);
      }
    }
  }, [scrapedData]);

  // Load saved profile and any server-saved scraped draft on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await profileService.getScore();
        const profile = res.data?.profile;
        setProfileDoc(profile || null);
        if (profile && profile.linkedIn) {
          const li = profile.linkedIn;
          if (li.profileUrl) setProfileUrl(li.profileUrl);
          setProfileInfo(prev => ({
            ...prev,
            name: li.name || prev.name,
            headline: li.headline || prev.headline,
            about: li.about || prev.about,
            location: li.location || prev.location,
            industry: li.industry || prev.industry
          }));

          if (li.connectionsCount) setConnectionsInput(formatNumberForDisplay(li.connectionsCount));

          if (Array.isArray(li.skills) && li.skills.length) setSkills(li.skills);
          if (Array.isArray(li.experiences) && li.experiences.length) setExperiences(li.experiences);
          if (Array.isArray(li.certifications) && li.certifications.length) setCertifications(li.certifications);

          // If the backend stored a scraped draft, use it to auto-fill suggestions but
          // don't overwrite user-saved values (the auto-fill effect respects that).
          if (li.scrapedDraft) setScrapedData(li.scrapedDraft);
        }
      } catch (e) {
        console.warn('Failed to load profile:', e);
      }
    };
    loadProfile();
  }, []);

  // compute missing fields (except certificates) whenever scrapedData or form state changes
  useEffect(() => {
    const missing = [];
    const draft = scrapedData || {};

    if (!profileInfo.name && !(draft.profileInfo && draft.profileInfo.name)) missing.push('Full Name');
    if (!profileInfo.headline && !(draft.profileInfo && draft.profileInfo.headline)) missing.push('Headline');
    if (!profileInfo.about && !(draft.profileInfo && draft.profileInfo.about)) missing.push('About / Bio');
    if (!profileInfo.location && !(draft.profileInfo && draft.profileInfo.location)) missing.push('Location');
    if ((!skills || skills.length === 0) && (!draft.skills || draft.skills.length === 0)) missing.push('Skills (add at least one)');
    if ((!experiences || experiences.length === 0) && (!draft.experiences || draft.experiences.length === 0)) missing.push('Experience (add at least one)');

    setMissingFields(missing);
  }, [scrapedData, profileInfo, skills, experiences]);

  // Generate AI-driven suggestions after we have profileDoc or scrapedData
  useEffect(() => {
    const runSuggestions = async () => {
      try {
        const profileData = {
          hasWebsite: !!(profileDoc && profileDoc.personalWebsite && profileDoc.personalWebsite.url),
          linkedInOptimized: !!(profileInfo.headline && profileInfo.about && skills.length >= 5),
          githubActive: !!(profileDoc && profileDoc.github && profileDoc.github.username),
          certificationCount: (profileDoc && profileDoc.certifications && profileDoc.certifications.length) || 0,
          publicationCount: (profileDoc && profileDoc.publications && profileDoc.publications.length) || 0
        };

        const currentScore = (profileDoc && profileDoc.scores && profileDoc.scores.total) || 0;

        const resp = await aiService.generateSuggestions({ profileData, currentScore, targetScore: null, targetRole: null });
        if (resp && resp.data && Array.isArray(resp.data.suggestions)) {
          setSuggestions(resp.data.suggestions);
        }
      } catch (e) {
        console.warn('Failed to generate AI suggestions:', e?.message || e);
        setSuggestions([]);
      }
    };

    if (scrapedData || profileDoc) runSuggestions();
  }, [scrapedData, profileDoc, profileInfo, skills]);

  // Ensure LinkedIn session flag is cleared when tab/window is closed
  const handleLogout = () => {
    // Clear any fetched data Ã¢â‚¬â€ Apify does not require local login
    try {
      setScrapedData(null);
      setProfileUrl('');
      toast.success('Cleared LinkedIn data');
    } catch (err) {
      toast.error('Failed to clear data');
    }
  };

  const handleScrapeProfile = async () => {
    if (!hasAccess) {
      toast.error('Access not granted by admin');
      return;
    }

    // Using Apify actor Ã¢â‚¬â€ no manual login required

    if (!profileUrl.trim()) {
      toast.error('Please enter a LinkedIn profile URL');
      return;
    }

    const normalized = normalizeLinkedInUrl(profileUrl);
    if (!validateLinkedInUrl(normalized)) {
      toast.error('Invalid LinkedIn URL format. Use https://www.linkedin.com/in/username');
      return;
    }

    setLoading(true);
      let toastId;
      try {
        toastId = toast.loading('Fetching profile via Apify Ã¢â‚¬â€ this may take a moment.');

        const res = await profileService.scrapeLinkedIn({ profileUrl: normalized });

        // If backend enqueued a job, poll for result
        if (res.status === 202 && res.data?.jobId) {
          const jobId = res.data.jobId;
          let attempts = 0;
          const maxAttempts = 40; // ~2 minutes (40 * 3s)
          const intervalMs = 3000;

          const poll = async () => {
            attempts += 1;
            try {
              const statusRes = await profileService.getScrapeJob(jobId);
              const job = statusRes.data.job;

              if (!job) {
                if (attempts < maxAttempts) setTimeout(poll, intervalMs);
                else {
                  toast.error('Scrape timed out. Please try again.', { id: toastId });
                  setLoading(false);
                }
                return;
              }

              if (job.status === 'completed') {
                // Some job runners return `result.scraped`, others now include a
                // server-persisted draft under `result.linkedInDraft`. Support both.
                const draft = job.result?.linkedInDraft || job.result?.scraped || null;
                if (draft) setScrapedData(draft);
                toast.success('Profile data fetched! Please verify and fill in remaining details.', { id: toastId });
                setLoading(false);
                return;
              }

              if (job.status === 'failed') {
                toast.error(job.error || 'Failed to scrape LinkedIn profile', { id: toastId });
                setLoading(false);
                return;
              }

              // still processing
              if (attempts < maxAttempts) setTimeout(poll, intervalMs);
              else {
                toast.error('Scrape timed out. Please try again.');
                setLoading(false);
              }
            } catch (pollErr) {
              console.error('Polling error:', pollErr);
              if (attempts < maxAttempts) setTimeout(poll, intervalMs);
              else {
                toast.error('Error checking scrape status', { id: toastId });
                setLoading(false);
              }
            }
          };

          poll();
        } else {
          // Backwards compatibility: immediate response with scraped data or draft
          const immediate = res.data?.scraped || res.data?.linkedInDraft || res.data;
          setScrapedData(immediate);
          toast.success('Profile data fetched! Please verify and fill in remaining details.', { id: toastId });
          setLoading(false);
        }
      } catch (err) {
        // Replace the loading toast with an error message
        toast.error(err.response?.data?.message || err.message || 'Failed to scrape LinkedIn profile', { id: toastId });
        console.error(err);
        setLoading(false);
      }
  };

  const handleSaveProfile = async () => {
    if (!hasAccess) {
      toast.error('Access not granted by admin');
      return;
    }

    if (missingFields && missingFields.length > 0) {
      toast.error(`Please fill required fields before saving: ${missingFields.join(', ')}`);
      return;
    }
    if (!profileInfo.name.trim()) {
      toast.error('Profile name is required');
      return;
    }

    if (!profileUrl.trim()) {
      toast.error('LinkedIn URL is required');
      return;
    }

    // Parse connections count
    const connectionsCount = parseFormattedNumber(connectionsInput);
    if (!connectionsCount && connectionsInput) {
      toast.error('Invalid connections count format');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        profileInfo: {
          ...profileInfo,
          profileUrl: normalizeLinkedInUrl(profileUrl),
          profilePictureUrl: scrapedData?.profileInfo?.profilePictureUrl || null
        },
        connectionsCount: connectionsCount || 0,
        skills,
        experiences,
        certifications,
        education: scrapedData?.education || [],
        networking: {
          endorsements: parseFormattedNumber(networking.endorsements) || 0,
          recommendations: parseFormattedNumber(networking.recommendations) || 0
        }
      };

      await profileService.updateLinkedIn(payload);

      toast.success('LinkedIn profile saved successfully! Score calculated.');

      // Reset form and clear server-backed scraped draft (backend also removes it)
      setScrapedData(null);
      setProfileUrl('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title="LinkedIn Profile">
      <div style={{ position: 'relative' }}>
        {!hasAccess && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            borderRadius: 12,
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Access not granted by admin</div>
          </div>
        )}

        <div style={{ opacity: hasAccess ? 1 : 0.5, pointerEvents: hasAccess ? 'auto' : 'none' }}>
      {/* Scraper Status */}
      <Card className="login-status">
        <div className="login-header">
          <h3>LinkedIn Scraper</h3>
          <div className="login-status-active">
            <span className="status-badge">Ã°Å¸Å’Â Scraping via Apify</span>
            <Button onClick={handleLogout} variant="secondary" size="small">
              Clear Data
            </Button>
          </div>
        </div>
        <p className="login-info">
          Ã°Å¸â€â€™ Scraping is handled by Apify actors; no local browser login is required.
        </p>
      </Card>

      {/* Profile URL Input */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20 }}>
          <h3>LinkedIn Profile URL</h3>
          <InputField
            label="Profile URL"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.linkedin.com/in/username"
          />
          <Button onClick={handleScrapeProfile} loading={loading} disabled={!hasAccess}>
            Scrape Profile
          </Button>
          <p style={{ fontSize: 12, marginTop: 10, color: '#666' }}>
            Profile will be fetched via Apify actors Ã¢â‚¬â€ this may take a minute or two.
          </p>
        </Card>
      )}

      {/* Manual Data Entry Form */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20, backgroundColor: '#f9f9f9' }}>
          <h3>Profile Information</h3>

          {/* Auto-filled indicators */}
          {scrapedData && (
            <div className="scraped-notice">
              Ã°Å¸â€œâ€¹ Some fields were auto-filled from LinkedIn. You can edit them below.
            </div>
          )}

          {missingFields && missingFields.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#fff4f4', border: '1px solid #ffd6d6' }}>
              <strong style={{ color: '#b72f2f' }}>Please complete these fields before saving:</strong>
              <ul style={{ margin: '8px 0 0 16px' }}>
                {missingFields.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Certificates may be added later and are not required now.</div>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: '#f6fbff', border: '1px solid #d7ecff' }}>
              <strong>Personalized improvement suggestions</strong>
              <ol style={{ margin: '8px 0 0 16px' }}>
                {suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}

          <div className="form-grid">
            <InputField
              label="Full Name *"
              value={profileInfo.name}
              onChange={(e) => setProfileInfo({ ...profileInfo, name: e.target.value })}
              placeholder="Your full name"
            />

            <InputField
              label="Headline"
              value={profileInfo.headline}
              onChange={(e) => setProfileInfo({ ...profileInfo, headline: e.target.value })}
              placeholder="Your professional headline"
            />

            <InputField
              label="Location"
              value={profileInfo.location}
              onChange={(e) => setProfileInfo({ ...profileInfo, location: e.target.value })}
              placeholder="City, Country"
            />

            <InputField
              label="Industry"
              value={profileInfo.industry}
              onChange={(e) => setProfileInfo({ ...profileInfo, industry: e.target.value })}
              placeholder="e.g., Software Development"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              About / Bio
            </label>
            <textarea
              value={profileInfo.about}
              onChange={(e) => setProfileInfo({ ...profileInfo, about: e.target.value })}
              placeholder="Tell us about yourself..."
              rows="4"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
                fontSize: '13px'
              }}
            />
          </div>

          {/* Connection/Networking Counts */}
          <div className="form-grid" style={{ marginTop: 16 }}>
            <InputField
              label="Connections (e.g., '5K', '1.2M')"
              value={connectionsInput}
              onChange={(e) => setConnectionsInput(e.target.value)}
              placeholder="5000 or 5K"
            />

            <InputField
              label="Endorsements"
              value={networking.endorsements}
              onChange={(e) => setNetworking({ ...networking, endorsements: e.target.value })}
              placeholder="Number or formatted (e.g., '150')"
            />

            <InputField
              label="Recommendations"
              value={networking.recommendations}
              onChange={(e) => setNetworking({ ...networking, recommendations: e.target.value })}
              placeholder="Number or formatted"
            />
          </div>
        </Card>
      )}

      {/* Skills Tagger */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20 }}>
          <SkillTagger
            skills={skills}
            onChange={setSkills}
            source={scrapedData ? 'auto' : 'user'}
          />
        </Card>
      )}

      {/* Experience Form */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20 }}>
          <ExperienceForm
            experiences={experiences}
            onChange={setExperiences}
            source={scrapedData ? 'auto' : 'user'}
          />
        </Card>
      )}

      {/* Certification Form */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20 }}>
          <CertificationForm
            certifications={certifications}
            onChange={setCertifications}
            source={scrapedData ? 'auto' : 'user'}
          />
        </Card>
      )}

      {/* Save Button */}
      {isLoggedIn && (
        <Card style={{ marginTop: 20, textAlign: 'center' }}>
          <Button
            onClick={handleSaveProfile}
            loading={loading}
            disabled={!hasAccess || (missingFields && missingFields.length > 0)}
            style={{ minWidth: 200, marginBottom: 10 }}
          >
            Save & Calculate Score
          </Button>
          <p style={{ fontSize: 12, color: '#666', margin: '10px 0 0 0' }}>
            Your profile will be saved and your branding score will be calculated automatically.
          </p>
        </Card>
      )}
        </div>
      </div>
    </PageLayout>
  );
}

