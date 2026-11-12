import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SavedDramaItem {
    drama_id: number;
    drama?: Drama;
    saved_at: string;
}

interface SaveCountState {
    [dramaId: number]: number;
}

export function useSavedDramas() {
    const { auth } = usePage().props;
    const [savedDramas, setSavedDramas] = useState<SavedDramaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [savedDramaIds, setSavedDramaIds] = useState<Set<number>>(new Set());
    const [saveCounts, setSaveCounts] = useState<SaveCountState>({});

    const loadSavedDramas = async () => {
        if (!auth.user) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/saved-dramas');
            if (response.ok) {
                const data = await response.json();
                setSavedDramas(data);
                
                // Create a set of saved drama IDs for quick lookup
                const ids = new Set(data.map((item: SavedDramaItem) => item.drama_id));
                setSavedDramaIds(ids);
            }
        } catch (error) {
            console.error('Failed to load saved dramas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load save count for a specific drama (public, no auth required)
    const loadSaveCount = async (dramaId: number) => {
        try {
            const response = await fetch(`/api/saved-dramas/${dramaId}/count`);
            if (response.ok) {
                const data = await response.json();
                setSaveCounts(prev => ({ ...prev, [dramaId]: data.count }));
                return data.count;
            }
        } catch (error) {
            console.error('Failed to load save count:', error);
        }
        return 0;
    };

    useEffect(() => {
        loadSavedDramas();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.user]);

    // Sync saved dramas across browser tabs (for guests using localStorage in future)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            // This will be useful if we add localStorage support for guest saved dramas
            if (e.key && e.key.includes('saved_dramas') && e.newValue) {
                loadSavedDramas();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleSave = async (dramaId: number) => {
        if (!auth.user) {
            toast.error('Please log in to save dramas');
            return { success: false, saved: false };
        }

        try {
            const response = await fetch('/api/saved-dramas/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ drama_id: dramaId }),
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update local state
                if (data.saved) {
                    setSavedDramaIds(prev => new Set(prev).add(dramaId));
                    toast.success('Drama saved successfully');
                } else {
                    setSavedDramaIds(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(dramaId);
                        return newSet;
                    });
                    toast.success('Drama removed from saved list');
                }
                
                // Update save count if provided
                if (data.saved_count !== undefined) {
                    setSaveCounts(prev => ({ ...prev, [dramaId]: data.saved_count }));
                }
                
                // Reload full list
                await loadSavedDramas();
                
                // Refresh page props to update saved_count
                router.reload({ only: ['saved_count'] });
                
                return { success: true, saved: data.saved };
            } else {
                const errorData = await response.text();
                console.error('Toggle save failed:', response.status, errorData);
                toast.error(`Failed to save: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Failed to toggle save:', error);
            toast.error('Network error. Please try again.');
        }

        return { success: false, saved: false };
    };

    const isSaved = (dramaId: number): boolean => {
        return savedDramaIds.has(dramaId);
    };

    const getSaveCount = (dramaId: number): number => {
        return saveCounts[dramaId] || 0;
    };

    const deleteSaved = async (dramaId: number): Promise<boolean> => {
        if (!auth.user) {
            toast.error('Please log in to manage saved dramas');
            return false;
        }

        try {
            const response = await fetch(`/api/saved-dramas/${dramaId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update local state
                setSavedDramaIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(dramaId);
                    return newSet;
                });
                
                // Update save count if provided
                if (data.saved_count !== undefined) {
                    setSaveCounts(prev => ({ ...prev, [dramaId]: data.saved_count }));
                }
                
                // Reload saved dramas list
                await loadSavedDramas();
                
                toast.success('Drama removed from saved list');
                
                // Refresh page props to update saved_count
                router.reload({ only: ['saved_count'] });
                
                return true;
            } else {
                toast.error('Failed to remove drama');
                return false;
            }
        } catch (error) {
            console.error('Failed to delete saved drama:', error);
            toast.error('Network error. Please try again.');
            return false;
        }
    };

    return {
        savedDramas,
        loading,
        toggleSave,
        deleteSaved,
        isSaved,
        loadSaveCount,
        getSaveCount,
        refreshSavedDramas: loadSavedDramas,
    };
}
