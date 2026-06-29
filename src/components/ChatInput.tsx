'use client';

import React, { useState, useRef, useCallback, memo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Smile, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('./EmojiPicker').then(mod => mod.EmojiPicker), { ssr: false });

interface ChatInputProps {
  onSend: (content: string, replyToId?: string, replyTo?: any) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingImage: boolean;
  replyingTo: any;
  onCancelReply: () => void;
  onEmojiSelect?: (emoji: string) => void;
}

const ChatInputInner = forwardRef<{ focus: () => void; openEmojiPicker?: () => void }, ChatInputProps>(function ChatInputInner(
  { onSend, onImageUpload, uploadingImage, replyingTo, onCancelReply, onEmojiSelect }, ref
) {
  const [input, setInput] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    openEmojiPicker: () => setShowEmojis(true),
  }), []);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const content = input;
    setInput('');
    setShowEmojis(false);
    onSend(content);
  }, [input, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
      e.preventDefault();
      const form = (e.target as HTMLElement).closest('form');
      if (form) form.requestSubmit();
    }
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    if (onEmojiSelect) {
      // Reaction mode: route emoji to the waiting reaction handler
      onEmojiSelect(emoji);
      setShowEmojis(false);
      inputRef.current?.focus();
    } else {
      // Normal mode: insert emoji into text input
      setInput(prev => prev + emoji);
      inputRef.current?.focus();
    }
  }, [onEmojiSelect]);

  const handleCloseEmojis = useCallback(() => {
    setShowEmojis(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="p-3 md:p-6 relative z-10 flex-shrink-0 bg-gradient-to-t from-amber-100/80 to-transparent pt-6">
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="max-w-4xl mx-auto mb-2 px-4 py-2 bg-amber-100 rounded-xl border-l-2 border-amber-500 flex justify-between items-center"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-amber-600 font-bold uppercase">
                Replying to {replyingTo.sender?.display_name || (replyingTo.sender_id === 'You' ? 'You' : 'Someone')}
              </p>
              <p className="text-xs text-amber-700 truncate">
                {replyingTo.message_type === 'image' ? '📷 Photo' : replyingTo.content}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancelReply} className="rounded-full w-6 h-6 ml-2">
              <X className="w-4 h-4 text-zinc-400" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-1 md:gap-2 bg-white p-1.5 md:p-2 rounded-full border-2 border-amber-200 shadow-lg focus-within:border-amber-400/70 transition-colors relative">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="rounded-full hover:bg-amber-100 w-9 h-9 md:w-10 md:h-10"
        >
          {uploadingImage ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full" />
          ) : (
            <Plus className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
          )}
        </Button>
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowEmojis(!showEmojis)}
            className="rounded-full hover:bg-amber-100 w-9 h-9 md:w-10 md:h-10"
          >
            <Smile className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
          </Button>
          <AnimatePresence>
            {showEmojis && (
              <div className="absolute bottom-12 left-0 z-50">
                <EmojiPicker
                  position="top"
                  onSelect={handleEmojiSelect}
                  onClose={handleCloseEmojis}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onCompositionStart={() => { composingRef.current = true; }}
          onCompositionEnd={() => { composingRef.current = false; }}
          onKeyDown={handleKeyDown}
          placeholder="Say something vibey... 💬"
          className="flex-1 border-none bg-transparent focus-visible:ring-0 text-base md:text-lg font-medium text-gray-900 placeholder:text-amber-300 outline-none"
          autoComplete="chrome-off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck="true"
          inputMode="text"
          enterKeyHint="send"
        />
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            type="submit"
            size="icon"
            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 border-0 shadow-lg shadow-amber-500/30"
          >
            <Send className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </Button>
        </motion.div>
      </form>
      <p className="text-center text-amber-400 text-xs mt-2 md:mt-3 font-medium hidden md:block">
        Double-click messages to react ❤️ • Tap to add reactions
      </p>
    </div>
  );
});

export const ChatInput = memo(ChatInputInner);