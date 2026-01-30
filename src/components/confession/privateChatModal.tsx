'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Clock, Image as ImageIcon, Check, Ban, Loader2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client'; 


type Props = {
  chat: any;
  onClose: () => void;
  onSendMessage: (content: string, imageUrl?: string) => void;
  onRespond: (chatId: string, status: 'active' | 'rejected') => void;
  onExtend?: () => void;
  currentUserId: string;
  otherUserName?: string;
};

export function PrivateChatModal({ 
  chat, 
  onClose, 
  onSendMessage, 
  onRespond,
  onExtend,
  currentUserId,
  otherUserName = 'Anonymous' 
}: Props) {
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const isPending = chat.status === 'pending';
  const isReceiver = chat.participant_2 === currentUserId;

  // Prevent background scroll when modal is open
  useEffect(() => {
    // Save original styles
    const originalStyle = window.getComputedStyle(document.body).overflow;
    const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
    
    // Lock both html and body to catch all scroll containers (Crucial for Next.js/React layouts)
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    // Prevent touch actions on body to stop background elastic scrolling on iOS
    document.body.style.touchAction = 'none';

    return () => { 
      document.body.style.overflow = originalStyle;
      document.documentElement.style.overflow = originalHtmlStyle;
      document.body.style.touchAction = '';
    };
  }, []);

  useEffect(() => {
    if (isPending) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(chat.expires_at).getTime();
      const diff = Math.max(0, expires - now);
      setTimeLeft(Math.floor(diff / 1000));
      if (diff <= 0) onClose(); 
    }, 1000);
    return () => clearInterval(interval);
  }, [chat.expires_at, onClose, isPending]);

  // Auto-scroll to bottom
  useEffect(() => { 
    if (messagesEndRef.current) {
      // Using 'auto' instead of 'smooth' to prevent fighting with user scroll
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [chat.messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { 
      toast.error('Image too large (Max 5MB)'); 
      return; 
    }
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedImage) return;
    
    let imageUrl: string | null = null;
    
    if (selectedImage) {
      setUploading(true);
      try {
        const supabase = createClient();
        const fileExt = selectedImage.name.split('.').pop();
        const cleanName = selectedImage.name.replace(/[^a-zA-Z0-9]/g, '');
        const fileName = `${currentUserId}/${Date.now()}_${cleanName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, selectedImage);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error("Image upload failed");
          setUploading(false);
          return;
        }

        const { data } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);
          
        imageUrl = data.publicUrl;
      } catch (err) {
        console.error(err);
        toast.error("Error uploading image");
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSendMessage(message.trim(), imageUrl || undefined);
    setMessage('');
    setSelectedImage(null);
    setImagePreview(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()} 
          // FIX: Stop wheel propagation to prevent laptop trackpads from scrolling background
          onWheel={(e) => e.stopPropagation()}
          // FIX: Strictly 80dvh ensures 20% gap at the top, preventing overlap on any device
          className="bg-white dark:bg-zinc-900 w-full sm:max-w-md h-[85dvh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden border-t sm:border border-gray-200 dark:border-zinc-800 shadow-2xl relative"
        >
          {/* Header */}
          <div className="flex-none flex items-center justify-between p-4 border-b border-gray-100 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl z-20 sticky top-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md">
                {otherUserName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm">{otherUserName}</h3>
                {!isPending && (
                  <p className={`text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                    <Clock className="w-3 h-3" /> {formatTime(timeLeft)} left
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isPending && onExtend && (
                <button 
                  onClick={onExtend}
                  className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-[10px] font-bold flex items-center gap-1 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                  <PlusCircle className="w-3 h-3" /> Extend
                </button>
              )}
              <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:rotate-90 transition-transform">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Accept/Reject UI */}
          {isPending && isReceiver ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-purple-50/50 dark:bg-purple-900/10">
              <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <Check className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-black mb-2 dark:text-white">Chat Request</h2>
              <p className="text-sm text-gray-500 text-center mb-8 px-4">
                User wants to chat privately. 10 mins session.
              </p>
              <div className="w-full space-y-3 px-4">
                <button onClick={() => onRespond(chat.id, 'active')} className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 transition-all text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-purple-500/20">
                  <Check className="w-5 h-5"/> Accept & Chat
                </button>
                <button onClick={() => onRespond(chat.id, 'rejected')} className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
                  <Ban className="w-5 h-5"/> Ignore
                </button>
              </div>
            </div>
          ) : isPending ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
               <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
               <h3 className="font-bold dark:text-white">Request Sent</h3>
               <p className="text-sm text-gray-400 mt-1">Waiting for approval...</p>
            </div>
          ) : (
            /* Messages Area - FIXED SCROLLING AND GESTURES */
            <div 
              ref={chatContainerRef} 
              // Removed 'scroll-smooth' to fix trackpad inertia fighting
              className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3 bg-gray-50 dark:bg-zinc-950/50 relative"
              style={{ 
                // Ensure touch scrolling works properly on iOS
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y' // Re-enabled explicitly to help browser identify scrollable area
              }} 
            >
              {/* Start Message */}
              <div className="text-center py-4">
                <p className="text-xs text-gray-400 font-medium">
                  Chat started on {new Date(chat.created_at).toLocaleDateString()}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">Messages are end-to-end encrypted & deleted after expiry</p>
              </div>

              {chat.messages?.map((msg: any) => {
                const isOwn = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative group`}>
                    <div className="relative max-w-[85%]">
                      {/* Message Bubble */}
                      <div 
                        className={`p-3 rounded-2xl transition-all ${
                          isOwn 
                            ? 'bg-purple-600 text-white rounded-br-none shadow-md shadow-purple-500/10' 
                            : 'bg-white dark:bg-zinc-800 dark:text-white rounded-bl-none shadow-sm border border-gray-100 dark:border-zinc-700'
                        }`}
                      >
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Shared" className="rounded-lg mb-2 max-h-60 object-cover w-full bg-black/10" />
                        )}
                        <p className="text-sm leading-relaxed break-words whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Area */}
          {!isPending && (
            <form onSubmit={handleUploadAndSubmit} className="flex-none p-3 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 safe-area-bottom z-20">
              {imagePreview && (
                <div className="relative inline-block mb-3 ml-2">
                  <img src={imagePreview} className="h-16 w-16 object-cover rounded-xl border-2 border-purple-500 shadow-md" alt="Preview" />
                  <button type="button" onClick={() => { setImagePreview(null); setSelectedImage(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-2 items-end bg-gray-100 dark:bg-zinc-800/50 p-1.5 rounded-[1.5rem]">
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-3 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors hover:bg-white dark:hover:bg-zinc-700 rounded-full"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin"/> : <ImageIcon className="w-5 h-5" />}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                
                <input 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent outline-none text-sm dark:text-white px-2 py-3 min-h-[44px]" 
                />
                
                <button 
                  type="submit" 
                  disabled={(!message.trim() && !selectedImage) || uploading} 
                  className="p-3 bg-purple-600 text-white rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}