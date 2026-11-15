import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Loader2, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import {
  BrandBrief,
  ChatMessage,
  LOGO_STYLE_PRESETS,
  SuggestedBrief,
} from '../types/studio';

interface BrandGuideChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentBrief: BrandBrief;
  onApplyBrief: (suggested: SuggestedBrief, autoGenerate: boolean) => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi there! Not sure what your logo should look like yet? Tell me what your business does, who you serve, or the general mood you're going for—we'll figure out a symbol, style, and color palette together.",
  quickPrompts: [
    'I need help coming up with a logo idea from scratch',
    'Help me pick friendly colors and a style for my shop',
    'I have a company name, suggest visual symbols for it',
  ],
};

export const BrandGuideChat: React.FC<BrandGuideChatProps> = ({
  isOpen,
  onClose,
  currentBrief,
  onApplyBrief,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputText('');
    setChatError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          currentBrief: {
            companyName: currentBrief.companyName,
            description: currentBrief.description,
            stylePreset: currentBrief.stylePreset,
            paletteHint: currentBrief.paletteHint,
          },
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        quickPrompts?: string[];
        suggestedBrief?: SuggestedBrief;
        error?: string;
      };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || 'Unable to reach Gemini Brand Guide.');
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.reply,
        quickPrompts: data.quickPrompts,
        suggestedBrief: data.suggestedBrief,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'Something went wrong talking to Gemini.'
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-[2px]">
      <div
        className="w-full max-w-md h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col"
        role="dialog"
        aria-label="Gemini Brand Guide"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Gemini Brand Guide
              </h2>
              <p className="text-xs text-slate-500">
                Creative partner for shaping your logo brief
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Brand Guide"
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC] flex flex-col gap-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const styleLabel = msg.suggestedBrief
              ? LOGO_STYLE_PRESETS.find((s) => s.id === msg.suggestedBrief!.stylePreset)
                  ?.label || msg.suggestedBrief.stylePreset
              : '';

            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-2.5 ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#4F46E5] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.text}
                </div>

                {!isUser && msg.suggestedBrief?.ready && (
                  <div className="w-full rounded-xl border border-indigo-200 bg-white p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#4F46E5]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Suggested Logo Direction</span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                      {msg.suggestedBrief.companyName && (
                        <div>
                          <span className="font-semibold text-slate-900">Name: </span>
                          <span>{msg.suggestedBrief.companyName}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-900">Style: </span>
                        <span>{styleLabel}</span>
                      </div>
                      {msg.suggestedBrief.paletteHint && (
                        <div>
                          <span className="font-semibold text-slate-900">Colors: </span>
                          <span>{msg.suggestedBrief.paletteHint}</span>
                        </div>
                      )}
                      <p className="pt-1 text-slate-700 leading-relaxed">
                        {msg.suggestedBrief.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onApplyBrief(msg.suggestedBrief!, false)}
                        className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        Apply to Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyBrief(msg.suggestedBrief!, true)}
                        className="h-9 px-3.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <span>Apply & Generate Logos</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {!isUser && msg.quickPrompts && msg.quickPrompts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[92%]">
                    {msg.quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isSending}
                        onClick={() => void sendMessage(prompt)}
                        className="text-left px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#4F46E5] hover:text-[#4F46E5] text-xs text-slate-700 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#4F46E5]" />
              <span>Gemini is thinking through logo ideas...</span>
            </div>
          )}

          {chatError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {chatError}
            </div>
          )}

          <div ref={scrollEndRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(inputText);
          }}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Describe your business or ask for ideas..."
            className="flex-1 h-10 px-3.5 rounded-lg bg-[#F8FAFC] border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F46E5]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            aria-label="Send message"
            className="h-10 px-3.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 text-white text-sm font-medium inline-flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
