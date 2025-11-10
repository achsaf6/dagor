import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

export interface MapSettings {
  gridScale: number;
  gridOffsetX: number;
  gridOffsetY: number;
}

const DEFAULT_SETTINGS: MapSettings = {
  gridScale: 1.0,
  gridOffsetX: 0,
  gridOffsetY: 0,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('map_settings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          // If no settings exist, use defaults
          if (error.code === 'PGRST116') {
            console.log('No existing settings found, using defaults');
            setSettings(DEFAULT_SETTINGS);
          } else {
            console.error('Error loading settings:', error);
            setSettings(DEFAULT_SETTINGS);
          }
        } else if (data) {
          setSettings({
            gridScale: data.grid_scale ?? DEFAULT_SETTINGS.gridScale,
            gridOffsetX: data.grid_offset_x ?? DEFAULT_SETTINGS.gridOffsetX,
            gridOffsetY: data.grid_offset_y ?? DEFAULT_SETTINGS.gridOffsetY,
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: MapSettings) => {
    try {
      setIsSaving(true);
      
      // First, try to update existing settings
      const { data: existingData } = await supabase
        .from('map_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('map_settings')
          .update({
            grid_scale: newSettings.gridScale,
            grid_offset_x: newSettings.gridOffsetX,
            grid_offset_y: newSettings.gridOffsetY,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('map_settings')
          .insert({
            grid_scale: newSettings.gridScale,
            grid_offset_x: newSettings.gridOffsetX,
            grid_offset_y: newSettings.gridOffsetY,
          });

        if (error) throw error;
      }

      setSettings(newSettings);
    } catch (err) {
      console.error('Error saving settings:', err);
      // Still update local state even if save fails
      setSettings(newSettings);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Debounced save function to avoid too many database writes
  const debouncedSave = useCallback(
    debounce((newSettings: MapSettings) => {
      saveSettings(newSettings);
    }, 500),
    [saveSettings]
  );

  const updateSettings = useCallback((updates: Partial<MapSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    debouncedSave(newSettings);
  }, [settings, debouncedSave]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    setGridScale: (value: number) => updateSettings({ gridScale: value }),
    setGridOffset: (x: number, y: number) => updateSettings({ gridOffsetX: x, gridOffsetY: y }),
  };
};

// Simple debounce helper
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

