export interface Drama {
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
    view_count: number;
}

/** Single place to change the drama detail route. */
export const dramaUrl = (slug: string) => `/drama/${slug}`;

const compact = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
});

/** 1234 -> "1.2K" */
export const formatCount = (n: number) => compact.format(n ?? 0);