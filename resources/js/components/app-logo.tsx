import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { name } = usePage().props;

    return (
        <>
            <img
                src="/FWDrama.webp"
                alt={name as string}
                className="h-8 w-auto"
            />
        </>
    );
}
