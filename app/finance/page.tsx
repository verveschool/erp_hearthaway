'use client';

import { PaymentConversionFields } from '@/components/PaymentConversionFields';
import { conversionText, money, paymentConversion, verifiedReceipts, validateConversion } from '@/lib/payment-money';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { matchesSearch } from '@/lib/utils';

import { WorkspaceNotice } from '@/components/WorkspaceNotice';
import { useWorkspaceView } from '@/hooks/use-workspace-view';

import { WorkspaceMetric } from '@/components/WorkspaceMetric';
import { WorkspaceDialog } from '@/components/WorkspaceDialog';

import React, { useState, useMemo } from 'react';
import { useHearthAway } from '@/lib/context';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  User,
  Building,
  Layers,
  X,
  Download,
} from 'lucide-react';
import { exportToCSV } from '@/lib/export-csv';

export default function FinancePage() {
  const {
    bookings,
    payments,
    students,
    partners,
    currentUser,
    uploadPaymentTransaction,
    verifyPaymentTransaction,
    setSelectedStudentId,
  } = useHearthAway();

  const [activeTab, setActiveTab] = useWorkspaceView<'payments' | 'bookings' | 'commissions'>(currentUser.uid, 'activeTab', 'payments');
  const [searchQuery, setSearchQuery] = useWorkspaceView<string>(currentUser.uid, 'searchQuery', '');
  const [filterPaymentStatus, setFilterPaymentStatus] = useWorkspaceView<string>(currentUser.uid, 'filterPaymentStatus', 'All');
  const [bookingSearch, setBookingSearch] = useWorkspaceView<string>(currentUser.uid, 'bookingSearch', '');
  const [commissionSearch, setCommissionSearch] = useWorkspaceView<string>(currentUser.uid, 'commissionSearch', '');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [notice, setNotice] = useState('');
  const [reviewing, setReviewing] = useState<string[]>([]);
  const [reviewErrors, setReviewErrors] = useState<Record<string, string>>({});
  const [recordError, setRecordError] = useState('');

  // New Payment state
  const [recordStudentId, setRecordStudentId] = useState('');
  const [recordAmount, setRecordAmount] = useState('');
  const [rate, setRate] = useState('');
  const [recordCurrency, setRecordCurrency] = useState('GBP');
  const [recordMethod, setRecordMethod] = useState<'Bank Transfer' | 'Credit Card' | 'Online Gateway' | 'Direct Debit' | 'UPI'>('Bank Transfer');
  const [recordRemarks, setRecordRemarks] = useState('');

  // Key Finance Metrics
  const metrics = useMemo(() => {
    const totalPaymentsReceived = verifiedReceipts(payments);

    const pendingVerificationCount = payments.filter((p) => p.paymentStatus === 'Pending Verification').length;

    const totalCommissionsExpected = bookings.reduce(
      (sum, b) => sum + (b.providerCommissionExpected || 0),
      0
    );

    const totalPartnerPayouts = bookings.reduce(
      (sum, b) => sum + (b.partnerPayoutAmount || 0),
      0
    );

    return {
      totalPaymentsReceived,
      pendingVerificationCount,
      totalCommissionsExpected,
      totalPartnerPayouts,
      bookingsCount: bookings.length,
    };
  }, [payments, bookings]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch = matchesSearch(searchQuery, [p.paymentId, p.studentId, p.studentName, p.uploadedBy]);

      const matchStatus = filterPaymentStatus === 'All' || p.paymentStatus === filterPaymentStatus;

      return matchSearch && matchStatus;
    });
  }, [payments, searchQuery, filterPaymentStatus]);

  // Partner Commission Rollup
  const partnerCommissionLedger = useMemo(() => {
    return partners.map((partner) => {
      const partnerBookings = bookings.filter((b) => b.partnerId === partner.partnerId);
      const bookedCount = partnerBookings.length;
      const grossValue = partnerBookings.reduce((sum, b) => sum + (b.bookingValue || 0), 0);
      const expectedHearthAwayCommission = partnerBookings.reduce((sum, b) => sum + (b.providerCommissionExpected || 0), 0);
      const partnerPayable = partnerBookings.reduce((sum, b) => sum + (b.partnerPayoutAmount || 0), 0);

      return {
        ...partner,
        bookedCount,
        grossValue,
        expectedHearthAwayCommission,
        partnerPayable,
      };
    });
  }, [partners, bookings]);

  const visibleBookings = bookings.filter(booking => matchesSearch(bookingSearch, [booking.bookingId, booking.bookingReference, booking.studentName, booking.studentId, booking.partnerName, booking.propertyName, booking.bookingStatus]));
  const visibleCommissions = partnerCommissionLedger.filter(partner => matchesSearch(commissionSearch, [partner.companyName, partner.partnerId, partner.portfolioOwnerName]));

  const closeRecordModal = () => {
    if (recordingPayment) return;
    setShowRecordModal(false);
    setRecordError('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (recordingPayment || !recordStudentId || !recordAmount) return;

    const enteredInr = Number(new FormData(e.currentTarget as HTMLFormElement).get('amountInr'));
    setRecordingPayment(true);
    setRecordError('');
    try {
      const conversion = validateConversion(Number(recordAmount), recordCurrency, Number(rate), enteredInr);
      await uploadPaymentTransaction({
        ...conversion,
        studentId: recordStudentId,
        amount: Number(recordAmount),
        currency: recordCurrency,
        paymentMethod: recordMethod,
        remarks: recordRemarks || 'Direct recorded by Finance Team.',
      });
      setShowRecordModal(false);
      setNotice('Payment recorded.');
      setRate('');
      setRecordAmount('');
      setRecordRemarks('');
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : 'Payment could not be recorded. Try again.');
    } finally {
      setRecordingPayment(false);
    }
  };

  async function reviewPayment(id: string, decision: 'Verified' | 'Rejected') {
    if (reviewing.includes(id)) return;
    setReviewing(ids => [...ids, id]);
    setReviewErrors(errors => ({ ...errors, [id]: '' }));
    try {
      await verifyPaymentTransaction(id, decision, decision === 'Verified' ? 'Verified by Finance' : 'Insufficient proof of transfer');
      setNotice(`Payment ${id} ${decision.toLowerCase()}.`);
    } catch {
      setReviewErrors(errors => ({ ...errors, [id]: 'Review could not be saved. Try again.' }));
    } finally {
      setReviewing(ids => ids.filter(value => value !== id));
    }
  }

  const handleExportPaymentsCSV = () => {
    exportToCSV(
      `hearthaway-payments-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Payment ID', accessor: (p) => p.paymentId },
        { header: 'Student ID', accessor: (p) => p.studentId },
        { header: 'Student Name', accessor: (p) => p.studentName || '' },
        { header: 'Amount', accessor: (p) => p.amount },
        { header: 'Currency', accessor: (p) => p.currency },
        { header: 'INR per currency unit', accessor: (p) => paymentConversion(p).rateToInr },
        { header: 'Amount in INR', accessor: (p) => paymentConversion(p).amountInr },
        { header: 'Payment Method', accessor: (p) => p.paymentMethod },
        { header: 'Payment Date', accessor: (p) => p.paymentDate },
        { header: 'Uploaded By', accessor: (p) => p.uploadedBy },
        { header: 'Payment Status', accessor: (p) => p.paymentStatus },
        { header: 'Verified By', accessor: (p) => p.verifiedBy || '' },
        { header: 'Verification Time', accessor: (p) => p.verificationTimestamp || '' },
        { header: 'Remarks', accessor: (p) => p.remarks || '' },
      ],
      filteredPayments
    );
  };

  const handleExportBookingsCSV = () => {
    exportToCSV(
      `hearthaway-bookings-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Booking ID', accessor: (b) => b.bookingId },
        { header: 'Booking Reference', accessor: (b) => b.bookingReference || '' },
        { header: 'Student ID', accessor: (b) => b.studentId },
        { header: 'Student Name', accessor: (b) => b.studentName },
        { header: 'Sourcing Partner', accessor: (b) => b.partnerName || b.partnerId },
        { header: 'Partner ID', accessor: (b) => b.partnerId },
        { header: 'Property Name', accessor: (b) => b.propertyName },
        { header: 'Property Address', accessor: (b) => b.propertyAddress },
        { header: 'Booking Value (£)', accessor: (b) => b.bookingValue },
        { header: 'Commission Expected (£)', accessor: (b) => b.providerCommissionExpected || 0 },
        { header: 'Commission (%)', accessor: (b) => b.providerCommissionPercent || 0 },
        { header: 'Partner Payout (£)', accessor: (b) => b.partnerPayoutAmount || 0 },
        { header: 'Tenancy Start', accessor: (b) => b.tenancyStartDate },
        { header: 'Tenancy End', accessor: (b) => b.tenancyEndDate },
        { header: 'Booking Status', accessor: (b) => b.bookingStatus },
      ],
      visibleBookings
    );
  };

  const handleExportCommissionsCSV = () => {
    exportToCSV(
      `hearthaway-partner-commissions-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Partner ID', accessor: (p) => p.partnerId },
        { header: 'Company Name', accessor: (p) => p.companyName },
        { header: 'Portfolio Owner', accessor: (p) => p.portfolioOwnerName || '' },
        { header: 'Booked Count', accessor: (p) => p.bookedCount },
        { header: 'Gross Booking Value (£)', accessor: (p) => p.grossValue },
        { header: 'HearthAway Commission (£)', accessor: (p) => p.expectedHearthAwayCommission },
        { header: 'Partner Payable (£)', accessor: (p) => p.partnerPayable },
        { header: 'Commission Rate (%)', accessor: (p) => `${p.commissionRate}%` },
      ],
      visibleCommissions
    );
  };

  return (
    <div className="ha-workspace workspace-compact finance-workspace">
      <WorkspaceNotice message={notice} clear={setNotice} />
      {/* Top Header */}
      <div className="ha-page-header">
        <div>
          <div className="workspace-heading">
            <div>
              <h1 className="ha-title">
                Finance
              </h1>
            </div>

            <button
              onClick={() => {
                setRecordStudentId((id) => students.some((student) => student.studentId === id) ? id : students[0]?.studentId || '');
                setShowRecordModal(true);
              }}
              className="ha-primary-action workspace-primary" title="Record payment" aria-label="Record payment"
            >
              <Plus size={21} aria-hidden="true" />
              <span className="workspace-action-text">Record payment</span>
            </button>
          </div>

          {/* Metrics Ribbon */}
          <dl className="ha-metrics workspace-metrics mt-2">
            <WorkspaceMetric label="Verified Receipts">{metrics.totalPaymentsReceived.rupees}<small className="block text-xs">{metrics.totalPaymentsReceived.native}</small></WorkspaceMetric>
            <WorkspaceMetric label="Pending Verification">{metrics.pendingVerificationCount}</WorkspaceMetric>
            <WorkspaceMetric label="Gross Commission">£{metrics.totalCommissionsExpected.toLocaleString()}</WorkspaceMetric>
            <WorkspaceMetric label="Partner Payouts Payable">£{metrics.totalPartnerPayouts.toLocaleString()}</WorkspaceMetric>
          </dl>

          {/* Sub-Tabs */}
          <div className="ha-tabs workspace-tabs mt-2 text-sm font-semibold">
            <button
              aria-pressed={activeTab === 'payments'}
              onClick={() => setActiveTab('payments')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'payments'
                  ? 'border-[#00319D] text-[#00319D]'
                  : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
              }`}
            >
              Payments
            </button>
            <button
              aria-pressed={activeTab === 'bookings'}
              onClick={() => setActiveTab('bookings')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'bookings'
                  ? 'border-[#00319D] text-[#00319D]'
                  : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
              }`}
            >
              Bookings
            </button>
            <button
              aria-pressed={activeTab === 'commissions'}
              onClick={() => setActiveTab('commissions')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'commissions'
                  ? 'border-[#00319D] text-[#00319D]'
                  : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
              }`}
            >
              Commissions
            </button>
          </div>
        </div>
      </div>

      <div className="workspace-content">
        {/* TAB 1: PAYMENTS LEDGER */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="workspace-toolbar finance-toolbar">
              <WorkspaceSearch label="Search payments" placeholder="Search payments" value={searchQuery} onChange={setSearchQuery} />

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter by payment status"
                  value={filterPaymentStatus}
                  onChange={(e) => setFilterPaymentStatus(e.target.value)}
                  className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Verification">Pending Verification</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                </select>
                {filterPaymentStatus !== 'All' && <button type="button" className="ha-text-action" onClick={() => setFilterPaymentStatus('All')}>Clear filter</button>}

                <button
                  onClick={handleExportPaymentsCSV}
                  disabled={filteredPayments.length === 0}
                  className="workspace-icon-button" aria-label="Export CSV"
                  title="Download payments table as CSV"
                >
                  <Download size={20} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="ha-table-scroll">
                <table className="ha-table finance-ledger" role="table">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3 px-4 font-bold">Payment ID</th>
                      <th scope="col" className="py-3 px-4 font-bold">Student Lead</th>
                      <th scope="col" className="py-3 px-4 font-bold">Amount</th>
                      <th scope="col" className="py-3 px-4 font-bold">Method</th>
                      <th scope="col" className="py-3 px-4 font-bold">Date &amp; Time</th>
                      <th scope="col" className="py-3 px-4 font-bold">Status</th>
                      <th scope="col" className="py-3 px-4 font-bold text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className="divide-y divide-[#E8E6E1]">
                    {filteredPayments.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ha-secondary">{searchQuery || filterPaymentStatus !== 'All' ? 'No payments match these filters.' : 'No payments recorded yet.'}</td></tr>}
                  {filteredPayments.map((payment) => (
                      <tr role="row" key={payment.id} className="hover:bg-[#F7F6F3]/50">
                        <td role="cell" data-label="Payment ID" className="py-3.5 px-4 font-mono font-bold text-[#00319D]">
                          {payment.paymentId}
                        </td>

                        <td role="cell" data-label="Student" className="py-3.5 px-4">
                          <div className="font-bold text-[#1A1A1A]">
                            {payment.studentName || payment.studentId}
                          </div>
                          <span className="font-mono text-xs text-[#6B6860]">{payment.studentId}</span>
                        </td>

                        <td role="cell" data-label="Amount" className="py-3.5 px-4">
                          <span className="whitespace-nowrap tabular-nums font-semibold text-sm text-ha-ink">
                            {money(payment.amount, payment.currency)}
                          </span>
                          <span className="text-xs text-[#6B6860] ml-1">{payment.currency.toUpperCase()}</span>
                          <small className="block text-xs">{conversionText(payment)}</small>
                        </td>

                        <td role="cell" data-label="Method" className="py-3.5 px-4 text-[#6B6860]">{payment.paymentMethod}</td>

                        <td role="cell" data-label="Date and uploader" className="py-3.5 px-4 text-[#6B6860]">
                          <div>{payment.paymentDate}</div>
                          <div className="text-xs">{payment.uploadedBy}</div>
                        </td>

                        <td role="cell" data-label="Status" className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              payment.paymentStatus === 'Verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : payment.paymentStatus === 'Pending Verification'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {payment.paymentStatus}
                          </span>
                        </td>

                        <td role="cell" data-label="Verification" className="py-3.5 px-4 text-right">
                          {payment.paymentStatus === 'Pending Verification' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              {reviewing.includes(payment.paymentId) && <span role="status">Saving…</span>}
                              {reviewErrors[payment.paymentId] && <span role="alert">{reviewErrors[payment.paymentId]}</span>}
                              <button
                                disabled={reviewing.includes(payment.paymentId)} onClick={() => reviewPayment(payment.paymentId, 'Verified')}
                                className="rounded bg-emerald-600 px-2 py-1 text-xs font-bold text-[#FFFFFF] hover:bg-emerald-700 transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                disabled={reviewing.includes(payment.paymentId)} onClick={() => reviewPayment(payment.paymentId, 'Rejected')}
                                className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6B6860] font-medium">
                              {payment.verifiedBy || 'Processed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS LEDGER */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="workspace-toolbar finance-toolbar">
              <WorkspaceSearch label="Search bookings" placeholder="Search bookings" value={bookingSearch} onChange={setBookingSearch} />
              <button
                onClick={handleExportBookingsCSV}
                disabled={visibleBookings.length === 0}
                className="workspace-icon-button" aria-label="Export CSV"
                title="Download bookings table as CSV"
              >
                <Download size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="ha-table-scroll">
                <table className="ha-table finance-ledger" role="table">
                <thead>
                  <tr>
                    <th scope="col" className="py-3 px-4 font-bold">Booking ID</th>
                    <th scope="col" className="py-3 px-4 font-bold">Student Name</th>
                    <th scope="col" className="py-3 px-4 font-bold">Sourcing Partner</th>
                    <th scope="col" className="py-3 px-4 font-bold">Booking Value</th>
                    <th scope="col" className="py-3 px-4 font-bold">HearthAway Commission</th>
                    <th scope="col" className="py-3 px-4 font-bold">Partner Payout</th>
                    <th scope="col" className="py-3 px-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody role="rowgroup" className="divide-y divide-[#E8E6E1]">
                  {visibleBookings.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-ha-secondary">{bookingSearch ? 'No bookings match this search.' : 'No bookings recorded yet.'}</td></tr>}
                  {visibleBookings.map((booking) => (
                    <tr role="row" key={booking.id} className="hover:bg-[#F7F6F3]/50">
                      <td role="cell" data-label="Booking ID" className="py-3.5 px-4 font-mono font-bold text-[#00319D]">{booking.bookingId}</td>
                      <td role="cell" data-label="Student" className="py-3.5 px-4">
                        <button type="button" className="font-semibold text-ha-blue hover:underline text-left" onClick={() => setSelectedStudentId(booking.studentId)}>{booking.studentName}</button>
                        <span className="font-mono text-xs text-[#6B6860]">{booking.studentId}</span>
                      </td>
                      <td role="cell" data-label="Partner" className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1A1A]">
                          {booking.partnerName || booking.partnerId}
                        </div>
                        <span className="font-mono text-xs text-[#6B6860]">{booking.partnerId}</span>
                      </td>
                      <td role="cell" data-label="Booking value" className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                        £{booking.bookingValue.toLocaleString()}
                      </td>
                      <td role="cell" data-label="Commission" className="py-3.5 px-4 font-bold text-[#00319D]">
                        £{(booking.providerCommissionExpected || 0).toLocaleString()} ({booking.providerCommissionPercent}%)
                      </td>
                      <td role="cell" data-label="Partner payout" className="py-3.5 px-4 font-bold text-emerald-700">
                        £{(booking.partnerPayoutAmount || 0).toLocaleString()} ({booking.partnerPayoutPercent}%)
                      </td>
                      <td role="cell" data-label="Status" className="py-3.5 px-4">
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold ${booking.bookingStatus === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' : booking.bookingStatus === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>
                          {booking.bookingStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}

        {/* TAB 3: PARTNER COMMISSIONS */}
        {activeTab === 'commissions' && (
          <div className="space-y-4">
            <div className="workspace-toolbar finance-toolbar">
              <WorkspaceSearch label="Search commissions" placeholder="Search commissions" value={commissionSearch} onChange={setCommissionSearch} />
              <button
                onClick={handleExportCommissionsCSV}
                disabled={visibleCommissions.length === 0}
                className="workspace-icon-button" aria-label="Export CSV"
                title="Download partner commission ledger as CSV"
              >
                <Download size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
              <div className="ha-table-scroll">
                <table className="ha-table finance-ledger" role="table">
                <thead>
                  <tr>
                    <th scope="col" className="py-3 px-4 font-bold">Partner Agency</th>
                    <th scope="col" className="py-3 px-4 font-bold">Portfolio Owner</th>
                    <th scope="col" className="py-3 px-4 font-bold">Booked Tenancies</th>
                    <th scope="col" className="py-3 px-4 font-bold">Gross Booking Value</th>
                    <th scope="col" className="py-3 px-4 font-bold">Expected Revenue</th>
                    <th scope="col" className="py-3 px-4 font-bold">Partner Payout Due</th>
                  </tr>
                </thead>
                <tbody role="rowgroup" className="divide-y divide-[#E8E6E1]">
                  {visibleCommissions.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ha-secondary">{commissionSearch ? 'No partners match this search.' : 'No partner commissions to display.'}</td></tr>}
                  {visibleCommissions.map((partner) => (
                    <tr role="row" key={partner.id} className="hover:bg-[#F7F6F3]/50">
                      <td role="cell" data-label="Partner" className="py-3.5 px-4">
                        <div className="font-bold text-[#1A1A1A]">{partner.companyName}</div>
                        <span className="font-mono text-xs text-[#00319D]">{partner.partnerId}</span>
                      </td>
                      <td role="cell" data-label="Portfolio owner" className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#1A1A1A]">
                          <Layers className="h-3 w-3 text-[#00319D]" />
                          {partner.portfolioOwnerName || 'Unassigned'}
                        </span>
                      </td>
                      <td role="cell" data-label="Tenancies" className="py-3.5 px-4 font-bold text-[#1A1A1A]">{partner.bookedCount}</td>
                      <td role="cell" data-label="Booking value" className="py-3.5 px-4 font-bold text-[#1A1A1A]">
                        £{partner.grossValue.toLocaleString()}
                      </td>
                      <td role="cell" data-label="Expected revenue" className="py-3.5 px-4 font-bold text-[#00319D]">
                        £{partner.expectedHearthAwayCommission.toLocaleString()}
                      </td>
                      <td role="cell" data-label="Payout due" className="py-3.5 px-4 font-bold text-emerald-700">
                        £{partner.partnerPayable.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      {showRecordModal && (
        <WorkspaceDialog label="Record student payment" onDismiss={closeRecordModal}>
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1A1A1A]">Record Student Payment</h3>
              <button aria-label="Close dialog" onClick={closeRecordModal} disabled={recordingPayment} className="text-[#6B6860] hover:text-[#1A1A1A]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} aria-busy={recordingPayment} className="space-y-3">
              {recordError && <p role="alert" className="text-sm text-rose-700">{recordError}</p>}
              <div>
                <label htmlFor="finance-record-student-id" className="block text-xs font-semibold text-[#1A1A1A] mb-1">Student Lead</label>
                <select
                  id="finance-record-student-id"
                  required
                  value={recordStudentId}
                  onChange={(e) => setRecordStudentId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                >
                  <option value="" disabled>Select a student lead</option>
                  {students.map((s) => (
                    <option key={s.studentId} value={s.studentId}>
                      {s.fullName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="finance-record-amount" className="block text-xs font-semibold text-[#1A1A1A] mb-1">Amount</label>
                  <input
                    id="finance-record-amount"
                    type="number"
                    required
                    min="0.01" step="0.01" placeholder="0.00"
                    value={recordAmount}
                    onChange={(e) => setRecordAmount(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="finance-record-currency" className="block text-xs font-semibold text-[#1A1A1A] mb-1">Currency</label>
                  <select
                    id="finance-record-currency"
                    value={recordCurrency}
                    onChange={(e) => { setRecordCurrency(e.target.value); setRate(''); }}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <PaymentConversionFields amount={recordAmount} currency={recordCurrency} rate={rate} onRate={setRate} />
              <div>
                <label htmlFor="finance-record-method" className="block text-xs font-semibold text-[#1A1A1A] mb-1">Payment Method</label>
                <select
                  id="finance-record-method"
                  value={recordMethod}
                  onChange={(e) => setRecordMethod(e.target.value as any)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Online Gateway">Online Gateway</option>
                  <option value="Direct Debit">Direct Debit</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label htmlFor="finance-record-remarks" className="block text-xs font-semibold text-[#1A1A1A] mb-1">Remarks / Reference</label>
                <input
                  id="finance-record-remarks"
                  type="text"
                  placeholder="e.g. Booking deposit payment receipt #4029"
                  value={recordRemarks}
                  onChange={(e) => setRecordRemarks(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRecordModal} disabled={recordingPayment}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
