import { Head, router } from '@inertiajs/react';
import Hls from 'hls.js';
import {
    Bookmark,
    ChevronLeft,
    Heart,
    List,
    Loader2,
    MessageCircle,
    Pause,
    Play,
    RefreshCw,
    Share2,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLikedDramas } from '@/hooks/use-liked-dramas';
import { useSavedDramas } from '@/hooks/use-saved-dramas';
import { useWatchHistory } from '@/hooks/use-watch-history';
import { cn } from '@/lib/utils';

interface Subtitle {
    dil: string;
    src: string;
}

interface StreamData {
    delivery?: string;
    type?: 'mp4' | 'hls';
    url?: string;
    source_tag?: string;
    expires_at?: string;
    altyazilar?: Subtitle[];
    mod?: string;
    hata?: string;
    retry_after?: number;
}

interface Drama {
    id: number;
    slug: string;
    title: string;
    cover: string;
    external_id: string;
    available_episodes: number;
    total_episodes: number;
}

interface Props {
    drama: Drama;
    episode: number;
    streamData: StreamData | null;
    error?: string;
    saved_count?: number;
    like_count?: number;
}

const RANGE_SIZE = 25;
const MAX_RETRIES = 20; // Maximum retry attempts for stream loading

export default function DramaWatch({
    drama,
    episode,
    streamData: initialStreamData,
    error: initialError,
    saved_count = 0,
    like_count = 0,
}: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [retryMessage, setRetryMessage] = useState('');
    const [streamData, setStreamData] = useState<StreamData | null>(initialStreamData);
    const [error, setError] = useState<string | undefined>(initialError);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showEpisodesModal, setShowEpisodesModal] = useState(false);
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [displaySaveCount, setDisplaySaveCount] = useState(saved_count);
    const [displayLikeCount, setDisplayLikeCount] = useState(like_count);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const nextEpisodeRetryRef = useRef<NodeJS.Timeout | null>(null);
    const swipeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasTrackedRef = useRef(false);
    
    // Initialize hooks (must be before any early returns)
    const { updateHistory } = useWatchHistory();
    const { toggleSave, isSaved, loadSaveCount } = useSavedDramas();
    const { toggleLike, isLiked: checkIsLiked, loadLikeCount } = useLikedDramas();
    
    // Check if drama is saved and liked
    const dramaIsSaved = isSaved(drama.id);
    const dramaIsLiked = checkIsLiked(drama.id);

    // Load and update counts (only on mount)
    useEffect(() => {
        setDisplaySaveCount(saved_count);
        setDisplayLikeCount(like_count);
        
        loadSaveCount(drama.id).then(count => {
            if (count !== undefined) {
                setDisplaySaveCount(count);
            }
        });
        
        loadLikeCount(drama.id).then(count => {
            if (count !== undefined) {
                setDisplayLikeCount(count);
            }
        });
    }, [drama.id]); // Only depend on drama.id

    // Fetch stream data with retry
    const fetchStreamData = async (attemptNumber: number = 1) => {
        // Prevent infinite retry loop
        if (attemptNumber > MAX_RETRIES) {
            setError('Stream failed to load after maximum retries. Please try again later.');
            setRetryMessage('');
            setIsLoading(false);
            return;
        }

        setRetryCount(attemptNumber);
        setRetryMessage(`Preparing stream... (Attempt ${attemptNumber}/${MAX_RETRIES})`);

        try {
            const response = await fetch(`/api/drama/${drama.slug}/stream/${episode}`);
            const data = await response.json();

            if (response.ok && data.streamData && data.streamData.url) {
                // Success! We have a streaming URL
                setStreamData(data.streamData);
                setError(undefined);
                setRetryMessage('');
                setRetryCount(0);
                return;
            }

            // Check if we need to retry
            if (data.streamData?.hata === 'yenileniyor' || data.streamData?.hata === 'mesgul') {
                const retryAfter = (data.streamData.retry_after || 1) * 1000;
                const seconds = Math.ceil(retryAfter / 1000);
                setRetryMessage(`Stream is being prepared... Retrying in ${seconds}s (Attempt ${attemptNumber}/${MAX_RETRIES})`);

                retryTimeoutRef.current = setTimeout(() => {
                    fetchStreamData(attemptNumber + 1);
                }, retryAfter);
            } else if (data.error) {
                setError(data.error);
                setRetryMessage('');
            } else {
                // No URL yet, retry after 2 seconds
                setRetryMessage(`Waiting for stream... (Attempt ${attemptNumber}/${MAX_RETRIES})`);
                retryTimeoutRef.current = setTimeout(() => {
                    fetchStreamData(attemptNumber + 1);
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to fetch stream data:', err);
            setRetryMessage(`Connection error... Retrying (Attempt ${attemptNumber}/${MAX_RETRIES})`);
            
            retryTimeoutRef.current = setTimeout(() => {
                fetchStreamData(attemptNumber + 1);
            }, 3000);
        }
    };

    // Preload next episode stream data in background (for smoother transitions)
    const preloadNextEpisode = async (attemptNumber: number = 1) => {
        const nextEp = episode + 1;
        
        // Don't preload if we're on the last episode
        if (nextEp > drama.total_episodes) {
            return;
        }

        try {
            const response = await fetch(`/api/drama/${drama.slug}/stream/${nextEp}`);
            const data = await response.json();

            if (response.ok && data.streamData && data.streamData.url) {
                // Successfully preloaded next episode
                console.log(`Preloaded episode ${nextEp} for faster loading`);
                return;
            }

            // If not ready yet, retry silently
            if (data.streamData?.hata === 'yenileniyor' || data.streamData?.hata === 'mesgul') {
                const retryAfter = (data.streamData.retry_after || 1) * 1000;
                nextEpisodeRetryRef.current = setTimeout(() => {
                    preloadNextEpisode(attemptNumber + 1);
                }, retryAfter);
            } else {
                // Retry after 3 seconds
                nextEpisodeRetryRef.current = setTimeout(() => {
                    preloadNextEpisode(attemptNumber + 1);
                }, 3000);
            }
        } catch (err) {
            console.error('Failed to preload next episode:', err);
            // Retry after 5 seconds on error
            nextEpisodeRetryRef.current = setTimeout(() => {
                preloadNextEpisode(attemptNumber + 1);
            }, 5000);
        }
    };

    // Track episode view after 10 seconds of watching
    useEffect(() => {
        if (!streamData?.url || !drama || hasTrackedRef.current) return;

        const trackTimer = setTimeout(() => {
            updateHistory(drama.id, episode, 0);
            hasTrackedRef.current = true;
        }, 10000); // Track after 10 seconds

        return () => {
            clearTimeout(trackTimer);
        };
    }, [streamData?.url, drama?.id, episode, updateHistory]); // Added updateHistory to dependencies

    // Start fetching if we don't have valid stream data
    useEffect(() => {
        const needsStream = !streamData?.url || streamData?.hata;
        
        if (needsStream && !error && drama) {
            setIsLoading(true);
            const startAttempt = streamData?.hata ? 1 : 1;
            fetchStreamData(startAttempt);
        }

        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);

    // Preload next episode once current episode stream is loaded
    useEffect(() => {
        if (streamData?.url && episode < drama.total_episodes) {
            // Start preloading after 5 seconds of current episode loading
            const preloadTimer = setTimeout(() => {
                preloadNextEpisode();
            }, 5000);

            return () => {
                clearTimeout(preloadTimer);
                if (nextEpisodeRetryRef.current) {
                    clearTimeout(nextEpisodeRetryRef.current);
                }
            };
        }
    }, [streamData?.url, episode]);

    // Initialize player when we have valid stream data
    useEffect(() => {
        if (!streamData?.url || !videoRef.current) return;

        const video = videoRef.current;
        setIsLoading(true);
        setRetryMessage('');

        // Resolve URL to absolute if needed
        let videoUrl = streamData.url;
        
        // For relative URLs, convert to absolute
        if (videoUrl.startsWith('/')) {
            // Get the drama API URL from window (set by Laravel)
            const dramaApiUrl = (window as any).dramaApiUrl || 'https://dramadunyam.com';
            videoUrl = `${dramaApiUrl}${videoUrl}`;
        }
        
        // For relay delivery, use our proxy to add cookies
        if (streamData.delivery === 'relay') {
            videoUrl = `/api/proxy/hls?url=${encodeURIComponent(videoUrl)}`;
        }

        // Store event handlers for cleanup
        const handleLoadedMetadata = () => {
            setIsLoading(false);
            video.play().catch((err) => {
                console.log('Autoplay prevented:', err);
                setIsPlaying(false);
            });
        };

        if (streamData.type === 'hls') {
            // HLS streaming
            if (Hls.isSupported()) {
                const hlsConfig: any = {
                    enableWorker: true,
                    lowLatencyMode: true,
                };

                // Only add xhrSetup for direct delivery (non-proxied requests)
                if (streamData.delivery !== 'relay') {
                    hlsConfig.xhrSetup = (xhr: XMLHttpRequest, url: string) => {
                        // Add User-Agent header for direct delivery URLs
                        xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36');
                    };
                }

                const hls = new Hls(hlsConfig);

                hls.loadSource(videoUrl);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    // Autoplay
                    video.play().catch((err) => {
                        console.log('Autoplay prevented:', err);
                        setIsPlaying(false);
                    });
                });

                hls.on(Hls.Events.ERROR, (event, data) => {
                    if (data.fatal) {
                        console.error('HLS fatal error:', data);
                        setIsLoading(false);
                    }
                });

                hlsRef.current = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                // Native HLS support (Safari)
                video.src = videoUrl;
                video.addEventListener('loadedmetadata', handleLoadedMetadata);
            }
        } else {
            // Direct MP4
            video.src = videoUrl;
            video.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        // Add subtitles
        if (streamData.altyazilar && streamData.altyazilar.length > 0) {
            streamData.altyazilar.forEach((sub) => {
                const track = document.createElement('track');
                track.kind = 'subtitles';
                track.label = sub.dil;
                track.srclang = sub.dil.toLowerCase();
                track.src = sub.src;
                if (sub.dil === 'EN') {
                    track.default = true;
                }
                video.appendChild(track);
            });
        }

        return () => {
            // Clean up HLS instance
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            
            // Remove event listeners
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            
            // Remove subtitle tracks to prevent memory leaks
            const tracks = video.querySelectorAll('track');
            tracks.forEach(track => track.remove());
            
            // Clear video source
            video.src = '';
            video.load();
        };
    }, [streamData]);

    // Handle play/pause
    const togglePlay = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Handle mute/unmute
    const toggleMute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !videoRef.current.muted;
        setIsMuted(!isMuted);
    };

    // Handle seek
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || !duration) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;
        
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    // Format time (seconds to MM:SS)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle like action
    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleLike(drama.id);
    };

    // Handle save action
    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await toggleSave(drama.id);
    };

    // Handle share action
    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Implement share functionality
        if (navigator.share) {
            navigator.share({
                title: `${drama.title} - Episode ${episode}`,
                url: window.location.href,
            }).catch(() => {
                // User cancelled share
            });
        }
    };

    // Handle comment action
    const handleComment = (e: React.MouseEvent) => {
        e.stopPropagation();
        // TODO: Open comments section or navigate to comments
        console.log('Open comments');
    };

    // Handle episodes list action
    const handleEpisodesList = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowEpisodesModal(true);
    };

    // Auto-hide controls
    const resetControlsTimeout = () => {
        setShowControls(true);
        
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        
        // Only auto-hide if playing
        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    // Show controls when playing state changes
    useEffect(() => {
        if (!isPlaying) {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        } else {
            resetControlsTimeout();
        }
    }, [isPlaying]);

    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            if (swipeTimeoutRef.current) {
                clearTimeout(swipeTimeoutRef.current);
            }
        };
    }, []);

    // Navigate to episode
    const goToEpisode = (newEpisode: number) => {
        router.get(`/drama/${drama.slug}/watch/${newEpisode}`, {}, {
            preserveState: false,
        });
    };

    // Handle touch start
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY,
        });
    };

    // Handle touch move
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const currentY = e.targetTouches[0].clientY;
        const currentX = e.targetTouches[0].clientX;
        
        setTouchEnd({
            x: currentX,
            y: currentY,
        });

        // Calculate offset for visual feedback
        const yDiff = currentY - touchStart.y;
        const xDiff = Math.abs(currentX - touchStart.x);
        const absYDiff = Math.abs(yDiff);

        // Only show visual feedback if vertical swipe is dominant
        if (absYDiff > xDiff) {
            // Check if swipe is valid (not at boundaries)
            const swipeUp = yDiff < 0 && episode < drama.total_episodes;
            const swipeDown = yDiff > 0 && episode > 1;

            if (swipeUp || swipeDown) {
                // Apply damping effect for smoother feel (reduce offset by 60%)
                setSwipeOffset(yDiff * 0.6);
            }
        }
    };

    // Handle touch end - swipe gesture detection
    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) {
            // Reset states
            setSwipeOffset(0);
            setTouchStart(null);
            setTouchEnd(null);
            return;
        }

        const xDiff = touchStart.x - touchEnd.x;
        const yDiff = touchStart.y - touchEnd.y;
        const absX = Math.abs(xDiff);
        const absY = Math.abs(yDiff);

        // Minimum swipe distance (in pixels)
        const minSwipeDistance = 50;

        // Only trigger if vertical swipe is more dominant than horizontal
        if (absY > absX && absY > minSwipeDistance) {
            if (yDiff > 0) {
                // Swipe up - next episode
                if (episode < drama.total_episodes) {
                    setIsTransitioning(true);
                    // Animate to full height before navigating
                    setSwipeOffset(-window.innerHeight);
                    swipeTimeoutRef.current = setTimeout(() => {
                        goToEpisode(episode + 1);
                    }, 300);
                    return;
                }
            } else {
                // Swipe down - previous episode
                if (episode > 1) {
                    setIsTransitioning(true);
                    // Animate to full height before navigating
                    setSwipeOffset(window.innerHeight);
                    swipeTimeoutRef.current = setTimeout(() => {
                        goToEpisode(episode - 1);
                    }, 300);
                    return;
                }
            }
        }

        // Reset with smooth bounce back animation
        setSwipeOffset(0);
        setTouchStart(null);
        setTouchEnd(null);
    };

    const episodeRanges = Array.from(
    { length: Math.ceil(drama.total_episodes / RANGE_SIZE) },
    (_, i) => {
        const start = i * RANGE_SIZE + 1;
        const end = Math.min(start + RANGE_SIZE - 1, drama.total_episodes);
        return { start, end, label: `${start}-${end}` };
    },
);
const [selectedRangeStart, setSelectedRangeStart] = useState(
    Math.floor((episode - 1) / RANGE_SIZE) * RANGE_SIZE + 1,
);
const selectedRange =
    episodeRanges.find((r) => r.start === selectedRangeStart) ?? episodeRanges[0];
const visibleEpisodes = selectedRange
    ? Array.from(
          { length: selectedRange.end - selectedRange.start + 1 },
          (_, i) => selectedRange.start + i,
      )
    : [];

    if (error) {
        return (
            <>
                <Head title={`Error - ${drama.title}`} />
                <div className="flex min-h-screen items-center justify-center bg-black">
                    <div className="w-full max-w-md rounded-2xl bg-background p-10 text-center shadow-xl">
                        <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10">
                            <Play className="h-7 w-7 text-destructive" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold">
                            Unable to Load Episode
                        </h2>
                        <p className="mb-6 text-muted-foreground">
                            {error}
                        </p>
                        <Button
                            onClick={() =>
                                router.get(`/drama/${drama.slug}`)
                            }
                        >
                            Back to Drama
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`${drama.title} - Episode ${episode}`} />
            <div className="fixed inset-0 bg-black">
                <div
                    ref={containerRef}
                    className="relative h-full w-full"
                    style={{
                        transform: `translateY(${swipeOffset}px)`,
                        transition: isTransitioning || swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none',
                    }}
                    onMouseMove={resetControlsTimeout}
                    onTouchStart={(e) => {
                        resetControlsTimeout();
                        handleTouchStart(e);
                    }}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                        // Toggle controls when clicking anywhere
                        if (streamData?.url) {
                            if (showControls) {
                                // If controls are showing, let the timeout handle hiding
                                resetControlsTimeout();
                            } else {
                                // If controls are hidden, show them
                                setShowControls(true);
                            }
                        }
                    }}
                >
                    {/* Video Element */}
                    <video
                        ref={videoRef}
                        className="h-full w-full object-contain"
                        playsInline
                        onClick={(e) => {
                            e.stopPropagation();
                            if (showControls) {
                                resetControlsTimeout();
                            } else {
                                setShowControls(true);
                            }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => {
                            setIsPlaying(false);
                            if (episode < drama.total_episodes) {
                                goToEpisode(episode + 1);
                            }
                        }}
                    />

                    {/* Loading/Retry Spinner */}
                    {(isLoading || retryMessage) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 z-50">
                            <div className="flex items-center gap-3">
                                {retryMessage ? (
                                    <RefreshCw className="h-12 w-12 animate-spin text-white" />
                                ) : (
                                    <Loader2 className="h-12 w-12 animate-spin text-white" />
                                )}
                            </div>
                            {retryMessage && (
                                <div className="text-center">
                                    <p className="text-lg font-semibold text-white">
                                        {retryMessage}
                                    </p>
                                    <p className="mt-2 text-sm text-white/70">
                                        This may take a few moments...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TikTok-style Vertical Action Buttons */}
                    {streamData?.url && (
                        <div className={cn(
                            "absolute bottom-24 right-4 z-10 flex flex-col gap-4 transition-opacity duration-300",
                            showControls ? 'opacity-100' : 'opacity-0'
                        )}>
                            {/* Like Button */}
                            <button
                                onClick={handleLike}
                                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
                            >
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors",
                                    dramaIsLiked && "bg-red-500"
                                )}>
                                    <Heart
                                        className={cn(
                                            "h-6 w-6 text-white transition-all",
                                            dramaIsLiked && "fill-white"
                                        )}
                                    />
                                </div>
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    {displayLikeCount > 0 ? displayLikeCount : '0'}
                                </span>
                            </button>

                            {/* Comment Button */}
                            <button
                                onClick={handleComment}
                                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <MessageCircle className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    0
                                </span>
                            </button>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
                            >
                                <div className={cn(
                                    "flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-colors",
                                    dramaIsSaved && "bg-yellow-500"
                                )}>
                                    <Bookmark
                                        className={cn(
                                            "h-6 w-6 text-white transition-all",
                                            dramaIsSaved && "fill-white"
                                        )}
                                    />
                                </div>
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    {displaySaveCount > 0 ? displaySaveCount : '0'}
                                </span>
                            </button>

                            {/* Episodes Button - NEW */}
                            <button
                                onClick={handleEpisodesList}
                                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <List className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    {episode}/{drama.total_episodes}
                                </span>
                            </button>

                            {/* Share Button */}
                            <button
                                onClick={handleShare}
                                className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Share2 className="h-6 w-6 text-white" />
                                </div>
                                <span className="text-xs font-semibold text-white drop-shadow-lg">
                                    Share
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    {streamData?.url && (
                        <div
                            className={cn(
                                'absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-transparent to-black/40 p-4 transition-opacity duration-300',
                                showControls ? 'opacity-100' : 'opacity-0',
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Top Bar */}
                            <div className="flex items-center justify-between">
                                {/* Back Button & Title */}
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => router.get(`/drama/${drama.slug}`)}
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </Button>
                                    <div className="flex items-center gap-1.5 text-white">
                                        <h2 className="text-sm font-semibold drop-shadow-lg">
                                            {drama.title}
                                        </h2>
                                        <span className="text-xs text-white/70 drop-shadow-lg">
                                            · Episode {episode}
                                        </span>
                                    </div>
                                </div>

                                {/* Volume Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleMute}
                                    className="h-8 w-8 text-white hover:bg-white/20"
                                >
                                    {isMuted ? (
                                        <VolumeX className="h-4 w-4" />
                                    ) : (
                                        <Volume2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>

                            {/* Center - Play/Pause Button */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={togglePlay}
                                    className="h-16 w-16 pointer-events-auto rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:scale-110 transition-all"
                                >
                                    {isPlaying ? (
                                        <Pause className="h-8 w-8" />
                                    ) : (
                                        <Play className="h-8 w-8" />
                                    )}
                                </Button>
                            </div>

                            {/* Bottom - Progress Bar */}
                            <div className="space-y-1">
                                <div
                                    className="group relative h-1 w-full cursor-pointer rounded-full bg-white/30 hover:h-1.5 transition-all"
                                    onClick={handleSeek}
                                >
                                    <div
                                        className="absolute left-0 top-0 h-full rounded-full bg-brand transition-all"
                                        style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                                    >
                                        <div
                                            className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white shadow-lg transition-transform group-hover:scale-125"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-white/80">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Episodes Modal */}
            <Dialog open={showEpisodesModal} onOpenChange={setShowEpisodesModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <img
                                src={drama.cover}
                                alt={drama.title}
                                className="h-16 w-12 rounded object-cover"
                            />
                            <div>
                                <h2 className="text-lg font-bold">{drama.title}</h2>
                                <p className="text-sm text-muted-foreground">
                                    {drama.total_episodes} Episodes
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto">
    <div className="space-y-4 p-4">
        {episodeRanges.length > 1 && (
            <div className="flex flex-wrap gap-2">
                {episodeRanges.map((range) => (
                    <Button
                        key={range.start}
                        variant={selectedRange?.start === range.start ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedRangeStart(range.start)}
                        className={cn(
                            selectedRange?.start === range.start && 'bg-brand text-brand-foreground',
                        )}
                    >
                        {range.label}
                    </Button>
                ))}
            </div>
        )}

        <div className="grid grid-cols-5 gap-2">
            {visibleEpisodes.map((ep) => (
                <button
                    key={ep}
                    onClick={() => {
                        goToEpisode(ep);
                        setShowEpisodesModal(false);
                    }}
                    className={cn(
                        'flex aspect-square items-center justify-center rounded-xl text-lg font-semibold transition-all',
                        ep === episode
                            ? 'bg-brand text-brand-foreground shadow-lg'
                            : 'bg-muted hover:bg-muted/80',
                    )}
                >
                    {ep}
                </button>
            ))}
        </div>
    </div>
</div>
                </DialogContent>
            </Dialog>
        </>
    );
}
