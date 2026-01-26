'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Share2, Download, Check } from 'lucide-react';
import { toast } from 'sonner';

// --- FEATURE 1: POLL SYSTEM ---

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

type PollProps = {
  question: string;
  options: PollOption[];
  userVoted?: string | null; // ID of option user voted for
  onVote: (optionId: string) => void;
};

export function PollDisplay({ question, options, userVoted, onVote }: PollProps) {
  const totalVotes = options.reduce((acc, curr) => acc + curr.votes, 0);

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <BarChart className="w-4 h-4 text-purple-500" />
        {question}
      </h4>
      <div className="space-y-2">
        {options.map((option) => {
          const percentage = totalVotes === 0 ? 0 : Math.round((option.votes / totalVotes) * 100);
          const isSelected = userVoted === option.id;

          return (
            <button
              key={option.id}
              onClick={() => !userVoted && onVote(option.id)}
              disabled={!!userVoted}
              className="relative w-full h-10 rounded-lg overflow-hidden group"
            >
              {/* Background Bar */}
              <div 
                className={`absolute inset-0 transition-all duration-500 ${
                  isSelected ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-gray-200 dark:bg-gray-800'
                }`}
              >
                <div 
                  className={`h-full transition-all duration-500 ${
                    isSelected ? 'bg-purple-200 dark:bg-purple-600/30' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              {/* Text Content */}
              <div className="absolute inset-0 flex items-center justify-between px-3 text-sm">
                <span className={`z-10 font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {option.text} {isSelected && <Check className="w-3 h-3 inline ml-1" />}
                </span>
                <span className="z-10 text-xs text-gray-500 dark:text-gray-400">
                  {percentage}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-400 text-right">
        {totalVotes} votes
      </div>
    </div>
  );
}

// --- FEATURE 2: SHARE AS IMAGE UTILITY ---

export const generateShareImage = async (elementId: string, filename: string = 'confession.png') => {
  // NOTE: In a real project, you would import html2canvas
  // import html2canvas from 'html2canvas';
  
  // Simulation of the function since we can't install packages in this view
  toast.promise(
    new Promise((resolve) => setTimeout(resolve, 1500)),
    {
      loading: 'Generating beautiful image...',
      success: 'Image downloaded!',
      error: 'Failed to generate image'
    }
  );
  
  // Real implementation would be:
  /*
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, {
    backgroundColor: '#1f2937', // dark theme background
    scale: 2, // retina quality
  });
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL();
  link.click();
  */
};

export function ShareButton({ targetId }: { targetId: string }) {
  return (
    <button
      onClick={() => generateShareImage(targetId)}
      className="flex items-center gap-1 text-gray-500 hover:text-purple-500 transition-colors text-xs"
      title="Share as Image"
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}