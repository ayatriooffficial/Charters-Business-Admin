import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '../../../components/Layout/PageLayout';
import Card from '../../../components/Common/Card';
import Button from '../../../components/Common/Button';
import InputField from '../../../components/Common/InputField';
import { EmptyState } from '../../../components/Common/SharedHelpers';
import { profileService, aiService } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { hasProfileBrandingAccess } from '../../../utils/permissions';
import {
  scoreCertification,
  scoreCourse,
  scoreResearchPaper,
  getIssuerTier,
  getPlatformTier,
  isActive,
  calculateTotalCredentialsScore,
  ISSUER_TIERS,
} from '../utils/credentialScorer';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiArticleLine, RiAwardLine, RiBookOpenLine,
  RiCalendarLine, RiCheckboxCircleLine, RiDeleteBinLine,
  RiExternalLinkLine, RiFileUploadLine, RiSparklingLine,
  RiShieldCheckLine, RiBarChartLine,
  RiInformationLine, RiCloseLine
} from 'react-icons/ri';

const EMPTY_CERT   = { title: '', issuer: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' };
const EMPTY_COURSE = { title: '', platform: '', instructor: '', completionDate: '', certificateUrl: '', skills: '' };
const EMPTY_RESEARCH = { title: '', platform: '', publishDate: '', url: '', description: '' };

export default function CredentialsPage() {
  const { user } = useAuth();
  const hasAccess = hasProfileBrandingAccess(
    user?.permissions?.profileBranding,
    'credentials'
  );

  const [certs,          setCerts]          = useState([]);
  const [courses,        setCourses]        = useState([]);
  const [researchPapers, setResearchPapers] = useState([]);

  const [certForm,     setCertForm]     = useState(EMPTY_CERT);
  const [courseForm,   setCourseForm]   = useState(EMPTY_COURSE);
  const [researchForm, setResearchForm] = useState(EMPTY_RESEARCH);

  const [showCertForm,     setShowCertForm]     = useState(false);
  const [showCourseForm,   setShowCourseForm]   = useState(false);
  const [showResearchForm, setShowResearchForm] = useState(false);

  const [certFile,     setCertFile]     = useState(null);
  const [certExtract,  setCertExtract]  = useState(null);
  const [extracting,   setExtracting]   = useState(false);

  const [savingCert,     setSavingCert]     = useState(false);
  const [savingCourse,   setSavingCourse]   = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);
  const [loading,        setLoading]        = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await profileService.getScore();
      const pubs = data.profile?.publications || [];
      setCerts(data.profile?.certifications || []);
      setCourses(data.profile?.courses || []);
      setResearchPapers(pubs.filter(p => p.publicationType === 'research'));
    } catch {
      toast.error('Failed to load credentials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live score from form values (before saving)
  const liveCertScore   = certForm.title || certForm.issuer ? scoreCertification(certForm) : null;
  const liveCourseScore = courseForm.title || courseForm.platform ? scoreCourse({ ...courseForm, skills: courseForm.skills.split(',').filter(Boolean) }) : null;

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Extract PDF ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const handleExtract = async () => {
    if (!certFile) return toast.error('Choose a certificate PDF or image first');
    setExtracting(true);
    try {
      const { data } = await aiService.extractCertificateText(certFile);
      const ex = data.extractedInfo || {};
      setCertExtract(ex);
      setShowCertForm(true);
      setCertForm(prev => ({
        ...prev,
        title:         ex.title         || prev.title,
        issuer:        ex.issuer        || prev.issuer,
        issueDate:     ex.issueDate     || prev.issueDate,
        credentialId:  ex.credentialId  || prev.credentialId,
        credentialUrl: ex.credentialUrl || prev.credentialUrl
      }));
      toast.success('Fields extracted ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â review and save');
    } catch (err) {
      toast.error(err.message || 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Add Cert ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const handleAddCert = async () => {
    if (!certForm.title || !certForm.issuer || !certForm.issueDate)
      return toast.error('Title, issuer, and issue date are required');
    setSavingCert(true);
    try {
      await profileService.addCertification(certForm);
      await profileService.calculateScore();
      setCertForm(EMPTY_CERT);
      setShowCertForm(false);
      setCertFile(null);
      setCertExtract(null);
      await load();
      toast.success('Certification added!');
    } catch { toast.error('Failed to add certification'); }
    finally  { setSavingCert(false); }
  };

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Add Course ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const handleAddCourse = async () => {
    if (!courseForm.title || !courseForm.platform || !courseForm.completionDate)
      return toast.error('Title, platform, and completion date are required');
    setSavingCourse(true);
    try {
      await profileService.addCourse({
        ...courseForm,
        skills: courseForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      await profileService.calculateScore();
      setCourseForm(EMPTY_COURSE);
      setShowCourseForm(false);
      await load();
      toast.success('Course added!');
    } catch { toast.error('Failed to add course'); }
    finally  { setSavingCourse(false); }
  };

  // ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Add Research ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
  const handleAddResearch = async () => {
    if (!researchForm.title || !researchForm.platform || !researchForm.publishDate || !researchForm.url)
      return toast.error('Title, venue, date, and URL are required');
    setSavingResearch(true);
    try {
      await profileService.addPublication({ ...researchForm, publicationType: 'research', views: 0, likes: 0 });
      await profileService.calculateScore();
      setResearchForm(EMPTY_RESEARCH);
      setShowResearchForm(false);
      await load();
      toast.success('Research paper added!');
    } catch { toast.error('Failed to add research paper'); }
    finally  { setSavingResearch(false); }
  };

  const totalScore = calculateTotalCredentialsScore(certs, courses, researchPapers);

  if (loading) return (
    <PageLayout title="Credentials">
      <div className="shimmer" style={{ height: 420, borderRadius: 14 }} />
    </PageLayout>
  );

  return (
    <PageLayout
      title="Credentials"
      subtitle="Each credential is intelligently scored by issuer prestige, duration, verifiability, and recency"
    >
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
            <RiShieldCheckLine style={{ fontSize: 32 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Access not granted by admin</div>
          </div>
        )}

        <div style={{ opacity: hasAccess ? 1 : 0.5, pointerEvents: hasAccess ? 'auto' : 'none' }}>
      {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Overall Score Banner ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 14,
        marginBottom: 24
      }}>
        <ScoreBannerBox
          label="Credentials Score"
          value={`${totalScore} / 20`}
          sub="Total section score"
          color="var(--gold)"
          icon={<RiBarChartLine />}
          big
        />
        <ScoreBannerBox
          label="Certifications"
          value={certs.length}
          sub={`${certs.filter(c => isActive(c.expiryDate)).length} active`}
          color="var(--gold)"
          icon={<RiAwardLine />}
        />
        <ScoreBannerBox
          label="Courses"
          value={courses.length}
          sub="Completed"
          color="var(--accent-light)"
          icon={<RiBookOpenLine />}
        />
        <ScoreBannerBox
          label="Research Papers"
          value={researchPapers.length}
          sub="Published"
          color="#22d3a0"
          icon={<RiArticleLine />}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Certifications ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <section>
          {/* Upload Card */}
          <Card style={{ marginBottom: 16, borderColor: 'rgba(245,200,66,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <RiFileUploadLine style={{ color: 'var(--gold)', fontSize: 20 }} />
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15 }}>
                    Auto-fill from PDF
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 500 }}>
                  Upload a certificate PDF or image ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â we'll extract the title, issuer, date, and credential ID and pre-fill the form.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 14px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: certFile ? 'var(--green)' : 'var(--text-secondary)',
                  whiteSpace: 'nowrap'
                }}>
                  <RiFileUploadLine />
                  {certFile ? certFile.name.slice(0, 24) + 'ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : 'Choose file'}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={e => { setCertFile(e.target.files?.[0] || null); setCertExtract(null); }}
                  />
                </label>
                <Button icon={<RiSparklingLine />} loading={extracting} onClick={handleExtract} size="sm">
                  Extract Fields
                </Button>
              </div>
            </div>

            {/* Extracted preview */}
            {certExtract && (
              <div style={{
                marginTop: 16,
                padding: '14px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(34,211,160,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)' }}>
                    ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Extracted Preview
                  </span>
                  <button
                    onClick={() => setCertExtract(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
                  >
                    <RiCloseLine />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <PreviewField label="Title"         value={certExtract.title} />
                  <PreviewField label="Issuer"        value={certExtract.issuer} />
                  <PreviewField label="Issue Date"    value={certExtract.issueDate || certExtract.issueDateText} />
                  <PreviewField label="Credential ID" value={certExtract.credentialId} />
                  <PreviewField label="URL"           value={certExtract.credentialUrl} />
                  {certExtract.issuer && (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Detected Tier</div>
                      <IssuerBadge issuer={certExtract.issuer} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>
              <RiAwardLine style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--gold)' }} />
              Certifications ({certs.length})
            </h2>
            <Button variant="secondary" size="sm" icon={<RiAddLine />} onClick={() => setShowCertForm(p => !p)}>
              Add Manually
            </Button>
          </div>

          {/* Add Form with Live Score */}
          {showCertForm && (
            <Card style={{ marginBottom: 16, borderColor: 'rgba(245,200,66,0.25)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--gold)' }}>
                    Certification Details
                  </h4>
                  <InputField
                    label="Certification Title *"
                    value={certForm.title}
                    onChange={e => setCertForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. AWS Solutions Architect Associate"
                  />
                  <InputField
                    label="Issuing Organization *"
                    value={certForm.issuer}
                    onChange={e => setCertForm(p => ({ ...p, issuer: e.target.value }))}
                    placeholder="e.g. Amazon Web Services"
                    hint={certForm.issuer ? null : 'Recognized issuers (Google, AWS, MicrosoftÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦) score higher'}
                  />
                  {certForm.issuer && <IssuerBadge issuer={certForm.issuer} style={{ marginBottom: 14 }} />}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <InputField label="Issue Date *"  type="date" value={certForm.issueDate}  onChange={e => setCertForm(p => ({ ...p, issueDate: e.target.value }))} />
                    <InputField label="Expiry Date"   type="date" value={certForm.expiryDate} onChange={e => setCertForm(p => ({ ...p, expiryDate: e.target.value }))}
                      hint="Leave blank for lifetime certs (+1 bonus)" />
                  </div>
                  <InputField label="Credential ID"  value={certForm.credentialId}  onChange={e => setCertForm(p => ({ ...p, credentialId: e.target.value }))}  placeholder="Optional ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â adds +1 pt" />
                  <InputField label="Credential URL" value={certForm.credentialUrl} onChange={e => setCertForm(p => ({ ...p, credentialUrl: e.target.value }))} placeholder="https://ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ adds +1 pt for verifiability" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button loading={savingCert} onClick={handleAddCert} size="sm">Save Certification</Button>
                    <Button variant="secondary" size="sm" onClick={() => { setShowCertForm(false); setCertExtract(null); }}>Cancel</Button>
                  </div>
                </div>

                {/* Live score panel */}
                {liveCertScore && (
                  <LiveScorePanel
                    score={liveCertScore.total}
                    max={14}
                    label="This cert will add"
                    breakdown={liveCertScore.breakdown}
                    color="var(--gold)"
                  />
                )}
              </div>
            </Card>
          )}

          {/* Cert Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {certs.length === 0
              ? <EmptyState icon={<RiAwardLine />} text="No certifications yet. Upload a PDF or add one manually." />
              : certs.map(cert => <CertCard key={cert._id} cert={cert} onDelete={async () => { await profileService.deleteCertification(cert._id); await profileService.calculateScore(); load(); toast.success('Removed'); }} />)
            }
          </div>
        </section>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Online Courses ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>
              <RiBookOpenLine style={{ verticalAlign: 'middle', marginRight: 8, color: 'var(--accent-light)' }} />
              Online Courses ({courses.length})
            </h2>
            <Button variant="secondary" size="sm" icon={<RiAddLine />} onClick={() => setShowCourseForm(p => !p)}>
              Add Course
            </Button>
          </div>

          {showCourseForm && (
            <Card style={{ marginBottom: 14, borderColor: 'rgba(108,99,255,0.25)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--accent-light)' }}>
                    Course Details
                  </h4>
                  <InputField
                    label="Course Title *"
                    value={courseForm.title}
                    onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Machine Learning Specialization"
                  />
                  <InputField
                    label="Platform *"
                    value={courseForm.platform}
                    onChange={e => setCourseForm(p => ({ ...p, platform: e.target.value }))}
                    placeholder="e.g. Coursera, Udemy, LinkedIn Learning"
                    hint="Coursera, edX, Pluralsight score higher than others"
                  />
                  {courseForm.platform && <PlatformBadge platform={courseForm.platform} style={{ marginBottom: 14 }} />}
                  <InputField label="Instructor" value={courseForm.instructor} onChange={e => setCourseForm(p => ({ ...p, instructor: e.target.value }))} placeholder="Optional ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â adds +1 pt for instructor-led" />
                  <InputField label="Completion Date *" type="date" value={courseForm.completionDate} onChange={e => setCourseForm(p => ({ ...p, completionDate: e.target.value }))} />
                  <InputField label="Certificate URL" value={courseForm.certificateUrl} onChange={e => setCourseForm(p => ({ ...p, certificateUrl: e.target.value }))} placeholder="https://ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ adds +1 pt" />
                  <InputField label="Skills Learned" value={courseForm.skills} onChange={e => setCourseForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, MongoDB (comma separated ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 5+ skills = +2 pts)" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button loading={savingCourse} onClick={handleAddCourse} size="sm">Save Course</Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowCourseForm(false)}>Cancel</Button>
                  </div>
                </div>

                {liveCourseScore && (
                  <LiveScorePanel
                    score={liveCourseScore.total}
                    max={9}
                    label="This course will add"
                    breakdown={liveCourseScore.breakdown}
                    color="var(--accent-light)"
                  />
                )}
              </div>
            </Card>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.length === 0
              ? <EmptyState icon={<RiBookOpenLine />} text="No courses yet. Add your first completed course." />
              : courses.map(course => <CourseCard key={course._id} course={course} onDelete={async () => { await profileService.deleteCourse(course._id); await profileService.calculateScore(); load(); toast.success('Removed'); }} />)
            }
          </div>
        </section>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Research Papers ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>
              <RiArticleLine style={{ verticalAlign: 'middle', marginRight: 8, color: '#22d3a0' }} />
              Research Papers ({researchPapers.length})
            </h2>
            <Button variant="secondary" size="sm" icon={<RiAddLine />} onClick={() => setShowResearchForm(p => !p)}>
              Add Paper
            </Button>
          </div>

          {showResearchForm && (
            <Card style={{ marginBottom: 14, borderColor: 'rgba(34,211,160,0.2)' }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: '#22d3a0' }}>
                Research Paper Details
              </h4>
              <InputField label="Paper Title *" value={researchForm.title} onChange={e => setResearchForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Transformer-based Anomaly Detection in IoT Networks" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <InputField label="Journal / Conference *" value={researchForm.platform} onChange={e => setResearchForm(p => ({ ...p, platform: e.target.value }))} placeholder="e.g. IEEE, ACM, Elsevier ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tier 1 = +6 pts" />
                <InputField label="Publish Date *" type="date" value={researchForm.publishDate} onChange={e => setResearchForm(p => ({ ...p, publishDate: e.target.value }))} />
              </div>
              <InputField label="DOI / URL *" value={researchForm.url} onChange={e => setResearchForm(p => ({ ...p, url: e.target.value }))} placeholder="https://doi.org/ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ adds +2 pts" />
              <InputField label="Abstract / Notes" type="textarea" rows={3} value={researchForm.description} onChange={e => setResearchForm(p => ({ ...p, description: e.target.value }))} placeholder="50+ character abstract adds +1 pt" />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button loading={savingResearch} onClick={handleAddResearch} size="sm">Save Paper</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowResearchForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {researchPapers.length === 0
              ? <EmptyState icon={<RiArticleLine />} text="No research papers added yet. IEEE/ACM/Nature papers score up to 10 pts each." />
              : researchPapers.map(paper => <ResearchCard key={paper._id} paper={paper} onDelete={async () => { await profileService.deletePublication(paper._id); await profileService.calculateScore(); load(); toast.success('Removed'); }} />)
            }
          </div>
        </section>

        {/* ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Scoring Guide ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ */}
        <ScoringGuide />
      </div>
        </div>
      </div>
    </PageLayout>
  );
}


// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Sub-components ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬

function ScoreBannerBox({ label, value, sub, color, icon, big }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '18px 20px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ color, fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: big ? 28 : 32, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function IssuerBadge({ issuer, style = {} }) {
  const tier = getIssuerTier(issuer);
  const label = tier === ISSUER_TIERS.tier1 ? 'Elite' : tier === ISSUER_TIERS.tier2 ? 'Recognized' : 'Standard';
  const { color, bg, border } = getTierStyle(label);

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 20,
      fontSize: 12, fontWeight: 600, color,
      ...style
    }}>
      <RiShieldCheckLine style={{ fontSize: 13 }} />
      {label} Issuer Ãƒâ€šÃ‚Â· +{tier.points} base pts
    </div>
  );
}

function getTierStyle(label) {
  if (label === 'Elite')      return { color: '#f5c842', bg: 'rgba(245,200,66,0.12)', border: 'rgba(245,200,66,0.35)' };
  if (label === 'Recognized') return { color: '#6c63ff', bg: 'rgba(108,99,255,0.12)', border: 'rgba(108,99,255,0.3)' };
  return { color: '#22d3a0', bg: 'rgba(34,211,160,0.1)', border: 'rgba(34,211,160,0.25)' };
}

function PlatformBadge({ platform, style = {} }) {
  const tier = getPlatformTier(platform);
  const label = tier.tier === 1 ? 'Premium' : tier.tier === 2 ? 'Popular' : 'Self-paced';
  const { color, bg, border } = getTierStyle(label === 'Premium' ? 'Elite' : label === 'Popular' ? 'Recognized' : 'Standard');
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px',
      background: bg, border: `1px solid ${border}`,
      borderRadius: 20, fontSize: 12, fontWeight: 600, color, ...style
    }}>
      <RiBookOpenLine style={{ fontSize: 13 }} />
      {label} Platform Ãƒâ€šÃ‚Â· +{tier.points} base pts
    </div>
  );
}

function LiveScorePanel({ score, max, label, breakdown, color }) {
  const pct = Math.round((score / max) * 100);
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid ${color}33`,
      borderRadius: 'var(--radius)',
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Live Score Preview
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 40, fontWeight: 800, color, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>/ {max} pts</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label} <strong style={{ color }}>{score} points</strong></div>

      {/* Bar */}
      <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          borderRadius: 3,
          transition: 'width 0.4s ease'
        }} />
      </div>

      {/* Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {breakdown.map((b, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12
          }}>
            <span style={{ color: 'var(--text-muted)' }}>{b.label}</span>
            <span style={{ fontWeight: 700, color: b.color }}>+{b.points}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertCard({ cert, onDelete }) {
  const { total, breakdown, tier } = scoreCertification(cert);
  const active   = isActive(cert.expiryDate);
  const tierLabel = tier === ISSUER_TIERS.tier1 ? 'Elite' : tier === ISSUER_TIERS.tier2 ? 'Recognized' : 'Standard';
  const { color, bg, border } = getTierStyle(tierLabel);

  return (
    <Card padding="16px">
      <div style={{ display: 'flex', gap: 14 }}>
        {/* Score bubble */}
        <div style={{
          flexShrink: 0,
          width: 52, height: 52,
          borderRadius: '50%',
          background: bg,
          border: `2px solid ${border}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color, lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 9, color, opacity: 0.7 }}>pts</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{cert.title}</span>
                {cert.verified && <RiCheckboxCircleLine style={{ color: 'var(--green)', fontSize: 14 }} />}
                {!active && (
                  <span style={{ fontSize: 11, padding: '1px 6px', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 20 }}>
                    Expired
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{cert.issuer}</span>
                <span style={{
                  fontSize: 11, padding: '2px 7px',
                  background: bg, border: `1px solid ${border}`,
                  color, borderRadius: 20, fontWeight: 600
                }}>
                  {tierLabel}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <RiCalendarLine style={{ fontSize: 11 }} />
                {formatMonthYear(cert.issueDate)}
                {cert.expiryDate ? ` ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“ ${formatMonthYear(cert.expiryDate)}` : ' Ãƒâ€šÃ‚Â· Lifetime'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {cert.credentialUrl && (
                <Button variant="ghost" size="sm" icon={<RiExternalLinkLine />} onClick={() => window.open(cert.credentialUrl, '_blank')} />
              )}
              <Button variant="danger" size="sm" icon={<RiDeleteBinLine />} onClick={onDelete} />
            </div>
          </div>

          {/* Mini breakdown pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {breakdown.map((b, i) => (
              <span key={i} style={{
                fontSize: 11,
                padding: '2px 8px',
                background: `${b.color}18`,
                color: b.color,
                border: `1px solid ${b.color}33`,
                borderRadius: 20
              }}>
                {b.label} +{b.points}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function CourseCard({ course, onDelete }) {
  const skills = Array.isArray(course.skills) ? course.skills : [];
  const { total, breakdown, tier } = scoreCourse({ ...course, skills });
  const tierLabel = tier.tier === 1 ? 'Elite' : tier.tier === 2 ? 'Recognized' : 'Standard';
  const { color, bg, border } = getTierStyle(tierLabel);

  return (
    <Card padding="16px">
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: '50%',
          background: bg, border: `2px solid ${border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color, lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 9, color, opacity: 0.7 }}>pts</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{course.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{course.platform}</span>
                <span style={{
                  fontSize: 11, padding: '2px 7px',
                  background: bg, border: `1px solid ${border}`,
                  color, borderRadius: 20, fontWeight: 600
                }}>
                  {tier.tier === 1 ? 'Premium' : tier.tier === 2 ? 'Popular' : 'Self-paced'}
                </span>
              </div>
              {course.instructor && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>by {course.instructor}</div>
              )}
              {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {skills.map(s => (
                    <span key={s} style={{ fontSize: 11, padding: '2px 8px', background: 'var(--accent-dim)', color: 'var(--accent-light)', borderRadius: 20 }}>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {course.certificateUrl && (
                <Button variant="ghost" size="sm" icon={<RiExternalLinkLine />} onClick={() => window.open(course.certificateUrl, '_blank')} />
              )}
              <Button variant="danger" size="sm" icon={<RiDeleteBinLine />} onClick={onDelete} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
            {breakdown.map((b, i) => (
              <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}33`, borderRadius: 20 }}>
                {b.label} +{b.points}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ResearchCard({ paper, onDelete }) {
  const { total, breakdown } = scoreResearchPaper(paper);
  const isTop = total >= 7;
  const color = isTop ? 'var(--gold)' : '#22d3a0';

  return (
    <Card padding="16px">
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: '50%',
          background: isTop ? 'var(--gold-dim)' : 'var(--green-dim)',
          border: `2px solid ${isTop ? 'rgba(245,200,66,0.4)' : 'rgba(34,211,160,0.3)'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color, lineHeight: 1 }}>{total}</span>
          <span style={{ fontSize: 9, color, opacity: 0.7 }}>pts</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{paper.title}</div>
              <div style={{ fontSize: 13, color, fontWeight: 600 }}>{paper.platform}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Published {formatMonthYear(paper.publishDate)}
              </div>
              {paper.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
                  {paper.description.slice(0, 160)}{paper.description.length > 160 ? 'ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' : ''}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                {breakdown.map((b, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: `${b.color}18`, color: b.color, border: `1px solid ${b.color}33`, borderRadius: 20 }}>
                    {b.label} +{b.points}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Button variant="ghost" size="sm" icon={<RiExternalLinkLine />} onClick={() => window.open(paper.url, '_blank')} />
              <Button variant="danger" size="sm" icon={<RiDeleteBinLine />} onClick={onDelete} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScoringGuide() {
  const [open, setOpen] = useState(false);
  const rows = [
    ['Issuer: Elite (Google, AWS, Microsoft, IBMÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦)',   '6 pts base',  'Tier 1'],
    ['Issuer: Recognized (Coursera, edX, UdacityÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦)',   '3 pts base',  'Tier 2'],
    ['Issuer: Standard (any other)',                    '1 pt base',   'Tier 3'],
    ['Duration: 12+ months (Specialization/Bootcamp)', '+3 pts',      ''],
    ['Duration: 3ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Å“12 months (Course/Program)',          '+2 pts',      ''],
    ['Duration: <3 months (Workshop/Webinar)',          '+1 pt',       ''],
    ['Verifiable credential URL',                       '+1 pt',       ''],
    ['Has Credential ID',                               '+1 pt',       ''],
    ['Currently active (not expired)',                  '+1 pt',       ''],
    ['Issued within last 2 years',                      '+1 pt',       'Recency'],
    ['Lifetime certificate (no expiry)',                '+1 pt',       'Bonus'],
    ['Research: IEEE / ACM / Nature venue',             '+6 pts',      'Top tier'],
    ['Research: ResearchGate / MDPI venue',             '+3 pts',      'Mid tier'],
    ['Research: DOI / URL provided',                    '+2 pts',      ''],
    ['Course: Coursera / edX / Pluralsight',            '+4 pts base', 'Premium'],
    ['Course: Udemy / Skillshare / FCC',                '+2 pts base', 'Popular'],
    ['Course: 5+ skills listed',                        '+2 pts',      ''],
    ['Course: Instructor-led',                          '+1 pt',       ''],
  ];

  return (
    <Card padding="16px">
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer',
          fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600,
          padding: 0, width: '100%', justifyContent: 'space-between'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RiInformationLine style={{ color: 'var(--accent-light)', fontSize: 18 }} />
          Scoring Criteria Guide
        </span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¼</span>
      </button>

      {open && (
        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Criterion', 'Points', 'Notes'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([criterion, pts, note], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{criterion}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--gold)', fontWeight: 700, whiteSpace: 'nowrap' }}>{pts}</td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            * Diminishing returns apply after 5 certifications and 5 courses ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â additional items score at 50% value. Section cap: 20 pts.
          </p>
        </div>
      )}
    </Card>
  );
}

function PreviewField({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
        {value || 'Not detected'}
      </div>
    </div>
  );
}

function formatMonthYear(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

