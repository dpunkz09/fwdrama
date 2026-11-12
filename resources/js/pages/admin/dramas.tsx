import { router } from '@inertiajs/react';
import { useState } from 'react';

interface Drama {
    id: number;
    external_id: string;
    slug: string;
    title: string;
    cover: string;
    platform: string;
    total_episodes: number;
    available_episodes: number;
    is_new: boolean;
    is_popular: boolean;
    is_featured: boolean;
    genre: string | null;
    view_count: number;
    like_count: number;
    created_at: string;
}

interface PaginatedDramas {
    data: Drama[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    dramas: PaginatedDramas;
    platforms: string[];
    filters: {
        search?: string;
        platform?: string;
        is_new?: boolean;
        is_popular?: boolean;
        is_featured?: boolean;
        sort_by?: string;
        sort_order?: string;
    };
}

export default function AdminDramas({ dramas, platforms, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedPlatform, setSelectedPlatform] = useState(filters.platform || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/dramas', { search, platform: selectedPlatform }, { preserveState: true });
    };

    const handleFilter = (key: string, value: any) => {
        router.get('/admin/dramas', { ...filters, [key]: value }, { preserveState: true });
    };

    const handleDelete = async (id: number, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            const response = await fetch(`/admin/dramas/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                router.reload({ only: ['dramas'] });
            }
        } catch (error) {
            alert('Failed to delete drama');
        }
    };

    const toggleFeature = async (id: number) => {
        try {
            const response = await fetch(`/admin/dramas/${id}/toggle-feature`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                router.reload({ only: ['dramas'] });
            }
        } catch (error) {
            alert('Failed to toggle feature');
        }
    };

    const togglePopular = async (id: number) => {
        try {
            const response = await fetch(`/admin/dramas/${id}/toggle-popular`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const data = await response.json();
            if (data.success) {
                router.reload({ only: ['dramas'] });
            }
        } catch (error) {
            alert('Failed to toggle popular');
        }
    };

    return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Manage Dramas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {dramas.total} dramas in database
                    </p>
                </div>

                {/* Search and Filters */}
                <div className="bg-card p-6 rounded-lg border mb-6">
                    <form onSubmit={handleSearch} className="flex gap-4 mb-4">
                        <input
                            type="text"
                            placeholder="Search by title, slug, or platform..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded bg-background"
                        />
                        <select
                            value={selectedPlatform}
                            onChange={(e) => setSelectedPlatform(e.target.value)}
                            className="px-4 py-2 border rounded bg-background"
                        >
                            <option value="">All Platforms</option>
                            {platforms.map((platform) => (
                                <option key={platform} value={platform}>
                                    {platform}
                                </option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                        >
                            Search
                        </button>
                    </form>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleFilter('is_new', filters.is_new ? undefined : true)}
                            className={`px-3 py-1 text-sm rounded ${
                                filters.is_new
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            New
                        </button>
                        <button
                            onClick={() => handleFilter('is_popular', filters.is_popular ? undefined : true)}
                            className={`px-3 py-1 text-sm rounded ${
                                filters.is_popular
                                    ? 'bg-green-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            Popular
                        </button>
                        <button
                            onClick={() =>
                                handleFilter('is_featured', filters.is_featured ? undefined : true)
                            }
                            className={`px-3 py-1 text-sm rounded ${
                                filters.is_featured
                                    ? 'bg-purple-500 text-white'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            Featured
                        </button>
                    </div>
                </div>

                {/* Drama Table */}
                <div className="bg-card rounded-lg border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="text-left p-4">Drama</th>
                                <th className="text-left p-4">Platform</th>
                                <th className="text-left p-4">Episodes</th>
                                <th className="text-left p-4">Stats</th>
                                <th className="text-left p-4">Status</th>
                                <th className="text-left p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dramas.data.map((drama) => (
                                <tr key={drama.id} className="border-t hover:bg-muted/50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={drama.cover}
                                                alt={drama.title}
                                                className="w-12 h-16 object-cover rounded"
                                            />
                                            <div>
                                                <div className="font-semibold">{drama.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {drama.genre}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">{drama.platform}</td>
                                    <td className="p-4">
                                        {drama.available_episodes}/{drama.total_episodes}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm">
                                            <div>👁️ {drama.view_count.toLocaleString()}</div>
                                            <div>❤️ {drama.like_count.toLocaleString()}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            {drama.is_new && (
                                                <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded w-fit">
                                                    New
                                                </span>
                                            )}
                                            {drama.is_popular && (
                                                <span className="text-xs px-2 py-0.5 bg-green-500 text-white rounded w-fit">
                                                    Popular
                                                </span>
                                            )}
                                            {drama.is_featured && (
                                                <span className="text-xs px-2 py-0.5 bg-purple-500 text-white rounded w-fit">
                                                    Featured
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => toggleFeature(drama.id)}
                                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                                            >
                                                {drama.is_featured ? 'Unfeature' : 'Feature'}
                                            </button>
                                            <button
                                                onClick={() => togglePopular(drama.id)}
                                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            >
                                                {drama.is_popular ? 'Unpopular' : 'Popular'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(drama.id, drama.title)}
                                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {dramas.last_page > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        {dramas.links.map((link, index) => (
                            <a
                                key={index}
                                href={link.url || '#'}
                                className={`px-3 py-1 rounded ${
                                    link.active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
    );
}
