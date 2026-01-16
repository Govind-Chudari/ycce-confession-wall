"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onSubmit: (content: string) => Promise<void>;
}

export function ConfessionForm({ onSubmit }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    await onSubmit(text);
    setText("");
    setLoading(false);
  }

  return (
    <div className="relative">
      {/* BLUR HALO */}
      <div className="absolute -inset-10 bg-white/10 blur-2xl opacity-00 pointer-events-none" />

      {/* ACTUAL MESSAGE BOX */}
      <form
        onSubmit={submit}
        className="relative bg-zinc-900/80 border border-white/10 rounded-xl p-3 backdrop-blur-xl"
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? Share anonymously..."
          className="bg-transparent border-none resize-none focus:ring-0 transition-all duration-300 focus:min-h-[120px]"
          maxLength={1000}
        />

        <div className="flex justify-between mt-2 text-xs text-zinc-400">
          <span>{text.length}/1000</span>
          <Button size="sm" disabled={loading}>
            Post
          </Button>
        </div>
      </form>
    </div>
  );
}
