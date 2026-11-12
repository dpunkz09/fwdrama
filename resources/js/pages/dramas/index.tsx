import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import DramaCard from '@/components/drama-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface Drama {
    id: number;
    slug: string;
    title: string;
    cover: string;
    available_episodes: number;
    total_episodes: number;
    platform: string;
    genre: string;
    language: string;
    tags: string[];
    description: string;
    is_new: boolean;
    is_popular: boolean;
    is_featured: boolean;
}

interface Filters {
    search?: string;
    platform?: string;
    genre?: string;
    language?: string;
    featured: boolean;
    popular: boolean;
    new: boolean;
    sort: string;
    direction: string;
}

interface FilterOptions {
    platforms: string[];
    genres: string[];
    languages: string[];
}

interface Props {
    dramas: {
        data: Drama[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    filters: Filters;
    filterOptions: FilterOptions;
}

export default function DramasIndex({ dramas, filters, filterOptions }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [showFilters, setShowFilters] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ search: searchQuery });
    };

    const updateFilters = (newFilters: Partial<Filters>) => {
        router.get(
            '/dramas',
            { ...filters, ...newFilters },
            { preserveState: true, preserveScroll: true }
        );
    };

    const clearFilters = () => {
        setSearchQuery('');
        router.get('/dramas');
    };

    const hasActiveFilters =
        filters.search ||
        filters.platform ||
        filters.genre ||
        filters.language ||
        filters.featured ||
        filters.popular ||
        filters.new;

    return (
        <>
            <Head title="Browse Dramas" />

            <div className="min-h-screen bg-background">
                {/* Header */}
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <Link href="/">
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    Drama World
                                </h1>
                            </Link>
                            <div className="flex gap-2">
                                <Link href="/admin/dashboard">
                                    <Button variant="outline" size="sm">
                                        Admin
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search dramas..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                            <Button type="submit">Search</Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <SlidersHorizontal className="h-4 w-4 mr-2" />
                                Filters
                            </Button>
                        </form>

                        {/* Active Filters */}
                        {hasActiveFilters && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {filters.search && (
                                    <Badge variant="secondary">
                                        Search: {filters.search}
                                        <button
                                            onClick={() =>
                                                updateFilters({ search: '' })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.platform && (
                                    <Badge variant="secondary">
                                        Platform: {filters.platform}
                                        <button
                                            onClick={() =>
                                                updateFilters({ platform: '' })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.genre && (
                                    <Badge variant="secondary">
                                        Genre: {filters.genre}
                                        <button
                                            onClick={() =>
                                                updateFilters({ genre: '' })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.language && (
                                    <Badge variant="secondary">
                                        Language: {filters.language}
                                        <button
                                            onClick={() =>
                                                updateFilters({ language: '' })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.featured && (
                                    <Badge variant="secondary">
                                        Featured
                                        <button
                                            onClick={() =>
                                                updateFilters({
                                                    featured: false,
                                                })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.popular && (
                                    <Badge variant="secondary">
                                        Popular
                                        <button
                                            onClick={() =>
                                                updateFilters({ popular: false })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {filters.new && (
                                    <Badge variant="secondary">
                                        New
                                        <button
                                            onClick={() =>
                                                updateFilters({ new: false })
                                            }
                                            className="ml-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}

                        {/* Filter Panel */}
                        {showFilters && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Platform
                                        </label>
                                        <Select
                                            value={filters.platform || ''}
                                            onValueChange={(value) =>
                                                updateFilters({
                                                    platform: value,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">
                                                    All
                                                </SelectItem>
                                                {filterOptions.platforms.map(
                                                    (platform) => (
                                                        <SelectItem
                                                            key={platform}
                                                            value={platform}
                                                        >
                                                            {platform}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Genre
                                        </label>
                                        <Select
                                            value={filters.genre || ''}
                                            onValueChange={(value) =>
                                                updateFilters({ genre: value })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">
                                                    All
                                                </SelectItem>
                                                {filterOptions.genres.map(
                                                    (genre) => (
                                                        <SelectItem
                                                            key={genre}
                                                            value={genre}
                                                        >
                                                            {genre}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Language
                                        </label>
                                        <Select
                                            value={filters.language || ''}
                                            onValueChange={(value) =>
                                                updateFilters({
                                                    language: value,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">
                                                    All
                                                </SelectItem>
                                                {filterOptions.languages.map(
                                                    (language) => (
                                                        <SelectItem
                                                            key={language}
                                                            value={language}
                                                        >
                                                            {language}
                                                        </SelectItem>
                                                    )
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Sort By
                                        </label>
                                        <Select
                                            value={filters.sort}
                                            onValueChange={(value) =>
                                                updateFilters({ sort: value })
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="created_at">
                                                    Recently Added
                                                </SelectItem>
                                                <SelectItem value="title">
                                                    Title
                                                </SelectItem>
                                                <SelectItem value="view_count">
                                                    Views
                                                </SelectItem>
                                                <SelectItem value="like_count">
                                                    Likes
                                                </SelectItem>
                                                <SelectItem value="release_date">
                                                    Release Date
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-2 block">
                                            Quick Filters
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant={
                                                    filters.featured
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    updateFilters({
                                                        featured:
                                                            !filters.featured,
                                                    })
                                                }
                                            >
                                                Featured
                                            </Button>
                                            <Button
                                                variant={
                                                    filters.popular
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    updateFilters({
                                                        popular:
                                                            !filters.popular,
                                                    })
                                                }
                                            >
                                                Popular
                                            </Button>
                                            <Button
                                                variant={
                                                    filters.new
                                                        ? 'default'
                                                        : 'outline'
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    updateFilters({
                                                        new: !filters.new,
                                                    })
                                                }
                                            >
                                                New
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 py-8">
                    {/* Results Count */}
                    <div className="mb-6">
                        <p className="text-muted-foreground">
                            Showing {dramas.data.length} of {dramas.total}{' '}
                            dramas
                        </p>
                    </div>

                    {/* Drama Grid */}
                    {dramas.data.length > 0 ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                                {dramas.data.map((drama) => (
                                    <DramaCard key={drama.id} drama={drama} />
                                ))}
                            </div>

                            {/* Pagination */}
                            {dramas.last_page > 1 && (
                                <div className="flex justify-center gap-2">
                                    {dramas.links.map((link, index) => {
                                        if (!link.url) {
                                            return (
                                                <Button
                                                    key={index}
                                                    variant="outline"
                                                    disabled
                                                    dangerouslySetInnerHTML={{
                                                        __html: link.label,
                                                    }}
                                                />
                                            );
                                        }

                                        return (
                                            <Link
                                                key={index}
                                                href={link.url}
                                                preserveState
                                                preserveScroll
                                            >
                                                <Button
                                                    variant={
                                                        link.active
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    dangerouslySetInnerHTML={{
                                                        __html: link.label,
                                                    }}
                                                />
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-xl text-muted-foreground">
                                No dramas found
                            </p>
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={clearFilters}
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
