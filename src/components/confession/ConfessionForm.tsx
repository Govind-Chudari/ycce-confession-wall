'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ConfessionFormProps {
  // We changed the type to match what FeedPage passes down
  onSubmit: (data: { content: string }) => Promise<void>; 
  onCancel?: () => void;
}

export function ConfessionForm({ onSubmit, onCancel }: ConfessionFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Confession cannot be empty');
      return;
    }

    if (content.length > 5000) {
      toast.error('Confession too long (max 5000 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      // FIX: Call the prop function directly instead of fetch()
      await onSubmit({ content }); 
      
      // Reset form on success
      setContent('');
      
      // Note: We don't need toast.success here because the hook usually handles it,
      // but keeping it doesn't hurt.
    } catch (error: any) {
      console.error('Post error:', error);
      toast.error('Failed to post confession');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-zinc-900/50 backdrop-blur-lg rounded-xl p-4 border border-zinc-800"
    >
      <div className="mb-4 relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your confession anonymously..."
          rows={3}
          maxLength={5000}
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none transition-all"
        />
        
        {/* Character Count */}
        <div className="flex items-center justify-end mt-2 px-1">
          <p className={`text-xs ${content.length > 4500 ? 'text-yellow-500' : 'text-zinc-600'}`}>
            {content.length} / 5000
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-purple-900/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Posting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Post Confession
            </>
          )}
        </motion.button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.form>
  );
}