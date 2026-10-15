'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useHearthAway } from '@/lib/context';
import { Partner, Student } from '@/lib/types';
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
    setSelectedStudentId,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';
  const isPartner = currentUser.role === 'partner';

  // Portfolio Owners list for assignments
  const portfolioOwners = useMemo(() => {
    return availableUsers.filter((u) => u.role === 'portfolio_owner');
  }, [availableUsers]);

  // Active Partner context for Partner role
  const activePartnerId = isPartner && currentUser.partnerId ? currentUser.partnerId : 'PART-00482';
  const currentPartnerRecord = partners.find((p) => p.partnerId === activePartnerId) || partners[0];

  // Search & Filter state for Management view
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterPortfolioOwner, setFilterPortfolioOwner] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Selected partner for inspecting their leads
  const [inspectPartnerId, setInspectPartnerId] = useState<string | null>(null);

  // Modals state
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showSingleLeadModal, setShowSingleLeadModal] = useState(false);
  const [reassignPartnerTarget, setReassignPartnerTarget] = useState<Partner | null>(null);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');

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

  // Filtered partners list for Management
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        searchQuery === '' ||
        p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.partnerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = filterType === 'All' || p.type === filterType;
      const matchPO = filterPortfolioOwner === 'All' || p.portfolioOwnerId === filterPortfolioOwner;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;

      return matchSearch && matchType && matchPO && matchStatus;
    });
  }, [partners, searchQuery, filterType, filterPortfolioOwner, filterStatus]);

  // Leads for the inspected partner or current partner
  const activeInspectedPartner = inspectPartnerId
    ? partners.find((p) => p.partnerId === inspectPartnerId)
    : currentPartnerRecord;

  const partnerLeads = useMemo(() => {
    const targetId = isPartner ? activePartnerId : activeInspectedPartner?.partnerId;
    return students.filter((s) => s.partnerId === targetId);
  }, [students, isPartner, activePartnerId, activeInspectedPartner]);

  // Onboard New Partner Form State
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<any>('Study Abroad Consultant');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPortfolioOwnerId, setNewPortfolioOwnerId] = useState(portfolioOwners[0]?.uid || 'user-po-001');
  const [newCommissionRate, setNewCommissionRate] = useState('20');

  const handleOnboardPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName || !newEmail || !newContactPerson) return;

    const chosenPO = portfolioOwners.find((u) => u.uid === newPortfolioOwnerId);
    const randomSeq = String(Math.floor(10000 + Math.random() * 90000));
    const generatedPartnerId = `PART-${randomSeq}`;

    onboardNewPartner({
      partnerId: generatedPartnerId,
      companyName: newCompanyName,
      type: newPartnerType,
      contactPerson: newContactPerson,
      email: newEmail,
      phone: newPhone || '+44 20 7000 0000',
      countries: ['International'],
      cities: ['Global Hub'],
      portfolioOwnerId: chosenPO?.uid || 'user-po-001',
      portfolioOwnerName: chosenPO?.displayName || 'Beatrice Vance',
      assignedManagerId: chosenPO?.uid || 'user-po-001',
      assignedManagerName: chosenPO?.displayName || 'Beatrice Vance',
      agreementStatus: 'Signed',
      status: 'Active',
      onboardingDate: new Date().toISOString().split('T')[0],
      commissionRate: Number(newCommissionRate) || 20,
    });

    setShowOnboardModal(false);
    setNewCompanyName('');
    setNewContactPerson('');
    setNewEmail('');
    setNewPhone('');
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
      for (const name of possibleNames) {
        const idx = headers.indexOf(name);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const nameIdx = findHeaderIdx('full name', 'name', 'student name', 'student');
    const emailIdx = findHeaderIdx('email', 'email address', 'student email');
    const phoneIdx = findHeaderIdx('phone', 'phone number', 'mobile', 'contact number', 'whatsapp');
    const uniIdx = findHeaderIdx('university', 'uni', 'college', 'institution', 'target university');
    const cityIdx = findHeaderIdx('destination city', 'city', 'destination', 'target city');
    const countryIdx = findHeaderIdx('country', 'destination country', 'target country');
    const intakeIdx = findHeaderIdx('intake', 'session', 'start date', 'term');
    const budgetIdx = findHeaderIdx('budget', 'weekly budget', 'rent budget');
    const moveInIdx = findHeaderIdx('move in date', 'move-in date', 'move in', 'check in date');
    const notesIdx = findHeaderIdx('notes', 'remarks', 'comments', 'preferences');

    const missingHeaders: string[] = [];
    if (nameIdx === -1) missingHeaders.push('Full Name');
    if (emailIdx === -1) missingHeaders.push('Email');
    if (phoneIdx === -1) missingHeaders.push('Phone');
    if (uniIdx === -1) missingHeaders.push('University');
    if (cityIdx === -1) missingHeaders.push('Destination City');

    if (missingHeaders.length > 0) {
      setCsvParseError(`CSV is missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }

    const parsed: any[] = [];
    const errors: any[] = [];
    const duplicates: any[] = [];
    const valid: any[] = [];

    // System email & phone set for duplication checks
    const existingEmails = new Set(students.map((s) => s.email.toLowerCase().trim()));
    const existingPhones = new Set(students.map((s) => s.phone.replace(/\D/g, '')));
    const batchEmails = new Set<string>();
    const batchPhones = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));

      const fullName = cols[nameIdx] || '';
      const email = (cols[emailIdx] || '').toLowerCase().trim();
      const phone = cols[phoneIdx] || '';
      const university = cols[uniIdx] || '';
      const destinationCity = cols[cityIdx] || 'London';
      const destinationCountry = countryIdx !== -1 && cols[countryIdx] ? cols[countryIdx] : 'United Kingdom';
      const intake = intakeIdx !== -1 && cols[intakeIdx] ? cols[intakeIdx] : 'Sep 2026';
      const budget = budgetIdx !== -1 && !isNaN(Number(cols[budgetIdx])) ? Number(cols[budgetIdx]) : 350;
      const moveInDate = moveInIdx !== -1 && cols[moveInIdx] ? cols[moveInIdx] : '2026-09-15';
      const notes = notesIdx !== -1 && cols[notesIdx] ? cols[notesIdx] : '';

      const record = {
        rowNum,
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

      parsed.push(record);

      // Validate required fields
      if (!fullName) {
        errors.push({ row: rowNum, field: 'Full Name', message: 'Full Name is required' });
        continue;
      }
      if (!email || !email.includes('@')) {
        errors.push({ row: rowNum, field: 'Email', message: 'Valid email address is required' });
        continue;
      }
      if (!university) {
        errors.push({ row: rowNum, field: 'University', message: 'Target university is required' });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowNum, field: 'Phone', message: 'Contact phone number is required' });
        continue;
      }

      // Check Duplicates against database or current batch
      const cleanPhone = phone.replace(/\D/g, '');
      if (existingEmails.has(email) || batchEmails.has(email)) {
        duplicates.push({ row: rowNum, email, phone, reason: `Lead with email '${email}' already exists in CRM.` });
        continue;
      }
      if (cleanPhone && (existingPhones.has(cleanPhone) || batchPhones.has(cleanPhone))) {
        duplicates.push({ row: rowNum, email, phone, reason: `Lead with phone '${phone}' already exists in CRM.` });
        continue;
      }

      batchEmails.add(email);
      if (cleanPhone) batchPhones.add(cleanPhone);
      valid.push(record);
    }

    setParsedRows(parsed);
    setValidationErrors(errors);
    setDuplicateRows(duplicates);
    setValidRows(valid);
    setBulkStep(4); // Advance to Preview & Review
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCSVText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleUseSampleCSV = () => {
    const sample =
      'Full Name,Email,Phone,University,Destination City,Country,Intake,Budget,Move In Date,Notes\n' +
      'Karan Varma,karan.varma@example.com,+91 98111 22334,Imperial College London,London,United Kingdom,Sep 2026,420,2026-09-18,Engineering MSc candidate\n' +
      'Pooja Nair,pooja.nair@example.com,+91 98222 33445,University of Manchester,Manchester,United Kingdom,Sep 2026,310,2026-09-10,Requires studio with kitchenette\n' +
      'Harshul Mehta,harshul@hearthaway.com,+44 7700 900123,UCL,London,United Kingdom,Sep 2026,350,2026-09-15,Duplicate test lead\n' +
      'Missing Uni Lead,invalid.student@example.com,+44 7700 900999,,London,United Kingdom,Sep 2026,300,2026-09-15,Error row test\n' +
      'Tariq Mansoor,tariq.m@example.com,+971 55 987 6543,King’s College London,London,United Kingdom,Sep 2026,390,2026-09-20,Finance BSc\n';

    processCSVText(sample, 'sample_partner_leads.csv');
  };

  const handleConfirmImport = () => {
    const targetPartnerId = isPartner ? activePartnerId : activeInspectedPartner?.partnerId;
    const targetPartnerName = isPartner ? currentPartnerRecord?.companyName : activeInspectedPartner?.companyName;

    const result = bulkImportPartnerLeads(validRows, targetPartnerId, targetPartnerName);
    setImportResults(result);
    setBulkStep(8); // Step 8: Show Results
  };

  const handleResetBulkModal = () => {
    setBulkStep(1);
    setCsvFileName('');
    setCsvRawText('');
    setParsedRows([]);
    setValidationErrors([]);
    setDuplicateRows([]);
    setValidRows([]);
    setImportResults(null);
    setShowBulkUploadModal(false);
  };

  // Single Lead Submission State (for Partner)
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePhone, setSinglePhone] = useState('');
  const [singleUni, setSingleUni] = useState('');
  const [singleCity, setSingleCity] = useState('London');
  const [singleIntake, setSingleIntake] = useState('Sep 2026');
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
      destinationCountry: 'United Kingdom',
      destinationCity: singleCity,
      intake: singleIntake,
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
                Manage education consultants, study abroad advisors, and institutional lead providers.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isManagement && (
                <button
                  onClick={() => setShowOnboardModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-3.5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
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
                className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#00319D]" />
                Bulk CSV Upload
              </button>

              {isPartner && (
                <button
                  onClick={() => setShowSingleLeadModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-3.5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
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
                    </div>
                    <p className="text-xs text-[#6B6860]">
                      {currentPartnerRecord?.type || 'Partner'} • Contact: {currentPartnerRecord?.contactPerson || currentUser.displayName} ({currentPartnerRecord?.email || currentUser.email})
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
                  <span className="text-lg font-extrabold text-[#1A1A1A]">{currentPartnerRecord?.commissionRate ?? 10}%</span>
                </div>
              </div>
            </div>

            {/* Submitted Leads Table for Partner */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E8E6E1] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Your Sourced Student Leads</h3>
                  <p className="text-xs text-[#6B6860]">
                    Leads submitted by {currentPartnerRecord?.companyName || currentUser.partnerName || 'your agency'}. Each lead is managed by an assigned internal sales owner.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#00319D]">
                  {partnerLeads.length} Leads
                </span>
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
                              className="text-[11px] font-bold text-[#00319D] hover:underline"
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

        {/* VIEW 2: MANAGEMENT VIEW (Full Partner Management) */}
        {isManagement && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                <input
                  type="text"
                  placeholder="Search partners by agency name, code, contact person, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
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

            {/* Partners Table */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Partner Agency</th>
                      <th className="py-3 px-4 font-bold">Type</th>
                      <th className="py-3 px-4 font-bold">Contact Person</th>
                      <th className="py-3 px-4 font-bold">Portfolio Owner</th>
                      <th className="py-3 px-4 font-bold">Sourced Leads</th>
                      <th className="py-3 px-4 font-bold">Bookings</th>
                      <th className="py-3 px-4 font-bold">Commission</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8E6E1]">
                    {filteredPartners.map((partner) => {
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
                              className="text-[10px] text-[#00319D] hover:underline mt-0.5 block"
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

                          <td className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                            {partner.commissionRate}%
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setInspectPartnerId(partner.partnerId);
                                }}
                                className="rounded-md border border-[#E8E6E1] bg-[#F7F6F3] px-2.5 py-1 text-[11px] font-bold text-[#1A1A1A] hover:bg-[#E8E6E1] transition-colors"
                              >
                                View Leads ({leadsCount})
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: BULK CSV UPLOAD WORKFLOW (All 8 Steps) */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={handleResetBulkModal}
              className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A]"
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
                4. Import Results
              </div>
            </div>

            {/* STEPS 1 & 2: SELECT FILE & DOWNLOAD TEMPLATE */}
            {bulkStep === 1 && (
              <div className="space-y-5">
                {/* Step 2: Download Template */}
                <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-[#00319D]" />
                      Download Standard CSV Template
                    </h4>
                    <p className="text-[11px] text-[#6B6860] mt-0.5">
                      Pre-formatted standard columns: Full Name, Email, Phone, University, Destination City, Country.
                    </p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="rounded-lg bg-[#FFFFFF] border border-[#E8E6E1] px-3 py-1.5 text-xs font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors shrink-0 shadow-2xs"
                  >
                    Download Template (.csv)
                  </button>
                </div>

                {csvParseError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{csvParseError}</span>
                  </div>
                )}

                {/* Step 1: Upload Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[#E8E6E1] hover:border-[#00319D] p-8 text-center cursor-pointer transition-colors bg-[#FFFFFF] hover:bg-[#F7F6F3]/40"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-10 w-10 text-[#00319D] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Select a CSV file from your device</h3>
                  <p className="text-xs text-[#6B6860] mt-1">
                    Drag and drop your file here, or click to browse.
                  </p>
                </div>

                {/* Quick Test with Sample CSV */}
                <div className="text-center pt-1">
                  <span className="text-xs text-[#6B6860] block mb-2">Or test immediately without creating a file:</span>
                  <button
                    type="button"
                    onClick={handleUseSampleCSV}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] shadow-2xs"
                  >
                    <FileText className="h-3.5 w-3.5 text-[#00319D]" />
                    Load Sample Pre-Validated CSV Dataset
                  </button>
                </div>
              </div>
            )}

            {/* STEPS 3, 4, 5, 6: PREVIEW DATA, REVIEW ERRORS, CHECK DUPLICATES */}
            {bulkStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#1A1A1A]">File: {csvFileName}</span>
                    <span className="text-[#6B6860] ml-2">({parsedRows.length} total rows parsed)</span>
                  </div>
                  <button
                    onClick={() => setBulkStep(1)}
                    className="text-[#00319D] font-semibold hover:underline"
                  >
                    Select different file
                  </button>
                </div>

                {/* Summary counts */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Ready to Import</span>
                    <strong className="text-base text-emerald-900">{validRows.length}</strong>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-amber-800 block">Duplicates (Skipped)</span>
                    <strong className="text-base text-amber-900">{duplicateRows.length}</strong>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">Format Errors (Rejected)</span>
                    <strong className="text-base text-rose-900">{validationErrors.length}</strong>
                  </div>
                </div>

                {/* Step 5: Review Errors */}
                {validationErrors.length > 0 && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                      <AlertCircle className="h-4 w-4 text-rose-600" />
                      Row Validation Errors (These rows will be rejected):
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-rose-800 text-[11px]">
                      {validationErrors.map((err, i) => (
                        <li key={i}>
                          <strong>Row {err.row}:</strong> {err.message} (Field: {err.field})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step 6: Check Duplicates */}
                {duplicateRows.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Duplicate Records Detected (These rows will be skipped):
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-amber-800 text-[11px]">
                      {duplicateRows.map((dup, i) => (
                        <li key={i}>
                          <strong>Row {dup.row}:</strong> {dup.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Step 4: Preview parsed table */}
                <div className="border border-[#E8E6E1] rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[9px] font-bold sticky top-0 border-b border-[#E8E6E1]">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Full Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">University</th>
                        <th className="py-2 px-3">City</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1]">
                      {parsedRows.map((r) => {
                        const isErr = validationErrors.some((e) => e.row === r.rowNum);
                        const isDup = duplicateRows.some((d) => d.row === r.rowNum);
                        return (
                          <tr key={r.rowNum} className="hover:bg-[#F7F6F3]/50">
                            <td className="py-2 px-3 text-[#6B6860]">{r.rowNum}</td>
                            <td className="py-2 px-3">
                              {isErr ? (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                                  Error
                                </span>
                              ) : isDup ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                  Duplicate
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                                  Valid
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#1A1A1A]">{r.fullName || '—'}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.email || '—'}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.university || '—'}</td>
                            <td className="py-2 px-3 text-[#6B6860]">{r.destinationCity || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Step 7: Confirm Import Action */}
                <div className="flex items-center justify-between pt-2 border-t border-[#E8E6E1]">
                  <button
                    onClick={handleResetBulkModal}
                    className="rounded-lg border border-[#E8E6E1] px-3.5 py-2 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={validRows.length === 0}
                    className="rounded-lg bg-[#00319D] px-5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors disabled:opacity-50"
                  >
                    Confirm &amp; Import {validRows.length} Valid Leads →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 8: SHOW RESULTS */}
            {bulkStep === 8 && importResults && (
              <div className="space-y-6 text-center py-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Bulk Lead Import Completed!</h3>
                  <p className="text-xs text-[#6B6860] mt-1 max-w-md mx-auto">
                    The imported leads have been stored in the business operations system with the partner relationship and automatically attributed to the Portfolio Owner.
                  </p>
                </div>

                {/* Exact 8-Step Results Breakdown */}
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto text-left">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Imported</span>
                    <strong className="text-lg text-emerald-950">{importResults.importedCount}</strong>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">Leads created</span>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Duplicates</span>
                    <strong className="text-lg text-amber-950">{importResults.duplicatesCount}</strong>
                    <span className="text-[10px] text-amber-700 block mt-0.5">Skipped safely</span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Rejected</span>
                    <strong className="text-lg text-rose-950">{importResults.errorsCount}</strong>
                    <span className="text-[10px] text-rose-700 block mt-0.5">Format errors</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleResetBulkModal}
                    className="rounded-lg bg-[#00319D] px-6 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
                  >
                    Finish &amp; View Leads
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: ONBOARD NEW PARTNER (Management Only) */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Onboard Education Consultant</h3>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="text-[#6B6860] hover:text-[#1A1A1A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardPartner} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-2">
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
                  placeholder="+44 20 7000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
                >
                  Onboard Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REASSIGN PORTFOLIO OWNER (Management Only) */}
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
                className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReassign}
                className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
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
                className="text-[#6B6860] hover:text-[#1A1A1A]"
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
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
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
