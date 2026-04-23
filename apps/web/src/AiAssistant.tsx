import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type Step = 'Brief' | 'Investigate' | 'Decide' | 'Feedback';

interface AiAssistantProps {
  apiUrl: string;
  scenarioId: string | null;
  scenarioTitle: string;
  step: Step;
  selectedEvidence: string[];
  hidden: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const QUICK_PROMPTS: Record<Step, string[]> = {
  Brief: [
    'What should I focus on first?',
    'Explain the stakes of this scenario',
  ],
  Investigate: [
    'Why is this evidence relevant?',
    'What am I missing?',
  ],
  Decide: [
    'Is my response complete?',
    'Help me structure my dependency trace',
  ],
  Feedback: [
    'Explain this score',
    'What should I improve?',
  ],
};

// Configure marked for safe, compact rendering
marked.setOptions({ gfm: true, breaks: true });

/** Render markdown to sanitized HTML */
function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote', 'h3', 'h4'], ALLOWED_ATTR: ['href', 'target', 'rel'] });
}

export default function AiAssistant({ apiUrl, scenarioId, scenarioTitle, step, selectedEvidence, hidden }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevScenarioRef = useRef(scenarioId);

  // Clear messages on scenario change
  useEffect(() => {
    if (scenarioId !== prevScenarioRef.current) {
      setMessages([]);
      prevScenarioRef.current = scenarioId;
    }
  }, [scenarioId]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Memoize rendered HTML per message list snapshot
  const renderedMessages = useMemo(
    () => messages.map(m => m.role === 'assistant' && m.text ? renderMarkdown(m.text) : ''),
    [messages],
  );

  const clearChat = useCallback(() => {
    if (streaming && abortRef.current) abortRef.current.abort();
    setMessages([]);
    setInput('');
  }, [streaming]);

  const saveChat = useCallback(() => {
    if (messages.length === 0) return;
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const header = `OmniMentor AI Assistant — ${scenarioTitle || 'General'}\nExported: ${new Date().toLocaleString()}\nStep: ${step}\n${'─'.repeat(50)}\n\n`;
    const body = messages.map(m => `${m.role === 'user' ? '🧑 You' : '🤖 Assistant'}:\n${m.text}\n`).join('\n');
    const blob = new Blob([header + body], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `omnimentor-chat-${ts}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [messages, scenarioTitle, step]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !scenarioId || streaming) return;

    const userMsg: Message = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);

    // Add placeholder assistant message
    setMessages(prev => [...prev, { role: 'assistant', text: '' }]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${apiUrl}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          step: step.toLowerCase(),
          selectedEvidence,
          question: text.trim(),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        await res.text();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', text: `Sorry, I couldn't process that. ${res.status === 502 ? 'Ollama may not be running.' : ''}` };
          return updated;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.token) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, text: last.text + data.token };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', text: 'Connection lost. Please try again.' };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [apiUrl, scenarioId, step, selectedEvidence, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          data-testid="ai-assistant-fab"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)',
            color: '#fff',
          }}
          aria-label="Open AI Assistant"
          title="AI Assistant"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          data-testid="ai-assistant-panel"
          className="fixed bottom-6 right-6 z-40 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: '370px',
            height: '480px',
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--line, rgba(148,163,184,0.15))',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)' }}>
            <div className="flex items-center gap-2 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="font-semibold text-sm">AI Assistant</span>
              <span className="text-[10px] opacity-75 bg-white/20 rounded-full px-2 py-0.5">{step}</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Save chat */}
              <button
                onClick={saveChat}
                disabled={messages.length === 0}
                data-testid="ai-assistant-save"
                className="text-white/70 hover:text-white transition-colors disabled:opacity-30 p-1"
                aria-label="Save chat"
                title="Save chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
              {/* Clear chat */}
              <button
                onClick={clearChat}
                disabled={messages.length === 0 && !input}
                data-testid="ai-assistant-clear"
                className="text-white/70 hover:text-white transition-colors disabled:opacity-30 p-1"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
              {/* Close panel */}
              <button
                onClick={() => setOpen(false)}
                data-testid="ai-assistant-close"
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Close AI Assistant"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Saved toast */}
          {showSaved && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg z-50 animate-pulse">
              Chat saved ✓
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[var(--text-2)] text-sm mb-1">
                  {scenarioId ? `Working on: ${scenarioTitle}` : 'Select a scenario to get started'}
                </p>
                <p className="text-[var(--text-3)] text-xs">
                  Ask me about the scenario, evidence, or your response.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'text-[var(--text-1)] ai-md'
                  }`}
                  style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)'
                      : 'var(--hover-bg, rgba(148,163,184,0.08))',
                  }}
                >
                  {msg.role === 'assistant' ? (
                    msg.text ? (
                      <div dangerouslySetInnerHTML={{ __html: renderedMessages[i] }} />
                    ) : streaming && i === messages.length - 1 ? (
                      <span className="inline-flex gap-1">
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</span>
                        <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</span>
                      </span>
                    ) : null
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          {messages.length === 0 && scenarioId && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS[step].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-[color:var(--line)] text-[var(--text-2)] hover:bg-[var(--hover-bg)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--line, rgba(148,163,184,0.15))' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={scenarioId ? 'Ask about this scenario...' : 'Select a scenario first'}
                disabled={!scenarioId || streaming}
                data-testid="ai-assistant-input"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--hover-bg, rgba(148,163,184,0.08))',
                  color: 'var(--text-1)',
                  border: '1px solid var(--line, rgba(148,163,184,0.15))',
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || !scenarioId || streaming}
                data-testid="ai-assistant-send"
                className="rounded-lg px-3 py-2 text-sm font-medium text-white transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #6366f1 0%, #14b8a6 100%)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
