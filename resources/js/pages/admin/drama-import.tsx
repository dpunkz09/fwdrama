import { useState } from 'react';

interface DramaItem {
    id: string;
    slug: string;
    title: string;
    cover: string;
    available_episodes: number;
    platform: string;
    tags: string[];
    in_database: boolean;
}

interface ApiResponse {
    items: DramaItem[];
    devam: boolean;
    toplam: number;
}

export default function DramaImport() {
    const [dramas, setDramas] = useState<DramaItem[]>([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(64);
    const [loading, setLoading] = useState(false);
    const [selectedDramas, setSelectedDramas] = useState<string[]>([]);
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<string>('');
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; message: string } | null>(null);
    const [progressLogs, setProgressLogs] = useState<string[]>([]);
    const [slugInput, setSlugInput] = useState<string>('');
    const [slugImporting, setSlugImporting] = useState(false);

    const fetchDramas = async () => {
        setLoading(true);
        setImportProgress('');

        try {
            const response = await fetch('/admin/import/fetch-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    page,
                    per_page: perPage,
                }),
            });

            const data = await response.json();
            setDramas(data.items || []);
        } catch (error) {
            console.error('Failed to fetch dramas:', error);
            setImportProgress('❌ Failed to fetch drama list');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectDrama = (slug: string) => {
        setSelectedDramas((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
        );
    };

    const toggleSelectAll = () => {
        if (selectedDramas.length === dramas.length) {
            setSelectedDramas([]);
        } else {
            setSelectedDramas(dramas.map((d) => d.slug));
        }
    };

    const importSingle = async (slug: string) => {
        setImporting(true);
        setImportProgress(`Importing ${slug}...`);

        try {
            const response = await fetch('/admin/import/single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ slug }),
            });

            const data = await response.json();

            if (data.success) {
                setImportProgress(`✅ ${data.message}`);
                // Update the drama in the list
                setDramas((prev) =>
                    prev.map((d) => (d.slug === slug ? { ...d, in_database: true } : d))
                );
            } else if (data.already_exists) {
                setImportProgress(`ℹ️ ${data.message}`);
                // Update the drama in the list to show it's in database
                setDramas((prev) =>
                    prev.map((d) => (d.slug === slug ? { ...d, in_database: true } : d))
                );
            } else {
                setImportProgress(`❌ ${data.message}`);
            }
        } catch (error) {
            setImportProgress(`❌ Failed to import ${slug}`);
        } finally {
            setImporting(false);
        }
    };

    const importBatch = async () => {
        if (selectedDramas.length === 0) {
            setImportProgress('❌ No dramas selected');
            return;
        }

        // Warn if too many selected
        if (selectedDramas.length > 20) {
            if (!confirm(`You selected ${selectedDramas.length} dramas. Large batches may take a while. Continue?`)) {
                return;
            }
        }

        setImporting(true);
        setBatchProgress({ current: 0, total: selectedDramas.length, message: 'Starting import...' });
        setProgressLogs([]);
        setImportProgress('');

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            
            const response = await fetch('/admin/import/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({ slugs: selectedDramas }),
            });

            if (!response.body) {
                throw new Error('No response body');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // Read the stream
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.type === 'start') {
                            setBatchProgress({ current: 0, total: data.total, message: data.message });
                            setProgressLogs([data.message]);
                        } else if (data.type === 'progress') {
                            setBatchProgress({ 
                                current: data.current, 
                                total: data.total, 
                                message: data.message 
                            });
                            
                            setProgressLogs((prev) => [...prev, data.message]);
                            
                            // Update drama in list if successful or skipped
                            if (data.status === 'success' || data.status === 'skipped') {
                                setDramas((prev) =>
                                    prev.map((d) => 
                                        d.slug === data.slug ? { ...d, in_database: true } : d
                                    )
                                );
                            }
                        } else if (data.type === 'complete') {
                            setBatchProgress(null);
                            setImportProgress(`✅ ${data.message}`);
                            setProgressLogs((prev) => [...prev, `\n✅ ${data.message}`]);
                            setSelectedDramas([]);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Batch import error:', error);
            setImportProgress(`❌ Failed to import batch: ${error}`);
            setBatchProgress(null);
        } finally {
            setImporting(false);
        }
    };

    const importBySlug = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!slugInput.trim()) {
            setImportProgress('❌ Please enter a slug');
            return;
        }

        const slug = slugInput.trim();
        setSlugImporting(true);
        setImportProgress(`Importing ${slug}...`);

        try {
            const response = await fetch('/admin/import/single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ slug }),
            });

            const data = await response.json();

            if (data.success) {
                setImportProgress(`✅ ${data.message}`);
                setSlugInput('');
                // Update the drama in the list if it exists
                setDramas((prev) =>
                    prev.map((d) => (d.slug === slug ? { ...d, in_database: true } : d))
                );
            } else if (data.already_exists) {
                setImportProgress(`ℹ️ ${data.message}`);
                setSlugInput('');
                // Update the drama in the list to show it's in database
                setDramas((prev) =>
                    prev.map((d) => (d.slug === slug ? { ...d, in_database: true } : d))
                );
            } else {
                setImportProgress(`❌ ${data.message}`);
            }
        } catch (error) {
            setImportProgress(`❌ Failed to import ${slug}`);
        } finally {
            setSlugImporting(false);
        }
    };

    return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Import Dramas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Import dramas from DramaDunyam API
                    </p>
                </div>
                {/* Import by Slug */}
                <div className="bg-card p-6 rounded-lg border mb-6">
                    <h2 className="text-lg font-semibold mb-4">Quick Import by Slug</h2>
                    <form onSubmit={importBySlug} className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">
                                Drama Slug
                                <span className="text-xs text-muted-foreground ml-2">
                                    (e.g., "askim-benim-rahatim")
                                </span>
                            </label>
                            <input
                                type="text"
                                value={slugInput}
                                onChange={(e) => setSlugInput(e.target.value)}
                                placeholder="Enter drama slug"
                                className="w-full px-3 py-2 border rounded bg-background"
                                disabled={slugImporting}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={slugImporting || !slugInput.trim()}
                            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {slugImporting ? 'Importing...' : 'Import'}
                        </button>
                    </form>
                </div>

                {/* Fetch Controls */}
                <div className="bg-card p-6 rounded-lg border mb-6">
                    <h2 className="text-lg font-semibold mb-4">Browse & Import from List</h2>
                    <div className="flex items-end gap-4 mb-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Page</label>
                            <input
                                type="number"
                                min="1"
                                value={page}
                                onChange={(e) => setPage(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded bg-background"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium mb-2">Items per page</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={perPage}
                                onChange={(e) => setPerPage(Number(e.target.value))}
                                className="w-full px-3 py-2 border rounded bg-background"
                            />
                        </div>
                        <button
                            onClick={fetchDramas}
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                        >
                            {loading ? 'Loading...' : 'Fetch Dramas'}
                        </button>
                    </div>

                    {importProgress && (
                        <div className="mt-4 p-3 bg-muted rounded text-sm whitespace-pre-line">{importProgress}</div>
                    )}

                    {/* Live Progress Display */}
                    {batchProgress && (
                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">
                                    Importing: {batchProgress.current} / {batchProgress.total}
                                </span>
                                <span className="text-muted-foreground">
                                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {batchProgress.message}
                            </div>
                        </div>
                    )}

                    {/* Progress Logs */}
                    {progressLogs.length > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold">Import Log</h3>
                                <button
                                    onClick={() => setProgressLogs([])}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="bg-black/90 text-green-400 p-4 rounded font-mono text-xs max-h-64 overflow-y-auto">
                                {progressLogs.map((log, index) => (
                                    <div key={index} className="mb-1">
                                        {log}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Batch Actions */}
                {dramas.length > 0 && (
                    <div className="bg-card p-4 rounded-lg border mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedDramas.length === dramas.length}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm font-medium">
                                    Select All ({selectedDramas.length} selected)
                                </span>
                            </label>
                        </div>
                        <button
                            onClick={importBatch}
                            disabled={selectedDramas.length === 0 || importing}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {importing ? 'Importing...' : `Import Selected (${selectedDramas.length})`}
                        </button>
                        {selectedDramas.length > 20 && (
                            <span className="text-xs text-yellow-600">
                                ⚠️ Large batch - may take several minutes
                            </span>
                        )}
                    </div>
                )}

                {/* Drama List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {dramas.map((drama) => (
                        <div key={drama.id} className="bg-card rounded-lg border p-4">
                            <div className="flex items-start gap-3 mb-3">
                                <input
                                    type="checkbox"
                                    checked={selectedDramas.includes(drama.slug)}
                                    onChange={() => toggleSelectDrama(drama.slug)}
                                    className="mt-1 w-4 h-4"
                                    disabled={drama.in_database}
                                />
                                <img
                                    src={drama.cover}
                                    alt={drama.title}
                                    className="w-16 h-24 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                                        {drama.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {drama.platform} • {drama.available_episodes} eps
                                    </p>
                                </div>
                            </div>

                            {drama.in_database ? (
                                <div className="text-xs text-green-600 font-medium">
                                    ✓ Already in database
                                </div>
                            ) : (
                                <button
                                    onClick={() => importSingle(drama.slug)}
                                    disabled={importing}
                                    className="w-full px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                                >
                                    Import
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {dramas.length === 0 && !loading && (
                    <div className="text-center py-12 text-muted-foreground">
                        Click "Fetch Dramas" to load the list
                    </div>
                )}
            </div>
    );
}
