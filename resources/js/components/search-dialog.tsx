import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SearchDialog({ isOpen, onClose }: SearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState('');

    console.log('SearchDialog render, isOpen =', isOpen);

    const handleClose = () => {
        console.log('handleClose called');
        onClose();
        setSearchQuery('');
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Safety net: always reset when the dialog closes, however it was closed
    useEffect(() => {
        if (!isOpen) setSearchQuery('');
    }, [isOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (!query) return;

        // Close + clear right away instead of waiting for the response
        handleClose();
        
        router.get('/', { search: query }, { preserveState: false });
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Search Dialog */}
            <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 px-4 animate-in fade-in slide-in-from-top-4 duration-200">
                <form
                    onSubmit={handleSearch}
                    className="relative rounded-2xl border bg-card shadow-2xl"
                >
                    <div className="flex items-center gap-2 p-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="text"
                                enterKeyHint="search"
                                placeholder="Search dramas by title or description…"
                                aria-label="Search dramas"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 border-0 pl-12 pr-4 text-lg focus-visible:ring-0"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            size="lg"
                            disabled={!searchQuery.trim()}
                            className="h-14 px-6"
                        >
                            Search
                        </Button>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close search"
                        className="absolute right-[140px] top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </form>

                {/* Helper text */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Press <kbd className="rounded bg-muted px-2 py-1 text-xs">ESC</kbd> to close
                    </p>
                </div>
            </div>
        </>
    );
}
