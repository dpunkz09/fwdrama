import { router, usePage } from '@inertiajs/react';
import { Download, Home, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Platform {
    id: number;
    name: string;
    logo: string | null;
    drama_count: number;
    yetiskin: boolean;
    on8: boolean;
    created_at: string;
    updated_at: string;
}

interface PlatformsProps {
    platforms: Platform[];
}

export default function Platforms({ platforms }: PlatformsProps) {
    const { flash } = usePage().props as any;
    const [importing, setImporting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleImport = () => {
        setImporting(true);
        router.post(
            '/admin/platforms/import',
            {},
            {
                onFinish: () => setImporting(false),
                onSuccess: () => {
                    // Success message is handled by flash
                },
                onError: () => {
                    // Error message is handled by flash
                },
                preserveScroll: true,
            },
        );
    };

    const handleDelete = (id: number) => {
        if (!confirm('Are you sure you want to delete this platform?')) {
            return;
        }

        setDeletingId(id);
        router.delete(`/admin/platforms/${id}`, {
            onFinish: () => setDeletingId(null),
            preserveScroll: true,
        });
    };

    return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Manage Platforms
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View and manage streaming platforms
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" asChild>
                            <a href="/admin/dashboard">
                                <Home className="mr-2 h-4 w-4" />
                                Dashboard
                            </a>
                        </Button>
                        <Button onClick={handleImport} disabled={importing}>
                            <Download className="mr-2 h-4 w-4" />
                            {importing ? 'Importing...' : 'Import Platforms'}
                        </Button>
                    </div>
                </div>
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-green-600 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
                        {flash.error}
                    </div>
                )}

                {/* Stats */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Total Platforms</div>
                        <div className="text-2xl font-bold">{platforms.length}</div>
                    </div>
                    <div className="bg-card p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Total Dramas</div>
                        <div className="text-2xl font-bold">
                            {platforms.reduce((sum, p) => sum + p.drama_count, 0)}
                        </div>
                    </div>
                    <div className="bg-card p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Adult Content</div>
                        <div className="text-2xl font-bold">
                            {platforms.filter(p => p.yetiskin).length}
                        </div>
                    </div>
                </div>

                {/* Platforms Table */}
                <div className="bg-card rounded-lg border">
                    {platforms.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-muted-foreground mb-4">
                                No platforms found. Import platforms to get started.
                            </div>
                            <Button onClick={handleImport} disabled={importing}>
                                <Download className="mr-2 h-4 w-4" />
                                Import Platforms
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16">Logo</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Drama Count</TableHead>
                                    <TableHead>Tags</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {platforms.map((platform) => (
                                    <TableRow key={platform.id}>
                                        <TableCell>
                                            {platform.logo ? (
                                                <img
                                                    src={platform.logo}
                                                    alt={platform.name}
                                                    className="h-10 w-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">
                                                    {platform.name.substring(0, 2)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {platform.name}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {platform.drama_count.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {platform.yetiskin && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Adult
                                                    </Badge>
                                                )}
                                                {platform.on8 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        On8
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(platform.id)}
                                                disabled={deletingId === platform.id}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
    );
}
