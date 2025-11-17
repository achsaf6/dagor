"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/app/utils/supabase";
import { TokenSize, TokenTemplate } from "@/app/types";
import {
  DEFAULT_TOKEN_SIZE,
  TOKEN_SIZE_METADATA,
  TOKEN_SIZE_ORDER,
} from "@/app/utils/tokenSizes";

interface TokenPickerProps {
  onTokenDragStart: (tokenTemplate: TokenTemplate) => void;
  onTokenDragEnd: () => void;
}

interface MonsterTemplate extends TokenTemplate {
  monsterId?: string | null;
}

const AVAILABLE_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Lime", value: "#84cc16" },
  { name: "Orange", value: "#f97316" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Yellow", value: "#eab308" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Violet", value: "#a855f7" },
  { name: "Emerald", value: "#059669" },
  { name: "Sky", value: "#0ea5e9" },
];

const LONG_PRESS_DELAY = 600;

const normalizeColorKey = (color: string) => color.toLowerCase();

const COLOR_LABEL_MAP = new Map(AVAILABLE_COLORS.map((entry) => [entry.value, entry.name]));

const getDefaultTokenName = (color: string) => {
  return COLOR_LABEL_MAP.get(color) ?? color;
};

const normalizeSize = (value?: string | null): TokenSize => {
  if (!value) return DEFAULT_TOKEN_SIZE;
  return TOKEN_SIZE_ORDER.includes(value as TokenSize)
    ? (value as TokenSize)
    : DEFAULT_TOKEN_SIZE;
};

const normalizeName = (value: string | null | undefined, fallbackColor: string) => {
  const trimmed = value?.trim();
  if (trimmed) {
    return trimmed;
  }
  return getDefaultTokenName(fallbackColor);
};

export const TokenPicker = ({ onTokenDragStart, onTokenDragEnd }: TokenPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [monsterTemplates, setMonsterTemplates] = useState<Map<string, MonsterTemplate>>(new Map());
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [editorState, setEditorState] = useState<MonsterTemplate | null>(null);
  const [editorStatus, setEditorStatus] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState("");

  const defaultTemplate = (color: string): MonsterTemplate => ({
    color,
    size: DEFAULT_TOKEN_SIZE,
    imageUrl: null,
    monsterId: null,
    name: getDefaultTokenName(color),
  });

  const getTemplateForColor = (color: string): MonsterTemplate => {
    const template = monsterTemplates.get(normalizeColorKey(color));
    return template ?? defaultTemplate(color);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchMonsters = async () => {
      setIsLoadingTemplates(true);
      const { data, error } = await supabase
        .from("monsters")
        .select("id,color,size,image_url,name")
        .order("color", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load monsters:", error);
        setIsLoadingTemplates(false);
        return;
      }

      const next = new Map<string, MonsterTemplate>();
      data?.forEach((row) => {
        const color = typeof row.color === "string" ? row.color : "";
        if (!color) return;
        next.set(normalizeColorKey(color), {
          color,
          size: normalizeSize(row.size),
          imageUrl: row.image_url ?? null,
          monsterId: row.id ?? null,
          name: normalizeName(row.name, color),
        });
      });

      setMonsterTemplates(next);
      setIsLoadingTemplates(false);
    };

    void fetchMonsters();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditorState(null);
        setEditorStatus(null);
        setEditorError(null);
        setNameDraft("");
      }
    };

    if (isOpen || editorState) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, editorState]);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const openEditor = (color: string) => {
    const template = getTemplateForColor(color);
    setEditorState(template);
    setNameDraft(template.name ?? getDefaultTokenName(color));
    setEditorStatus(null);
    setEditorError(null);
    setIsOpen(false);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = null;
  };

  const startLongPress = (color: string) => {
    if (typeof window === "undefined") return;
    cancelLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      openEditor(color);
    }, LONG_PRESS_DELAY);
  };

  const persistMonsterTemplate = async (
    color: string,
    updates: Partial<Pick<MonsterTemplate, "size" | "imageUrl" | "name">>
  ) => {
    const key = normalizeColorKey(color);
    const existing = monsterTemplates.get(key) ?? defaultTemplate(color);
    const payload = {
      color,
      size: updates.size ?? existing.size ?? DEFAULT_TOKEN_SIZE,
      image_url: updates.imageUrl ?? existing.imageUrl ?? null,
      id: existing.monsterId ?? undefined,
      name: updates.name ?? existing.name ?? getDefaultTokenName(color),
    };

    setIsSaving(true);
    setEditorStatus("Saving...");
    setEditorError(null);
    try {
      const { data, error } = await supabase
        .from("monsters")
        .upsert(payload, { onConflict: "color" })
        .select("id,color,size,image_url,name")
        .single();

      if (error) throw error;

      const next: MonsterTemplate = {
        color: data.color,
        size: normalizeSize(data.size),
        imageUrl: data.image_url ?? null,
        monsterId: data.id ?? null,
        name: normalizeName(data.name, data.color),
      };

      setMonsterTemplates((prev) => {
        const updated = new Map(prev);
        updated.set(key, next);
        return updated;
      });
      setEditorState((prev) => (prev && normalizeColorKey(prev.color) === key ? next : prev));
      setEditorStatus("Saved");
      return next;
    } catch (error) {
      console.error("Failed to persist monster:", error);
      setEditorError(error instanceof Error ? error.message : "Could not save monster.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const commitNameChange = async () => {
    if (!editorState) return;
    const nextName = nameDraft.trim() || getDefaultTokenName(editorState.color);
    setEditorState({ ...editorState, name: nextName });
    try {
      await persistMonsterTemplate(editorState.color, { name: nextName });
      setNameDraft(nextName);
    } catch {
      setNameDraft(editorState.name ?? nextName);
    }
  };

  const handleSizeChange = async (size: TokenSize) => {
    if (!editorState || size === editorState.size) return;
    setEditorState({ ...editorState, size });
    try {
      await persistMonsterTemplate(editorState.color, { size });
    } catch {
      /* handled elsewhere */
    }
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!editorState) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setEditorStatus("Uploading image...");
    setEditorError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const tokenId = `monster-${editorState.color.replace(/[^a-zA-Z0-9]/g, "") || "custom"}`;
      formData.append("tokenId", tokenId);

      const response = await fetch("/api/token-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Failed to upload image.");
      }

      const data = await response.json();
      await persistMonsterTemplate(editorState.color, { imageUrl: data.publicUrl });
    } catch (error) {
      console.error("Failed to upload monster image:", error);
      setEditorError(error instanceof Error ? error.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageRemove = async () => {
    if (!editorState || !editorState.imageUrl) return;
    try {
      await persistMonsterTemplate(editorState.color, { imageUrl: null });
    } catch {
      /* handled elsewhere */
    }
  };

  const handleTokenDragStart = (event: React.DragEvent, color: string) => {
    cancelLongPress();
    const template = getTemplateForColor(color);
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", color);
    onTokenDragStart(template);
  };

  const handleTokenDragEnd = () => {
    cancelLongPress();
    onTokenDragEnd();
  };

  const editorPreviewBackground = useMemo(() => {
    if (!editorState) return undefined;
    if (editorState.imageUrl) {
      return {
        backgroundImage: `url(${editorState.imageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } as const;
    }
    return { backgroundColor: editorState.color } as const;
  }, [editorState]);

  return (
    <div ref={pickerRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`relative rounded-md p-3 text-white hover:bg-black/90 transition-all ${
          isOpen ? "bg-black/90" : ""
        }`}
        aria-label="Add Token"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-white/60" />
      </button>

      {isOpen && (
        <div className="absolute left-full ml-2 top-0 bg-black/85 backdrop-blur-md rounded-lg p-4 shadow-lg border border-white/20 min-w-[220px] z-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold">Token Catalog</h3>
            {isLoadingTemplates && <span className="text-xs text-gray-300">Loading…</span>}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {AVAILABLE_COLORS.map((color) => {
              const template = getTemplateForColor(color.value);
              const sizeMeta = TOKEN_SIZE_METADATA[template.size];
              return (
                <button
                  key={color.value}
                  type="button"
                  draggable
                  onDragStart={(e) => handleTokenDragStart(e, color.value)}
                  onDragEnd={handleTokenDragEnd}
                  onMouseDown={() => startLongPress(color.value)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(color.value)}
                  onTouchEnd={cancelLongPress}
                  className="relative w-10 h-10 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-grab active:cursor-grabbing overflow-hidden"
                  style={
                    template.imageUrl
                      ? {
                          backgroundImage: `url(${template.imageUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : { backgroundColor: color.value }
                  }
                  title={`Drag ${template.name ?? color.name} token (${sizeMeta.label})`}
                  aria-label={`Drag ${template.name ?? color.name} token (${sizeMeta.label})`}
                >
                  <span className="absolute bottom-0 right-0 mb-0.5 mr-0.5 rounded bg-black/70 px-1 text-[8px] font-semibold uppercase text-white">
                    {TOKEN_SIZE_METADATA[template.size].label.charAt(0)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {editorState && (
        <div className="absolute left-full ml-3 top-0 z-30 w-64 rounded-lg border border-white/15 bg-slate-950/95 p-4 text-sm text-white shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-300">Customize Token</p>
              <p className="text-base font-semibold" style={{ color: editorState.color }}>
                {AVAILABLE_COLORS.find((c) => c.value === editorState.color)?.name ?? editorState.color}
              </p>
            </div>
            <button
              type="button"
              className="text-gray-300 hover:text-white"
              aria-label="Close editor"
              onClick={() => {
                setEditorState(null);
                setEditorStatus(null);
                setEditorError(null);
                setNameDraft("");
              }}
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-2 mb-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-300">
              Token Name
            </label>
            <input
              type="text"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => void commitNameChange()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void commitNameChange();
                }
              }}
              className="w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-gray-100 placeholder-gray-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder={getDefaultTokenName(editorState.color)}
            />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-12 w-12 rounded-full border border-white/40 shadow-inner"
              style={editorPreviewBackground}
            />
            <div className="flex flex-col text-xs text-gray-300">
              <span>DnD Size</span>
              <span className="font-semibold text-white">{TOKEN_SIZE_METADATA[editorState.size].label}</span>
              <span>{TOKEN_SIZE_METADATA[editorState.size].description}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {TOKEN_SIZE_ORDER.map((size) => {
              const meta = TOKEN_SIZE_METADATA[size];
              const isSelected = editorState.size === size;
              return (
                <button
                  key={size}
                  type="button"
                  className={`rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/20 text-white"
                      : "border-gray-700 bg-gray-900/50 text-gray-200 hover:border-gray-500"
                  }`}
                  onClick={() => void handleSizeChange(size)}
                  disabled={isSaving && isSelected}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <div className="mb-2">
            <p className="text-xs uppercase tracking-wide text-gray-300 mb-1">Token Art</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-gray-600 bg-gray-900 px-2 py-1 text-xs text-gray-100 hover:border-gray-400 disabled:opacity-60"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Upload"}
              </button>
              <button
                type="button"
                className="rounded-md border border-gray-600 bg-transparent px-2 py-1 text-xs text-gray-200 hover:text-white disabled:opacity-50"
                onClick={() => void handleImageRemove()}
                disabled={!editorState.imageUrl || isSaving || isUploading}
              >
                Remove
              </button>
            </div>
            {editorState.imageUrl && (
              <p className="mt-1 text-[11px] text-gray-400 break-all">{editorState.imageUrl}</p>
            )}
          </div>
          {editorStatus && <p className="text-[11px] text-emerald-300">{editorStatus}</p>}
          {editorError && <p className="text-[11px] text-red-300">{editorError}</p>}
        </div>
      )}
    </div>
  );
};