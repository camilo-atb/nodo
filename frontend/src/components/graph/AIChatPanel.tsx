/**
 * AIChatPanel — floating chat bubble over the graph.
 * Talks to POST /v1/_debug/chat for AI-powered match recommendations.
 */

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPanelProps {
  suggestionId?: string | null;
}

export function AIChatPanel({ suggestionId }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'user', content: text };
    const historyBefore = messages.slice();
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await apiFetch<{ reply: string }>('/v1/_debug/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: historyBefore,
          ...(suggestionId && { suggestionId }),
        }),
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setMessages((prev) => [...prev, { role: 'assistant', content: `⚠ ${errorMsg}` }]);
    }

    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105
          bg-[#12c7e5] text-[#001a20]"
        aria-label="AI Assistant"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-[60] w-[340px] max-h-[460px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden
          bg-white border-gray-200
          dark:bg-[#0d1116] dark:border-[#202832]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#202832]">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#12c7e5]/10 text-[#12c7e5] text-xs">✦</span>
              <span className="text-xs font-semibold text-[#111318] dark:text-[#f4f6f8]">Nodo AI</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm transition-colors"
            >✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-[200px] max-h-[320px]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-10 h-10 rounded-xl bg-[#12c7e5]/10 flex items-center justify-center mb-3">
                  <span className="text-[#12c7e5] text-lg">✦</span>
                </div>
                <p className="text-xs font-medium text-[#111318] dark:text-[#f4f6f8] mb-1">Match Assistant</p>
                <p className="text-[10px] text-gray-400 dark:text-[#68717d] max-w-[220px] leading-relaxed">
                  Ask me who you should team up with, what teams need your skills, or why someone was recommended.
                </p>
                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                  {['Who needs my skills?', 'Recommend a team', 'Who is looking?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); inputRef.current?.focus(); }}
                      className="px-2 py-1 rounded-md text-[9px] border transition-colors
                        border-gray-200 text-gray-500 hover:border-[#12c7e5] hover:text-[#12c7e5]
                        dark:border-[#202832] dark:text-[#9da6b1] dark:hover:border-[#12c7e5] dark:hover:text-[#12c7e5]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-auto bg-[#12c7e5] text-[#001a20]'
                    : 'mr-auto bg-gray-100 text-[#111318] dark:bg-[#15191e] dark:text-[#f4f6f8]'
                }`}
              >
                {msg.content}
              </div>
            ))}

            {sending && (
              <div className="mr-auto px-3 py-2 rounded-xl text-xs bg-gray-100 dark:bg-[#15191e] text-gray-400 dark:text-[#68717d]">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>·</span>
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 dark:border-[#202832]">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about matches..."
                className="flex-1 h-9 rounded-lg px-3 text-xs border focus:outline-none focus:ring-1 focus:ring-[#12c7e5]
                  bg-gray-50 border-gray-200 text-[#111318] placeholder:text-gray-400
                  dark:bg-[#15191e] dark:border-[#20262d] dark:text-[#f4f6f8] dark:placeholder:text-[#68717d]"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="h-9 w-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40
                  bg-[#12c7e5] text-[#001a20] hover:bg-[#0fb5d0]"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
