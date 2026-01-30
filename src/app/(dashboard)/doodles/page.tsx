'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Type, Image as ImageIcon, ZoomIn, ZoomOut, Trash2, 
  Eraser, MousePointer2, RefreshCw, Palette, Share2, X, Menu, 
  User, Type as TypeIcon, Check, Loader2, CloudOff, Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// Ensure these are set in your .env.local file
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// --- SINGLETON CLIENT SETUP ---
let supabaseInstance: any = null;

const getSupabase = () => {
  if (!supabaseInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Supabase credentials missing");
      return null;
    }
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
  }
  return supabaseInstance;
};

// --- CONSTANTS ---
const FONT_OPTIONS = [
  { id: 'sans', label: 'Sans', value: 'sans-serif', family: 'sans-serif' },
  { id: 'serif', label: 'Serif', value: 'serif', family: 'Noto Serif, serif' },
  { id: 'mono', label: 'Mono', value: 'mono', family: 'monospace' },
  { id: 'hand', label: 'Hand', value: 'hand', family: 'Comic Sans MS, cursive' },
  { id: 'bold', label: 'Bold', value: 'bold', family: 'Impact, fantasy' },
];

const COLORS = [
  '#000000', '#FF3B30', '#34C759', '#007AFF',
  '#FFCC00', '#AF52DE', '#FF9500', '#5856D6',
  '#FF2D55', '#FFFFFF'
];

// --- TYPES ---
type Tool = 'select' | 'draw' | 'pan' | 'eraser';

interface BaseElement {
  id: string;
  user_id?: string;
  author_name?: string;
  created_at?: string;
}

interface Stroke extends BaseElement {
  type: 'pen' | 'eraser';
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontFamily: string;
}

interface ImageElement extends BaseElement {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

type DoodleElement = Stroke | TextElement | ImageElement;

// --- UTILS ---
const distance = (a: {x:number, y:number}, b: {x:number, y:number}) => 
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const isPointInStroke = (point: {x:number, y:number}, stroke: Stroke) => {
  if (stroke.type === 'eraser') return false;
  for (let i = 0; i < stroke.points.length - 1; i++) {
    const start = stroke.points[i];
    const end = stroke.points[i+1];
    const d1 = distance(point, start);
    const d2 = distance(point, end);
    const lineLen = distance(start, end);
    if (d1 + d2 >= lineLen - 0.5 && d1 + d2 <= lineLen + 0.5) return true;
    if (d1 < 10) return true;
  }
  return false;
};

export default function DoodlesPage() {
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(20);
  const [currentFontId, setCurrentFontId] = useState<string>('sans');

  const [elements, setElements] = useState<DoodleElement[]>([]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  const [textInput, setTextInput] = useState<{
    isOpen: boolean; text: string; x: number; y: number;
    screenX: number; screenY: number; id?: string; color: string; font: string;
  } | null>(null);
  
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ 
    x: number, y: number, visible: boolean, targetElement?: DoodleElement | null 
  }>({ x: 0, y: 0, visible: false, targetElement: null });

  const supabase = getSupabase();

  // --- INITIAL LOAD ---
  useEffect(() => {
    if (!supabase) {
        setAuthLoading(false);
        toast.error("Supabase not configured");
        return;
    }

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let currentUser = session?.user;

        if (!currentUser) {
            setIsGuest(true);
        } else {
            setUser(currentUser);
        }
        setAuthLoading(false);

        const { data, error } = await supabase
            .from('doodles')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

        if (data) {
            const dbElements = data.map((d: any) => ({
                ...d.doodle_data,
                id: d.id,
                user_id: d.user_id,
                author_name: d.anonymous_username
            }));
            setElements(dbElements);
        } else if (error) {
             console.error("Fetch error:", error);
             toast.error("Could not load doodles");
        }
      } catch (err) {
        console.error("Init crash:", err);
      }
    };

    init();

    const channel = supabase
      .channel('public:doodles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doodles' }, (payload: any) => {
          if (payload.new.is_deleted) return;
          const newElement = {
              ...payload.new.doodle_data,
              id: payload.new.id,
              user_id: payload.new.user_id,
              author_name: payload.new.anonymous_username
          };
          setElements(prev => {
              if (prev.some(e => e.id === newElement.id)) return prev;
              return [...prev, newElement];
          });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'doodles' }, (payload: any) => {
          if (payload.new.is_deleted) {
              setElements(prev => prev.filter(e => e.id !== payload.new.id));
          } else {
              const el = { ...payload.new.doodle_data, id: payload.new.id, user_id: payload.new.user_id, author_name: payload.new.anonymous_username };
              setElements(prev => prev.map(e => e.id === payload.new.id ? el : e));
          }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'doodles' }, (payload: any) => {
           setElements(prev => prev.filter(e => e.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  useEffect(() => {
    scaleRef.current = scale;
    offsetRef.current = offset;
  }, [scale, offset]);

  // --- ACTIONS ---
  const saveElementToDB = async (element: DoodleElement) => {
    setElements(prev => [...prev, element]);

    if (isGuest || !user || !supabase) return;

    const payload = {
        id: element.id,
        user_id: user.id, 
        doodle_data: { ...element, id: undefined, user_id: undefined, author_name: undefined },
        anonymous_username: element.author_name || 'Anonymous',
        position_x: (element as any).x || 0,
        position_y: (element as any).y || 0,
    };

    const { error } = await supabase.from('doodles').upsert(payload);
    if (error) {
        console.error("Save failed:", error);
        if (error.code === '23503') {
             const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                anonymous_username: `Guest-${user.id.slice(0, 4)}` 
            });
            if (!profileError) await supabase.from('doodles').upsert(payload);
        }
    }
  };

  const deleteElementFromDB = async (elementId: string) => {
     const elementToDelete = elements.find(e => e.id === elementId);
     setElements(prev => prev.filter(e => e.id !== elementId));

     if (isGuest || !user || !supabase) return;

     if (elementToDelete && elementToDelete.user_id !== user.id) return;

     const { error } = await supabase
         .from('doodles')
         .update({ is_deleted: true })
         .eq('id', elementId);
     
     if (error) {
        if (error.code !== '42501' && error.code !== '403') {
            console.error("Delete failed:", error);
        }
     }
  };

  const handleClear = async () => { 
      if (!confirm("Delete your doodles?")) return;

      const idsToDelete = elements
        .filter(e => user && e.user_id === user.id)
        .map(e => e.id);

      if (idsToDelete.length === 0) {
          toast.info("No own doodles found.");
          setElements([]); 
          return;
      }

      setElements(prev => prev.filter(e => !idsToDelete.includes(e.id)));
      
      if (user && supabase) {
          const { error } = await supabase
              .from('doodles')
              .update({ is_deleted: true })
              .in('id', idsToDelete);
          
          if (error && error.code !== '42501' && error.code !== '403') {
              console.error("Batch delete failed:", error);
          } else {
              toast.success("Cleared");
          }
      }
  };

  // --- HIT TESTING (FIXED LOOP) ---
  const hitTest = (worldX: number, worldY: number): DoodleElement | null => {
    const point = { x: worldX, y: worldY };
    
    // FIX: Avoid spread syntax on array in loop head for esbuild compatibility
    // Instead of [...elements].reverse(), we slice and reverse separately
    const reversedElements = elements.slice().reverse();
    
    for (const el of reversedElements) {
        if (el.type === 'text') {
            const width = el.text.length * (el.fontSize * 0.6); 
            if (worldX >= el.x && worldX <= el.x + width && worldY >= el.y - el.fontSize && worldY <= el.y) return el;
        } else if (el.type === 'image') {
            if (worldX >= el.x && worldX <= el.x + el.width && worldY >= el.y && worldY <= el.y + el.height) return el;
        } else if (el.type === 'pen') {
            if (isPointInStroke(point, el)) return el;
        }
    }
    return null;
  };

  const handleReload = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('doodles').select('*').eq('is_deleted', false);
      if(data) {
          const dbElements = data.map((d: any) => ({ ...d.doodle_data, id: d.id, user_id: d.user_id }));
          setElements(dbElements);
          toast.success("Canvas Refreshed");
      }
  };

  // --- DRAWING LOGIC ---
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Grid
    const gridSize = scale < 0.5 ? 100 : 50;
    const left = -offset.x / scale;
    const top = -offset.y / scale;
    const right = (canvas.width - offset.x) / scale;
    const bottom = (canvas.height - offset.y) / scale;
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    for (let x = Math.floor(left / gridSize) * gridSize; x < right; x += gridSize) {
      ctx.moveTo(x, top); ctx.lineTo(x, bottom);
    }
    for (let y = Math.floor(top / gridSize) * gridSize; y < bottom; y += gridSize) {
      ctx.moveTo(left, y); ctx.lineTo(right, y);
    }
    ctx.stroke();

    elements.forEach(el => {
       if (el.type === 'image') {
          const img = new Image();
          img.src = el.src;
          if (img.complete) ctx.drawImage(img, el.x, el.y, el.width, el.height);
          else img.onload = () => ctx.drawImage(img, el.x, el.y, el.width, el.height);
       } else if (el.type === 'text') {
          const fontDef = FONT_OPTIONS.find(f => f.id === el.fontFamily);
          ctx.font = `${el.fontSize}px ${fontDef?.family || 'sans-serif'}`;
          ctx.fillStyle = el.color;
          ctx.fillText(el.text, el.x, el.y);
       } else if (el.type === 'pen' || el.type === 'eraser') {
          if (el.points.length < 2) return;
          ctx.beginPath();
          ctx.strokeStyle = el.type === 'eraser' ? 'rgba(255,255,255,1)' : el.color;
          ctx.globalCompositeOperation = el.type === 'eraser' ? 'destination-out' : 'source-over';
          ctx.lineWidth = el.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
             const p1 = el.points[i - 1];
             const p2 = el.points[i];
             const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
             ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
          }
          ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
       }
    });

    if (currentStroke && currentStroke.points.length > 1) {
       const el = currentStroke;
       ctx.beginPath();
       ctx.strokeStyle = el.type === 'eraser' ? 'rgba(255,255,255,1)' : el.color;
       ctx.globalCompositeOperation = el.type === 'eraser' ? 'destination-out' : 'source-over';
       ctx.lineWidth = el.width;
       ctx.lineCap = 'round';
       ctx.lineJoin = 'round';
       ctx.moveTo(el.points[0].x, el.points[0].y);
       for (let i = 1; i < el.points.length; i++) {
          const p1 = el.points[i - 1];
          const p2 = el.points[i];
          const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
          ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
       }
       ctx.lineTo(el.points[el.points.length - 1].x, el.points[el.points.length - 1].y);
       ctx.stroke();
       ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }, [elements, currentStroke, offset, scale]);

  useEffect(() => {
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; draw(); }};
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  // --- WHEEL LOGIC ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = -e.deltaY * 0.002;
        const newScale = Math.max(0.1, Math.min(5, scaleRef.current + zoomFactor));
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - offsetRef.current.x) / scaleRef.current;
        const worldY = (mouseY - offsetRef.current.y) / scaleRef.current;
        setScale(newScale);
        setOffset({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale });
      } else {
        setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // --- INPUT HANDLERS ---
  const handlePointerDown = (e: any) => {
    if (textInput?.isOpen) setTextInput(null);
    setContextMenu({ ...contextMenu, visible: false });
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const point = { x: (clientX - offset.x) / scale, y: (clientY - offset.y) / scale };

    if (e.touches) {
      touchStartTime.current = Date.now();
      longPressTimer.current = setTimeout(() => {
         const target = hitTest(point.x, point.y);
         setContextMenu({ x: clientX, y: clientY, visible: true, targetElement: target });
         setIsDrawing(false); setCurrentStroke(null);
      }, 500);
    }

    if (isSpacePressed || tool === 'pan' || (tool === 'select' && !isDrawing)) {
      setIsPanning(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    if (tool === 'draw' || tool === 'eraser') {
      setIsDrawing(true);
      setCurrentStroke({
        id: crypto.randomUUID(),
        user_id: user?.id,
        points: [point],
        color,
        width: tool === 'eraser' ? eraserSize : brushSize,
        type: tool === 'eraser' ? 'eraser' : 'pen',
        author_name: 'Me'
      });
    }
  };

  const handlePointerMove = (e: any) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (isPanning) {
      setOffset({ x: offset.x + clientX - lastMousePos.x, y: offset.y + clientY - lastMousePos.y });
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    if (isDrawing && currentStroke) {
      const point = { x: (clientX - offset.x) / scale, y: (clientY - offset.y) / scale };
      setCurrentStroke(prev => prev ? ({ ...prev, points: [...prev.points, point] }) : null);

      if (tool === 'eraser') {
          const hit = hitTest(point.x, point.y);
          if (hit && (isGuest || (user && hit.user_id === user.id))) {
              deleteElementFromDB(hit.id);
          }
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setIsPanning(false);
    if (isDrawing && currentStroke) {
      saveElementToDB(currentStroke);
      setCurrentStroke(null);
      setIsDrawing(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-gray-500 overflow-hidden touch-none selection:bg-none ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      onContextMenu={(e) => { e.preventDefault(); handlePointerDown(e); }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onDoubleClick={(e) => {
            const pt = { x: (e.clientX - offset.x) / scale, y: (e.clientY - offset.y) / scale };
            const target = hitTest(pt.x, pt.y);
            if (target?.type === 'text' && (isGuest || target.user_id === user?.id)) {
                setTextInput({ isOpen: true, text: target.text, x: target.x, y: target.y, screenX: e.clientX, screenY: e.clientY, id: target.id, color: target.color, font: target.fontFamily });
            } else {
                setTextInput({ isOpen: true, text: '', x: pt.x, y: pt.y, screenX: e.clientX, screenY: e.clientY, color, font: currentFontId });
            }
        }}
        className={`absolute inset-0 z-10 ${isSpacePressed ? 'cursor-grab' : 'cursor-crosshair'} active:${isSpacePressed ? 'cursor-grabbing' : ''}`}
      />

      {/* --- UI OVERLAYS --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        {authLoading && <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Syncing...</div>}
      </div>

      {/* Text Input Modal */}
      <AnimatePresence>
        {textInput && textInput.isOpen && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-black/20" onClick={(e) => e.stopPropagation()}>
              <div className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-2xl w-[90%] max-w-sm flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-between"><span className="text-gray-500 font-bold">Text</span><button onClick={() => setTextInput(null)}><X className="w-4 h-4"/></button></div>
                  <textarea autoFocus value={textInput.text} onChange={e => setTextInput({...textInput, text: e.target.value})} className="w-full bg-gray-50 dark:bg-zinc-900 border-none rounded-xl p-3 text-lg min-h-[100px] outline-none dark:text-white" />
                  <div className="flex gap-2 pb-1 overflow-x-auto">{FONT_OPTIONS.map(f => <button key={f.id} onClick={() => setTextInput({...textInput, font: f.id})} className={`px-2 py-1 border rounded text-xs ${textInput.font === f.id ? 'bg-purple-100 border-purple-500' : ''}`}>{f.label}</button>)}</div>
                  <div className="flex gap-2 overflow-x-auto">{COLORS.map(c => <button key={c} onClick={() => setTextInput({...textInput, color: c})} className={`w-6 h-6 rounded-full border ${textInput.color === c ? 'scale-110 border-purple-500' : ''}`} style={{backgroundColor: c}}/>)}</div>
                  <button onClick={() => {
                      if(!textInput.text.trim()) { setTextInput(null); return; }
                      if(textInput.id) {
                          const existing = elements.find(e => e.id === textInput.id);
                          if(existing) saveElementToDB({ ...existing, text: textInput.text, color: textInput.color, fontFamily: textInput.font } as TextElement);
                      } else {
                          saveElementToDB({ id: crypto.randomUUID(), user_id: user?.id, type: 'text', x: textInput.x, y: textInput.y, text: textInput.text, color: textInput.color, fontSize: 24/scale, fontFamily: textInput.font, author_name: 'Me' } as TextElement);
                      }
                      setTextInput(null);
                  }} className="w-full bg-purple-600 text-white font-bold py-2 rounded-xl flex justify-center gap-2"><Check className="w-4 h-4"/> Done</button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ left: contextMenu.x, top: contextMenu.y }} className="absolute z-50 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-1 min-w-[160px]" onClick={(e) => e.stopPropagation()}>
            {contextMenu.targetElement && <div className="px-3 py-2 text-xs text-gray-500 border-b mb-1 flex items-center gap-2"><User className="w-3 h-3"/> By: <span className="font-bold text-purple-600">{contextMenu.targetElement.author_name || 'Anon'}</span></div>}
            {contextMenu.targetElement && (isGuest || contextMenu.targetElement.user_id === user?.id) ? (
                 <button onClick={() => { deleteElementFromDB(contextMenu.targetElement!.id); setContextMenu({...contextMenu, visible: false}); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4"/> Delete</button>
            ) : contextMenu.targetElement && <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400"><Lock className="w-3 h-3"/> Locked</div>}
            <button onClick={() => setContextMenu({ ...contextMenu, visible: false })} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-black/5 rounded-lg"><X className="w-4 h-4"/> Close</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Toolbar */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-3 flex flex-col gap-2">
            <ToolButton icon={MousePointer2} active={tool === 'select'} onClick={() => setTool('select')} label="Pan" />
            <ToolButton icon={Pencil} active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw" />
            <ToolButton icon={Eraser} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser" />
            <div className="h-px bg-gray-200 my-1" />
            <ToolButton icon={RefreshCw} active={false} onClick={handleReload} label="Refresh" />
            <ToolButton icon={Trash2} active={false} onClick={handleClear} label="Clear All" color="text-red-500" />
        </div>
        {(tool === 'draw' || tool === 'eraser') && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-xl p-4 w-48">
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Size</label>
                <input type="range" min="1" max="50" value={tool === 'draw' ? brushSize : eraserSize} onChange={(e) => tool === 'draw' ? setBrushSize(Number(e.target.value)) : setEraserSize(Number(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg" />
                {tool === 'draw' && (
                    <div className="grid grid-cols-5 gap-2 mt-4">
                        {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border ${color === c ? 'scale-110 border-purple-500' : ''}`} style={{backgroundColor: c}}/>)}
                        <button onClick={() => colorInputRef.current?.click()} className="w-6 h-6 rounded-full border flex items-center justify-center bg-gradient-to-tr from-yellow-400 to-blue-500"><Palette className="w-3 h-3 text-white"/></button>
                        <input ref={colorInputRef} type="color" className="hidden" onChange={e => setColor(e.target.value)} />
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Mobile Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex md:hidden gap-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border rounded-full px-4 py-2 shadow-2xl">
         <ToolButton icon={Pencil} active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw" isMobile />
         <ToolButton icon={Eraser} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Erase" isMobile />
         <div className="h-6 w-px bg-gray-300" />
         <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-full bg-purple-600 text-white"><Menu className="w-5 h-5"/></button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {showMobileMenu && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="absolute bottom-24 left-4 right-4 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl md:hidden">
                <div className="flex justify-between mb-4"><span className="font-bold">Tools</span><button onClick={() => setShowMobileMenu(false)}><X className="w-5 h-5"/></button></div>
                <div className="grid grid-cols-4 gap-4">
                    <ToolButton icon={RefreshCw} onClick={handleReload} label="Refresh" isMobile />
                    <ToolButton icon={Trash2} onClick={handleClear} label="Clear" isMobile color="text-red-500" />
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ icon: Icon, active, onClick, label, color, isMobile }: any) {
  return (
    <button onClick={onClick} className={`p-3 rounded-xl flex flex-col items-center justify-center ${active ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-black/5'} ${color}`}>
      <Icon className={isMobile ? "w-5 h-5" : "w-6 h-6"} />
    </button>
  );
}