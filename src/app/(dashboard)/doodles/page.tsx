'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, Type, Image as ImageIcon, ZoomIn, ZoomOut, Trash2, 
  Eraser, MousePointer2, RefreshCw, Palette, Share2, X, Menu, 
  User, Type as TypeIcon, Check, Loader2, Undo, CloudOff
} from 'lucide-react';
import { toast } from 'sonner';

// --- PRODUCTION: UNCOMMENT THIS IMPORT ---
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// --- SUPABASE CLIENT SETUP (SINGLETON) ---
let supabase: any = null;

// Helper to init client once
const getSupabase = () => {
  if (supabase) return supabase;

  // --- 1. PRODUCTION MODE (UNCOMMENT THIS BLOCK IN REAL APP) ---
  
  if (typeof createClient !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { 
        persistSession: true, 
        autoRefreshToken: true, 
        detectSessionInUrl: false 
      }
    });
    return supabase;
  }
}

// Initialize immediately
const supabaseClient = getSupabase();

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

// --- LOCAL STORAGE HELPERS ---
const LOCAL_STORAGE_KEY = 'doodles_backup_v2';
const DELETED_IDS_KEY = 'doodles_deleted_ids_v1';

const saveToLocalStorage = (elements: DoodleElement[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(elements));
};

const markAsDeletedLocally = (id: string) => {
  if (typeof window === 'undefined') return;
  const deleted = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]');
  if (!deleted.includes(id)) {
    deleted.push(id);
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(deleted));
  }
};

const markMultipleAsDeletedLocally = (ids: string[]) => {
    if (typeof window === 'undefined') return;
    const deleted = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]');
    const newDeleted = [...new Set([...deleted, ...ids])];
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(newDeleted));
};

const getDeletedIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]');
};

const loadFromLocalStorage = (): DoodleElement[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    const elements: DoodleElement[] = stored ? JSON.parse(stored) : [];
    const deletedIds = getDeletedIds();
    return elements.filter(e => !deletedIds.includes(e.id));
  } catch (e) {
    return [];
  }
};

export default function DoodlesPage() {
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [tool, setTool] = useState<Tool>('draw');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(20);
  const [currentFontId, setCurrentFontId] = useState<string>('sans');

  // Data State
  const [elements, setElements] = useState<DoodleElement[]>([]);
  
  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  
  // Text Editing State
  const [textInput, setTextInput] = useState<{
    isOpen: boolean;
    text: string;
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    id?: string;
    color: string;
    font: string;
  } | null>(null);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Refs
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  
  // UI State
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ 
    x: number, 
    y: number, 
    visible: boolean, 
    targetElement?: DoodleElement | null 
  }>({ x: 0, y: 0, visible: false, targetElement: null });

  // --- AUTH & INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      const localData = loadFromLocalStorage();
      if (localData.length > 0) setElements(localData);

      if (!supabaseClient) {
        setIsGuest(true);
        setAuthLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        let currentUser = session?.user;

        if (!currentUser) {
          const { data, error } = await supabaseClient.auth.signInAnonymously();
          if (error) {
            console.error("Auth Error:", error.message);
            setIsGuest(true);
            setIsOfflineMode(true);
          } else {
            currentUser = data.user;
            // Attempt to create a profile, but don't block if it fails
            supabaseClient.from('profiles').upsert(
                { id: currentUser.id, anonymous_username: `Guest-${currentUser.id.slice(0, 4)}` }, 
                { onConflict: 'id' }
            ).then(({ error }: any) => {
               if (error) console.warn("Profile creation warn:", error.message);
            });
          }
        }
        
        setUser(currentUser);
        setAuthLoading(false);

        if (currentUser) {
          const { data, error } = await supabaseClient
            .from('doodles')
            .select('*')
            .eq('is_deleted', false)
            .order('created_at', { ascending: true });

          if (!error && data) {
            const dbElements = data.map((d: any) => ({
              ...d.doodle_data,
              id: d.id,
              user_id: d.user_id,
              author_name: d.anonymous_username
            }));
            
            if (dbElements.length > 0) {
                const deletedIds = getDeletedIds();
                const validDbElements = dbElements.filter((d: any) => !deletedIds.includes(d.id));

                const merged = [...validDbElements];
                localData.forEach(localItem => {
                    if (!merged.find(m => m.id === localItem.id)) {
                        merged.push(localItem);
                    }
                });
                setElements(merged);
                saveToLocalStorage(merged);
            }
          } else if (error) {
             console.error("Fetch error, switching to offline view for data");
             setIsOfflineMode(true);
          }
        }
      } catch (err) {
        console.error("Init crash:", err);
        setIsGuest(true);
        setAuthLoading(false);
      }
    };

    init();

    if (supabaseClient) {
        const channel = supabaseClient
        .channel('public:doodles')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'doodles' }, (payload: any) => {
            const newDoodle = payload.new;
            if (newDoodle.is_deleted) return;
            
            const newElement = {
                ...newDoodle.doodle_data,
                id: newDoodle.id,
                user_id: newDoodle.user_id,
                author_name: newDoodle.anonymous_username
            };

            setElements(prev => {
                if (getDeletedIds().includes(newElement.id)) return prev;
                const exists = prev.some(e => e.id === newElement.id);
                if (exists) return prev;
                const next = [...prev, newElement];
                saveToLocalStorage(next);
                return next;
            });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'doodles' }, (payload: any) => {
            const updated = payload.new;
            setElements(prev => {
                let next;
                if (updated.is_deleted) {
                    next = prev.filter(e => e.id !== updated.id);
                } else {
                    if (getDeletedIds().includes(updated.id)) return prev;
                    const el = { ...updated.doodle_data, id: updated.id, user_id: updated.user_id, author_name: updated.anonymous_username };
                    next = prev.map(e => e.id === updated.id ? el : e);
                }
                saveToLocalStorage(next);
                return next;
            });
        })
        .subscribe();

        return () => { supabaseClient.removeChannel(channel); };
    }
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
    offsetRef.current = offset;
  }, [scale, offset]);

  // --- INFINITE CANVAS WHEEL LOGIC ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentScale = scaleRef.current;
      const currentOffset = offsetRef.current;

      if (e.ctrlKey || e.metaKey) {
        const zoomFactor = -e.deltaY * 0.002;
        const newScale = Math.max(0.1, Math.min(5, currentScale + zoomFactor));
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - currentOffset.x) / currentScale;
        const worldY = (mouseY - currentOffset.y) / currentScale;
        setScale(newScale);
        setOffset({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale });
      } else {
        setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []); 

  // --- SPACEBAR LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) setIsSpacePressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  // --- DATABASE OPERATIONS ---
  const saveElementToDB = async (element: DoodleElement) => {
    setElements(prev => {
        const next = [...prev, element];
        saveToLocalStorage(next);
        return next;
    });

    if (isGuest || !user || !supabaseClient || isOfflineMode) {
        return;
    }

    let displayName = element.author_name || 'Anonymous';
    
    const { id, user_id, author_name, ...doodleData } = element;
    const payload = {
        id: element.id,
        user_id: user.id, 
        doodle_data: doodleData,
        anonymous_username: displayName,
        position_x: (element as any).x || (element as any).points?.[0]?.x || 0,
        position_y: (element as any).y || (element as any).points?.[0]?.y || 0,
    };

    const { error } = await supabaseClient.from('doodles').upsert(payload);
    
    if (error) { 
        console.error('DB Save failed:', error);
        
        if (error.code === '23503') {
            const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const { error: profileError } = await supabaseClient.from('profiles').upsert({
                id: user.id,
                anonymous_username: `Guest-${user.id.slice(0, 4)}-${randomSuffix}` 
            });

            if (!profileError) {
                const { error: retryError } = await supabaseClient.from('doodles').upsert(payload);
                if (!retryError) return; 
            }
        }

        setIsOfflineMode(true);
        toast.error("Backend issue. Switched to Offline Mode.");
    }
  };

  const updateElementInDB = async (element: DoodleElement) => {
     const { id, user_id, author_name, ...doodleData } = element;
     
     setElements(prev => {
         const next = prev.map(e => e.id === element.id ? element : e);
         saveToLocalStorage(next);
         return next;
     });

     if (isGuest || !user || !supabaseClient || isOfflineMode) return;

     const { error } = await supabaseClient
         .from('doodles')
         .update({ doodle_data: doodleData, updated_at: new Date().toISOString() })
         .eq('id', element.id);
     
     if (error) console.error("Update failed", error);
  };

  const deleteElementFromDB = async (elementId: string) => {
     setElements(prev => {
         const next = prev.filter(e => e.id !== elementId);
         saveToLocalStorage(next);
         return next;
     });
     markAsDeletedLocally(elementId);

     if (isGuest || !user || !supabaseClient || isOfflineMode) return;

     const { error } = await supabaseClient
         .from('doodles')
         .update({ is_deleted: true })
         .eq('id', elementId);
     
     if (error) toast.error("Cloud delete failed");
  };

  const handleClear = async () => { 
      if (!confirm("Are you sure you want to delete ALL your doodles? This cannot be undone.")) return;

      // 1. Identify which doodles belong to the current user
      // If guest/offline, we treat everything as deletable locally.
      // If signed in, only delete items where user_id matches.
      const idsToDelete = elements
        .filter(e => isGuest || (user && e.user_id === user.id))
        .map(e => e.id);

      if (idsToDelete.length === 0) {
          toast.info("No doodles found to delete.");
          return;
      }

      // 2. Remove from Local State & Backup immediately
      setElements(prev => {
          const next = prev.filter(e => !idsToDelete.includes(e.id));
          saveToLocalStorage(next);
          return next;
      });
      draw();

      // 3. Mark as deleted locally (Tombstone) to prevent reload reappearance
      markMultipleAsDeletedLocally(idsToDelete);

      // 4. Delete from Cloud (Batch update)
      if (!isGuest && user && supabaseClient && !isOfflineMode) {
          const { error } = await supabaseClient
              .from('doodles')
              .update({ is_deleted: true })
              .in('id', idsToDelete);
          
          if (error) {
              console.error("Batch delete failed:", error);
              toast.error("Cloud clear failed (Saved locally)");
          } else {
              toast.success("Canvas cleared");
          }
      } else {
          toast.success("Cleared locally");
      }
  };

  const handleReload = () => {
      // Reload logic: Fetch from local, then try re-syncing if online
      const saved = loadFromLocalStorage();
      setElements(saved);
      toast.success("Refreshed view");
      draw();
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

    drawGrid(ctx, canvas.width, canvas.height, scale, offset);

    const imageElements = elements.filter(e => e.type === 'image') as ImageElement[];
    const strokeElements = elements.filter(e => (e as Stroke).type === 'pen' || (e as Stroke).type === 'eraser') as Stroke[];
    const textElements = elements.filter(e => e.type === 'text') as TextElement[];

    imageElements.forEach(img => {
      const image = new Image();
      image.src = img.src;
      if (image.complete) {
         ctx.drawImage(image, img.x, img.y, img.width, img.height);
      } else {
         image.onload = () => ctx.drawImage(image, img.x, img.y, img.width, img.height);
      }
    });

    strokeElements.forEach(stroke => drawStroke(ctx, stroke));
    if (currentStroke) drawStroke(ctx, currentStroke);

    textElements.forEach(text => {
      const fontDef = FONT_OPTIONS.find(f => f.id === text.fontFamily);
      const family = fontDef ? fontDef.family : 'sans-serif';
      ctx.font = `${text.fontSize}px ${family}`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
    });

    ctx.restore();
  }, [elements, currentStroke, offset, scale]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        draw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number, sc: number, off: {x: number, y: number}) => {
    let gridSize = 50;
    if (sc < 0.5) gridSize = 100;
    if (sc < 0.25) gridSize = 200;
    const left = -off.x / sc;
    const top = -off.y / sc;
    const right = (w - off.x) / sc;
    const bottom = (h - off.y) / sc;
    ctx.lineWidth = 1 / sc;
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    for (let x = Math.floor(left / gridSize) * gridSize; x < right; x += gridSize) {
      ctx.moveTo(x, top); ctx.lineTo(x, bottom);
    }
    for (let y = Math.floor(top / gridSize) * gridSize; y < bottom; y += gridSize) {
      ctx.moveTo(left, y); ctx.lineTo(right, y);
    }
    ctx.stroke();
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.type === 'eraser' ? 'rgba(255,255,255,1)' : stroke.color; 
    if (stroke.type === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = stroke.width;
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1];
      const p2 = stroke.points[i];
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      ctx.quadraticCurveTo(p1.x, p1.y, mid.x, mid.y);
    }
    ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  // --- HIT TESTING ---
  const hitTest = (worldX: number, worldY: number): DoodleElement | null => {
    const point = { x: worldX, y: worldY };
    for (const el of [...elements].reverse()) {
        if (el.type === 'text') {
            const width = el.text.length * (el.fontSize * 0.6); // approx
            const height = el.fontSize;
            if (worldX >= el.x && worldX <= el.x + width && worldY >= el.y - height && worldY <= el.y) {
                return el;
            }
        } else if (el.type === 'image') {
            if (worldX >= el.x && worldX <= el.x + el.width && worldY >= el.y && worldY <= el.y + el.height) {
                return el;
            }
        } else if (el.type === 'pen') {
            if (isPointInStroke(point, el)) return el;
        }
    }
    return null;
  };

  const getWorldPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - offset.x) / scale,
      y: (clientY - offset.y) / scale,
    };
  };

  // --- INTERACTION HANDLERS ---
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (textInput?.isOpen) setTextInput(null);
    setContextMenu({ ...contextMenu, visible: false });
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const point = getWorldPoint(e);

    if ('touches' in e) {
      touchStartTime.current = Date.now();
      longPressTimer.current = setTimeout(() => {
         const target = hitTest(point.x, point.y);
         setContextMenu({ x: clientX, y: clientY, visible: true, targetElement: target });
         setIsDrawing(false); 
         setCurrentStroke(null);
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

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const point = getWorldPoint(e);
    const target = hitTest(point.x, point.y);
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true, targetElement: target });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    if (isPanning) {
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    if (isDrawing && currentStroke) {
      const point = getWorldPoint(e);
      setCurrentStroke(prev => prev ? ({ ...prev, points: prev.points.concat(point) }) : null);

      if (tool === 'eraser') {
          const hit = hitTest(point.x, point.y);
          if (hit && hit.type !== 'pen' && hit.type !== 'eraser') {
              if (isGuest || (user && hit.user_id === user.id)) {
                  deleteElementFromDB(hit.id);
              }
          }
      }
    }
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    setIsPanning(false);
    if (isDrawing && currentStroke) {
      const finalStroke = currentStroke;
      saveElementToDB(finalStroke);
      setCurrentStroke(null);
      setIsDrawing(false);
    }
  };

  // --- TEXT & ACTIONS ---
  const openTextEditor = (x: number, y: number, screenX: number, screenY: number, existing?: TextElement) => {
      setTextInput({
          isOpen: true,
          text: existing ? existing.text : '',
          x: existing ? existing.x : x,
          y: existing ? existing.y : y,
          screenX,
          screenY,
          id: existing?.id,
          color: existing ? existing.color : color,
          font: existing ? existing.fontFamily : currentFontId
      });
  };

  const handleTextSubmit = () => {
    if (!textInput || !textInput.text.trim()) { setTextInput(null); return; }
    
    if (textInput.id) {
        const existing = elements.find(e => e.id === textInput.id);
        if (existing) {
            updateElementInDB({ 
                ...existing, 
                text: textInput.text, 
                color: textInput.color, 
                fontFamily: textInput.font 
            } as TextElement);
        }
    } else {
        const newText: TextElement = {
            id: crypto.randomUUID(),
            user_id: user?.id,
            type: 'text',
            x: textInput.x,
            y: textInput.y,
            text: textInput.text,
            color: textInput.color,
            fontSize: 24 / scale,
            fontFamily: textInput.font,
            author_name: 'Me'
        };
        saveElementToDB(newText);
    }
    setTextInput(null);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = getWorldPoint(e);
    const target = hitTest(point.x, point.y);
    
    if (target && target.type === 'text') {
        if (isGuest || (user && target.user_id === user.id)) {
            openTextEditor(0, 0, e.clientX, e.clientY, target as TextElement);
        } else {
            toast("Cannot edit others' text");
        }
    } else {
        openTextEditor(point.x, point.y, e.clientX, e.clientY);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const centerX = (-offset.x + window.innerWidth / 2) / scale;
          const centerY = (-offset.y + window.innerHeight / 2) / scale;
          const newImage: ImageElement = {
            id: crypto.randomUUID(),
            user_id: user?.id,
            type: 'image',
            x: centerX - 100, 
            y: centerY - 100,
            width: 200,
            height: 200 * (img.height / img.width),
            src: event.target?.result as string,
            author_name: 'Me'
          };
          saveElementToDB(newImage);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShare = async (target?: DoodleElement | null) => {
    if (canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'doodle.png', { type: 'image/png' });
        if (navigator.share) {
          await navigator.share({ title: 'Doodle', text: `Check out this doodle!`, files: [file] });
        } else {
          const link = document.createElement('a');
          link.href = dataUrl; link.download = 'doodle.png'; link.click();
          toast.success("Saved to gallery!");
        }
      } catch (err) { toast.error("Sharing failed."); }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-gray-500 overflow-hidden touch-none selection:bg-none ${isSpacePressed ? 'cursor-grab' : ''} ${isPanning ? 'cursor-grabbing' : ''}`}
      onContextMenu={handleRightClick}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={() => { if(longPressTimer.current) clearTimeout(longPressTimer.current); if(!contextMenu.visible) handlePointerUp(); }}
        className={`absolute inset-0 z-10 ${isSpacePressed ? 'cursor-grab' : 'cursor-crosshair'} active:${isSpacePressed ? 'cursor-grabbing' : ''}`}
      />

      {/* --- STATUS INDICATORS --- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {authLoading && (
            <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold text-gray-600">Syncing...</span>
            </div>
        )}
        {isOfflineMode && (
            <div className="bg-orange-100 border border-orange-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-orange-700">
                <CloudOff className="w-4 h-4" />
                <span className="text-xs font-bold">Offline Mode (Local Save Only)</span>
            </div>
        )}
      </div>

      {/* --- CUSTOM TEXT EDITOR MODAL --- */}
      <AnimatePresence>
        {textInput && textInput.isOpen && (
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className="absolute z-50 flex items-center justify-center pointer-events-none"
             style={{ 
                 left: 0, top: 0, width: '100%', height: '100%',
                 backgroundColor: 'rgba(0,0,0,0.2)' 
             }}
           >
              <div 
                className="bg-white dark:bg-zinc-800 rounded-2xl p-4 shadow-2xl pointer-events-auto w-[90%] max-w-sm flex flex-col gap-3 border border-gray-200 dark:border-zinc-700"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-500">{textInput.id ? 'Edit Text' : 'New Text'}</span>
                      <button onClick={() => setTextInput(null)}><X className="w-4 h-4 text-gray-400" /></button>
                  </div>
                  <textarea 
                    autoFocus
                    value={textInput.text}
                    onChange={(e) => setTextInput({...textInput, text: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-zinc-900 border-none rounded-xl p-3 text-lg min-h-[100px] focus:ring-2 focus:ring-purple-500 outline-none resize-none dark:text-white"
                    placeholder="Type something..."
                    style={{ fontFamily: FONT_OPTIONS.find(f => f.id === textInput.font)?.family }}
                  />
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                     {FONT_OPTIONS.map(f => (
                         <button key={f.id} onClick={() => setTextInput({...textInput, font: f.id})} className={`px-2 py-1 rounded text-xs border ${textInput.font === f.id ? 'bg-purple-100 border-purple-500 text-purple-700' : 'border-gray-200 text-gray-500'}`}>{f.label}</button>
                     ))}
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto">
                     {COLORS.map(c => (
                         <button key={c} onClick={() => setTextInput({...textInput, color: c})} className={`w-6 h-6 rounded-full border ${textInput.color === c ? 'border-purple-500 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                     ))}
                  </div>
                  <button onClick={handleTextSubmit} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl mt-2 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Done
                  </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* --- CONTEXT MENU --- */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="absolute z-50 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-1 flex flex-col min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.targetElement && (
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700 mb-1 flex items-center gap-2">
                    <User className="w-3 h-3" />
                    By: <span className="font-bold text-purple-600">{contextMenu.targetElement.author_name || 'Anonymous'}</span>
                </div>
            )}
            {!contextMenu.targetElement && (
                 <button onClick={() => { setContextMenu({...contextMenu, visible: false}); openTextEditor(0,0,contextMenu.x, contextMenu.y); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-black/5 rounded-lg text-left">
                    <TypeIcon className="w-4 h-4" /> Add Text
                 </button>
            )}
            <button onClick={() => { setContextMenu({...contextMenu, visible: false}); handleShare(contextMenu.targetElement); }} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-black/5 rounded-lg text-left">
               <Share2 className="w-4 h-4" /> Share
            </button>
            {contextMenu.targetElement && (isGuest || (user && contextMenu.targetElement.user_id === user.id)) && (
                 <button onClick={() => { deleteElementFromDB(contextMenu.targetElement!.id); setContextMenu({...contextMenu, visible: false}); }} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left">
                    <Trash2 className="w-4 h-4" /> Delete
                 </button>
            )}
            <button onClick={() => setContextMenu({ ...contextMenu, visible: false })} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-black/5 rounded-lg text-left">
              <X className="w-4 h-4" /> Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DESKTOP TOOLBAR --- */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col gap-4">
        <DesktopToolbar 
          tool={tool} setTool={setTool} 
          fileInputRef={fileInputRef} handleImageUpload={handleImageUpload} 
          openTextEditor={() => openTextEditor((-offset.x + window.innerWidth/2)/scale, (-offset.y + window.innerHeight/2)/scale, window.innerWidth/2, window.innerHeight/2)}
          handleReload={handleReload} handleClear={handleClear}
          color={color} setColor={setColor} brushSize={brushSize} setBrushSize={setBrushSize} eraserSize={eraserSize} setEraserSize={setEraserSize}
          colors={COLORS} colorInputRef={colorInputRef} 
          toggleFont={() => setCurrentFontId(prev => { const idx = FONT_OPTIONS.findIndex(f => f.id === prev); return FONT_OPTIONS[(idx + 1) % FONT_OPTIONS.length].id; })}
          currentFontLabel={FONT_OPTIONS.find(f => f.id === currentFontId)?.label}
        />
      </div>

      {/* --- MOBILE BOTTOM BAR --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex md:hidden items-center gap-2 w-[95%] max-w-md justify-between bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 shadow-2xl">
         <ToolButton icon={MousePointer2} active={tool === 'select'} onClick={() => setTool('select')} label="Pan" isMobile />
         <ToolButton icon={Pencil} active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw" isMobile />
         <ToolButton icon={Eraser} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Erase" isMobile />
         <div className="h-6 w-px bg-gray-300 dark:bg-zinc-700" />
         <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 rounded-full bg-purple-600 text-white shadow-lg">
            <Menu className="w-5 h-5" />
         </button>
      </div>

      {/* --- MOBILE MENU --- */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 md:hidden"
          >
             <div className="flex justify-between items-center">
               <span className="text-sm font-bold dark:text-white">Tools</span>
               <button onClick={() => setShowMobileMenu(false)}><X className="w-5 h-5 text-gray-500" /></button>
             </div>
             <div className="space-y-1">
               <label className="text-xs text-gray-500">Size</label>
               <input type="range" min="1" max="50" value={tool === 'eraser' ? eraserSize : brushSize} onChange={(e) => tool === 'eraser' ? setEraserSize(Number(e.target.value)) : setBrushSize(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg" />
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2">
                {COLORS.map(c => ( <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 flex-shrink-0 ${color === c ? 'border-purple-500 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} /> ))}
             </div>
             <div className="grid grid-cols-4 gap-2">
                <ToolButton icon={TypeIcon} active={false} onClick={() => { openTextEditor((-offset.x + window.innerWidth/2)/scale, (-offset.y + window.innerHeight/2)/scale, window.innerWidth/2, window.innerHeight/2); setShowMobileMenu(false); }} label="Text" isMobile />
                <ToolButton icon={ImageIcon} active={false} onClick={() => { fileInputRef.current?.click(); setShowMobileMenu(false); }} label="Img" isMobile />
                <ToolButton icon={Share2} active={false} onClick={() => handleShare()} label="Share" isMobile />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

      {/* --- ZOOM CONTROLS --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-4">
        <motion.div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 flex items-center gap-4 shadow-lg">
          <button onClick={() => setScale(Math.max(0.1, scale - 0.1))}><ZoomOut className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[3ch] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(Math.min(5, scale + 0.1))}><ZoomIn className="w-5 h-5 text-gray-700 dark:text-gray-300" /></button>
        </motion.div>
      </div>

      <div className="absolute top-24 right-6 z-30 pointer-events-none opacity-50 hover:opacity-100 transition-opacity hidden md:block">
        <div className="bg-black/20 backdrop-blur-md text-white text-xs p-3 rounded-xl max-w-[200px]">
          <p>• <strong>Right Click / Hold</strong> Menu</p>
          <p>• <strong>Double Click</strong> Add/Edit text</p>
          <p>• <strong>Eraser</strong> Deletes text/images</p>
        </div>
      </div>
    </div>
  );
}

function DesktopToolbar({ tool, setTool, fileInputRef, openTextEditor, handleReload, handleClear, color, setColor, brushSize, setBrushSize, eraserSize, setEraserSize, colors, colorInputRef, toggleFont, currentFontLabel }: any) {
  return (
    <div className="flex gap-4 items-start">
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-2"
      >
        <ToolButton icon={MousePointer2} active={tool === 'select'} onClick={() => setTool('select')} label="Pan/Move" />
        <ToolButton icon={Pencil} active={tool === 'draw'} onClick={() => setTool('draw')} label="Draw" />
        <ToolButton icon={Eraser} active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser" />
        <div className="h-px bg-gray-200 dark:bg-zinc-700 my-1" />
        <ToolButton icon={TypeIcon} active={false} onClick={openTextEditor} label="Text" />
        <ToolButton icon={TypeIcon} active={false} onClick={toggleFont} label={`Font: ${currentFontLabel}`} />
        <ToolButton icon={ImageIcon} active={false} onClick={() => fileInputRef.current?.click()} label="Image" />
        <div className="h-px bg-gray-200 dark:bg-zinc-700 my-1" />
        <ToolButton icon={RefreshCw} active={false} onClick={handleReload} label="Refresh" />
        <ToolButton icon={Trash2} active={false} onClick={handleClear} label="Clear View" color="text-red-500" />
      </motion.div>

      <AnimatePresence>
        {(tool === 'draw' || tool === 'eraser') && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-xl p-4 flex flex-col gap-4 w-48"
          >
             <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{tool === 'draw' ? 'Brush Size' : 'Eraser Size'}</label>
                <div className="flex items-center gap-3">
                  <div className={`rounded-full bg-black dark:bg-white`} style={{ width: tool === 'draw' ? brushSize : eraserSize/2, height: tool === 'draw' ? brushSize : eraserSize/2 }} />
                  <input type="range" min="1" max="50" value={tool === 'draw' ? brushSize : eraserSize} onChange={(e) => tool === 'draw' ? setBrushSize(Number(e.target.value)) : setEraserSize(Number(e.target.value))} className="w-full h-1 bg-gray-200 dark:bg-zinc-700 rounded-lg" />
                </div>
             </div>
             {tool === 'draw' && (
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Color</label>
                 <div className="grid grid-cols-5 gap-2">
                    {colors.map((c: string) => (
                      <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-purple-500 scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                    <button onClick={() => colorInputRef.current?.click()} className="w-6 h-6 rounded-full border-2 flex items-center justify-center bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500 hover:scale-110">
                      <Palette className="w-3 h-3 text-white drop-shadow-md" />
                    </button>
                    <input ref={colorInputRef} type="color" className="hidden" onChange={(e) => setColor(e.target.value)} />
                 </div>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolButton({ icon: Icon, active, onClick, label, color, isMobile }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`p-3 rounded-xl transition-all relative group flex flex-col items-center justify-center ${active ? 'bg-purple-600 text-white shadow-lg' : 'bg-transparent text-gray-500 hover:bg-black/5 dark:hover:bg-white/10'} ${color}`}
      title={label}
    >
      <Icon className={isMobile ? "w-5 h-5" : "w-6 h-6"} />
      {!isMobile && (
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </span>
      )}
    </motion.button>
  );
}