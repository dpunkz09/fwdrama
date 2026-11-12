import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const GUEST_ID_KEY = 'drama_guest_id';
const LIKED_DRAMAS_KEY = 'liked_dramas';

interface LikedDramaData {
    [dramaId: number]: boolean;
}

interface LikeCount {
    [dramaId: number]: number;
}

// Generate or retrieve guest ID
function getGuestId(): string {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
}

export function useLikedDramas() {
    const [likedDramas, setLikedDramas] = useState<LikedDramaData>({});
    const [likeCounts, setLikeCounts] = useState<LikeCount>({});
    const [loading, setLoading] = useState(true);

    // Load liked dramas from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(LIKED_DRAMAS_KEY);
        if (stored) {
            try {
                setLikedDramas(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse liked dramas:', e);
            }
        }
        setLoading(false);
    }, []);

    // Sync liked dramas across browser tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === LIKED_DRAMAS_KEY && e.newValue) {
                try {
                    setLikedDramas(JSON.parse(e.newValue));
                } catch (error) {
                    console.error('Failed to sync liked dramas across tabs:', error);
                }
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Save to localStorage whenever likedDramas changes
    useEffect(() => {
        if (!loading) {
            localStorage.setItem(LIKED_DRAMAS_KEY, JSON.stringify(likedDramas));
        }
    }, [likedDramas, loading]);

    // Toggle like for a drama
    const toggleLike = async (dramaId: number): Promise<boolean> => {
        const guestId = getGuestId();
        const wasLiked = likedDramas[dramaId] || false;

        // Optimistically update UI
        setLikedDramas(prev => ({
            ...prev,
            [dramaId]: !wasLiked,
        }));

        // Optimistically update count
        setLikeCounts(prev => ({
            ...prev,
            [dramaId]: (prev[dramaId] || 0) + (wasLiked ? -1 : 1),
        }));

        try {
            const response = await fetch('/api/liked-dramas/toggle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    drama_id: dramaId,
                    guest_id: guestId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update like status');
            }

            // Update with actual server state
            setLikedDramas(prev => ({
                ...prev,
                [dramaId]: data.liked,
            }));

            setLikeCounts(prev => ({
                ...prev,
                [dramaId]: data.like_count,
            }));

            // Show toast notification
            if (data.liked) {
                toast.success('Added to liked dramas');
            } else {
                toast.success('Removed from liked dramas');
            }

            return data.liked;
        } catch (error) {
            console.error('Failed to toggle like:', error);
            
            // Revert optimistic update
            setLikedDramas(prev => ({
                ...prev,
                [dramaId]: wasLiked,
            }));

            setLikeCounts(prev => ({
                ...prev,
                [dramaId]: (prev[dramaId] || 0) + (wasLiked ? 1 : -1),
            }));

            toast.error('Failed to update like status');
            return wasLiked;
        }
    };

    // Check if drama is liked
    const isLiked = (dramaId: number): boolean => {
        return likedDramas[dramaId] || false;
    };

    // Load like count from server
    const loadLikeCount = async (dramaId: number): Promise<number | undefined> => {
        try {
            const response = await fetch(`/api/liked-dramas/${dramaId}/count`);
            const data = await response.json();
            
            if (response.ok) {
                setLikeCounts(prev => ({
                    ...prev,
                    [dramaId]: data.like_count,
                }));
                return data.like_count;
            }
        } catch (error) {
            console.error('Failed to load like count:', error);
        }
        return undefined;
    };

    // Get cached like count
    const getLikeCount = (dramaId: number): number => {
        return likeCounts[dramaId] || 0;
    };

    return {
        likedDramas,
        loading,
        toggleLike,
        isLiked,
        loadLikeCount,
        getLikeCount,
    };
}
