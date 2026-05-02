# Arcade Legends

A modern web-based gaming platform which players can discover, play, and compete in arcade and retro-inspired games. Built with React, TypeScript, and Supabase, Arcade Legends offers an interactive community experience with leaderboards, contests, and user authentication.

## 📋 Project Overview

Arcade Legends is a full-stack web application designed to:
- **Discover & Play**: Browse a diverse collection of arcade and modern games (platformers, racing, fighting, puzzle, RPG, etc.)
- **Compete**: Participate in contests and track your scores on global leaderboards
- **Authenticate**: Sign up, log in, and manage your user profile with secure authentication via Supabase
- **Connect**: View community statistics and engage with other players through a dashboard

## 🗂️ Folder Structure

```
arcade-legends/
├── src/
│   ├── pages/              # Main route pages (Index, Games, Contest, Dashboard, Login, Signup, etc.)
│   ├── components/         # Reusable React components (GameCard, Layout, UI components)
│   ├── hooks/              # Custom React hooks (useAuth, etc.)
│   ├── data/               # Static data (games list, leaderboard)
│   ├── types/              # TypeScript type definitions
│   ├── integrations/       # External service integrations (Supabase client)
│   ├── lib/                # Utility functions and helpers
│   ├── assets/             # Images and static assets
│   ├── test/               # Test files
│   ├── App.tsx             # Main app component with routing
│   ├── main.tsx            # React root entry point
│   └── index.css           # Global styles
├── public/                 # Static files served directly
├── supabase/               # Supabase configuration and migrations
├── index.html              # HTML template
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── components.json         # shadcn/ui components configuration
├── eslint.config.js        # ESLint configuration
├── vitest.config.ts        # Vitest test configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library for building interactive components
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Fast build tool and dev server (running on port 8080)
- **React Router v6** - Client-side routing for navigation between pages
- **Tailwind CSS** - Utility-first CSS framework for styling
- **shadcn/ui** - High-quality, accessible UI component library built on Radix UI
- **Lucide React** - Icon library for visual elements

### State Management & Data
- **TanStack React Query** - Data fetching, caching, and synchronization
- **React Hook Form** - Performant form state management
- **Zod** - TypeScript-first schema validation

### Backend & Authentication
- **Supabase** - Open-source Firebase alternative (PostgreSQL database + auth)
- **@supabase/supabase-js** - JavaScript client for Supabase

### Utilities & UI Enhancements
- **next-themes** - Dark mode support
- **sonner** - Toast notifications
- **recharts** - Data visualization and charts
- **Embla Carousel** - Carousel/slider component
- **date-fns** - Date manipulation library
- **class-variance-authority** - Component variant management
- **input-otp** - OTP input component

### Development Tools
- **ESLint** - Code quality and style checking
- **Vitest** - Unit testing framework
- **Testing Library** - React component testing utilities
- **PostCSS & Autoprefixer** - CSS processing

## 🚀 Getting Started

### Prerequisites
- **Bun** - Fast JavaScript runtime and package manager ([Install Bun](https://bun.sh/docs/installation))

### Installation & Development

1. **Clone the repository**
   ```bash
   git clone <YOUR_GIT_URL>
   cd arcade-legends
   ```

2. **Install dependencies with Bun**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the project root
   - Add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Start the development server**
   ```bash
   bun run dev
   ```
   The app will be available at `http://localhost:8080` with hot-reload enabled.

### Available Scripts

```bash
# Development
bun run dev              # Start dev server with hot reload

# Building
bun run build            # Production build
bun run build:dev        # Development build

# Testing & Quality
bun run test             # Run all tests once
bun run test:watch       # Watch mode for tests
bun run lint             # Run ESLint

# Preview
bun run preview          # Preview production build locally
```

## 📄 Key Pages & Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page with hero section, featured games, leaderboards |
| `/games` | Browse and filter games by category |
| `/contest` | View and enter gaming contests |
| `/dashboard` | User dashboard (protected route, requires authentication) |
| `/about` | About Arcade Legends |
| `/login` | User login page |
| `/signup` | New user registration |

## 🔐 Authentication

The app uses Supabase for authentication with protected routes. The `ProtectedRoute` component wraps pages that require user login (e.g., `/dashboard`). Unauthenticated users are redirected to `/login`.

## 🎮 Core Features

- **Game Library**: Browse and filter games across multiple categories
- **Leaderboards**: Real-time scoring and ranking system
- **Contests**: Organize and participate in gaming competitions
- **User Authentication**: Secure sign-up and login with Supabase
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Dark Mode**: Theme switching support

## ⌨️ Keyboard Shortcuts

Arcade Legends supports keyboard shortcuts for faster navigation and actions in the dashboard. Shortcuts use `Shift` instead of `Ctrl` to prevent browser conflicts.

| Shortcut | Action |
|----------|--------|
| `Shift` + `1`-`9` | Navigate between dashboard tabs |
| `Shift` + `B` | Toggle sidebar collapse |
| `Shift` + `N` | Open "Create Contest" / "Add Game" dialogs (Admins) |
| `/` | Focus search inputs (e.g., Player Directory) |
| `Shift` + `D` | Open "Add Funds" deposit dialog |
| `Shift` + `W` | Open "Withdraw" dialog |

## 📝 Development Guidelines

- Use TypeScript for type safety
- Follow the existing component structure in `/components`
- Keep custom hooks in `/hooks` for reusability
- Add tests for new features in `/test`
- Maintain consistent styling with Tailwind CSS and existing design patterns
- Use Zod for form validation
- Leverage React Query for server state management

## 🔗 Related Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
