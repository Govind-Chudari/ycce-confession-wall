'use client'

export const dynamic = "force-dynamic"
export const revalidate = 0

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/hooks/useAuth";
import { useConfessions } from "@/lib/hooks/useConfessions";
import { createClient } from "@/lib/supabase/client";
import { ConfessionCard } from "@/components/confession/ConfessionCard";
import { ConfessionForm } from "@/components/confession/ConfessionForm";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Clock } from "lucide-react";

export default function FeedPage() {
  const router = useRouter();
  const supabase = createClient();
  const { profile, isVerified } = useAuth();

  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"latest" | "trending">("latest");

  const feedRef = useRef<HTMLDivElement>(null);

  const { 
    confessions, 
    loading, 
    createConfession, 
    addReaction, 
    addReply,
    likeReply,
    deleteReply,
    deleteConfession 
  } = useConfessions(activeRoom || "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, []);

  // Load rooms
  useEffect(() => {
    if (profile) loadRooms();
  }, [profile]);

  async function loadRooms() {
    const { data, error } = await supabase
      .from("room_memberships")
      .select("room_id, rooms(*)")
      .eq("user_id", profile!.id);

    if (error) {
      console.error(error);
      return;
    }

    const roomList = data.map((m: any) => m.rooms).filter(Boolean);
    setRooms(roomList);
    if (roomList.length) setActiveRoom(roomList[0].id);
  }

  // 🔒 Not verified
  if (!isVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-400">Account pending verification</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-purple-500/30">
      {/* FEED */}
      <div
        ref={feedRef}
        className="max-w-4xl mx-auto px-4 pt-6 pb-40 space-y-6 overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* HEADER */}
        <div className="relative flex items-center justify-between py-2 mb-4">
          <div className="relative z-10 shrink-0">
             <div className="relative w-25 h-25 overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer">
               <Image 
                 src="/logo.png" 
                 alt="Logo" 
                 fill
                 className="object-cover"
               />
             </div>
          </div>
          <div className="relative z-10 flex gap-2 shrink-0">
            <Button
              size="icon"
              variant={sortBy === "latest" ? "default" : "outline"}
              className={`w-9 h-9 rounded-xl transition-all shadow-lg ${
                sortBy === "latest" 
                  ? "bg-white text-black hover:bg-zinc-200 border-transparent" 
                  : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              onClick={() => setSortBy("latest")}
            >
              <Clock className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={sortBy === "trending" ? "default" : "outline"}
              className={`w-9 h-9 rounded-xl transition-all shadow-lg ${
                sortBy === "trending" 
                  ? "bg-purple-600 text-white hover:bg-purple-500 border-transparent shadow-purple-500/20" 
                  : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              onClick={() => setSortBy("trending")}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Rooms */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {rooms.map((r) => (
            <Button
              key={r.id}
              size="sm"
              variant={activeRoom === r.id ? "default" : "outline"}
              onClick={() => setActiveRoom(r.id)}
              className={`rounded-ll px-4 transition-all ${
                activeRoom === r.id 
                  ? "bg-white text-black hover:bg-zinc-200 font-bold" 
                  : "bg-transparent border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {r.name}
            </Button>
          ))}
        </div>

        {/* Confessions */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-zinc-500" />
          </div>
        ) : (
          confessions.map((c) => (
            <ConfessionCard
              key={c.id}
              confession={c}
              onLike={(id:string) => addReaction(id)}
              onReply={addReply}
              onLikeReply={likeReply}           
              onDeleteReply={deleteReply}       
              onDeleteConfession={deleteConfession} 
            />
          ))
        )}
      </div>

      {/* MESSAGE BOX */}
      <div className="fixed bottom-5 left-0 right-0 z-10 px-4">
        <div className="max-w-4xl mx-auto">
          <ConfessionForm
            onSubmit={async (text) => {
              await createConfession(text);
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}