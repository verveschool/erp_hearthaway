'use client';

import React, { useState } from 'react';
import { useHearthAway } from '@/lib/context';
import {
  Archive,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ShieldCheck,
  RotateCcw,
  Eye,
  EyeOff,
  X,
  Tag,
  Filter,
} from 'lucide-react';

export function ArchivalControlModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    students,
    payments,
    bookings,
    currentUser,
    hideTestRecords,
    setHideTestRecords,
    flagRecordForArchival,
    unflagRecordForArchival,
    flagAllTestRecords,
  } = useHearthAway();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'payments' | 'bookings'>('overview');
  const [isFlagging, setIsFlagging] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const flaggedStudents = students.filter((s) => s.isTestRecord || s.archivalStatus === 'Flagged For Archival');
  const flaggedPayments = payments.filter((p) => p.isTestRecord || p.archivalStatus === 'Flagged For Archival');
  const flaggedBookings = bookings.filter((b) => b.isTestRecord || b.archivalStatus === 'Flagged For Archival');
  const totalFlagged = flaggedStudents.length + flaggedPayments.length + flaggedBookings.length;

  const handleRunAudit = async () => {
    setIsFlagging(true);
    setActionSuccess(null);
    try {
      await flagAllTestRecords();
      setActionSuccess('System audit complete! All test records identified & flagged for archival.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsFlagging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#FFFFFF] border border-[#E8E6E1] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8E6E1] px-6 py-4 bg-[#F7F6F3]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00319D]/10 text-[#00319D]">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1A]">Production Readiness & Archival Queue</h2>
              <p className="text-xs text-[#6B6860]">
                Identify, flag, & audit test records while preserving 100% data lineage & audit trail.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B6860] hover:bg-[#E8E6E1] hover:text-[#1A1A1A] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Banner / Toggle */}
        <div className="border-b border-[#E8E6E1] bg-[#FAF8F5] px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHideTestRecords(!hideTestRecords)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hideTestRecords
                  ? 'bg-[#00319D] text-[#FFFFFF] shadow-sm'
                  : 'bg-[#FFFFFF] border border-[#E8E6E1] text-[#1A1A1A] hover:bg-[#E8E6E1]/50'
              }`}
            >
              {hideTestRecords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              <span>{hideTestRecords ? 'Clean Production View (Hiding Test Records)' : 'Audit View (Showing Flagged Test Records)'}</span>
            </button>
            <span className="text-xs text-[#6B6860]">
              Flagged Items: <strong className="text-[#00319D]">{totalFlagged}</strong>
            </span>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isFlagging}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#FCC20A] text-[#1A1A1A] hover:bg-[#e0ab00] transition-colors shadow-sm disabled:opacity-50"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{isFlagging ? 'Scanning System...' : 'Run Production Audit'}</span>
          </button>
        </div>

        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#E8E6E1] px-6 bg-[#FFFFFF] gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-[#00319D] text-[#00319D]'
                : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'border-[#00319D] text-[#00319D]'
                : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Leads ({flaggedStudents.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'payments'
                ? 'border-[#00319D] text-[#00319D]'
                : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Payments ({flaggedPayments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'bookings'
                ? 'border-[#00319D] text-[#00319D]'
                : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <span>Bookings ({flaggedBookings.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3]">
                  <div className="flex items-center justify-between text-xs text-[#6B6860] mb-1">
                    <span>Flagged Leads</span>
                    <FileSpreadsheet className="h-4 w-4 text-[#00319D]" />
                  </div>
                  <div className="text-xl font-bold text-[#1A1A1A]">{flaggedStudents.length}</div>
                  <p className="text-[11px] text-[#6B6860] mt-1">CSV Imports & Role Tests</p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3]">
                  <div className="flex items-center justify-between text-xs text-[#6B6860] mb-1">
                    <span>Flagged Payments</span>
                    <ShieldCheck className="h-4 w-4 text-[#00319D]" />
                  </div>
                  <div className="text-xl font-bold text-[#1A1A1A]">{flaggedPayments.length}</div>
                  <p className="text-[11px] text-[#6B6860] mt-1">Proof Bypasses & Validation</p>
                </div>

                <div className="p-4 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3]">
                  <div className="flex items-center justify-between text-xs text-[#6B6860] mb-1">
                    <span>Flagged Bookings</span>
                    <Tag className="h-4 w-4 text-[#00319D]" />
                  </div>
                  <div className="text-xl font-bold text-[#1A1A1A]">{flaggedBookings.length}</div>
                  <p className="text-[11px] text-[#6B6860] mt-1">Property Booking Tests</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 space-y-3">
                <h3 className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Data Lineage & Production Isolation Governance</span>
                </h3>
                <ul className="text-xs text-[#6B6860] space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-[#1A1A1A]">Data Lineage Preservation:</strong> No historical records are permanently erased from persistent storage. Each test record retains its original upload timestamps, uploader IDs, and audit activity.
                  </li>
                  <li>
                    <strong className="text-[#1A1A1A]">Production Environment Cleanliness:</strong> Toggling <em>Clean Production View</em> filters test records out of default active lists across Portfolio, Partners, Sales, and Finance modules.
                  </li>
                  <li>
                    <strong className="text-[#1A1A1A]">CSV Import Identification:</strong> Any lead uploaded via CSV bulk import or generated for role-based permission verification is tagged with <code>CSV & Permission Test</code> and flagged for archival.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-3">
              {flaggedStudents.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6B6860] border border-dashed border-[#E8E6E1] rounded-xl">
                  No leads are currently flagged for archival.
                </div>
              ) : (
                flaggedStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A1A]">{s.fullName}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {s.archivalTag || 'Flagged Test Lead'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6860] mt-0.5">
                        ID: {s.studentId} | Email: {s.email} | Partner: {s.partnerName || s.partnerId}
                      </p>
                      <p className="text-[10px] text-[#6B6860] mt-0.5 italic">
                        Reason: {s.archivalReason || 'CSV import / testing record'}
                      </p>
                    </div>

                    <button
                      onClick={() => unflagRecordForArchival('student', s.id)}
                      className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#E8E6E1] text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#E8E6E1]/50 flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Unflag</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              {flaggedPayments.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6B6860] border border-dashed border-[#E8E6E1] rounded-xl">
                  No payment records are currently flagged for archival.
                </div>
              ) : (
                flaggedPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A1A]">
                          {p.paymentId} - {p.currency} {p.amount}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {p.archivalTag || 'Flagged Test Payment'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6860] mt-0.5">
                        Student: {p.studentName || p.studentId} | Method: {p.paymentMethod} | Status: {p.paymentStatus}
                      </p>
                      {p.proofBypassReason && (
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          Bypass Reason: {p.proofBypassReason}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => unflagRecordForArchival('payment', p.id)}
                      className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#E8E6E1] text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#E8E6E1]/50 flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Unflag</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-3">
              {flaggedBookings.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6B6860] border border-dashed border-[#E8E6E1] rounded-xl">
                  No property bookings are currently flagged for archival.
                </div>
              ) : (
                flaggedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-[#E8E6E1] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A1A]">
                          {b.bookingId} - {b.propertyName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {b.archivalTag || 'Flagged Test Booking'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B6860] mt-0.5">
                        Student: {b.studentName} | Rent: {b.rentCurrency} {b.rentAmount} ({b.rentFrequency})
                      </p>
                    </div>

                    <button
                      onClick={() => unflagRecordForArchival('booking', b.id)}
                      className="px-2.5 py-1 rounded bg-[#FFFFFF] border border-[#E8E6E1] text-[11px] font-semibold text-[#1A1A1A] hover:bg-[#E8E6E1]/50 flex items-center gap-1 shrink-0"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Unflag</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E8E6E1] px-6 py-3 bg-[#F7F6F3] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#00319D] text-[#FFFFFF] text-xs font-semibold hover:bg-[#002780] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
