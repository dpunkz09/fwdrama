import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

interface WatchHistoryItem {
    drama_id: number;
    last_episode: number;
    progress_seconds?: number;
    drama?: Drama;
    updated_at?: string;
}

const STORAGE_KEY = 'drama_watch_history';

export function useWatchHistory() {
    const { auth } = usePage().props;
    const [history, setHistory] = useState<WatchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadHistory = async () => {
        if (auth.user) {
            // Authenticated: fetch from server
            try {
                const response = await fetch('/api/watch-history');
                if (response.ok) {
                    const data = await response.json();
                    setHistory(data);
                }
            } catch (error) {
                console.error('Failed to load watch history:', error);
            }
        } else {
            // Guest: load from localStorage and enrich with drama data
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const localHistory: WatchHistoryItem[] = JSON.parse(stored);
                    
                    // Fetch drama data for each history item (use allSettled to handle failures)
                    const enrichedHistory = await Promise.allSettled(
                        localHistory.map(async (item) => {
                            try {
                                const response = await fetch(`/api/dramas/${item.drama_id}`);
                                if (response.ok) {
                                    const drama = await response.json();
                                    return { ...item, drama };
                                }
                            } catch (error) {
                                console.error(`Failed to fetch drama ${item.drama_id}:`, error);
                            }
                            return item;
                        })
                    );
                    
                    // Filter successful results and map them
                    const validHistory = enrichedHistory
                        .filter((result): result is PromiseFulfilledResult<WatchHistoryItem> => 
                            result.status === 'fulfilled'
                        )
                        .map(result => result.value);
                    
                    setHistory(validHistory);
                }
            } catch (error) {
                console.error('Failed to parse watch history from localStorage:', error);
            }
        }
        setLoading(false);
    };

    // Load watch history on mount
    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth.user]);

    // Sync watch history across browser tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                loadHistory();
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const updateHistory = async (dramaId: number, episode: number, progressSeconds: number = 0) => {
        if (auth.user) {
            // Authenticated: save to server
            try {
                await fetch('/api/watch-history', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        drama_id: dramaId,
                        episode,
                        progress_seconds: progressSeconds,
                    }),
                });
                // Reload history after update
                loadHistory();
            } catch (error) {
                console.error('Failed to update watch history:', error);
            }
        } else {
            // Guest: save to localStorage
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                let historyData: WatchHistoryItem[] = stored ? JSON.parse(stored) : [];

                // Check if this is first time watching this drama
                const existingIndex = historyData.findIndex(item => item.drama_id === dramaId);
                const isFirstWatch = existingIndex < 0;
                
                // Update or add new entry
                const newItem: WatchHistoryItem = {
                    drama_id: dramaId,
                    last_episode: episode,
                    progress_seconds: progressSeconds,
                };

                if (existingIndex >= 0) {
                    historyData[existingIndex] = newItem;
                } else {
                    historyData.unshift(newItem);
                }

                // Keep only last 10 items
                historyData = historyData.slice(0, 10);

                localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
                
                // Increment view count on first watch
                if (isFirstWatch) {
                    try {
                        // Generate guest ID (same logic as use-liked-dramas)
                        let guestId = localStorage.getItem('drama_guest_id');
                        if (!guestId) {
                            guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            localStorage.setItem('drama_guest_id', guestId);
                        }
                        
                        await fetch('/api/dramas/increment-view', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            },
                            body: JSON.stringify({
                                drama_id: dramaId,
                                guest_id: guestId,
                            }),
                        });
                    } catch (error) {
                        console.error('Failed to increment view count:', error);
                    }
                }
                
                // Reload to fetch drama data
                loadHistory();
            } catch (error) {
                console.error('Failed to save watch history to localStorage:', error);
            }
        }
    };

    const getLastEpisode = (dramaId: number): number | null => {
        const item = history.find(h => h.drama_id === dramaId);
        return item ? item.last_episode : null;
    };

    const deleteHistory = async (dramaId: number): Promise<boolean> => {
        if (auth.user) {
            // Authenticated: delete from server
            try {
                const response = await fetch(`/api/watch-history/${dramaId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                });

                if (response.ok) {
                    // Update local state immediately
                    setHistory(prev => prev.filter(item => item.drama_id !== dramaId));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to delete watch history:', error);
                return false;
            }
        } else {
            // Guest: remove from localStorage
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    let historyData: WatchHistoryItem[] = JSON.parse(stored);
                    historyData = historyData.filter(item => item.drama_id !== dramaId);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyData));
                    
                    // Update local state immediately
                    setHistory(prev => prev.filter(item => item.drama_id !== dramaId));
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Failed to delete watch history from localStorage:', error);
                return false;
            }
        }
    };

    return {
        history,
        loading,
        updateHistory,
        deleteHistory,
        getLastEpisode,
        refreshHistory: loadHistory,
    };
}
