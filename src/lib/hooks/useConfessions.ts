"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useConfessions(roomId: string) {
  const supabaseRef = useRef<any>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 1. Init User
  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: { id: string } | null } }) => {
        setCurrentUserId(data.user?.id ?? null);
      });
  }, []);

  // 2. Main Load Function
  async function loadConfessions(showLoader = false) {
    if (!roomId) return;
    if (showLoader) setLoading(true);

    let userId = currentUserId;
    if (!userId) {
      const { data: userData } = await supabase.auth.getUser();
      userId = userData.user?.id || null;
      setCurrentUserId(userId);
    }

    const { data, error } = await supabase
      .from("confessions")
      .select(
        `
        *,
        confession_replies(
          id, user_id, content, created_at, parent_reply_id,
          confession_reply_likes(user_id)
        ),
        confession_likes(id, user_id)
      `
      )
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      if (showLoader) setLoading(false);
      return;
    }

    const mapped = (data || []).map((c: any) => ({
      ...c,
      is_mine: c.user_id === userId,
      reply_count: c.confession_replies?.length || 0,
      reaction_count: c.confession_likes?.length || 0,
      liked_by_me:
        c.confession_likes?.some((l: any) => l.user_id === userId) || false,

      confession_replies: c.confession_replies?.map((r: any) => ({
        ...r,
        is_mine: r.user_id === userId,
        like_count: r.confession_reply_likes?.length || 0,
        liked_by_me:
          r.confession_reply_likes?.some((l: any) => l.user_id === userId) ||
          false,
      })),
    }));

    setConfessions(mapped);
    if (showLoader) setLoading(false);
  }

  // 3. Realtime Subscription
  useEffect(() => {
    if (!roomId) return;
    loadConfessions(true);

    const channel = supabase
      .channel("room-" + roomId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions" },
        () => loadConfessions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confession_likes" },
        () => loadConfessions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confession_replies" },
        () => loadConfessions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confession_reply_likes" },
        () => loadConfessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId]);

  // --- ACTIONS WITH OPTIMISTIC UPDATES ---

  async function createConfession(content: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("anonymous_username, anonymous_avatar")
      .eq("id", user.id)
      .single();

    // 1. Create a fake confession object immediately for UI
    const tempConfession = {
      id: crypto.randomUUID(),
      room_id: roomId,
      content,
      anonymous_username: profile?.anonymous_username,
      anonymous_avatar: profile?.anonymous_avatar,
      created_at: new Date().toISOString(),
      user_id: user.id, // Keep track locally even if DB doesn't have it yet
      is_mine: true,
      reply_count: 0,
      reaction_count: 0,
      liked_by_me: false,
      confession_replies: [],
    };

    // 2. Inject into state instantly (Optimistic UI)
    setConfessions((prev) => [tempConfession, ...prev]);

    // 3. Send to Database (Background)
    // FIX: Send 'id' explicitly so local ID matches DB ID. This ensures delete works.
    const { error } = await supabase.from("confessions").insert({
      id: tempConfession.id, // ✅ Critical Fix: Match IDs
      room_id: roomId,
      content,
      anonymous_username: profile?.anonymous_username,
      anonymous_avatar: profile?.anonymous_avatar,
      // user_id: user.id  <-- REMOVED due to Schema Error (PGRST204)
    });

    if (error) {
      console.error("Create Confession Error:", error);
      // Revert optimistic update if failed
      setConfessions((prev) => prev.filter((c) => c.id !== tempConfession.id));
    }
  }

  async function addReaction(confessionId: string) {
    let userId = currentUserId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    }
    if (!userId) return;

    // ⚡ Optimistic Update: Confession Like
    setConfessions((prev) =>
      prev.map((c) => {
        if (c.id !== confessionId) return c;
        const isLiked = c.liked_by_me;
        return {
          ...c,
          liked_by_me: !isLiked,
          reaction_count: isLiked ? c.reaction_count - 1 : c.reaction_count + 1,
        };
      })
    );

    const { data: existing } = await supabase
      .from("confession_likes")
      .select("id")
      .eq("confession_id", confessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase.from("confession_likes").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase
        .from("confession_likes")
        .insert({ confession_id: confessionId, user_id: userId });
      if (error && error.code === "23505") {
        // 409 Conflict code in Postgres
        console.warn("Already liked (race condition), ignoring.");
      }
    }
  }

  // ✅ Add Reply with INSTANT UI Update (Realtime feel)
  async function addReply(
    confessionId: string,
    content: string,
    parentReplyId?: string
  ) {
    let userId = currentUserId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    }
    if (!userId) return;

    // 1. Create a fake reply object immediately for UI
    const tempReply = {
      id: crypto.randomUUID(),
      user_id: userId,
      content: content,
      created_at: new Date().toISOString(),
      parent_reply_id: parentReplyId || null,
      like_count: 0,
      liked_by_me: false,
      is_mine: true,
      confession_id: confessionId,
    };

    // 2. Inject into state instantly
    setConfessions((prev) =>
      prev.map((c) => {
        if (c.id !== confessionId) return c;

        return {
          ...c,
          reply_count: (c.reply_count || 0) + 1,
          confession_replies: [...(c.confession_replies || []), tempReply],
        };
      })
    );

    // 3. Send to Database (Background)
    const { error } = await supabase.from("confession_replies").insert({
      id: tempReply.id, // ✅ Match IDs here too for consistency
      confession_id: confessionId,
      content,
      parent_reply_id: parentReplyId || null,
      user_id: userId,
    });

    if (error) {
      console.error("INSERT REPLY ERROR:", error);
    }
  }

  async function likeReply(replyId: string) {
    let userId = currentUserId;
    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id || null;
    }
    if (!userId) return;

    // ⚡ Optimistic Update: Reply Like
    setConfessions((prev) =>
      prev.map((c) => ({
        ...c,
        confession_replies: c.confession_replies?.map((r: any) => {
          if (r.id !== replyId) return r;
          const isLiked = r.liked_by_me;

          return {
            ...r,
            liked_by_me: !isLiked,
            like_count: isLiked ? r.like_count - 1 : r.like_count + 1,
          };
        }),
      }))
    );

    const { data: existing } = await supabase
      .from("confession_reply_likes")
      .select("id")
      .eq("reply_id", replyId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("confession_reply_likes")
        .delete()
        .eq("id", existing.id);
    } else {
      const { error } = await supabase
        .from("confession_reply_likes")
        .insert({ reply_id: replyId, user_id: userId });
      if (error && error.code === "23505") {
        // 409 Conflict code
        console.warn("Reply already liked (race condition), ignoring.");
      }
    }
  }

  async function deleteReply(replyId: string) {
    // ⚡ Optimistic Update: Delete Reply
    setConfessions((prev) =>
      prev.map((c) => ({
        ...c,
        confession_replies: c.confession_replies?.filter(
          (r: any) => r.id !== replyId
        ),
      }))
    );

    await supabase.from("confession_replies").delete().eq("id", replyId);
  }

  async function deleteConfession(confessionId: string) {
    // ⚡ Optimistic Update: Delete Confession
    setConfessions((prev) => prev.filter((c) => c.id !== confessionId));

    await supabase
      .from("confessions")
      .update({ is_deleted: true })
      .eq("id", confessionId);
  }

  return {
    confessions,
    loading,
    createConfession,
    addReaction,
    addReply,
    likeReply,
    deleteReply,
    deleteConfession,
  };
}
