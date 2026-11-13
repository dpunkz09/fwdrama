# Drama Laravel

A modern short drama streaming platform built with Laravel, React, Inertia.js, and Tailwind CSS.

## Features

- 📺 **Tabbed Homepage** with multiple content categories:
  - Popular dramas
  - New releases  
  - Rankings (Today, This Week, This Month)
- 🎬 **Drama Detail Pages** with comprehensive information
- 🎨 **Modern UI** using Tailwind CSS and Radix UI components
- ⚡ **Fast Navigation** with Inertia.js SPA experience
- 📱 **Responsive Design** works on all screen sizes

## Tech Stack

- **Backend**: Laravel 13 with PHP 8.5
- **Frontend**: React 19 with TypeScript
- **Routing**: Inertia.js v3
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI
- **Build Tool**: Vite Plus
- **Database**: SQLite (default)


## Getting Started

### Prerequisites

- PHP 8.5+
- Composer
- Node.js & npm
- Laravel installer

### Installation

1. Navigate to the project directory:
```bash
cd drama-laravel
```

2. Install dependencies (already done during setup):
```bash
composer install
npm install
```

3. Start the development server:
```bash
composer run dev
```

This command will start both:
- Laravel development server on http://localhost:8000
- Vite dev server for hot module replacement

### Building for Production

```bash
npm run build
```

## Project Structure

```
drama-laravel/
├── app/
│   └── Http/
│       └── Controllers/
│           ├── HomeController.php      # Handles homepage and API routes
│           └── DramaController.php     # Handles drama detail pages
├── resources/
│   └── js/
│       ├── components/
│       │   ├── drama-card.tsx         # Reusable drama card component
│       │   └── ui/                    # UI components (badges, cards, tabs)
│       └── pages/
│           ├── home.tsx               # Tabbed homepage
│           └── drama/
│               └── show.tsx           # Drama detail page
└── routes/
    └── web.php                        # Application routes
```

## Routes

- `GET /` - Homepage with tabbed content
- `GET /api/popular` - Fetch popular dramas
- `GET /api/new` - Fetch new dramas
- `GET /api/rankings/{period}` - Fetch rankings (gun/hafta/ay)
- `GET /api/drama/{slug}` - Fetch drama details (proxied)
- `GET /drama/{slug}` - Drama detail page

## Features in Detail

### Tabbed Navigation
The homepage features five tabs:
1. **Popular**: Most popular dramas
2. **New**: Recently added dramas
3. **Today**: Top-ranked dramas today
4. **This Week**: Top-ranked dramas this week
5. **This Month**: Top-ranked dramas this month

### Drama Cards
Each drama card displays:
- Cover image with hover effects
- Title
- Platform badge
- Episode count
- Tags
- Ranking number (for ranking tabs)

### Drama Detail Page
Shows comprehensive information including:
- Full cover image
- Title and description
- Platform and status
- Episode count
- Tags and categories

## Development Notes

- The app uses Inertia.js v3 with the new `useHttp` hook for data fetching
- All API calls are proxied through Laravel to avoid CORS issues
- The UI follows a modern, card-based design pattern
- Images are lazy-loaded for better performance

## Laravel Boost

This project was created with Laravel Boost for AI-assisted development. See `AGENTS.md` for development guidelines.

## License

This is a private application for demonstration purposes.
