'use client';

import { LeadFieldSelect } from './LeadFieldSelect';
import { normalizeLeadPhone, leadWhatsAppTarget } from '@/lib/lead-phone';
import { LeadDetailsDialog } from '@/components/LeadDetailsDialog';
import { getLeadOwner } from '@/lib/lead-details';
import { WorkspaceDialog } from '@/components/WorkspaceDialog';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';

import React, { useState, useRef, useMemo, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { useHearthAway } from '@/lib/context';
import {
  X,
  MoreHorizontal,
  Phone,
  Mail,
  Clock,
  Shield,
  DollarSign,
  Building,
  User,
  Calendar,
  MapPin,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Upload,
  Send,
  ExternalLink,
  ChevronRight,
  Plus,
  Trash2,
  File,
  Image as ImageIcon,
  Download,
  Eye,
  Edit2,
  Home,
  Check,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  Tag,
} from 'lucide-react';
import {
  Booking,
  Student,
  Payment,
  PaymentProofAttachment,
  RentFrequency,
  SupportedCurrency,
  CURRENCY_SYMBOLS,
} from '@/lib/types';

export type RegisterLeadLeaveGuard = (guard: (() => boolean) | null) => void;

export function StudentDetailDrawer({ studentId, embedded = false, onClose, registerLeaveGuard }: {
  studentId?: string;
  embedded?: boolean;
  onClose?: () => void;
  registerLeaveGuard?: RegisterLeadLeaveGuard;
} = {}) {
  const { selectedStudentId, setSelectedStudentId, students } = useHearthAway();
  const id = studentId ?? selectedStudentId;
  const student = id ? students.find((entry) => entry.studentId === id || entry.id === id) : undefined;
  if (!student) return null;

  return <StudentDetail
    key={student.studentId}
    student={student}
    embedded={embedded}
    onClose={onClose ?? (() => setSelectedStudentId(null))}
    registerLeaveGuard={registerLeaveGuard}
  />;
}

function LeadDetailSurface({ embedded, label, onClose, children }: {
  embedded: boolean;
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return embedded
    ? <aside id="sales-lead-panel" aria-label={label} className="sales-lead-panel">{children}</aside>
    : <WorkspaceDialog label={label} onDismiss={onClose} drawer>{children}</WorkspaceDialog>;
}

function StudentDetail({ student, embedded, onClose, registerLeaveGuard }: {
  student: Student;
  embedded: boolean;
  onClose: () => void;
  registerLeaveGuard?: RegisterLeadLeaveGuard;
}) {
  const {
    partners,
    activities,
    payments,
    bookings,
    currentUser,
    availableUsers,
    leadOwnerOptions,
    updateStudentDecoupledStatus,
    uploadPaymentTransaction,
    recordPropertyBooking,
    updatePropertyBooking,
    reassignLeadOwner,
    assignSalesOwner,
    editLeadDetails,
    archiveLead,
    leadOperationsRole,
    logStudentActivity,
  } = useHearthAway();

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [archivingLeadId, setArchivingLeadId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const phone = normalizeLeadPhone(student.phone);
  const whatsApp = leadWhatsAppTarget(typeof student.whatsApp === 'string' && student.whatsApp.trim() ? student.whatsApp : student.phone);
  function closeArchive() {
    setArchivingLeadId(null);
    requestAnimationFrame(() => moreTrigger.current?.focus());
  }
  const [activeTab, setActiveTab] = useState<'timeline' | 'bookings' | 'payments'>('timeline');

  // ==========================================
  // PAYMENT FORM & PROOF UPLOAD STATE
  // ==========================================
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<SupportedCurrency>('GBP');
  const [paymentMethod, setPaymentMethod] = useState<'Bank Transfer' | 'Credit Card' | 'Online Gateway' | 'Direct Debit' | 'UPI'>('Bank Transfer');
  const [paymentAssociatedBookingId, setPaymentAssociatedBookingId] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<
    Array<{ file: File; id: string; name: string; size: number; type: string; previewUrl?: string }>
  >([]);
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);
  const [paymentUploadError, setPaymentUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Management Proof Bypass state
  const [allowBypassProof, setAllowBypassProof] = useState(false);
  const [bypassReason, setBypassReason] = useState('');

  // Active Attachment Preview modal
  const [previewAttachment, setPreviewAttachment] = useState<PaymentProofAttachment | null>(null);

  // ==========================================
  // PROPERTY BOOKING FORM STATE
  // ==========================================
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);

  const [bookingPropertyName, setBookingPropertyName] = useState('');
  const [bookingPropertyAddress, setBookingPropertyAddress] = useState('');
  const [bookingRentAmount, setBookingRentAmount] = useState('');
  const [bookingRentFrequency, setBookingRentFrequency] = useState<RentFrequency>('weekly');
  const [bookingRentCurrency, setBookingRentCurrency] = useState<SupportedCurrency>('GBP');
  const [bookingDepositAmount, setBookingDepositAmount] = useState('0');
  const [bookingDepositCurrency, setBookingDepositCurrency] = useState<SupportedCurrency>('GBP');
  const [bookingTenancyStartDate, setBookingTenancyStartDate] = useState('2026-09-15');
  const [bookingTenancyEndDate, setBookingTenancyEndDate] = useState('2027-07-01');
  const [bookingStatus, setBookingStatus] = useState<'Pending Confirmation' | 'Confirmed' | 'Cancelled'>('Confirmed');
  const [bookingReference, setBookingReference] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Commission & Expected Revenue section
  const [bookingCommissionRate, setBookingCommissionRate] = useState('15');
  const [bookingCommissionableAmount, setBookingCommissionableAmount] = useState('');
  const [bookingCommissionableCurrency, setBookingCommissionableCurrency] = useState<SupportedCurrency>('GBP');
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);

  const [newNote, setNewNote] = useState('');
  const noteInFlight = useRef(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [contactError, setContactError] = useState('');
  const [bookingDirty, setBookingDirty] = useState(false);
  const [paymentDirty, setPaymentDirty] = useState(false);
  const savingBooking = useRef(false);
  const hasDraft = Boolean(newNote.trim() || bookingDirty || paymentDirty || selectedProofFiles.length);

  const canLeave = useCallback(() => !savingBooking.current && !noteInFlight.current && !isUploadingPayment &&
    (!hasDraft || window.confirm('Discard unsaved changes to this lead?')), [hasDraft, isUploadingPayment]);

  useLayoutEffect(() => {
    if (!registerLeaveGuard) return;
    registerLeaveGuard(canLeave);
    return () => registerLeaveGuard(null);
  }, [canLeave, registerLeaveGuard]);

  function requestClose() {
    if (canLeave()) onClose();
  }

  const isManagementUser = currentUser.role === 'management' || currentUser.role === 'admin';

  // Expected Revenue calculation (Hook must be top-level before early returns)
  const calculatedExpectedRevenue = useMemo(() => {
    const rate = parseFloat(bookingCommissionRate);
    const amount = parseFloat(bookingCommissionableAmount);
    if (isNaN(rate) || isNaN(amount) || rate <= 0 || amount <= 0) {
      return null;
    }
    return Number(((amount * rate) / 100).toFixed(2));
  }, [bookingCommissionRate, bookingCommissionableAmount]);

  const studentActivities = activities.filter((a) => a.studentId === student.studentId);
  const studentPayments = payments.filter((p) => p.studentId === student.studentId);
  const studentBookings = bookings.filter((b) => b.studentId === student.studentId);
  const studentPartner = partners.find((p) => p.partnerId === student.partnerId);
  const canEditDetails = isManagementUser || currentUser.role === 'sales' ||
    (currentUser.role === 'partner' && student.partnerId === currentUser.partnerId) ||
    (currentUser.role === 'portfolio_owner' && studentPartner?.portfolioOwnerId === currentUser.uid);
  const canEditOwners = isManagementUser || currentUser.role === 'sales';

  // Security check: If current user is a Partner, verify data isolation
  const isPartner = currentUser.role === 'partner';
  if (isPartner && student.partnerId !== currentUser.partnerId) {
    return (
      <LeadDetailSurface embedded={embedded} label="Access restricted" onClose={requestClose}>
        <div className="w-full max-w-md bg-[#FFFFFF] p-6 shadow-2xl flex flex-col justify-center items-center text-center border-l border-[#E8E6E1]">
          <div className="h-12 w-12 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] flex items-center justify-center text-[#00319D] mb-4">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-[#1A1A1A]">Access Restricted</h3>
          <p className="text-xs text-[#6B6860] mt-2 leading-relaxed">
            Partner isolation boundary active. You can only view student records assigned to your organization.
          </p>
          <button
            onClick={requestClose}
            className="mt-6 rounded-lg bg-[#00319D] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
          >
            Close
          </button>
        </div>
      </LeadDetailSurface>
    );
  }

  // Pre-fill partner rate when available
  const defaultPartnerRate = studentPartner?.commissionRate || 15;

  // Auto-fill commissionable amount from rent if empty
  const handleRentAmountChange = (val: string) => {
    setBookingRentAmount(val);
    if (!bookingCommissionableAmount || bookingCommissionableAmount === bookingRentAmount) {
      setBookingCommissionableAmount(val);
    }
  };

  // File size formatter
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle file selection (drag & drop or browse)
  const handleFileDrop = (files: FileList | null) => {
    if (!files) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const newFiles: File[] = [];
    const newPreviews: Array<{ file: File; id: string; name: string; size: number; type: string; previewUrl?: string }> = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isValidExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext || '');
      const isValidType = allowedTypes.includes(file.type.toLowerCase()) || isValidExt;

      if (!isValidType) {
        setPaymentUploadError(`"${file.name}" has an unsupported format. Only JPG, PNG, WEBP, and PDF files are allowed.`);
        return;
      }

      newFiles.push(file);
      const isImg = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
      newPreviews.push({
        file,
        id: `local-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type || (ext === 'pdf' ? 'application/pdf' : 'image/jpeg'),
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      });
    });

    if (newFiles.length > 0) {
      setPaymentUploadError(null);
      setSelectedProofFiles((prev) => [...prev, ...newFiles]);
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const item = filePreviews[index];
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    setSelectedProofFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload Payment with Proof Files
  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentUploadError(null);

    const amountNum = parseFloat(paymentAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setPaymentUploadError('Please specify a valid payment amount.');
      return;
    }

    // Require at least one proof file unless an authorized management user bypassed
    if (selectedProofFiles.length === 0) {
      if (!allowBypassProof) {
        setPaymentUploadError('At least one payment proof document or screenshot is required before submission.');
        return;
      }
      if (!bypassReason.trim()) {
        setPaymentUploadError('Management exception reason must be provided to record payment without proof.');
        return;
      }
    }

    setIsUploadingPayment(true);

    try {
      let uploadedAttachments: PaymentProofAttachment[] = [];

      // Step 1: Upload files to persistent file storage
      if (selectedProofFiles.length > 0) {
        const formData = new FormData();
        selectedProofFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('uploadedBy', currentUser.displayName);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload payment proof files to persistent storage.');
        }

        const resData = await uploadRes.json();
        uploadedAttachments = resData.attachments || [];
      }

      // Step 2: Record transaction with its attachments
      await uploadPaymentTransaction({
        studentId: student.studentId,
        bookingId: paymentAssociatedBookingId || studentBookings[0]?.bookingId || undefined,
        bookingReference: studentBookings.find((b) => b.bookingId === paymentAssociatedBookingId)?.bookingReference,
        amount: amountNum,
        currency: paymentCurrency,
        paymentMethod,
        attachments: uploadedAttachments,
        proofBypassReason: allowBypassProof ? bypassReason.trim() : undefined,
        remarks: paymentRemarks.trim() || undefined,
        screenshotUrl: uploadedAttachments[0]?.fileUrl || undefined,
      });

      // Clear form
      setPaymentDirty(false);
      setPaymentAmount('');
      setPaymentRemarks('');
      setSelectedProofFiles([]);
      setFilePreviews([]);
      setAllowBypassProof(false);
      setBypassReason('');
      setPaymentUploadError(null);
      setActiveTab('payments');
    } catch (err: any) {
      console.error('Payment upload failed:', err);
      setPaymentUploadError(err.message || 'Payment submission failed. Transaction was not recorded.');
    } finally {
      setIsUploadingPayment(false);
    }
  };

  // Record / Update Property Booking
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingFormError(null);

    if (!bookingPropertyName.trim()) {
      setBookingFormError('Property Name is required.');
      return;
    }
    if (!bookingPropertyAddress.trim()) {
      setBookingFormError('Property Address is required.');
      return;
    }
    const rentNum = parseFloat(bookingRentAmount);
    if (isNaN(rentNum) || rentNum <= 0) {
      setBookingFormError('Please enter a valid rent amount.');
      return;
    }

    const rateNum = parseFloat(bookingCommissionRate);
    const commAmtNum = parseFloat(bookingCommissionableAmount || bookingRentAmount);

    if (isNaN(rateNum) || isNaN(commAmtNum) || rateNum <= 0 || commAmtNum <= 0) {
      setBookingFormError('Please complete the Agreed Commission Rate (%) and Commissionable Amount fields to calculate Expected Revenue.');
      return;
    }

    const depositNum = parseFloat(bookingDepositAmount) || 0;

    if (editingBookingId) {
      await updatePropertyBooking(editingBookingId, {
        propertyName: bookingPropertyName.trim(),
        propertyAddress: bookingPropertyAddress.trim(),
        rentAmount: rentNum,
        rentFrequency: bookingRentFrequency,
        rentCurrency: bookingRentCurrency,
        depositAmount: depositNum,
        depositCurrency: bookingDepositCurrency,
        tenancyStartDate: bookingTenancyStartDate,
        tenancyEndDate: bookingTenancyEndDate,
        bookingStatus,
        bookingReference: bookingReference.trim() || undefined,
        notes: bookingNotes.trim() || undefined,
        commissionRate: rateNum,
        commissionableAmount: commAmtNum,
        commissionableCurrency: bookingCommissionableCurrency,
      });
      setEditingBookingId(null);
    } else {
      await recordPropertyBooking({
        studentId: student.studentId,
        propertyName: bookingPropertyName.trim(),
        propertyAddress: bookingPropertyAddress.trim(),
        rentAmount: rentNum,
        rentFrequency: bookingRentFrequency,
        rentCurrency: bookingRentCurrency,
        depositAmount: depositNum,
        depositCurrency: bookingDepositCurrency,
        tenancyStartDate: bookingTenancyStartDate,
        tenancyEndDate: bookingTenancyEndDate,
        bookingStatus,
        bookingReference: bookingReference.trim() || undefined,
        notes: bookingNotes.trim() || undefined,
        commissionRate: rateNum,
        commissionableAmount: commAmtNum,
        commissionableCurrency: bookingCommissionableCurrency,
      });
    }

    // Reset booking form
    setBookingDirty(false);
    setShowBookingForm(false);
    setBookingPropertyName('');
    setBookingPropertyAddress('');
    setBookingRentAmount('');
    setBookingDepositAmount('0');
    setBookingReference('');
    setBookingNotes('');
    setBookingCommissionableAmount('');
    setActiveTab('bookings');
  };

  const handleStartEditBooking = (b: Booking) => {
    setBookingDirty(false);
    setEditingBookingId(b.bookingId);
    setBookingPropertyName(b.propertyName);
    setBookingPropertyAddress(b.propertyAddress);
    setBookingRentAmount(String(b.rentAmount));
    setBookingRentFrequency(b.rentFrequency || 'weekly');
    setBookingRentCurrency((b.rentCurrency as SupportedCurrency) || 'GBP');
    setBookingDepositAmount(String(b.depositAmount || 0));
    setBookingDepositCurrency((b.depositCurrency as SupportedCurrency) || 'GBP');
    setBookingTenancyStartDate(b.tenancyStartDate || '2026-09-15');
    setBookingTenancyEndDate(b.tenancyEndDate || '2027-07-01');
    setBookingStatus((b.bookingStatus as any) || 'Confirmed');
    setBookingReference(b.bookingReference || '');
    setBookingNotes(b.notes || '');
    setBookingCommissionRate(String(b.commissionRate || 15));
    setBookingCommissionableAmount(String(b.commissionableAmount || b.rentAmount));
    setBookingCommissionableCurrency((b.commissionableCurrency as SupportedCurrency) || 'GBP');
    setShowBookingForm(true);
  };

  const handleCancelBookingRecord = (bookingId: string) => setCancelBookingId(bookingId);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const note = newNote.trim();
    if (!note || noteInFlight.current) return;
    noteInFlight.current = true;
    setNoteSaving(true);
    setNoteError('');
    try {
      await logStudentActivity(student.studentId, 'Internal Note Added', `${currentUser.displayName}: ${note}`);
      setNewNote('');
    } catch { setNoteError('Note could not be saved. Try again.'); }
    finally { noteInFlight.current = false; setNoteSaving(false); }
  };

  function recordContact(type: string, description: string) {
    setContactError('');
    void logStudentActivity(student.studentId, type, description).catch(() => setContactError('Contact opened, but the activity was not recorded.'));
  }

  const currencies: Array<{ code: SupportedCurrency; label: string; symbol: string }> = [
    { code: 'INR', label: 'INR (₹)', symbol: '₹' },
    { code: 'GBP', label: 'GBP (£)', symbol: '£' },
    { code: 'EUR', label: 'EUR (€)', symbol: '€' },
    { code: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
    { code: 'USD', label: 'USD ($)', symbol: '$' },
  ];

  const portfolioOwner = partners.find((partner) => partner.partnerId === student.partnerId)?.portfolioOwnerName || 'Unassigned';
  const destination = [student.destinationCity, student.destinationCountry].filter(Boolean).join(', ');

  function openArchiveDialog() {
    setArchiveReason('');
    setArchiveError('');
    setArchivingLeadId(student.studentId);
  }

  return (
    <>
    <LeadDetailSurface embedded={embedded} label="Student details" onClose={requestClose}>
      <div className="h-full min-w-0">
        <div className="ha-drawer-layout lead-record-layout w-full max-w-3xl bg-[#FFFFFF] shadow-2xl flex flex-col h-full border-l border-[#E8E6E1] animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="border-b border-[#E8E6E1] px-6 py-4 bg-[#F7F6F3]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold text-ha-ink">{student.fullName}</h2>
                <p className="mt-1 text-xs text-ha-secondary">{student.studentId}</p>
              </div>
              <div className="lead-header-tools" role="group" aria-label="Lead actions" onKeyDown={event => {
                if (moreOpen && event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  setMoreOpen(false);
                  moreTrigger.current?.focus();
                }
              }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }}>
                {canEditDetails && <button aria-label="Edit lead" data-tip="Edit lead" onClick={() => setEditingLeadId(student.studentId)}><Edit2 size={17}/></button>}
                {leadOperationsRole === 'management' && <>
                  <button ref={moreTrigger} aria-label="More lead actions" data-tip="More lead actions" aria-expanded={moreOpen}
                    onClick={() => setMoreOpen(!moreOpen)}><MoreHorizontal size={19}/></button>
                  {moreOpen && <button className="lead-overflow" onClick={() => { setMoreOpen(false); openArchiveDialog(); }}>Archive lead</button>}
                </>}
                <button aria-label="Close lead" data-tip="Close lead" onClick={requestClose}><X size={19}/></button>
              </div>
            </div>

            <div className="lead-summary mt-2 space-y-1 break-words text-xs text-ha-secondary">
              {student.university && <p className="font-semibold text-ha-ink">{student.university}</p>}
              {destination && (
                <p className="flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{destination}</span>
                </p>
              )}
              {student.intake && <p>Intake: {student.intake}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <p>Partner: <span className="text-ha-ink">{student.partnerName || student.partnerId || 'Unassigned'}</span></p>
                <p>Portfolio owner: <span className="text-ha-ink">{portfolioOwner}</span></p>
              </div>
            </div>

            <div className="lead-record-controls">
              <div className="lead-contact-row" role="group" aria-label="Contact lead">
                <a aria-label="Call" data-tip="Call" aria-disabled={!phone} href={phone ? `tel:${phone}` : undefined}
                  onClick={() => phone && recordContact('Phone Call', `Outbound call initiated to ${phone}`)}><Phone size={17}/></a>
                <a aria-disabled={!whatsApp} title={whatsApp ? 'Open WhatsApp chat' : 'No valid WhatsApp number'} target="_blank" rel="noreferrer" href={whatsApp ? `https://wa.me/${whatsApp}?text=${encodeURIComponent(`Hi ${student.firstName}, this is ${currentUser.displayName} from HearthAway.`)}` : undefined}
                  onClick={() => whatsApp && recordContact('WhatsApp Outbound', `WhatsApp chat initiated to ${whatsApp}`)}>WhatsApp</a>
                <a aria-label="Email" data-tip="Email" aria-disabled={!student.email} href={student.email ? `mailto:${student.email}?subject=HearthAway%20Accommodation%20Update%20-${student.studentId}` : undefined}
                  onClick={() => student.email && recordContact('Email Outbound', `Email client opened for ${student.email}`)}><Mail size={17}/></a>
              </div>
              <p className="lead-phone-text">{phone || 'No valid phone number'}</p>
              {contactError && <p role="alert" className="text-xs text-rose-700">{contactError}</p>}
              <div className="lead-assignment-fields mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-ha-line bg-white p-3">
                {(() => {
                  const salesUsers = leadOwnerOptions.length ? leadOwnerOptions : availableUsers.filter((u) => u.role === 'sales');

                  return (
                    <>
                      {(['lead', 'sales'] as const).map((kind) => {
                        const isSales = kind === 'sales';
                        const label = isSales ? 'Sales owner' : 'Lead owner';
                        const owner = isSales ? { id: student.salesOwnerId || '', name: student.salesOwnerName || 'Unassigned' } : getLeadOwner(student);
                        return (
                          <label key={kind} className="grid min-w-0 content-start gap-0.5 text-xs text-ha-secondary">
                            <span className="shrink-0">{label}</span>
                            {canEditOwners && (!isSales || leadOperationsRole === "management" || leadOperationsRole === "sales") ? <LeadFieldSelect aria-label={label} value={owner.id} className="w-full min-w-0 bg-transparent text-sm font-semibold text-ha-blue"
                              onSave={(id) => {
                                const name = salesUsers.find((user) => user.uid === id)?.displayName || '';
                                const save = isSales ? assignSalesOwner : reassignLeadOwner;
                                return save(student.studentId, id, name);
                              }}>
                              <option value="">Unassigned</option>
                              {!!owner.id && !salesUsers.some((user) => user.uid === owner.id) && <option value={owner.id}>{owner.name}</option>}
                              {salesUsers.map((user) => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}
                            </LeadFieldSelect> : <strong className="lead-owner-value break-words text-sm text-ha-ink">{owner.name}</strong>}
                          </label>
                        );
                      })}


                      {/* Pipeline Stage */}
                      <label className="grid min-w-0 content-start gap-0.5 text-xs text-ha-secondary">
                        <span className="shrink-0">Pipeline stage</span>
                        <LeadFieldSelect
                          aria-label="Pipeline Stage"
                          value={student.pipelineStage || 'New'}
                          onSave={(value) => updateStudentDecoupledStatus(student.studentId, { pipelineStage: value as NonNullable<Student['pipelineStage']> })}
                          className="w-full min-w-0 bg-transparent text-sm font-semibold text-[#00319D] focus-visible:outline-ha-blue cursor-pointer"
                        >
                          <option>New</option>
                          <option>Active</option>
                          <option>Qualified</option>
                          <option>Option Shared</option>
                          <option>Payment</option>
                          <option>Fulfilment</option>
                          <option>Closed Won</option>
                          <option>Disqualified</option>
                          <option>Cancelled</option>
                        </LeadFieldSelect>
                      </label>
                      {/* Priority */}
                      <label className="grid min-w-0 content-start gap-0.5 text-xs text-ha-secondary">
                        <span className="shrink-0">Priority</span>
                        <LeadFieldSelect
                          aria-label="Priority"
                          value={student.priority || 'Medium'}
                          onSave={(value) => updateStudentDecoupledStatus(student.studentId, { priority: value as NonNullable<Student['priority']> })}
                          className="w-full min-w-0 bg-transparent text-sm font-semibold text-[#00319D] focus-visible:outline-ha-blue cursor-pointer"
                        >
                          <option>Urgent</option>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </LeadFieldSelect>
                      </label>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div role="tablist" aria-label="Lead records" className="lead-record-tabs mt-2 flex gap-3" onKeyDown={event => {
              const tabs = Array.from(event.currentTarget.querySelectorAll('button'));
              const index = tabs.indexOf(event.target as HTMLButtonElement);
              const next = { ArrowLeft: (index + 2) % 3, ArrowRight: (index + 1) % 3, Home: 0, End: 2 }[event.key];
              if (next === undefined) return;
              event.preventDefault();
              tabs[next].focus();
              tabs[next].click();
            }}>
              {([['timeline', 'Activity', studentActivities.length], ['bookings', 'Bookings', studentBookings.length], ['payments', 'Payments', studentPayments.length]] as const).map(([id, label, count]) =>
                <button key={id} id={`lead-tab-${id}`} role="tab" aria-controls="lead-tab-panel" aria-selected={activeTab === id}
                  tabIndex={activeTab === id ? 0 : -1} onClick={() => setActiveTab(id)}>{label} ({count})</button>)}
            </div>
          </div>

          {/* Drawer Body */}
          <div role="tabpanel" id="lead-tab-panel" aria-labelledby={`lead-tab-${activeTab}`} className="ha-drawer-body flex-1 overflow-y-auto p-6 space-y-6">

            {/* ========================================================= */}
            {/* TAB: PROPERTY BOOKINGS */}
            {/* ========================================================= */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-4 w-4 text-[#00319D]" />
                      Bookings
                    </h3>
                    <p className="text-xs text-[#6B6860] mt-0.5">
                      {studentBookings.length} {studentBookings.length === 1 ? 'booking' : 'bookings'}
                    </p>
                  </div>
                  {!showBookingForm && <button type="button" className="ha-primary-action" onClick={() => { setBookingFormError(null); setShowBookingForm(true); }}><Plus size={16} aria-hidden="true" /> Add booking</button>}
                </div>

                {/* Form: Record or Edit Property Booking */}
                {showBookingForm && (
                  <div className="rounded-xl border border-[#00319D] bg-[#FFFFFF] p-5 shadow-sm space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#00319D]" />
                        <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                          {editingBookingId ? 'Edit Property Booking Record' : 'Record Property Booking'}
                        </h4>
                      </div>
                    </div>

                    <form className="space-y-4" onChange={() => setBookingDirty(true)} onSubmit={async (event) => {
                      event.preventDefault();
                      if (savingBooking.current) return;
                      savingBooking.current = true;
                      setBookingSaving(true);
                      try {
                        await handleSaveBooking(event);
                      } catch {
                        setBookingFormError('Booking could not be saved. Your changes are still here. Try again.');
                      } finally {
                        savingBooking.current = false;
                        setBookingSaving(false);
                      }
                    }}>
                      {bookingFormError && (
                        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                          <span>{bookingFormError}</span>
                        </div>
                      )}

                      {/* Property Details */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-[#00319D] uppercase tracking-wider">
                          1. Accommodation &amp; Property Details
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lead-detail-grid-2 gap-3">
                          <div>
                            <label htmlFor="studentdetaildrawer-booking-property-name" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Property Name *
                            </label>
                            <input
                              id="studentdetaildrawer-booking-property-name"
                              type="text"
                              required
                              value={bookingPropertyName}
                              onChange={(e) => setBookingPropertyName(e.target.value)}
                              placeholder="e.g. Scape Mile End, Vita Circle Square"
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-reference" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Booking Reference (Optional)
                            </label>
                            <input
                              id="studentdetaildrawer-booking-reference"
                              type="text"
                              value={bookingReference}
                              onChange={(e) => setBookingReference(e.target.value)}
                              placeholder="e.g. SCP-LON-99214"
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="studentdetaildrawer-booking-property-address" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                            Property Address *
                          </label>
                          <input
                            id="studentdetaildrawer-booking-property-address"
                            type="text"
                            required
                            value={bookingPropertyAddress}
                            onChange={(e) => setBookingPropertyAddress(e.target.value)}
                            placeholder="Full address, building number, street, city, postal code"
                            className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                          />
                        </div>
                      </div>

                      {/* Rent & Deposit with Independent Currencies */}
                      <div className="space-y-3 pt-2 border-t border-[#E8E6E1]">
                        <div className="text-xs font-bold text-[#00319D] uppercase tracking-wider">
                          2. Rent &amp; Deposit Financials
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 lead-detail-grid-3 gap-3">
                          <div>
                            <label htmlFor="studentdetaildrawer-booking-rent-amount" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Rent Amount *
                            </label>
                            <input
                              id="studentdetaildrawer-booking-rent-amount"
                              type="number"
                              step="any"
                              required
                              value={bookingRentAmount}
                              onChange={(e) => handleRentAmountChange(e.target.value)}
                              placeholder="e.g. 325"
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-rent-frequency" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Rent Frequency *
                            </label>
                            <select
                              id="studentdetaildrawer-booking-rent-frequency"
                              value={bookingRentFrequency}
                              onChange={(e) => setBookingRentFrequency(e.target.value as RentFrequency)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                              <option value="entire contract">Entire Contract</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-rent-currency" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Rent Currency *
                            </label>
                            <select
                              id="studentdetaildrawer-booking-rent-currency"
                              value={bookingRentCurrency}
                              onChange={(e) => {
                                const c = e.target.value as SupportedCurrency;
                                setBookingRentCurrency(c);
                                setBookingCommissionableCurrency(c);
                              }}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            >
                              {currencies.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lead-detail-grid-2 gap-3">
                          <div>
                            <label htmlFor="studentdetaildrawer-booking-deposit-amount" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Deposit Amount (Allows 0)
                            </label>
                            <input
                              id="studentdetaildrawer-booking-deposit-amount"
                              type="number"
                              step="any"
                              value={bookingDepositAmount}
                              onChange={(e) => setBookingDepositAmount(e.target.value)}
                              placeholder="0 if no deposit applies"
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-deposit-currency" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Deposit Currency (Independent)
                            </label>
                            <select
                              id="studentdetaildrawer-booking-deposit-currency"
                              value={bookingDepositCurrency}
                              onChange={(e) => setBookingDepositCurrency(e.target.value as SupportedCurrency)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            >
                              {currencies.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 lead-detail-grid-3 gap-3">
                          <div>
                            <label htmlFor="studentdetaildrawer-booking-tenancy-start-date" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Tenancy Start Date *
                            </label>
                            <input
                              id="studentdetaildrawer-booking-tenancy-start-date"
                              type="date"
                              required
                              value={bookingTenancyStartDate}
                              onChange={(e) => setBookingTenancyStartDate(e.target.value)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-tenancy-end-date" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Tenancy End Date *
                            </label>
                            <input
                              id="studentdetaildrawer-booking-tenancy-end-date"
                              type="date"
                              required
                              value={bookingTenancyEndDate}
                              onChange={(e) => setBookingTenancyEndDate(e.target.value)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-status" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Booking Status *
                            </label>
                            <select
                              id="studentdetaildrawer-booking-status"
                              value={bookingStatus}
                              onChange={(e) => setBookingStatus(e.target.value as any)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            >
                              <option value="Confirmed">Confirmed</option>
                              <option value="Pending Confirmation">Pending Confirmation</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Dedicated Expected Revenue Section */}
                      <div className="rounded-xl border border-[#FCC20A] bg-[#F7F6F3] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-[#00319D]" />
                            <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">
                              Expected Revenue &amp; Partnership Commission
                            </span>
                          </div>
                          <span className="text-xs bg-[#FFFFFF] text-[#00319D] px-2 py-0.5 rounded border border-[#E8E6E1] font-semibold">
                            Contractual Basis
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 lead-detail-grid-3 gap-3">
                          <div>
                            <label htmlFor="studentdetaildrawer-booking-commission-rate" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Commission Rate (%) *
                            </label>
                            <div className="relative">
                              <input
                                id="studentdetaildrawer-booking-commission-rate"
                                type="number"
                                step="any"
                                required
                                value={bookingCommissionRate}
                                onChange={(e) => setBookingCommissionRate(e.target.value)}
                                placeholder="e.g. 15"
                                className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                              />
                              <span className="absolute right-3 top-1.5 text-xs text-[#6B6860]">%</span>
                            </div>
                            <span className="text-xs text-[#6B6860] mt-0.5 block">
                              Partner rate: {defaultPartnerRate}%
                            </span>
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-commissionable-amount" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Commissionable Amount *
                            </label>
                            <input
                              id="studentdetaildrawer-booking-commissionable-amount"
                              type="number"
                              step="any"
                              required
                              value={bookingCommissionableAmount}
                              onChange={(e) => setBookingCommissionableAmount(e.target.value)}
                              placeholder="Total contract or monthly basis"
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            />
                            <span className="text-xs text-[#6B6860] mt-0.5 block">
                              Contractual rent base
                            </span>
                          </div>

                          <div>
                            <label htmlFor="studentdetaildrawer-booking-commissionable-currency" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                              Commission Currency
                            </label>
                            <select
                              id="studentdetaildrawer-booking-commissionable-currency"
                              value={bookingCommissionableCurrency}
                              onChange={(e) => setBookingCommissionableCurrency(e.target.value as SupportedCurrency)}
                              className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                            >
                              {currencies.map((c) => (
                                <option key={c.code} value={c.code}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Automatic Expected Revenue Calculation Box */}
                        <div className="rounded-lg bg-[#FFFFFF] border border-[#E8E6E1] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">
                              Primary Metric
                            </span>
                            <h5 className="text-sm font-extrabold text-[#1A1A1A]">Expected Revenue</h5>
                          </div>

                          <div className="text-right">
                            {calculatedExpectedRevenue !== null ? (
                              <div className="flex items-baseline gap-1.5 sm:justify-end">
                                <span className="text-lg sm:text-xl font-extrabold text-[#00319D]">
                                  {CURRENCY_SYMBOLS[bookingCommissionableCurrency] || bookingCommissionableCurrency}{' '}
                                  {calculatedExpectedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs text-[#6B6860] font-medium">
                                  ({bookingCommissionRate}% of {bookingCommissionableAmount})
                                </span>
                              </div>
                            ) : (
                              <div className="text-xs text-[#6B6860] italic flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-[#FCC20A]" />
                                Complete rate and commissionable amount to calculate revenue
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="studentdetaildrawer-booking-notes" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                          Booking Notes &amp; Special Stipulations
                        </label>
                        <textarea
                          id="studentdetaildrawer-booking-notes"
                          rows={2}
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          placeholder="e.g. Dual-occupancy agreement, guarantor deed signed, move-in code requested..."
                          className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E6E1]">
                        <button
                          type="button"
                          disabled={bookingSaving}
                          onClick={() => {
                            if (bookingDirty && !window.confirm('Discard unsaved booking details?')) return;
                            setShowBookingForm(false);
                            setEditingBookingId(null);
                            setBookingDirty(false);
                          }}
                          className="rounded-lg border border-[#E8E6E1] px-3.5 py-2 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={bookingSaving}
                          className="rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] shadow-xs transition-colors"
                        >
                          {bookingSaving ? 'Saving…' : editingBookingId ? 'Save changes' : 'Record booking'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Structured List of Bookings */}
                <div className="space-y-4">
                  {!showBookingForm && studentBookings.length === 0 && <div className="ha-empty-state"><Building size={24} aria-hidden="true" /><strong>No bookings yet</strong><p>Recorded accommodation bookings will appear here.</p></div>}
                  {studentBookings.map((b) => {
                    const bookingPayments = payments.filter((p) => p.bookingId === b.bookingId);
                    const totalPaidAmount = bookingPayments
                      .filter((p) => p.paymentStatus === 'Verified')
                      .reduce((sum, p) => sum + p.amount, 0);

                    return (
                      <div
                        key={b.bookingId || b.id}
                        className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs space-y-4 hover:border-[#00319D]/30 transition-all"
                      >
                        {/* Header & Status */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-[#E8E6E1]">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#00319D] bg-[#F7F6F3] border border-[#E8E6E1] px-2 py-0.5 rounded">
                                {b.bookingId}
                              </span>
                              {b.bookingReference && (
                                <span className="text-xs text-[#6B6860] font-mono bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#E8E6E1]">
                                  Ref: {b.bookingReference}
                                </span>
                              )}
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                                  b.bookingStatus === 'Confirmed'
                                    ? 'bg-[#00319D]/10 text-[#00319D] border-[#00319D]/30'
                                    : b.bookingStatus === 'Cancelled'
                                    ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] border-[#E8E6E1]'
                                    : 'bg-[#FCC20A]/20 text-[#1A1A1A] border-[#FCC20A]'
                                }`}
                              >
                                {b.bookingStatus}
                              </span>
                            </div>

                            <h4 className="text-base font-extrabold text-[#1A1A1A] mt-1.5 flex items-center gap-1.5">
                              <Building className="h-4 w-4 text-[#00319D]" />
                              {b.propertyName}
                            </h4>
                            <p className="text-xs text-[#6B6860] flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {b.propertyAddress}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 self-end sm:self-start">
                            <button
                              disabled={bookingSaving} onClick={() => { if (!bookingDirty || window.confirm('Discard unsaved booking details?')) handleStartEditBooking(b); }}
                              className="flex items-center gap-1 rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors"
                            >
                              <Edit2 className="h-3 w-3 text-[#00319D]" />
                              Edit
                            </button>
                            {b.bookingStatus !== 'Cancelled' && (
                              <button
                                onClick={() => handleCancelBookingRecord(b.bookingId)}
                                className="flex items-center gap-1 rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-1 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors"
                              >
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 lead-detail-grid-4 gap-3 bg-[#F7F6F3] p-3.5 rounded-lg border border-[#E8E6E1]">
                          <div>
                            <span className="text-xs font-bold text-[#6B6860] uppercase tracking-wider block">
                              Rent &amp; Frequency
                            </span>
                            <span className="text-sm font-extrabold text-[#1A1A1A]">
                              {CURRENCY_SYMBOLS[b.rentCurrency] || b.rentCurrency} {b.rentAmount?.toLocaleString()}
                            </span>
                            <span className="text-xs text-[#6B6860] block capitalize">
                              per {b.rentFrequency}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-[#6B6860] uppercase tracking-wider block">
                              Deposit
                            </span>
                            <span className="text-sm font-extrabold text-[#1A1A1A]">
                              {b.depositAmount > 0
                                ? `${CURRENCY_SYMBOLS[b.depositCurrency] || b.depositCurrency} ${b.depositAmount?.toLocaleString()}`
                                : 'No Deposit'}
                            </span>
                            <span className="text-xs text-[#6B6860] block">
                              {b.depositAmount > 0 ? 'Refundable holding' : 'Zero deposit lease'}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-bold text-[#6B6860] uppercase tracking-wider block">
                              Tenancy Period
                            </span>
                            <span className="text-xs font-bold text-[#1A1A1A] block">
                              {b.tenancyStartDate}
                            </span>
                            <span className="text-xs text-[#6B6860] block">
                              to {b.tenancyEndDate}
                            </span>
                          </div>

                          <div className="border-l border-[#E8E6E1] pl-3">
                            <span className="text-xs font-bold text-[#00319D] uppercase tracking-wider block">
                              Expected Revenue
                            </span>
                            <span className="text-sm font-extrabold text-[#00319D]">
                              {CURRENCY_SYMBOLS[b.commissionableCurrency || b.rentCurrency] || b.commissionableCurrency}{' '}
                              {(b.expectedRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-[#6B6860] block">
                              {b.commissionRate}% of {(b.commissionableAmount || b.rentAmount)?.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Associated Payments Summary */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-[#E8E6E1]">
                          <div className="flex items-center gap-3 text-[#6B6860]">
                            <span>
                              Associated Payments: <strong className="text-[#1A1A1A]">{bookingPayments.length}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Verified Payments: <strong className="text-[#00319D]">{CURRENCY_SYMBOLS[b.rentCurrency] || b.rentCurrency} {totalPaidAmount.toLocaleString()}</strong>
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setPaymentAssociatedBookingId(b.bookingId);
                              setActiveTab('payments');
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-[#00319D] hover:underline"
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Record Payment for this Booking &rarr;
                          </button>
                        </div>

                        {b.notes && (
                          <p className="text-xs bg-[#F7F6F3] p-2 rounded-lg text-[#6B6860] italic">
                            &quot;{b.notes}&quot;
                          </p>
                        )}

                        {/* Audit Footer */}
                        <div className="text-xs text-[#6B6860] pt-2 border-t border-[#E8E6E1] flex flex-wrap justify-between gap-1">
                          <span>Created by: <strong className="text-[#1A1A1A]">{b.createdBy}</strong> ({b.createdAt})</span>
                          {b.updatedBy && (
                            <span>Updated by: <strong className="text-[#1A1A1A]">{b.updatedBy}</strong> ({b.updatedAt})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {studentBookings.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#E8E6E1] p-8 text-center text-xs text-[#6B6860] space-y-2">
                      <Building className="h-8 w-8 text-[#6B6860]/40 mx-auto" />
                      <p className="font-semibold text-[#1A1A1A]">No property bookings recorded yet.</p>
                      <p>Record accommodation property details, rent, deposit, and agreed expected revenue above.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: PAYMENTS & PROOF UPLOADS */}
            {/* ========================================================= */}
            {activeTab === 'payments' && (
              <div className="space-y-6">
                {/* Upload Terminal: Record Payment Transaction */}
                <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-5 shadow-xs">
                  <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Upload className="h-4 w-4 text-[#00319D]" />
                    Record Payment Transaction
                  </h4>

                  <form onSubmit={handleUploadPayment} onChange={() => setPaymentDirty(true)} className="space-y-4">
                    {paymentUploadError && (
                      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                        <span>{paymentUploadError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 lead-detail-grid-3 gap-3">
                      <div>
                        <label htmlFor="studentdetaildrawer-payment-amount" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                          Amount *
                        </label>
                        <input
                          id="studentdetaildrawer-payment-amount"
                          type="number"
                          step="any"
                          required
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="e.g. 250"
                          className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                        />
                      </div>

                      <div>
                        <label htmlFor="studentdetaildrawer-payment-currency" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                          Currency
                        </label>
                        <select
                          id="studentdetaildrawer-payment-currency"
                          value={paymentCurrency}
                          onChange={(e) => setPaymentCurrency(e.target.value as SupportedCurrency)}
                          className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                        >
                          {currencies.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="studentdetaildrawer-payment-method" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                          Payment Method
                        </label>
                        <select
                          id="studentdetaildrawer-payment-method"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value as any)}
                          className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                        >
                          <option value="Bank Transfer">Bank Wire Transfer</option>
                          <option value="Credit Card">Credit / Debit Card</option>
                          <option value="Online Gateway">Online Gateway (Stripe/Flywire)</option>
                          <option value="Direct Debit">Direct Debit</option>
                          <option value="UPI">International Transfer (UPI/Wire)</option>
                        </select>
                      </div>
                    </div>

                    {/* Associated Booking Dropdown */}
                    <div>
                      <label htmlFor="studentdetaildrawer-payment-associated-booking-id" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                        Associated Property Booking
                      </label>
                      <select
                        id="studentdetaildrawer-payment-associated-booking-id"
                        value={paymentAssociatedBookingId}
                        onChange={(e) => setPaymentAssociatedBookingId(e.target.value)}
                        className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                      >
                        <option value="">General Holding Deposit / Advance Reservation</option>
                        {studentBookings.map((b) => (
                          <option key={b.bookingId} value={b.bookingId}>
                            {b.bookingId}: {b.propertyName} ({CURRENCY_SYMBOLS[b.rentCurrency] || b.rentCurrency} {b.rentAmount}/{b.rentFrequency})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PAYMENT PROOF SECTION */}
                    <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">
                            Payment Proof *
                          </label>
                          <span className="text-xs text-[#6B6860]">
                            Attach bank transfer receipt, wire confirmation, or transaction screenshot (JPG, PNG, WEBP, PDF).
                          </span>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider bg-[#00319D]/10 text-[#00319D] px-2 py-0.5 rounded">
                          Mandatory
                        </span>
                      </div>

                      {/* Drag & Drop Zone */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          handleFileDrop(e.dataTransfer.files);
                        }}
                        className={`rounded-lg border-2 border-dashed p-4 text-center transition-all ${
                          isDragOver
                            ? 'border-[#00319D] bg-[#00319D]/5'
                            : 'border-[#E8E6E1] bg-[#F7F6F3] hover:border-[#00319D]/50'
                        }`}
                      >
                        <Upload className="h-6 w-6 text-[#00319D] mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-[#1A1A1A]">
                          Drag &amp; drop proof files here, or{' '}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[#00319D] hover:underline font-bold"
                          >
                            Browse Files
                          </button>
                        </p>
                        <p className="text-xs text-[#6B6860] mt-1">
                          Supports multiple attachments: JPG, JPEG, PNG, WEBP, and PDF documents.
                        </p>

                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          onChange={(e) => handleFileDrop(e.target.files)}
                          className="hidden"
                        />
                      </div>

                      {/* Attached Previews before submission */}
                      {filePreviews.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-xs font-bold text-[#1A1A1A] block">
                            Ready to upload ({filePreviews.length}):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lead-detail-grid-2 gap-2">
                            {filePreviews.map((preview, idx) => {
                              const isPdf = preview.type.includes('pdf') || preview.name.endsWith('.pdf');
                              return (
                                <div
                                  key={preview.id}
                                  className="flex items-center justify-between p-2 rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {preview.previewUrl ? (
                                      /* eslint-disable-next-line @next/next/no-img-element */
                                      <img
                                        src={preview.previewUrl}
                                        alt=""
                                        className="h-8 w-8 rounded object-cover border border-[#E8E6E1] shrink-0"
                                      />
                                    ) : isPdf ? (
                                      <File className="h-6 w-6 text-[#00319D] shrink-0" />
                                    ) : (
                                      <ImageIcon className="h-6 w-6 text-[#00319D] shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-[#1A1A1A] truncate" title={preview.name}>
                                        {preview.name}
                                      </p>
                                      <p className="text-xs text-[#6B6860]">
                                        {formatFileSize(preview.size)}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFile(idx)}
                                    className="rounded p-1 text-[#6B6860] hover:text-red-600 hover:bg-[#FFFFFF] transition-colors"
                                    title="Remove attachment"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Management Bypass Option if Proof Cannot be Obtained */}
                      <div className="pt-2 border-t border-[#E8E6E1]">
                        {isManagementUser ? (
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1A1A1A]">
                              <input
                                type="checkbox"
                                checked={allowBypassProof}
                                onChange={(e) => setAllowBypassProof(e.target.checked)}
                                className="rounded border-[#E8E6E1] text-[#00319D] focus:ring-[#00319D]"
                              />
                              <span>Bypass Proof Requirement (Management Authorization)</span>
                            </label>

                            {allowBypassProof && (
                              <div className="rounded-lg bg-[#FCC20A]/10 border border-[#FCC20A] p-2.5 space-y-1.5 animate-in fade-in">
                                <label htmlFor="studentdetaildrawer-bypass-reason" className="block text-xs font-bold text-[#1A1A1A]">
                                  Reason for Proof Exception (Logged in Audit Trail) *
                                </label>
                                <textarea
                                  id="studentdetaildrawer-bypass-reason"
                                  rows={2}
                                  required={allowBypassProof}
                                  value={bypassReason}
                                  onChange={(e) => setBypassReason(e.target.value)}
                                  placeholder="e.g. Bank wire swift copy pending release from remitting foreign exchange branch, authorized by Management."
                                  className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] p-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#6B6860]">
                            Note: If proof is unavailable, an authorized Management user can record an exception with an audited reason.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="studentdetaildrawer-payment-remarks" className="block text-xs font-bold text-[#1A1A1A] mb-1">
                        Remarks / Transaction Reference
                      </label>
                      <input
                        id="studentdetaildrawer-payment-remarks"
                        type="text"
                        value={paymentRemarks}
                        onChange={(e) => setPaymentRemarks(e.target.value)}
                        placeholder="e.g. Holding deposit transaction ID: BARC-99824"
                        className="w-full rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUploadingPayment}
                      className="w-full rounded-lg bg-[#00319D] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isUploadingPayment ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Uploading Proofs &amp; Recording Transaction...</span>
                        </>
                      ) : (
                        <span>Record Payment &amp; Trigger Audit Verification</span>
                      )}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-[#00319D]" />
                    Payment Transactions &amp; Proofs
                  </h3>
                  <p className="text-xs text-[#6B6860] mt-0.5">
                    Audited ledger of reservation payments, holding deposits, and receipts for {student.fullName}.
                  </p>
                </div>

                {/* List of Payments */}
                <div className="space-y-4">
                  {studentPayments.map((pmt) => (
                    <div
                      key={pmt.paymentId || pmt.id}
                      className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#1A1A1A]">{pmt.paymentId}</span>
                            {pmt.bookingId && (
                              <span className="font-mono text-xs text-[#00319D] bg-[#F7F6F3] px-1.5 py-0.5 rounded border border-[#E8E6E1]">
                                Booking: {pmt.bookingId}
                              </span>
                            )}
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                                pmt.paymentStatus === 'Verified'
                                  ? 'bg-[#00319D]/10 text-[#00319D] border-[#00319D]/30'
                                  : pmt.paymentStatus === 'Rejected'
                                  ? 'bg-[#1A1A1A]/5 text-[#1A1A1A] border-[#E8E6E1]'
                                  : 'bg-[#FCC20A]/20 text-[#1A1A1A] border-[#FCC20A]'
                              }`}
                            >
                              {pmt.paymentStatus}
                            </span>
                          </div>

                          <p className="text-lg font-bold text-[#1A1A1A] mt-1">
                            {CURRENCY_SYMBOLS[pmt.currency] || pmt.currency} {pmt.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-[#6B6860] mt-0.5">
                            Method: {pmt.paymentMethod} • Date: {pmt.paymentDate}
                          </p>
                        </div>
                      </div>

                      {/* Payment Proof Attachments List */}
                      {pmt.attachments && pmt.attachments.length > 0 && (
                        <div className="rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] p-3 space-y-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#00319D] block">
                            Attached Payment Proofs ({pmt.attachments.length})
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lead-detail-grid-2 gap-2">
                            {pmt.attachments.map((att) => {
                              const isPdf = att.fileType.includes('pdf') || att.fileName.toLowerCase().endsWith('.pdf');
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#FFFFFF] border border-[#E8E6E1] text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {isPdf ? (
                                      <File className="h-4 w-4 text-[#00319D] shrink-0" />
                                    ) : (
                                      <ImageIcon className="h-4 w-4 text-[#00319D] shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-[#1A1A1A] truncate" title={att.fileName}>
                                        {att.fileName}
                                      </p>
                                      <p className="text-xs text-[#6B6860]">
                                        {formatFileSize(att.fileSize)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewAttachment(att)}
                                      className="rounded p-1 text-[#00319D] hover:bg-[#F7F6F3] transition-colors"
                                      title="Preview Proof"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <a
                                      href={att.fileUrl}
                                      download={att.fileName}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] transition-colors"
                                      title="Download Proof"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Management Proof Bypass Notice */}
                      {pmt.proofBypassReason && (
                        <div className="rounded-lg border border-[#FCC20A] bg-[#FCC20A]/10 p-2.5 text-xs text-[#1A1A1A] flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-[#00319D] shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              Payment Proof Requirement Bypassed by Management:
                            </span>
                            <span className="text-[#6B6860]">
                              &quot;{pmt.proofBypassReason}&quot;
                            </span>
                            {pmt.proofBypassedBy && (
                              <span className="text-xs text-[#6B6860] block mt-0.5">
                                Authorized by: {pmt.proofBypassedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#E8E6E1] text-xs text-[#6B6860] flex flex-wrap justify-between gap-1">
                        <span>Uploaded by: <strong className="text-[#1A1A1A]">{pmt.uploadedBy}</strong> ({pmt.uploadedTimestamp})</span>
                        {pmt.verifiedBy && (
                          <span className="text-[#00319D] font-semibold">
                            Verified by: {pmt.verifiedBy} ({pmt.verificationTimestamp})
                          </span>
                        )}
                      </div>

                      {pmt.remarks && (
                        <p className="text-xs bg-[#F7F6F3] p-2 rounded-lg text-[#6B6860] italic">
                          &quot;{pmt.remarks}&quot;
                        </p>
                      )}
                    </div>
                  ))}

                  {studentPayments.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#E8E6E1] p-6 text-center text-xs text-[#6B6860]">
                      No payments submitted yet for this student record.
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ========================================================= */}
            {/* TAB: AUDIT TIMELINE */}
            {/* ========================================================= */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="lead-activity-title flex items-center gap-1.5 text-sm font-bold text-ha-ink">
                    <Clock className="h-4 w-4 text-ha-blue" aria-hidden="true" />
                    Activity timeline<span className="lead-desktop-metadata"> ({studentActivities.length})</span>
                  </h3>
                  <span className="lead-desktop-metadata rounded border border-ha-line bg-ha-canvas px-2 py-0.5 text-xs text-ha-secondary">
                    ABAC Log Guard Active
                  </span>
                </div>

                <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3.5 text-xs text-[#1A1A1A]">
                  <span className="font-bold block mb-1">Lead Requirement Notes</span>
                  <p className="text-[#6B6860] whitespace-pre-wrap">{student.notes || 'No preliminary notes recorded.'}</p>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:bottom-0 before:top-2 before:left-2.5 before:w-0.5 before:bg-[#E8E6E1]">
                  {studentActivities.map((act) => (
                    <div key={act.id || act.activityId} className="relative group">
                      <div className="absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-[#FFFFFF] bg-[#00319D] shadow-xs" />
                      <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-3 text-xs shadow-2xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A1A1A]">{act.activityType}</span>
                          <span className="text-xs text-[#6B6860]">{act.timestamp}</span>
                        </div>
                        <p className="text-[#6B6860]">{act.description}</p>
                        {act.oldValue && act.newValue && (
                          <div className="flex items-center gap-1.5 pt-1 text-xs">
                            <span className="rounded bg-[#F7F6F3] border border-[#E8E6E1] px-2 py-0.5 text-[#6B6860]">
                              {act.oldValue}
                            </span>
                            <span className="text-[#6B6860] font-bold">→</span>
                            <span className="rounded bg-[#00319D]/10 border border-[#00319D]/20 px-2 py-0.5 font-bold text-[#00319D]">
                              {act.newValue}
                            </span>
                          </div>
                        )}
                        <div className="pt-1 text-xs text-[#6B6860] flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          <span>Logged by: <strong className="text-[#1A1A1A]">{act.performedBy.name}</strong> ({act.performedBy.role})</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {studentActivities.length === 0 && (
                    <p className="text-xs text-[#6B6860] italic">No historical activities found.</p>
                  )}
                </div>

                <form onSubmit={handleAddNote} className="relative space-y-2">
                  <label htmlFor="activity-note" className="sr-only">Add activity note</label>
                  <textarea
                    id="activity-note"
                    rows={2}
                    value={newNote}
                    disabled={noteSaving}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about this lead..."
                    className="w-full resize-none overflow-hidden rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] p-3 text-xs text-[#1A1A1A] placeholder:text-[#6B6860] focus:outline-none focus:border-[#00319D]"
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                  />
                  <button
                    type="submit"
                    disabled={noteSaving || !newNote.trim()}
                    className="rounded-lg bg-[#00319D] px-3 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
                  >
                    {noteSaving ? 'Saving…' : 'Add note'}
                  </button>
                  {noteError && <p role="alert" className="text-xs text-rose-700">{noteError}</p>}
                </form>
              </div>
            )}


          </div>
        </div>
      </div>

    </LeadDetailSurface>

      {cancelBookingId && <ConfirmActionDialog title="Cancel booking?" description="The booking will remain in the ledger with a Cancelled status. Its audit history will be retained." action="Cancel booking" onClose={() => setCancelBookingId(null)} onConfirm={() => updatePropertyBooking(cancelBookingId, { bookingStatus: 'Cancelled' })} />}

      {/* ========================================================= */}
      {editingLeadId === student.studentId && (
        <LeadDetailsDialog title="Edit lead details" lead={student} onClose={() => setEditingLeadId(null)}
          onSave={(details) => editLeadDetails(student.studentId, details)} />
      )}

      {archivingLeadId === student.studentId && (
        <WorkspaceDialog label="Archive lead" onDismiss={() => { if (!archiveSaving) closeArchive(); }}>
          <form className="w-full max-w-md space-y-4 p-5" onSubmit={async (event) => {
            event.preventDefault();
            if (archiveSaving || !archiveReason.trim()) return;
            setArchiveSaving(true);
            setArchiveError('');
            try {
              await archiveLead(student.studentId, archiveReason);
              setArchivingLeadId(null);
              onClose();
            } catch (cause) {
              setArchiveError(cause instanceof Error ? cause.message : 'Could not archive this lead.');
            } finally {
              setArchiveSaving(false);
            }
          }}>
            <h2 className="text-lg font-semibold">Archive {student.fullName}</h2>
            <p className="text-sm text-ha-secondary">This lead becomes inactive and moves to the management data archive.</p>
            <label className="block text-sm font-medium">Reason for archival
              <textarea value={archiveReason} onChange={(event) => setArchiveReason(event.target.value)}
                maxLength={500} rows={4} required className="mt-1 w-full rounded-lg border border-ha-line p-2" />
            </label>
            {archiveError && <p role="alert" className="text-sm text-rose-700">{archiveError}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={archiveSaving} onClick={closeArchive}>Cancel</button>
              <button type="submit" className="ha-primary-action" disabled={archiveSaving}>{archiveSaving ? 'Archiving…' : 'Archive lead'}</button>
            </div>
          </form>
        </WorkspaceDialog>
      )}

      {/* ATTACHMENT PREVIEW MODAL */}
      {/* ========================================================= */}
      {previewAttachment && (
        <WorkspaceDialog label="Attachment preview" onDismiss={() => setPreviewAttachment(null)}>
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#FFFFFF] border border-[#E8E6E1] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#E8E6E1] p-4 bg-[#F7F6F3]">
              <div className="flex items-center gap-2 min-w-0">
                {previewAttachment.fileType.includes('pdf') ? (
                  <File className="h-5 w-5 text-[#00319D] shrink-0" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-[#00319D] shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#1A1A1A] truncate" title={previewAttachment.fileName}>
                    {previewAttachment.fileName}
                  </h4>
                  <p className="text-xs text-[#6B6860]">
                    {formatFileSize(previewAttachment.fileSize)} • Uploaded by {previewAttachment.uploadedBy} on {previewAttachment.uploadedTimestamp}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewAttachment.fileUrl}
                  download={previewAttachment.fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] shadow-xs transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  aria-label="Close dialog"
                  onClick={() => setPreviewAttachment(null)}
                  className="rounded-lg p-1.5 text-[#6B6860] hover:bg-[#E8E6E1] hover:text-[#1A1A1A] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-[#F7F6F3]">
              {previewAttachment.fileType.includes('pdf') || previewAttachment.fileName.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-[65vh] flex flex-col items-center justify-center rounded-xl bg-[#FFFFFF] border border-[#E8E6E1] p-4 text-center space-y-3">
                  <File className="h-12 w-12 text-[#00319D]" />
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">{previewAttachment.fileName}</p>
                    <p className="text-xs text-[#6B6860] mt-1">
                      Portable Document Format (PDF) • {formatFileSize(previewAttachment.fileSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewAttachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] shadow-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open PDF Document in Browser
                    </a>
                    <a
                      href={previewAttachment.fileUrl}
                      download={previewAttachment.fileName}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F6F3]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download File
                    </a>
                  </div>
                  <iframe
                    src={previewAttachment.fileUrl}
                    className="w-full h-[45vh] rounded-lg border border-[#E8E6E1] mt-2"
                    title={previewAttachment.fileName}
                  />
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewAttachment.fileUrl}
                  alt={previewAttachment.fileName}
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
                />
              )}
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </>
  );
}
