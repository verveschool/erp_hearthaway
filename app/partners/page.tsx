'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useHearthAway } from '@/lib/context';
import { Partner, Student } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';
import {
  Users,
  Building,
  Upload,
  Download,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  ChevronRight,
  Layers,
  Phone,
  Mail,
  UserCheck,
  RefreshCw,
  X,
  FileSpreadsheet,
  Check,
  MapPin,
  FileCheck,
  Calendar,
  Grid,
  List,
  Shield,
  FileCode,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function PartnersPage() {
  const {
    currentUser,
    partners,
    students,
    availableUsers,
    reassignPartnerPortfolioOwner,
    bulkImportPartnerLeads,
    submitPartnerLead,
    onboardNewPartner,
    updatePartner,
    deletePartner,
    setSelectedStudentId,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';
  const isPartner = currentUser.role === 'partner';

  // Portfolio Owners list for assignments
  const portfolioOwners = useMemo(() => {
    const uniqueUsers = new Map<string, (typeof availableUsers)[number]>();
    availableUsers
      .filter((u) => u.uid && u.displayName?.trim() && u.role !== 'partner' && u.status !== 'rejected' && u.status !== 'pending' && u.isApproved !== false)
      .forEach((u) => uniqueUsers.set(u.uid, u));
    return Array.from(uniqueUsers.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [availableUsers]);

  // Active Partner context for Partner role
  const activePartnerId = isPartner && currentUser.partnerId ? currentUser.partnerId : 'PART-00482';
  const currentPartnerRecord = partners.find((p) => p.partnerId === activePartnerId) || partners[0];

  // Search, Filter & View state for Partners
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPortfolioOwner, setFilterPortfolioOwner] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterState, setFilterState] = useState('All');
  const [filterCity, setFilterCity] = useState('All');
  const [filterAgreement, setFilterAgreement] = useState('All');
  const [viewMode, setViewMode] = useState<'directory' | 'bifurcated'>('bifurcated');

  // Selected partner for inspecting their leads
  const [inspectPartnerId, setInspectPartnerId] = useState<string | null>(null);

  // Modals state
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardingPartner, setOnboardingPartner] = useState<Partner | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [showSingleLeadModal, setShowSingleLeadModal] = useState(false);
  const [reassignPartnerTarget, setReassignPartnerTarget] = useState<Partner | null>(null);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');

  // Agreement Modal state
  const [selectedAgreementPartner, setSelectedAgreementPartner] = useState<Partner | null>(null);
  const [agreementStatus, setAgreementStatus] = useState<string>('Active');
  const [agreementType, setAgreementType] = useState<string>('Master Services Agreement (MSA)');
  const [agreementSignedDate, setAgreementSignedDate] = useState<string>('');
  const [agreementExpiryDate, setAgreementExpiryDate] = useState<string>('');
  const [agreementTerms, setAgreementTerms] = useState<string>('');
  const [agreementDocName, setAgreementDocName] = useState<string>('');
  const [agreementLogoUrl, setAgreementLogoUrl] = useState<string>('');
  const [agreementSaved, setAgreementSaved] = useState<boolean>(false);
  const [agreementSaving, setAgreementSaving] = useState<boolean>(false);
  const [agreementError, setAgreementError] = useState<string>('');
  const agreementFileRef = useRef<HTMLInputElement>(null);
  const agreementLogoRef = useRef<HTMLInputElement>(null);

  // Available unique States & Cities for bifurcation filters
  const availableStates = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.state) set.add(p.state);
    });
    return Array.from(set).sort();
  }, [partners]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    partners.forEach((p) => {
      if (p.city) {
        if (filterState === 'All' || p.state === filterState) {
          set.add(p.city);
        }
      }
    });
    return Array.from(set).sort();
  }, [partners, filterState]);

  // Bulk Upload Workflow State
  // Steps: 1 (Select), 2 (Download template), 3 (Validate), 4 (Preview), 5 (Errors), 6 (Duplicates), 7 (Confirm), 8 (Results)
  const [bulkStep, setBulkStep] = useState<number>(1);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<Array<any>>([]);
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; field: string; message: string }>>([]);
  const [duplicateRows, setDuplicateRows] = useState<Array<{ row: number; email: string; phone: string; reason: string }>>([]);
  const [validRows, setValidRows] = useState<Array<any>>([]);
  const [importResults, setImportResults] = useState<{ importedCount: number; duplicatesCount: number; errorsCount: number } | null>(null);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered partners list
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partnerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.state && p.state.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = filterType === 'All' || p.type === filterType;
      const matchPO = filterPortfolioOwner === 'All' || p.portfolioOwnerId === filterPortfolioOwner;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      const matchState = filterState === 'All' || (p.state || 'Maharashtra') === filterState;
      const matchCity = filterCity === 'All' || (p.city || 'Mumbai') === filterCity;
      const matchAgreement = filterAgreement === 'All' || (p.agreementStatus || 'Active') === filterAgreement;

      return matchSearch && matchType && matchPO && matchStatus && matchState && matchCity && matchAgreement;
    });
  }, [partners, searchQuery, filterType, filterPortfolioOwner, filterStatus, filterState, filterCity, filterAgreement]);

  // Partners grouped by State and City for Bifurcation View
  const partnersByStateAndCity = useMemo(() => {
    const groups: Record<string, Record<string, Partner[]>> = {};

    filteredPartners.forEach((partner) => {
      const stateName = partner.state || 'Maharashtra';
      const cityName = partner.city || 'Mumbai';

      if (!groups[stateName]) {
        groups[stateName] = {};
      }
      if (!groups[stateName][cityName]) {
        groups[stateName][cityName] = [];
      }
      groups[stateName][cityName].push(partner);
    });

    return groups;
  }, [filteredPartners]);

  // Leads for the inspected partner or current partner
  const activeInspectedPartner = inspectPartnerId
    ? partners.find((p) => p.partnerId === inspectPartnerId)
    : currentPartnerRecord;

  const partnerLeads = useMemo(() => {
    const targetId = isPartner ? activePartnerId : activeInspectedPartner?.partnerId;
    return students.filter((s) => s.partnerId === targetId);
  }, [students, isPartner, activePartnerId, activeInspectedPartner]);

  const handleExportPartnerListCSV = () => {
    exportToCSV(
      `hearthaway-partner-list-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Partner ID', accessor: (p) => p.partnerId },
        { header: 'Company Name', accessor: (p) => p.companyName },
        { header: 'Partner Type', accessor: (p) => p.type },
        { header: 'Contact Person', accessor: (p) => p.contactPerson },
        { header: 'Email Address', accessor: (p) => p.email },
        { header: 'Phone Number', accessor: (p) => p.phone },
        { header: 'City', accessor: (p) => p.city },
        { header: 'State', accessor: (p) => p.state },
        { header: 'Country', accessor: (p) => p.country },
        { header: 'Portfolio Owner', accessor: (p) => p.portfolioOwnerName || '' },
        { header: 'Agreement Status', accessor: (p) => p.agreementStatus },
        { header: 'Agreement Type', accessor: (p) => p.agreementType },
        { header: 'Commission Rate (%)', accessor: (p) => `${p.commissionRate}%` },
        { header: 'Onboarding Date', accessor: (p) => p.onboardingDate },
        { header: 'Status', accessor: (p) => p.status },
      ],
      filteredPartners
    );
  };

  const handleExportPartnerLeadsCSV = () => {
    exportToCSV(
      `hearthaway-partner-leads-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Student ID', accessor: (s) => s.studentId },
        { header: 'Full Name', accessor: (s) => s.fullName },
        { header: 'Email', accessor: (s) => s.email },
        { header: 'Phone', accessor: (s) => s.phone },
        { header: 'University', accessor: (s) => s.university },
        { header: 'Destination City', accessor: (s) => s.destinationCity },
        { header: 'Destination Country', accessor: (s) => s.destinationCountry },
        { header: 'Intake', accessor: (s) => s.intake },
        { header: 'Lead Status', accessor: (s) => s.leadStatus },
        { header: 'Booking Status', accessor: (s) => s.bookingStatus },
        { header: 'Sales Owner', accessor: (s) => s.assignedSalesExecutiveName },
        { header: 'Budget', accessor: (s) => `${s.currency || 'GBP'} ${s.budget}` },
        { header: 'Created Date', accessor: (s) => s.createdAt },
      ],
      partnerLeads
    );
  };

  // Onboard New Partner Form State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<any>('Study Abroad Consultant');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('Mumbai');
  const [newState, setNewState] = useState('Maharashtra');
  const [newCountry, setNewCountry] = useState('India');
  const [newAgreementStatus, setNewAgreementStatus] = useState<any>('Active');
  const [newAgreementType, setNewAgreementType] = useState('Master Services Agreement (MSA)');
  const [newAgreementTerms, setNewAgreementTerms] = useState('40% Commission, 120-day payment window');
  const [newPortfolioOwnerId, setNewPortfolioOwnerId] = useState(portfolioOwners[0]?.uid || 'user-po-001');
  const [newCommissionRate, setNewCommissionRate] = useState('40');

  const handleOpenAgreementModal = (partner: Partner) => {
    setSelectedAgreementPartner(partner);
    setAgreementStatus(partner.agreementStatus || 'Active');
    setAgreementType(partner.agreementType || 'Master Services Agreement (MSA)');
    setAgreementSignedDate(partner.agreementSignedDate || partner.onboardingDate || '2026-10-15');
    setAgreementExpiryDate(
      partner.agreementExpiryDate || '2027-10-15'
    );
    setAgreementTerms(partner.agreementTerms || `${partner.commissionRate}% Commission, 120-day payment window`);
    setAgreementDocName(partner.agreementDocumentUrl ? 'Executed_Contract.pdf' : '');
    setAgreementLogoUrl(partner.logoUrl || '');
    setAgreementSaved(false);
    setAgreementError('');
  };

  const handleSaveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreementPartner || agreementSaving) return;

    setAgreementSaving(true);
    setAgreementError('');
    try {
      await updatePartner(selectedAgreementPartner.partnerId, {
        agreementStatus: agreementStatus as any,
        agreementType,
        agreementSignedDate,
        agreementExpiryDate,
        agreementTerms,
        agreementDocumentUrl: agreementDocName || selectedAgreementPartner.agreementDocumentUrl || '',
        logoUrl: agreementLogoUrl || '',
        status: agreementStatus === 'Active' || agreementStatus === 'Signed' ? 'Active' : selectedAgreementPartner.status,
      });

      setAgreementSaved(true);
      setTimeout(() => {
        setAgreementSaved(false);
        setSelectedAgreementPartner(null);
      }, 1500);
    } catch (error) {
      setAgreementError(error instanceof Error ? error.message : 'Unable to save agreement terms. Please try again.');
    } finally {
      setAgreementSaving(false);
    }
  };

  const handleAgreementFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAgreementPartner) return;

    setAgreementDocName(file.name);
    // Keep the selected file in the form until Save is pressed so all agreement fields persist together.
    setAgreementSaved(false);
  };

  const openPartnerOnboarding = (partner: Partner) => {
    setOnboardingPartner(partner);
    setNewCompanyName(partner.companyName);
    setNewPartnerType(partner.type);
    setNewContactPerson(partner.contactPerson);
    setNewEmail(partner.email);
    setNewPhone(partner.phone || '');
    setNewCity(partner.city || 'Mumbai');
    setNewState(partner.state || 'Maharashtra');
    setNewCountry(partner.country || 'India');
    setNewAgreementStatus(partner.agreementStatus || 'Pending Review');
    setNewAgreementType(partner.agreementType || 'Master Services Agreement (MSA)');
    setNewAgreementTerms(partner.agreementTerms || '40% Commission, 120-day payment window');
    setNewCommissionRate(String(partner.commissionRate || 40));
    setNewPortfolioOwnerId(partner.portfolioOwnerId || portfolioOwners[0]?.uid || '');
    setShowOnboardModal(true);
  };

  const handleOnboardPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOnboarding || !newCompanyName || !newEmail || !newContactPerson) return;
    setIsOnboarding(true);

    const chosenPO = portfolioOwners.find((u) => u.uid === newPortfolioOwnerId);
    const randomSeq = String(Math.floor(10000 + Math.random() * 90000));
    const generatedPartnerId = `PART-${randomSeq}`;

    const onboardingData = {
      partnerId: onboardingPartner?.partnerId || generatedPartnerId,
      companyName: newCompanyName,
      type: newPartnerType,
      contactPerson: newContactPerson,
      email: newEmail,
      phone: newPhone || '+91 22 2490 0000',
      city: newCity.trim(),
      state: newState.trim(),
      country: newCountry.trim(),
      countries: [newCountry.trim() || 'India'],
      cities: [newCity.trim() || 'Mumbai'],
      portfolioOwnerId: chosenPO?.uid || 'user-po-001',
      portfolioOwnerName: chosenPO?.displayName || 'Primary Portfolio Manager',
      assignedManagerId: chosenPO?.uid || 'user-po-001',
      assignedManagerName: chosenPO?.displayName || 'Primary Portfolio Manager',
      agreementStatus: newAgreementStatus,
      agreementType: newAgreementType,
      agreementTerms: newAgreementTerms,
      agreementSignedDate: new Date().toISOString().split('T')[0],
      agreementExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Active' as const,
      onboardingDate: new Date().toISOString().split('T')[0],
      commissionRate: Number(newCommissionRate) || 40,
    };

    try {
      if (onboardingPartner) {
        await updatePartner(onboardingPartner.partnerId, onboardingData);
      } else {
        await onboardNewPartner(onboardingData);
      }
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : 'Unable to save partner details.');
      setIsOnboarding(false);
      return;
    }

    setShowOnboardModal(false);
    setOnboardingPartner(null);
    setIsOnboarding(false);
    setNewCompanyName('');
    setNewContactPerson('');
    setNewEmail('');
    setNewPhone('');
  };

  const handleDeletePartner = async (partner: Partner) => {
    if (!window.confirm(`Delete ${partner.companyName}? This cannot be undone.`)) return;
    try {
      await deletePartner(partner.partnerId);
      if (inspectPartnerId === partner.partnerId) setInspectPartnerId(null);
    } catch (error) {
      setOnboardingError(error instanceof Error ? error.message : 'Unable to delete partner.');
    }
  };

  // Reassign Partner Portfolio Owner Handler
  const handleConfirmReassign = () => {
    if (!reassignPartnerTarget || !selectedNewOwnerId) return;
    const targetOwner = portfolioOwners.find((u) => u.uid === selectedNewOwnerId);
    if (!targetOwner) return;

    reassignPartnerPortfolioOwner(
      reassignPartnerTarget.partnerId,
      targetOwner.uid,
      targetOwner.displayName
    );
    setReassignPartnerTarget(null);
  };

  // CSV Template Downloader
  const handleDownloadTemplate = () => {
    const csvContent =
      'Full Name,Email,Phone,University,Destination City,Country,Intake,Budget,Move In Date,Notes\n' +
      'Ananya Sharma,ananya.s@example.com,+91 98200 11223,University College London,London,United Kingdom,Sep 2026,380,2026-09-15,Prefers walking distance to Bloomsbury campus\n' +
      'Zubair Khan,zubair.khan@example.com,+971 50 123 4567,University of Manchester,Manchester,United Kingdom,Sep 2026,320,2026-09-12,En-suite room requirement with student visa\n' +
      'Mei Lin,mei.lin@example.com,+852 9123 4567,University of Edinburgh,Edinburgh,United Kingdom,Jan 2027,350,2027-01-08,Postgraduate student looking for quiet residence\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'hearthaway_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Step 1 & 3: Handle CSV File Parsing & Validation
  const processCSVText = (text: string, fileName: string) => {
    setCsvParseError(null);
    setCsvRawText(text);
    setCsvFileName(fileName);

    const lines = text.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length < 2) {
      setCsvParseError('CSV file must include a header line and at least one lead row.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const findHeaderIdx = (...possibleNames: string[]) => {
      return headers.findIndex((h) =>
        possibleNames.some((name) => h.includes(name.toLowerCase()))
      );
    };

    const nameIdx = findHeaderIdx('full name', 'name', 'student name', 'student');
    const emailIdx = findHeaderIdx('email', 'email address', 'mail');
    const phoneIdx = findHeaderIdx('phone', 'mobile', 'whatsapp', 'contact');
    const uniIdx = findHeaderIdx('university', 'uni', 'college', 'institution');
    const cityIdx = findHeaderIdx('destination city', 'city', 'location');
    const countryIdx = findHeaderIdx('country', 'destination country');
    const intakeIdx = findHeaderIdx('intake', 'session', 'term');
    const budgetIdx = findHeaderIdx('budget', 'weekly budget', 'rent');
    const moveInIdx = findHeaderIdx('move in date', 'movein', 'arrival');
    const notesIdx = findHeaderIdx('notes', 'preferences', 'remarks', 'comments');

    if (nameIdx === -1 || emailIdx === -1) {
      setCsvParseError(
        'CSV must contain columns for "Full Name" and "Email Address". Download our template for correct formatting.'
      );
      return;
    }

    const parsed: Array<any> = [];
    const errors: Array<{ row: number; field: string; message: string }> = [];
    const duplicates: Array<{ row: number; email: string; phone: string; reason: string }> = [];
    const valid: Array<any> = [];

    const existingEmails = new Set(students.map((s) => s.email.toLowerCase().trim()));
    const existingPhones = new Set(students.map((s) => s.phone.replace(/\D/g, '')));
    const seenBatchEmails = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const rowLine = lines[i];
      if (!rowLine.trim()) continue;

      const rawCols = rowLine.split(',');
      const getVal = (idx: number) => (idx >= 0 && rawCols[idx] ? rawCols[idx].trim() : '');

      const fullName = getVal(nameIdx);
      const email = getVal(emailIdx).toLowerCase();
      const phone = getVal(phoneIdx) || '+44 7700 900000';
      const university = getVal(uniIdx) || 'University of London';
      const destinationCity = getVal(cityIdx) || 'London';
      const destinationCountry = getVal(countryIdx) || 'United Kingdom';
      const intake = getVal(intakeIdx) || 'Sep 2026';
      const budget = Number(getVal(budgetIdx)) || 350;
      const moveInDate = getVal(moveInIdx) || '2026-09-15';
      const notes = getVal(notesIdx) || 'CSV Batch Import';

      const rowObj = {
        rowNumber: i,
        fullName,
        email,
        phone,
        university,
        destinationCity,
        destinationCountry,
        intake,
        budget,
        moveInDate,
        notes,
      };

      parsed.push(rowObj);

      // Validation Checks
      let isRowValid = true;

      if (!fullName || fullName.length < 2) {
        errors.push({ row: i, field: 'Full Name', message: 'Student full name is required' });
        isRowValid = false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: i, field: 'Email', message: 'Valid email address is required' });
        isRowValid = false;
      }

      // Duplicate Checks
      const cleanPhone = phone.replace(/\D/g, '');
      if (existingEmails.has(email)) {
        duplicates.push({ row: i, email, phone, reason: 'Email already exists in master students database' });
        isRowValid = false;
      } else if (cleanPhone && cleanPhone.length > 5 && existingPhones.has(cleanPhone)) {
        duplicates.push({ row: i, email, phone, reason: 'Phone number already exists in master database' });
        isRowValid = false;
      } else if (seenBatchEmails.has(email)) {
        duplicates.push({ row: i, email, phone, reason: 'Duplicate email repeated within this CSV file' });
        isRowValid = false;
      }

      if (isRowValid) {
        seenBatchEmails.add(email);
        valid.push(rowObj);
      }
    }

    setParsedRows(parsed);
    setValidationErrors(errors);
    setDuplicateRows(duplicates);
    setValidRows(valid);
    setBulkStep(4); // Advance to preview
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVText(text, file.name);
    };
    reader.readAsText(file);
  };

  // Step 7: Confirm & Execute CSV Batch Import
  const handleExecuteImport = () => {
    if (validRows.length === 0) return;

    const targetPartnerId = isPartner ? activePartnerId : (activeInspectedPartner?.partnerId || 'PART-00482');
    const targetPartnerName = isPartner
      ? (currentPartnerRecord?.companyName || currentUser.partnerName || 'Education Partner')
      : (activeInspectedPartner?.companyName || 'Education Partner');

    const result = bulkImportPartnerLeads(validRows, targetPartnerId, targetPartnerName);
    setImportResults(result);
    setBulkStep(8); // Advance to results
  };

  const handleResetBulkModal = () => {
    setShowBulkUploadModal(false);
    setBulkStep(1);
    setCsvFileName('');
    setCsvRawText('');
    setParsedRows([]);
    setValidationErrors([]);
    setDuplicateRows([]);
    setValidRows([]);
    setImportResults(null);
    setCsvParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Single Lead Form State (for Partner)
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleUni, setSingleUni] = useState('');
  const [singleCity, setSingleCity] = useState('London');
  const [singleBudget, setSingleBudget] = useState('350');
  const [singleNotes, setSingleNotes] = useState('');

  const handleSingleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName || !singleEmail || !singleUni) return;

    submitPartnerLead({
      fullName: singleName,
      email: singleEmail,
      phone: singlePhone || '+44 7700 900123',
      university: singleUni,
      destinationCity: singleCity || 'London',
      destinationCountry: 'United Kingdom',
      intake: 'Sep 2026',
      moveInDate: '2026-09-15',
      budget: Number(singleBudget) || 350,
      notes: singleNotes,
    });

    setShowSingleLeadModal(false);
    setSingleName('');
    setSingleEmail('');
    setSinglePhone('');
    setSingleUni('');
    setSingleNotes('');
  };

  const formatAgreementBadge = (status?: string) => {
    switch (status) {
      case 'Active':
      case 'Signed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Pending Signature':
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Expired':
      case 'Terminated':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-16">
      {/* Top Header */}
      <div className="border-b border-[#E8E6E1] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#00319D]/10 px-2.5 py-0.5 text-xs font-bold text-[#00319D] uppercase tracking-wider">
                  <Building className="h-3.5 w-3.5" />
                  Module 2
                </span>
                <span className="text-xs text-[#6B6860]">• Education Consultant Network</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] mt-1 tracking-tight">
                Partners
              </h1>
              <p className="text-xs text-[#6B6860] mt-0.5 max-w-2xl">
                Bifurcate and manage education consultants by state, city, agreements, and portfolio owners.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* View Switcher: Directory vs Bifurcated */}
              {!isPartner && (
                <div className="inline-flex items-center rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] p-1 text-xs">
                  <button
                    onClick={() => setViewMode('directory')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                      viewMode === 'directory'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Table View
                  </button>
                  <button
                    onClick={() => setViewMode('bifurcated')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                      viewMode === 'bifurcated'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                  >
                    <Grid className="h-3.5 w-3.5" />
                    Bifurcate by State &amp; City
                  </button>
                </div>
              )}

              {isManagement && (
                <button
                  onClick={() => { setOnboardingPartner(null); setOnboardingError(''); setShowOnboardModal(true); }}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-3.5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Onboard Partner
                </button>
              )}

              <button
                onClick={() => {
                  setBulkStep(1);
                  setShowBulkUploadModal(true);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#00319D]" />
                Bulk CSV Upload
              </button>

              {!isPartner && (
                <button
                  onClick={handleExportPartnerListCSV}
                  disabled={filteredPartners.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3.5 py-2 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Download partner directory as CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Partner List ({filteredPartners.length})
                </button>
              )}

              {isPartner && (
                <button
                  onClick={() => setShowSingleLeadModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-3.5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Submit Single Lead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* VIEW 1: PARTNER USER VIEW (Their agency dashboard) */}
        {isPartner && (
          <div className="space-y-6">
            {/* Partner Agency Profile Card */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-[#00319D] text-[#FFFFFF] flex items-center justify-center font-bold text-lg shadow-xs">
                    {(currentPartnerRecord?.companyName || currentUser.partnerName || 'P').charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#1A1A1A]">
                        {currentPartnerRecord?.companyName || currentUser.partnerName || 'Partner Agency'}
                      </h2>
                      {currentPartnerRecord?.partnerId && (
                        <span className="font-mono text-[10px] font-bold bg-[#F7F6F3] text-[#00319D] px-2 py-0.5 rounded border border-[#E8E6E1]">
                          {currentPartnerRecord.partnerId}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${formatAgreementBadge(currentPartnerRecord?.agreementStatus)}`}>
                        <FileCheck className="h-3 w-3" />
                        Agreement: {currentPartnerRecord?.agreementStatus || 'Active'}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B6860] mt-0.5">
                      {currentPartnerRecord?.city || 'Mumbai'}, {currentPartnerRecord?.state || 'Maharashtra'} • {currentPartnerRecord?.type || 'Partner'} • Contact: {currentPartnerRecord?.contactPerson || currentUser.displayName} ({currentPartnerRecord?.email || currentUser.email})
                    </p>
                  </div>
                </div>

                {/* Sourcing & Portfolio Rollup Relation */}
                <div className="bg-[#F7F6F3] px-4 py-2.5 rounded-xl border border-[#E8E6E1] text-xs">
                  <span className="text-[10px] font-bold uppercase text-[#6B6860] block">
                    Your HearthAway Portfolio Owner:
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-[#FCC20A]" />
                    <strong className="text-[#1A1A1A]">
                      {currentPartnerRecord?.portfolioOwnerName || 'Unassigned'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Agency Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#E8E6E1]">
                <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                  <span className="text-[10px] font-bold text-[#6B6860] uppercase block">Total Leads Submitted</span>
                  <span className="text-lg font-extrabold text-[#00319D]">{partnerLeads.length}</span>
                </div>
                <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                  <span className="text-[10px] font-bold text-[#6B6860] uppercase block">Active In Pipeline</span>
                  <span className="text-lg font-extrabold text-[#1A1A1A]">
                    {partnerLeads.filter((s) => s.bookingStatus !== 'Booked' && s.leadStatus !== 'Lost').length}
                  </span>
                </div>
                <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                  <span className="text-[10px] font-bold text-[#6B6860] uppercase block">Booked Tenancies</span>
                  <span className="text-lg font-extrabold text-emerald-700">
                    {partnerLeads.filter((s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed').length}
                  </span>
                </div>
                <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                  <span className="text-[10px] font-bold text-[#6B6860] uppercase block">Commission Tier</span>
                  <span className="text-lg font-extrabold text-[#1A1A1A]">{currentPartnerRecord?.commissionRate ?? 20}%</span>
                </div>
              </div>
            </div>

            {/* Submitted Leads Table for Partner */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Your Sourced Student Leads</h3>
                  <p className="text-xs text-[#6B6860]">
                    Leads submitted by {currentPartnerRecord?.companyName || currentUser.partnerName || 'your agency'}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#00319D]">
                    {partnerLeads.length} Leads
                  </span>
                  <button
                    onClick={handleExportPartnerLeadsCSV}
                    disabled={partnerLeads.length === 0}
                    className="flex items-center gap-1 rounded-md border border-[#00319D] bg-[#00319D]/5 px-2.5 py-1 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    title="Export sourced leads to CSV"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                </div>
              </div>

              {partnerLeads.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Users className="h-8 w-8 text-[#6B6860] mx-auto" />
                  <h4 className="text-xs font-bold text-[#1A1A1A]">No Leads Submitted Yet</h4>
                  <p className="text-xs text-[#6B6860]">
                    Use &quot;Submit Single Lead&quot; or &quot;Bulk CSV Upload&quot; to send student requirements to the team.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Student Name</th>
                        <th className="py-3 px-4 font-bold">University &amp; City</th>
                        <th className="py-3 px-4 font-bold">Assigned Sales Owner</th>
                        <th className="py-3 px-4 font-bold">Lead Status</th>
                        <th className="py-3 px-4 font-bold">Booking Status</th>
                        <th className="py-3 px-4 font-bold">Intake</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1]">
                      {partnerLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-[#F7F6F3]/50 cursor-pointer"
                          onClick={() => setSelectedStudentId(lead.studentId)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1A1A1A]">{lead.fullName}</div>
                            <div className="font-mono text-[11px] text-[#00319D]">{lead.studentId}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-[#1A1A1A] font-medium">{lead.destinationCity}</div>
                            <div className="text-[11px] text-[#6B6860]">{lead.university}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                            {lead.assignedSalesExecutiveName}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              {lead.leadStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-800">
                              {lead.bookingStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#6B6860]">{lead.intake}</td>
                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedStudentId(lead.studentId)}
                              className="text-[11px] font-bold text-[#00319D] hover:underline cursor-pointer"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: MANAGEMENT & DIRECTORY VIEW */}
        {!isPartner && (
          <div className="space-y-5">
            {/* Multi-Dimensional Filters Bar (State, City, Agreement, PO, Type) */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                  <input
                    type="text"
                    placeholder="Search partners by agency, city, state, code, contact person..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bifurcate by State Filter */}
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#00319D]" />
                    <select
                      value={filterState}
                      onChange={(e) => {
                        setFilterState(e.target.value);
                        setFilterCity('All'); // Reset city when state changes
                      }}
                      className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                    >
                      <option value="All">All States</option>
                      {availableStates.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bifurcate by City Filter */}
                  <select
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Cities</option>
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>

                  {/* Filter by Agreement Status */}
                  <select
                    value={filterAgreement}
                    onChange={(e) => setFilterAgreement(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Agreements</option>
                    <option value="Active">Agreement: Active</option>
                    <option value="Signed">Agreement: Signed</option>
                    <option value="Pending Signature">Pending Signature</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Expired">Expired</option>
                  </select>

                  {/* Filter by Partner Type */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Types</option>
                    <option value="Study Abroad Consultant">Study Abroad Consultant</option>
                    <option value="Bank">Bank</option>
                    <option value="VAS Company">VAS Company</option>
                    <option value="Education Company">Education Company</option>
                    <option value="Referral Partner">Referral Partner</option>
                  </select>

                  {/* Filter by Portfolio Owner */}
                  <select
                    value={filterPortfolioOwner}
                    onChange={(e) => setFilterPortfolioOwner(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Portfolio Owners</option>
                    {portfolioOwners.map((po) => (
                      <option key={po.uid} value={po.uid}>
                        {po.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filter Badges */}
              {(filterState !== 'All' || filterCity !== 'All' || filterAgreement !== 'All' || searchQuery) && (
                <div className="flex items-center gap-2 pt-1 border-t border-[#E8E6E1] text-[11px] text-[#6B6860]">
                  <span className="font-semibold text-[#1A1A1A]">Active Bifurcation:</span>
                  {filterState !== 'All' && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 font-bold text-[#00319D]">
                      State: {filterState}
                      <button onClick={() => setFilterState('All')} className="hover:text-rose-600">×</button>
                    </span>
                  )}
                  {filterCity !== 'All' && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 font-bold text-[#00319D]">
                      City: {filterCity}
                      <button onClick={() => setFilterCity('All')} className="hover:text-rose-600">×</button>
                    </span>
                  )}
                  {filterAgreement !== 'All' && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                      Agreement: {filterAgreement}
                      <button onClick={() => setFilterAgreement('All')} className="hover:text-rose-600">×</button>
                    </span>
                  )}
                  <span className="ml-auto font-medium">
                    Showing <strong>{filteredPartners.length}</strong> of <strong>{partners.length}</strong> partners
                  </span>
                </div>
              )}
            </div>

            {/* MODE A: BIFURCATED BY STATE & CITY (Grouped View) */}
            {viewMode === 'bifurcated' && (
              <div className="space-y-6">
                {Object.keys(partnersByStateAndCity).length === 0 ? (
                  <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-12 text-center space-y-2">
                    <Building className="h-8 w-8 text-[#6B6860] mx-auto" />
                    <h3 className="text-sm font-bold text-[#1A1A1A]">No Partners Match Filters</h3>
                    <p className="text-xs text-[#6B6860]">
                      Try clearing city/state filters or onboard a partner in this territory.
                    </p>
                  </div>
                ) : (
                  Object.entries(partnersByStateAndCity).map(([stateName, cityDict]) => {
                    const stateTotalPartners = Object.values(cityDict).reduce((acc, list) => acc + list.length, 0);

                    return (
                      <div
                        key={stateName}
                        className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden"
                      >
                        {/* State Group Header */}
                        <div className="bg-[#F7F6F3] px-5 py-3.5 border-b border-[#E8E6E1] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-[#00319D] text-[#FFFFFF] flex items-center justify-center font-bold text-xs shadow-xs">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2">
                                State: {stateName}
                                <span className="rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
                                  {stateTotalPartners} {stateTotalPartners === 1 ? 'Partner' : 'Partners'}
                                </span>
                              </h3>
                              <p className="text-[11px] text-[#6B6860]">
                                Across {Object.keys(cityDict).length} {Object.keys(cityDict).length === 1 ? 'city hub' : 'city hubs'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Cities and Partner Cards within this State */}
                        <div className="p-5 space-y-6">
                          {Object.entries(cityDict).map(([cityName, cityPartners]) => (
                            <div key={cityName} className="space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#FCC20A]" />
                                <h4 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wide">
                                  City: {cityName}
                                </h4>
                                <span className="text-[10px] text-[#6B6860] font-semibold">
                                  ({cityPartners.length} {cityPartners.length === 1 ? 'agency' : 'agencies'})
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {cityPartners.map((partner) => {
                                  const leadsCount = students.filter((s) => s.partnerId === partner.partnerId).length;
                                  const bookingsCount = students.filter(
                                    (s) =>
                                      s.partnerId === partner.partnerId &&
                                      (s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed')
                                  ).length;

                                  return (
                                    <div
                                      key={partner.id}
                                      className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 hover:border-[#00319D]/40 transition-all shadow-2xs space-y-3 flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <h5 className="text-xs font-bold text-[#1A1A1A] leading-snug">
                                              {partner.companyName}
                                            </h5>
                                            <span className="font-mono text-[10px] font-bold text-[#00319D]">
                                              {partner.partnerId}
                                            </span>
                                          </div>
                                          <button
                                            onClick={() => handleOpenAgreementModal(partner)}
                                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border cursor-pointer ${formatAgreementBadge(partner.agreementStatus)}`}
                                            title="View / Edit Agreement"
                                          >
                                            <FileCheck className="h-3 w-3" />
                                            {partner.agreementStatus || 'Active'}
                                          </button>
                                        </div>

                                        <p className="text-[11px] text-[#6B6860] mt-1.5 line-clamp-1">
                                          Contact: {partner.contactPerson} ({partner.email})
                                        </p>

                                        <div className="mt-2.5 pt-2.5 border-t border-[#E8E6E1] text-[11px] flex items-center justify-between">
                                          <span className="text-[#6B6860]">Portfolio Owner:</span>
                                          <strong className="text-[#1A1A1A]">
                                            {partner.portfolioOwnerName || 'Beatrice Vance'}
                                          </strong>
                                        </div>
                                      </div>

                                      <div className="pt-2 border-t border-[#E8E6E1] flex items-center justify-between">
                                        <div className="text-[10px] text-[#6B6860]">
                                          Leads: <strong className="text-[#00319D]">{leadsCount}</strong> • Bookings: <strong className="text-emerald-700">{bookingsCount}</strong>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          {isManagement && (
                                            <button
                                              onClick={() => openPartnerOnboarding(partner)}
                                              className="rounded-md border border-[#00319D] bg-[#00319D]/5 px-2 py-1 text-[10px] font-bold text-[#00319D] hover:bg-[#00319D]/10 cursor-pointer"
                                            >
                                              <Pencil className="mr-1 inline h-3 w-3" />
                                              Edit
                                            </button>
                                          )}
                                          {isManagement && partner.status !== 'Active' && (
                                            <button
                                              onClick={() => openPartnerOnboarding(partner)}
                                              className="rounded-md border border-[#00319D] bg-[#00319D]/5 px-2 py-1 text-[10px] font-bold text-[#00319D] hover:bg-[#00319D]/10 cursor-pointer"
                                            >
                                              Onboard
                                            </button>
                                          )}
                                          <button
                                            onClick={() => handleOpenAgreementModal(partner)}
                                            className="rounded-md border border-[#E8E6E1] bg-[#F7F6F3] px-2 py-1 text-[10px] font-bold text-[#1A1A1A] hover:bg-[#E8E6E1] cursor-pointer"
                                          >
                                            Agreement
                                          </button>
                                          {isManagement && (
                                            <button
                                              onClick={() => handleDeletePartner(partner)}
                                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                              title="Delete partner"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </button>
                                          )}
                                          <button
                                            onClick={() => setInspectPartnerId(partner.partnerId)}
                                            className="rounded-md bg-[#00319D] px-2.5 py-1 text-[10px] font-bold text-[#FFFFFF] hover:bg-[#00257A] cursor-pointer"
                                          >
                                            Leads →
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* MODE B: STANDARD DIRECTORY TABLE */}
            {viewMode === 'directory' && (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Partner Agency</th>
                        <th className="py-3 px-4 font-bold">City &amp; State</th>
                        <th className="py-3 px-4 font-bold">Agreement</th>
                        <th className="py-3 px-4 font-bold">Type</th>
                        <th className="py-3 px-4 font-bold">Contact Person</th>
                        <th className="py-3 px-4 font-bold">Portfolio Owner</th>
                        <th className="py-3 px-4 font-bold">Leads</th>
                        <th className="py-3 px-4 font-bold">Bookings</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1]">
                      {filteredPartners.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-[#6B6860]">
                            No partners found matching the selected city, state, or search filters.
                          </td>
                        </tr>
                      ) : (
                        filteredPartners.map((partner) => {
                          const leadsCount = students.filter((s) => s.partnerId === partner.partnerId).length;
                          const bookingsCount = students.filter(
                            (s) =>
                              s.partnerId === partner.partnerId &&
                              (s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed')
                          ).length;

                          return (
                            <tr
                              key={partner.id}
                              className="hover:bg-[#F7F6F3]/60 transition-colors"
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-[#1A1A1A]">{partner.companyName}</div>
                                <div className="font-mono text-[11px] text-[#00319D]">{partner.partnerId}</div>
                              </td>

                              {/* City & State Location */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#1A1A1A] flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-[#00319D]" />
                                  {partner.city || 'Mumbai'}
                                </div>
                                <div className="text-[11px] text-[#6B6860] pl-4">{partner.state || 'Maharashtra'}</div>
                              </td>

                              {/* Agreement Status & Modal Action */}
                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => handleOpenAgreementModal(partner)}
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border cursor-pointer ${formatAgreementBadge(partner.agreementStatus)}`}
                                  title="View / Manage Contract Terms"
                                >
                                  <FileCheck className="h-3 w-3" />
                                  {partner.agreementStatus || 'Active'}
                                </button>
                              </td>

                              <td className="py-3.5 px-4 text-[#6B6860]">{partner.type}</td>

                              <td className="py-3.5 px-4">
                                <div className="font-medium text-[#1A1A1A]">{partner.contactPerson}</div>
                                <div className="text-[11px] text-[#6B6860]">{partner.email}</div>
                              </td>

                              {/* Portfolio Owner & Reassignment Action */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-[#00319D]" />
                                  <strong className="text-[#1A1A1A]">
                                    {partner.portfolioOwnerName || 'Beatrice Vance'}
                                  </strong>
                                </div>
                                <button
                                  onClick={() => {
                                    setReassignPartnerTarget(partner);
                                    setSelectedNewOwnerId(partner.portfolioOwnerId || portfolioOwners[0]?.uid || '');
                                  }}
                                  className="text-[10px] text-[#00319D] hover:underline mt-0.5 block cursor-pointer"
                                >
                                  Reassign Owner
                                </button>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-bold text-[#00319D]">{leadsCount}</span>
                              </td>

                              <td className="py-3.5 px-4">
                                <span className="font-bold text-emerald-700">{bookingsCount}</span>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isManagement && (
                                    <>
                                      <button
                                        onClick={() => openPartnerOnboarding(partner)}
                                        className="rounded-md border border-[#00319D] bg-[#00319D]/5 px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#00319D]/10 cursor-pointer"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleDeletePartner(partner)}
                                        className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleOpenAgreementModal(partner)}
                                    className="rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-bold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors cursor-pointer"
                                  >
                                    Agreement
                                  </button>
                                  <button
                                    onClick={() => setInspectPartnerId(partner.partnerId)}
                                    className="rounded-md border border-[#E8E6E1] bg-[#F7F6F3] px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors cursor-pointer"
                                  >
                                    Leads ({leadsCount})
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: AGREEMENT MANAGEMENT MODAL */}
      {selectedAgreementPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedAgreementPartner(null)}
              className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
                <FileCheck className="h-3.5 w-3.5" />
                Partner Agreement &amp; Contract Terms
              </span>
              <span className="text-xs font-mono text-[#6B6860]">
                {selectedAgreementPartner.partnerId}
              </span>
            </div>

            <h3 className="text-lg font-bold text-[#1A1A1A]">
              {selectedAgreementPartner.companyName}
            </h3>
            <p className="text-xs text-[#6B6860]">
              {selectedAgreementPartner.city || 'Mumbai'}, {selectedAgreementPartner.state || 'Maharashtra'} • Contact: {selectedAgreementPartner.contactPerson} ({selectedAgreementPartner.email})
            </p>

            {/* Form to update Agreement */}
            <form onSubmit={handleSaveAgreement} className="space-y-4 mt-5 pt-4 border-t border-[#E8E6E1]">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Agreement Status
                  </label>
                  <select
                    value={agreementStatus}
                    onChange={(e) => setAgreementStatus(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs font-semibold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                  >
                    <option value="Active">Active / In Force</option>
                    <option value="Signed">Signed &amp; Verified</option>
                    <option value="Pending Signature">Pending Signature</option>
                    <option value="Under Review">Under Legal Review</option>
                    <option value="Draft">Drafting Agreement</option>
                    <option value="Expired">Expired</option>
                    <option value="Terminated">Terminated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Agreement Type
                  </label>
                  <input
                    type="text"
                    value={agreementType}
                    onChange={(e) => setAgreementType(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#6B6860]" />
                    Signed Date
                  </label>
                  <input
                    type="date"
                    value={agreementSignedDate}
                    onChange={(e) => setAgreementSignedDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-[#6B6860]" />
                    Expiry / Renewal Date
                  </label>
                  <input
                    type="date"
                    value={agreementExpiryDate}
                    onChange={(e) => setAgreementExpiryDate(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Commercial Terms &amp; Commission Payout
                </label>
                <input
                  type="text"
                  value={agreementTerms}
                  onChange={(e) => setAgreementTerms(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                  placeholder="e.g. 40% Commission, 120-day payment window"
                />
              </div>

              <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 space-y-2.5">
                <span className="text-xs font-bold text-[#1A1A1A]">Partner Logo</span>
                <div className="flex items-center gap-3">
                  {agreementLogoUrl ? <img src={agreementLogoUrl} alt="Partner logo preview" className="h-10 w-10 rounded-lg object-contain border border-[#E8E6E1] bg-white" /> : <div className="h-10 w-10 rounded-lg border border-dashed border-[#BDB9B0]" />}
                  <button type="button" onClick={() => agreementLogoRef.current?.click()} className="rounded-lg border border-[#00319D] bg-white px-3 py-1.5 text-xs font-bold text-[#00319D] cursor-pointer">Upload Logo</button>
                  <input ref={agreementLogoRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setAgreementLogoUrl(String(reader.result || ''));
                    reader.readAsDataURL(file);
                  }} />
                </div>
              </div>

              {/* Contract Document Upload & Verification */}
              <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#00319D]" />
                    Contract Document File
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Audit Verified
                  </span>
                </div>
                <p className="text-[11px] text-[#6B6860]">
                  Attach or download the signed MSA document or authorization letter for this partner.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => agreementFileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Upload Executed Agreement (PDF)
                  </button>
                  <input
                    ref={agreementFileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    className="hidden"
                    onChange={handleAgreementFileUpload}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const docContent = `HEARTHAWAY MASTER SERVICES AGREEMENT (MSA)\nPartner: ${selectedAgreementPartner.companyName} (${selectedAgreementPartner.partnerId})\nTerritory: ${selectedAgreementPartner.city || 'Mumbai'}, ${selectedAgreementPartner.state || 'Maharashtra'}\nStatus: ${agreementStatus}\nAgreement Type: ${agreementType}\nSigned Date: ${agreementSignedDate}\nExpiry Date: ${agreementExpiryDate}\nTerms: ${agreementTerms}\nAuthorized Counterparty: ${selectedAgreementPartner.contactPerson} (${selectedAgreementPartner.email})\n\nExecuted under HearthAway Global Accommodation Partner Framework.`;
                      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedAgreementPartner.partnerId}_Agreement_Executed.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {agreementDocName || `${selectedAgreementPartner.partnerId}_MSA.pdf`}
                  </button>
                </div>
              </div>

              {agreementSaved && (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Agreement terms updated &amp; persisted successfully!
                </p>
              )}
              {agreementError && (
                <p role="alert" className="text-xs text-red-600 font-semibold">
                  {agreementError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E6E1]">
                <button
                  type="button"
                  onClick={() => setSelectedAgreementPartner(null)}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={agreementSaving}
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {agreementSaving ? 'Saving…' : 'Save Agreement Terms'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: BULK CSV UPLOAD WORKFLOW */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleResetBulkModal}
              className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00319D] bg-[#00319D]/10 px-2 py-0.5 rounded">
                Bulk Lead Import Workflow
              </span>
              <h2 className="text-xl font-bold text-[#1A1A1A] mt-1">Bulk Lead Upload (CSV)</h2>
              <p className="text-xs text-[#6B6860]">
                Upload multiple student leads at once. Leads automatically inherit the submitting Partner relationship and roll up into their Portfolio Owner.
              </p>
            </div>

            {/* Step Progress Indicators */}
            <div className="grid grid-cols-4 gap-2 mb-6 text-center text-[10px] font-bold">
              <div
                className={`py-1.5 rounded-lg border ${
                  bulkStep === 1
                    ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF]'
                    : 'border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860]'
                }`}
              >
                1. Select &amp; Template
              </div>
              <div
                className={`py-1.5 rounded-lg border ${
                  bulkStep === 4
                    ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF]'
                    : 'border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860]'
                }`}
              >
                2. Preview &amp; Validate
              </div>
              <div
                className={`py-1.5 rounded-lg border ${
                  bulkStep === 7
                    ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF]'
                    : 'border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860]'
                }`}
              >
                3. Duplicates &amp; Confirm
              </div>
              <div
                className={`py-1.5 rounded-lg border ${
                  bulkStep === 8
                    ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF]'
                    : 'border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860]'
                }`}
              >
                4. Results
              </div>
            </div>

            {/* STEP 1 & 2: Select File or Download Template */}
            {bulkStep === 1 && (
              <div className="space-y-6">
                <div className="rounded-xl border border-dashed border-[#00319D]/40 bg-[#00319D]/5 p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-[#00319D] text-[#FFFFFF] flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">Choose CSV File to Upload</h3>
                    <p className="text-xs text-[#6B6860] mt-1">
                      Drag &amp; drop or browse your local files (.csv format supported)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
                  >
                    Select CSV File
                  </button>
                </div>

                {csvParseError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{csvParseError}</span>
                  </div>
                )}

                {/* Step 2: Download Standardized Template */}
                <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A]">Need the HearthAway CSV Format?</h4>
                    <p className="text-[11px] text-[#6B6860]">
                      Download our verified CSV template containing pre-formatted headers and sample lead rows.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#E8E6E1] transition-colors shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-[#00319D]" />
                    Download CSV Template
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4, 5, 6: Preview, Errors & Duplicates */}
            {(bulkStep === 4 || bulkStep === 7) && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">Validation Summary</h3>
                    <p className="text-xs text-[#6B6860]">
                      File: <strong>{csvFileName}</strong> ({parsedRows.length} total rows evaluated)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {validRows.length} Valid
                    </span>
                    {validationErrors.length > 0 && (
                      <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {validationErrors.length} Errors
                      </span>
                    )}
                    {duplicateRows.length > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {duplicateRows.length} Duplicates
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Errors Box */}
                {validationErrors.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 space-y-1 text-xs text-rose-700 max-h-32 overflow-y-auto">
                    <span className="font-bold block">Validation Errors (Rows will be skipped):</span>
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className="text-[11px]">
                        Row {err.row}: {err.field} — {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Duplicate Rows Box */}
                {duplicateRows.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1 text-xs text-amber-800 max-h-32 overflow-y-auto">
                    <span className="font-bold block">Duplicate Records Detected (Skipped to prevent double-entry):</span>
                    {duplicateRows.map((dup, idx) => (
                      <div key={idx} className="text-[11px]">
                        Row {dup.row}: {dup.email} — {dup.reason}
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview Valid Leads Table */}
                <div className="rounded-xl border border-[#E8E6E1] overflow-hidden">
                  <div className="bg-[#F7F6F3] px-3 py-2 border-b border-[#E8E6E1] text-xs font-bold text-[#1A1A1A]">
                    Valid Leads Ready to Import ({validRows.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FFFFFF] text-[#6B6860] uppercase text-[10px] border-b border-[#E8E6E1]">
                        <tr>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">University</th>
                          <th className="py-2 px-3">City</th>
                          <th className="py-2 px-3">Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E6E1]">
                        {validRows.slice(0, 10).map((r, idx) => (
                          <tr key={idx} className="hover:bg-[#F7F6F3]">
                            <td className="py-2 px-3 font-semibold text-[#1A1A1A]">{r.fullName}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.email}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.university}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.destinationCity}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#00319D]">£{r.budget}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-[#E8E6E1]">
                  <button
                    type="button"
                    onClick={() => setBulkStep(1)}
                    className="rounded-lg border border-[#E8E6E1] px-4 py-2 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
                  >
                    ← Back to File Upload
                  </button>
                  <button
                    type="button"
                    disabled={validRows.length === 0}
                    onClick={handleExecuteImport}
                    className="rounded-lg bg-[#00319D] px-5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    Confirm &amp; Import {validRows.length} Leads
                  </button>
                </div>
              </div>
            )}

            {/* STEP 8: Import Results */}
            {bulkStep === 8 && importResults && (
              <div className="text-center py-6 space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Batch Import Complete</h3>
                  <p className="text-xs text-[#6B6860] mt-1">
                    Successfully imported <strong>{importResults.importedCount}</strong> new leads into the master system.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto text-xs py-2">
                  <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                    <span className="text-[10px] text-[#6B6860] uppercase block">Imported</span>
                    <span className="text-base font-bold text-emerald-600">{importResults.importedCount}</span>
                  </div>
                  <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                    <span className="text-[10px] text-[#6B6860] uppercase block">Duplicates</span>
                    <span className="text-base font-bold text-amber-600">{importResults.duplicatesCount}</span>
                  </div>
                  <div className="bg-[#F7F6F3] p-3 rounded-lg border border-[#E8E6E1]">
                    <span className="text-[10px] text-[#6B6860] uppercase block">Errors</span>
                    <span className="text-base font-bold text-rose-600">{importResults.errorsCount}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetBulkModal}
                  className="rounded-lg bg-[#00319D] px-6 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ONBOARD NEW PARTNER (with State, City, Agreement) */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Onboard Education Consultant</h3>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-[#6B6860] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardPartner} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Company / Agency Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Global Advisors"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">City Hub</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maharashtra"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Partner Type</label>
                <select
                  value={newPartnerType}
                  onChange={(e) => setNewPartnerType(e.target.value as any)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                >
                  <option value="Study Abroad Consultant">Study Abroad Consultant</option>
                  <option value="Bank">Bank</option>
                  <option value="VAS Company">VAS Company</option>
                  <option value="Education Company">Education Company</option>
                  <option value="Referral Partner">Referral Partner</option>
                </select>
              </div>

              {/* Agreement Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Agreement Status</label>
                  <select
                    value={newAgreementStatus}
                    onChange={(e) => setNewAgreementStatus(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Signed">Signed</option>
                    <option value="Pending Signature">Pending Signature</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Commission %</label>
                  <input
                    type="number"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              {/* Required Portfolio Owner Assignment */}
              <div className="bg-[#F7F6F3] p-3 rounded-xl border border-[#E8E6E1]">
                <label className="block text-xs font-bold text-[#00319D] mb-1">
                  Assign Portfolio Owner (Internal):
                </label>
                <p className="text-[11px] text-[#6B6860] mb-2">
                  All future leads received from this partner will automatically appear in this user&apos;s Portfolio.
                </p>
                <select
                  value={newPortfolioOwnerId}
                  onChange={(e) => setNewPortfolioOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] p-2 text-xs font-semibold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                >
                  {portfolioOwners.map((po) => (
                    <option key={po.uid} value={po.uid}>
                      {po.displayName} ({po.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Ross"
                  value={newContactPerson}
                  onChange={(e) => setNewContactPerson(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@agency.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 22 2490 0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              {onboardingError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {onboardingError}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8E6E1]">
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingError('');
                    setShowOnboardModal(false);
                  }}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
                >
                  Cancel
                </button>
  <button
  type="submit"
  disabled={isOnboarding}
  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
  >
  {isOnboarding ? 'Saving…' : 'Onboard Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REASSIGN PORTFOLIO OWNER */}
      {reassignPartnerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Reassign {reassignPartnerTarget.companyName}
            </h3>
            <p className="text-xs text-[#6B6860] leading-relaxed">
              Updating the Portfolio Owner will immediately and consistently roll up all leads sourced by this partner into the new Portfolio Owner&apos;s Portfolio, while preserving each lead&apos;s assigned sales Owner.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                New Portfolio Owner:
              </label>
              <select
                value={selectedNewOwnerId}
                onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                {portfolioOwners.map((owner) => (
                  <option key={owner.uid} value={owner.uid}>
                    {owner.displayName} ({owner.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReassignPartnerTarget(null)}
                className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] cursor-pointer"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SUBMIT SINGLE LEAD (For Partner) */}
      {showSingleLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Submit Student Lead</h3>
              <button
                onClick={() => setShowSingleLeadModal(false)}
                className="text-[#6B6860] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSingleLeadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Patel"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="maya@example.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="+44 7700 900123"
                    value={singlePhone}
                    onChange={(e) => setSinglePhone(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Target University</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University of Manchester"
                  value={singleUni}
                  onChange={(e) => setSingleUni(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Destination City</label>
                  <input
                    type="text"
                    value={singleCity}
                    onChange={(e) => setSingleCity(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Budget (£/week)</label>
                  <input
                    type="number"
                    value={singleBudget}
                    onChange={(e) => setSingleBudget(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Notes / Preferences</label>
                <textarea
                  rows={2}
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  placeholder="Accommodation requirements, move-in preferences..."
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSingleLeadModal(false)}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] cursor-pointer"
                >
                  Submit Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
