import { Link } from '@inertiajs/react';
import { Monitor, Shield, User } from 'lucide-react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

const settingsNavItems = [
    {
        title: 'Profile',
        href: editProfile(),
        icon: User,
        description: 'Manage your profile settings',
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: Shield,
        description: 'Password and authentication',
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: Monitor,
        description: 'Customize your theme',
    },
];

export function SettingsSidebar() {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <aside className="w-64 shrink-0">
            <div className="sticky top-20 space-y-1">
                <h2 className="mb-4 px-2 text-lg font-semibold">Settings</h2>
                <nav className="space-y-1">
                    {settingsNavItems.map((item) => {
                        const isActive = isCurrentUrl(item.href);
                        return (
                            <Link
                                key={item.title}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                    isActive
                                        ? 'bg-accent text-accent-foreground font-medium'
                                        : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                                )}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                <div className="flex flex-col">
                                    <span>{item.title}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
