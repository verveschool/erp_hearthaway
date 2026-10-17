'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Minimize2,
  Maximize2,
  Copy,
  Check,
  Bot,
  User,
  HelpCircle,
  Building,
  GraduationCap,
  Layers,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useHearthAway } from '@/lib/context';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

let globalMsgCounter = 1;

function createMessage(role: 'user' | 'model', content: string): Message {
  globalMsgCounter += 1;
  let formattedTime = 'Just now';
  if (typeof window !== 'undefined') {
    const d = new Date();
    formattedTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return {
    id: `msg-${globalMsgCounter}-${role}`,
    role,
    content,
    timestamp: formattedTime,
  };
}

function getInitialWelcome(userName?: string, role?: string, path?: string): Message {
  return {
    id: 'welcome-msg',
    role: 'model',
    content: `Hello **${userName || 'there'}**! I am your **HearthAway Support Agent** powered by Gemini.

I am context-aware of your current role (**${role || 'Guest'}**) and workspace (${path || 'Dashboard'}). How can I assist with your accommodation leads, bookings, partner portfolios, or financial settlements today?`,
    timestamp: 'Online',
  };
}

const STORAGE_KEY = 'hearthaway_gemini_support_chat_v1';

export function SupportAgentChatbot() {
  const pathname = usePathname();
  const {
    currentUser,
    students,
    partners,
    bookings,
    payments,
    selectedStudentId,
  } = useHearthAway();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showContextDetails, setShowContextDetails] = useState(false);

  // Active student context if drawer or lead selected
  const activeStudent = React.useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  // Conversation history state loaded from sessionStorage or initialized
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse saved chat history:', e);
      }
    }
    return [getInitialWelcome()];
  });

  // Persist conversation history to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.warn('Failed to save chat history:', e);
      }
    }
  }, [messages]);

  // Auto-scroll to bottom of message list
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Suggested prompt chips based on current path
  const suggestedPrompts = React.useMemo(() => {
    if (pathname.includes('/portfolio')) {
      return [
        'How does Global Lead Search work across portfolios?',
        'Explain the 6-Month Growth Analytics chart.',
        'How do I reassign a partner to another owner?',
      ];
    }
    if (pathname.includes('/sales')) {
      return [
        'What are the stages of lead progression?',
        'How do I confirm a tenancy agreement?',
        'How are leads assigned to sales executives?',
      ];
    }
    if (pathname.includes('/finance')) {
      return [
        'How do I verify a student holding deposit?',
        'What is the partner commission payout workflow?',
        'Explain the remittance audit trail.',
      ];
    }
    if (pathname.includes('/partners')) {
      return [
        'How do I onboard a new B2B agency?',
        'How does bulk student lead import work?',
        'What commission models are supported?',
      ];
    }
    return [
      'What can the HearthAway platform do?',
      'How do role permissions work in HearthAway?',
      'How to book accommodation for an international student?',
    ];
  }, [pathname]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg = createMessage('user', text);
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    try {
      // Build context payload
      const pendingPaymentsCount = payments.filter((p) => p.paymentStatus === 'Pending Verification').length;

      const contextPayload = {
        currentUser: {
          id: currentUser?.uid,
          displayName: currentUser?.displayName,
          email: currentUser?.email,
          role: currentUser?.role,
          partnerName: currentUser?.partnerName,
        },
        currentPath: pathname,
        selectedStudent: activeStudent
          ? {
              id: activeStudent.id,
              studentId: activeStudent.studentId,
              fullName: activeStudent.fullName,
              email: activeStudent.email,
              university: activeStudent.university,
              targetCity: activeStudent.destinationCity,
              bookingStatus: activeStudent.bookingStatus,
              budgetWeekly: activeStudent.budget,
              assignedSalesOwnerName: activeStudent.assignedSalesExecutiveName,
              sourcePartnerName: activeStudent.partnerName,
            }
          : null,
        platformSummary: {
          totalStudents: students.length,
          totalPartners: partners.length,
          totalBookings: bookings.length,
          pendingPayments: pendingPaymentsCount,
        },
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: contextPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const modelMsg = createMessage('model', data.reply || 'No response received from agent.');

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const errorMsg = createMessage(
        'model',
        `I encountered a momentary connectivity issue. Please ensure your network is stable or retry in a moment.\n*(Error: ${err?.message || 'Network error'})*`
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome = getInitialWelcome(currentUser?.displayName, currentUser?.role, pathname);
    setMessages([welcome]);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render simple markdown formatting (bold, bullet points, headers)
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Check for bullet line
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Simple parser for bold **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const lineElements = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="font-bold text-[#1A1A1A]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5">
            <span className="text-[#00319D] font-bold text-xs mt-0.5">•</span>
            <span className="text-xs leading-relaxed text-[#1A1A1A]">{lineElements}</span>
          </div>
        );
      }

      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-[#00319D] mt-2 mb-1">
            {line.trim().replace('### ', '')}
          </h4>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-[#1A1A1A]">
          {lineElements}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        >
          {/* Subtle contextual hint badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E8E6E1] shadow-md px-3 py-1.5 rounded-full text-xs font-medium text-[#1A1A1A] animate-pulse">
            <Sparkles className="h-3.5 w-3.5 text-[#00319D]" />
            <span>AI Support Agent</span>
          </div>

          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="group relative flex h-13 w-13 items-center justify-center rounded-full bg-[#00319D] text-[#FFFFFF] shadow-lg hover:bg-[#00257A] hover:shadow-xl transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#00319D] focus:ring-offset-2"
            aria-label="Open HearthAway Support Agent"
            title="Open HearthAway Support Agent (Gemini)"
          >
            <Sparkles className="h-6 w-6 text-[#FCC20A] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </button>
        </motion.div>
      )}

      {/* Chat Window Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              height: isMinimized ? 'auto' : 580,
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-5 right-5 z-50 w-full sm:w-[420px] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xl overflow-hidden flex flex-col font-sans transition-all`}
          >
            {/* Header */}
            <div className="bg-[#00319D] px-4 py-3 text-[#FFFFFF] flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFFFFF]/15">
                  <Bot className="h-5 w-5 text-[#FCC20A]" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#00319D]"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-[#FFFFFF] tracking-tight">HearthAway Assistant</h3>
                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-[#FFFFFF]/75">
                    Context-Aware Support • Gemini 3.8 Flash
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-[#FFFFFF]/80">
                <button
                  type="button"
                  onClick={() => setShowContextDetails(!showContextDetails)}
                  className={`p-1.5 rounded-md hover:bg-[#FFFFFF]/15 transition-colors cursor-pointer ${
                    showContextDetails ? 'bg-[#FFFFFF]/25 text-[#FCC20A]' : ''
                  }`}
                  title="Toggle context snapshot"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-md hover:bg-[#FFFFFF]/15 transition-colors cursor-pointer"
                  title="Clear conversation history"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-md hover:bg-[#FFFFFF]/15 transition-colors cursor-pointer"
                  title={isMinimized ? 'Expand chat' : 'Minimize chat'}
                >
                  {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-[#FFFFFF]/15 transition-colors cursor-pointer"
                  title="Close support agent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Context Pills Bar */}
            <div className="bg-[#F7F6F3] border-b border-[#E8E6E1] px-3 py-1.5 flex items-center justify-between text-[10px] text-[#6B6860] shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1A1A1A] flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-[#00319D]" />
                  {currentUser?.role || 'Guest'}
                </span>
                <span className="text-[#E8E6E1]">•</span>
                <span className="text-[#6B6860] truncate max-w-[150px]">
                  {pathname === '/' ? 'Sign In Portal' : pathname}
                </span>
              </div>
              {activeStudent && (
                <div className="flex items-center gap-1 bg-[#00319D]/10 text-[#00319D] px-2 py-0.5 rounded-full font-semibold text-[9px] shrink-0">
                  <GraduationCap className="h-2.5 w-2.5" />
                  <span className="truncate max-w-[110px]">{activeStudent.fullName}</span>
                </div>
              )}
            </div>

            {/* Collapsible Context Inspector */}
            {showContextDetails && !isMinimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-[#00319D]/5 border-b border-[#00319D]/15 p-2.5 text-[11px] text-[#1A1A1A] shrink-0"
              >
                <div className="flex items-center justify-between font-bold text-[#00319D] text-[10px] uppercase mb-1">
                  <span>Active Agent Context</span>
                  <span className="text-[9px] lowercase font-normal text-[#6B6860]">synced live</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-[#6B6860]">
                  <div>User: <strong className="text-[#1A1A1A]">{currentUser?.displayName || 'Guest'}</strong></div>
                  <div>Role: <strong className="text-[#1A1A1A]">{currentUser?.role || 'None'}</strong></div>
                  <div>Leads: <strong className="text-[#1A1A1A]">{students.length}</strong></div>
                  <div>Partners: <strong className="text-[#1A1A1A]">{partners.length}</strong></div>
                  {activeStudent && (
                    <div className="col-span-2 text-[#00319D] font-medium pt-0.5">
                      Target Lead: {activeStudent.fullName} ({activeStudent.id}) • {activeStudent.bookingStatus}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {!isMinimized && (
              <>
                {/* Message List */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#FFFFFF]">
                  {messages.map((m) => {
                    const isUser = m.role === 'user';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00319D]/10 text-[#00319D] mt-0.5">
                            <Bot className="h-3.5 w-3.5" />
                          </div>
                        )}

                        <div
                          className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                            isUser
                              ? 'bg-[#00319D] text-[#FFFFFF] rounded-tr-none'
                              : 'bg-[#F7F6F3] border border-[#E8E6E1] text-[#1A1A1A] rounded-tl-none'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          ) : (
                            <div className="space-y-1">
                              {renderFormattedContent(m.content)}
                            </div>
                          )}

                          <div
                            className={`flex items-center justify-between gap-2 mt-1 text-[9px] ${
                              isUser ? 'text-[#FFFFFF]/70' : 'text-[#6B6860]'
                            }`}
                          >
                            <span>{m.timestamp}</span>

                            {!isUser && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(m.id, m.content)}
                                className="opacity-0 group-hover:opacity-100 hover:text-[#00319D] transition-opacity cursor-pointer p-0.5"
                                title="Copy answer"
                              >
                                {copiedId === m.id ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {isUser && (
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FCC20A] text-[#1A1A1A] mt-0.5 font-bold text-[10px]">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-2 justify-start items-center text-[#6B6860]">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#00319D]/10 text-[#00319D]">
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                      <div className="bg-[#F7F6F3] border border-[#E8E6E1] rounded-2xl rounded-tl-none px-3 py-2 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00319D] animate-bounce"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00319D] animate-bounce [animation-delay:0.2s]"></span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#00319D] animate-bounce [animation-delay:0.4s]"></span>
                        <span className="text-[10px] text-[#6B6860] ml-1">Analyzing CRM context...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Suggestion Chips */}
                {suggestedPrompts.length > 0 && (
                  <div className="px-3 py-1.5 bg-[#F7F6F3] border-t border-[#E8E6E1] flex gap-1.5 overflow-x-auto shrink-0">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(prompt)}
                        className="rounded-full bg-[#FFFFFF] border border-[#E8E6E1] px-2.5 py-1 text-[10px] font-medium text-[#1A1A1A] hover:border-[#00319D] hover:text-[#00319D] whitespace-nowrap transition-colors cursor-pointer shrink-0"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="p-3 bg-[#FFFFFF] border-t border-[#E8E6E1] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask HearthAway Support..."
                    disabled={isLoading}
                    className="flex-1 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] px-3.5 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:bg-[#FFFFFF] focus:outline-hidden transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#00319D] text-[#FFFFFF] hover:bg-[#00257A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 shadow-xs"
                    title="Send message"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
