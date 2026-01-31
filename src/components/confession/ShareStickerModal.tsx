'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Copy } from 'lucide-react';
import { toast } from 'sonner';

type ShareStickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  confession: any;
  displayName: string;
};

const THEMES = [
  { id: 'sunset', bg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', text: 'text-white', accent: 'text-pink-200' },
  { id: 'ocean', bg: 'bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600', text: 'text-white', accent: 'text-cyan-200' },
  { id: 'peach', bg: 'bg-gradient-to-bl from-orange-300 via-pink-400 to-rose-500', text: 'text-white', accent: 'text-yellow-200' },
  { id: 'forest', bg: 'bg-gradient-to-br from-emerald-400 to-teal-700', text: 'text-white', accent: 'text-emerald-200' },
  { id: 'midnight', bg: 'bg-zinc-900', text: 'text-gray-100', accent: 'text-purple-400' },
  { id: 'cotton', bg: 'bg-white border-2 border-pink-100', text: 'text-gray-800', accent: 'text-pink-500' },
];

export function ShareStickerModal({ isOpen, onClose, confession, displayName }: ShareStickerModalProps) {
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const stickerRef = useRef<HTMLDivElement>(null);

  const loadHtml2Canvas = () => {
    return new Promise<void>((resolve, reject) => {
      if ((window as any).html2canvas) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.body.appendChild(script);
    });
  };

  const generateImage = async () => {
    if (!stickerRef.current) return null;
    try {
      await loadHtml2Canvas();
      const html2canvas = (window as any).html2canvas;

      const canvas = await html2canvas(stickerRef.current, {
        scale: 3, 
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob: Blob | null) => resolve(blob), 'image/png', 1.0);
      });
    } catch (error) {
      console.error('Generation failed', error);
      return null;
    }
  };

  const handleNativeShare = async () => {
    setIsGenerating(true);
    const blob = await generateImage();
    
    if (blob) {
      const file = new File([blob], 'confession-sticker.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Check out this confession!',
            text: 'Read this anonymous confession 👀',
          });
          toast.success('Shared successfully!');
          onClose();
        } catch (error: any) {
          if (error.name !== 'AbortError') toast.error('Could not share.');
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `confession-${confession.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Image downloaded! You can now post it.');
      }
    } else {
      toast.error('Failed to generate sticker.');
    }
    setIsGenerating(false);
  };

  const handleCopyImage = async () => {
    setIsGenerating(true);
    const blob = await generateImage();
    if(blob) {
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            toast.success('Sticker copied to clipboard!');
        } catch (err) {
            toast.error('Failed to copy image');
        }
    }
    setIsGenerating(false);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden mt-7 flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white">Share Confession</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Preview Area (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-zinc-950 flex flex-col items-center gap-6">
                
                {/* The STICKER (This is what gets captured) */}
                <div 
                  ref={stickerRef}
                  className={`relative w-[320px] aspect-[4/5] ${selectedTheme.bg} shadow-2xl rounded-3xl p-8 flex flex-col justify-between select-none transition-all duration-500`}
                >
                  {/* Decorative Elements */}
                  <div className="absolute top-4 right-4 opacity-50">
                    <div className={`w-12 h-12 rounded-full blur-xl ${selectedTheme.id === 'cotton' ? 'bg-pink-300' : 'bg-white'}`} />
                  </div>

                  {/* Header */}
                  <div className="flex items-center gap-3 z-10">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white shadow-inner">
                      {displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className={`text-sm font-bold ${selectedTheme.text} opacity-90`}>@{displayName}</span>
                        <span className={`text-xs ${selectedTheme.text} opacity-70`}>Confessed anonymously</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 flex items-center my-6">
                    <div className="relative">
                        <span className={`absolute -top-6 -left-4 text-6xl opacity-30 font-serif ${selectedTheme.text}`}>"</span>
                        <p className={`text-xl font-medium leading-relaxed font-sans ${selectedTheme.text} drop-shadow-sm text-balance text-center`}>
                        {confession.content}
                        </p>
                        <span className={`absolute -bottom-10 -right-2 text-6xl opacity-30 font-serif ${selectedTheme.text}`}>"</span>
                    </div>
                  </div>

                  {/* Footer/Branding */}
                  <div className="z-10 flex justify-center items-center gap-2 opacity-80">
                    <div className={`h-[1px] w-8 ${selectedTheme.id === 'cotton' ? 'bg-gray-400' : 'bg-white'}`}></div>
                    <span className={`text-xs font-semibold tracking-widest uppercase ${selectedTheme.text}`}>Confessions App</span>
                    <div className={`h-[1px] w-8 ${selectedTheme.id === 'cotton' ? 'bg-gray-400' : 'bg-white'}`}></div>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="w-full">
                    <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider text-center">Choose a Vibe</p>
                    <div className="flex justify-center gap-3 flex-wrap">
                    {THEMES.map((theme) => (
                        <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme)}
                        className={`w-10 h-10 rounded-full ${theme.bg} shadow-sm transition-all duration-200 ${selectedTheme.id === theme.id ? 'ring-2 ring-offset-2 ring-purple-500 scale-110' : 'hover:scale-105'}`}
                        title={theme.id}
                        />
                    ))}
                    </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 grid grid-cols-2 gap-3">
                 <button 
                  onClick={handleCopyImage}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? <span className="animate-spin text-lg">◌</span> : <Copy className="w-5 h-5" />}
                  <span>Copy</span>
                </button>

                <button 
                  onClick={handleNativeShare}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isGenerating ? <span className="animate-spin text-lg">◌</span> : <Share2 className="w-5 h-5" />}
                  <span>Share Sticker</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}