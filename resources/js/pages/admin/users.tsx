import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Search,
    Filter,
    UserCheck,
    UserX,
    Shield,
    ShieldOff,
    Trash2,
    Eye,
    MoreVertical,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    is_admin: boolean;
    created_at: string;
    saved_dramas_count: number;
    watch_history_count: number;
    liked_dramas_count: number;
}

interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface UsersProps {
    users: {
        data: User[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: PageLink[];
    };
    stats: {
        total_users: number;
        verified_users: number;
        admin_users: number;
        new_users_today: number;
    };
    filters: {
        search?: string;
        role?: string;
        verified?: string;
        sort_by: string;
        sort_dir: string;
    };
}

export default function UsersIndex({ users, stats, filters }: UsersProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showBulkDialog, setShowBulkDialog] = useState(false);
    const [bulkAction, setBulkAction] = useState<string>('');

    const deleteForm = useForm();
    const bulkForm = useForm({
        action: '',
        user_ids: [] as number[],
    });

    // Handle search
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        const params = new URLSearchParams(window.location.search);
        if (value) {
            params.set('search', value);
        } else {
            params.delete('search');
        }
        router.get(`/admin/users?${params.toString()}`, {}, { preserveState: true });
    };

    // Handle filter
    const handleFilter = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.get(`/admin/users?${params.toString()}`);
    };

    // Toggle user selection
    const toggleUser = (userId: number) => {
        setSelectedUsers((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    // Select all users
    const toggleSelectAll = () => {
        if (selectedUsers.length === users.data.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(users.data.map((u) => u.id));
        }
    };

    // Delete user
    const handleDelete = () => {
        if (!userToDelete) return;

        deleteForm.delete(`/admin/users/${userToDelete.id}`, {
            onSuccess: () => {
                setShowDeleteDialog(false);
                setUserToDelete(null);
            },
        });
    };

    // Bulk action
    const handleBulkAction = (action: string) => {
        if (selectedUsers.length === 0) return;

        setBulkAction(action);
        setShowBulkDialog(true);
    };

    const confirmBulkAction = () => {
        bulkForm.setData({
            action: bulkAction,
            user_ids: selectedUsers,
        });

        bulkForm.post('/admin/users/bulk-action', {
            onSuccess: () => {
                setShowBulkDialog(false);
                setSelectedUsers([]);
                setBulkAction('');
            },
        });
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div>
            <Head title="User Management - Admin" />

            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                        User Management
                    </h1>
                    <p className="text-muted-foreground">Manage users, permissions, and access control</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-card p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Total Users</span>
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-3xl font-bold">{stats.total_users}</div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Verified</span>
                            <UserCheck className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="text-3xl font-bold text-green-500">{stats.verified_users}</div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Admins</span>
                            <Shield className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="text-3xl font-bold text-orange-500">{stats.admin_users}</div>
                    </div>

                    <div className="bg-card p-6 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">New Today</span>
                            <CheckCircle2 className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="text-3xl font-bold text-blue-500">{stats.new_users_today}</div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-card border rounded-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <select
                            value={filters.role || ''}
                            onChange={(e) => handleFilter('role', e.target.value)}
                            className="px-4 py-2 border rounded-lg bg-background"
                        >
                            <option value="">All Roles</option>
                            <option value="admin">Admins</option>
                            <option value="user">Users</option>
                        </select>

                        <select
                            value={filters.verified || ''}
                            onChange={(e) => handleFilter('verified', e.target.value)}
                            className="px-4 py-2 border rounded-lg bg-background"
                        >
                            <option value="">All Status</option>
                            <option value="verified">Verified</option>
                            <option value="unverified">Unverified</option>
                        </select>
                    </div>

                    {/* Bulk Actions */}
                    {selectedUsers.length > 0 && (
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedUsers.length} selected
                            </span>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('verify')}>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Verify
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBulkAction('make_admin')}>
                                <Shield className="h-4 w-4 mr-2" />
                                Make Admin
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction('remove_admin')}
                            >
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Remove Admin
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBulkAction('delete')}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    )}
                </div>

                {/* Users Table */}
                <div className="bg-card border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b">
                            <tr>
                                <th className="text-left p-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.length === users.data.length}
                                        onChange={toggleSelectAll}
                                        className="rounded"
                                    />
                                </th>
                                <th className="text-left p-4">User</th>
                                <th className="text-left p-4">Status</th>
                                <th className="text-left p-4">Role</th>
                                <th className="text-left p-4">Activity</th>
                                <th className="text-left p-4">Joined</th>
                                <th className="text-right p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user) => (
                                <tr key={user.id} className="border-b hover:bg-muted/50">
                                    <td className="p-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="rounded"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {user.email_verified_at ? (
                                            <Badge variant="default" className="bg-green-500">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Unverified
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {user.is_admin ? (
                                            <Badge variant="default" className="bg-orange-500">
                                                <Shield className="h-3 w-3 mr-1" />
                                                Admin
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">User</Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm space-y-1">
                                            <div>{user.watch_history_count} watched</div>
                                            <div className="text-muted-foreground">
                                                {user.saved_dramas_count} saved · {user.liked_dramas_count} liked
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">
                                        {formatDate(user.created_at)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link href={`/admin/users/${user.id}`}>
                                                <Button size="sm" variant="ghost">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            router.post(`/admin/users/${user.id}/toggle-admin`)
                                                        }
                                                    >
                                                        {user.is_admin ? (
                                                            <>
                                                                <ShieldOff className="h-4 w-4 mr-2" />
                                                                Remove Admin
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shield className="h-4 w-4 mr-2" />
                                                                Make Admin
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                    {!user.email_verified_at && (
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.post(`/admin/users/${user.id}/verify-email`)
                                                            }
                                                        >
                                                            <UserCheck className="h-4 w-4 mr-2" />
                                                            Verify Email
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            setUserToDelete(user);
                                                            setShowDeleteDialog(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete User
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="p-4 border-t flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {users.data.length} of {users.total} users
                            </div>
                            <div className="flex items-center gap-2">
                                {users.links.map((link, index) => {
                                    const isPrev = /previous/i.test(link.label);
                                    const isNext = /next/i.test(link.label);
                                    const isArrow = isPrev || isNext;

                                    if (!link.url && !link.active) return null;

                                    return (
                                        <Button
                                            key={index}
                                            size="sm"
                                            variant={link.active ? 'default' : 'outline'}
                                            onClick={() => link.url && router.get(link.url)}
                                            disabled={!link.url}
                                        >
                                            {isPrev ? (
                                                <ChevronLeft className="h-4 w-4" />
                                            ) : isNext ? (
                                                <ChevronRight className="h-4 w-4" />
                                            ) : (
                                                link.label.replace(/<[^>]*>/g, '')
                                            )}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Dialog */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete {userToDelete?.name}? This will permanently delete
                                the user and all their data (saved dramas, watch history, likes). This action
                                cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleteForm.processing}
                            >
                                Delete User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Bulk Action Confirmation Dialog */}
                <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirm Bulk Action</DialogTitle>
                            <DialogDescription>
                                You are about to perform a bulk action on {selectedUsers.length} user(s).
                                {bulkAction === 'delete' &&
                                    ' This will permanently delete all selected users and their data.'}
                                {bulkAction === 'verify' && ' This will mark all selected users as verified.'}
                                {bulkAction === 'make_admin' && ' This will grant admin privileges to all selected users.'}
                                {bulkAction === 'remove_admin' &&
                                    ' This will revoke admin privileges from all selected users.'}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                                onClick={confirmBulkAction}
                                disabled={bulkForm.processing}
                            >
                                Confirm
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            </div>
    );
}
