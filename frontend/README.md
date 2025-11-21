# OwoJudge Frontend

Modern online judge platform frontend built with Next.js, featuring dark-only UI with vibrant colored accents.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: react-icons (FA6)
- **Package Manager**: pnpm

## Prerequisites

- Node.js 20 or higher
- pnpm
- Backend server running on `http://localhost:8787` (see backend README)

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
```

### 3. Run Development Server

```bash
pnpm dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── login/             # Login page
│   ├── problems/          # Problems list and detail
│   ├── submissions/       # Submissions list
│   └── users/             # User profiles
├── components/            # Reusable components
│   ├── Header.tsx         # Navigation header
│   ├── UserMenu.tsx       # User dropdown menu
│   └── markdown/          # Markdown renderer
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Global auth state
├── constants/             # Static data
└── utils/                 # Utility functions
```

## Key Features

- **Authentication**: Session-based login with global state management
- **User Menu**: Dropdown with profile, settings, and logout
- **Auto-redirect**: Logged-in users can't access login page
- **Consistent Design**: Follows design_style.txt specifications

## Design System

This project follows a strict design system. See `design_style.txt` for:

- Color palette (dark mode only)
- Typography hierarchy
- Component patterns
- Animation standards

## Development Notes

- Desktop-only (no mobile responsive design)
- Dark mode only (no light mode support)
- All transitions use 150ms duration
- Use `react-icons/fa6` for all icons

## Available Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Build for production
pnpm start         # Start production server
pnpm lint          # Run ESLint
pnpm format        # Format code with Prettier
pnpm format:check  # Only check formatting
```

## Environment Variables

| Variable              | Description     | Default                 |
| --------------------- | --------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8787` |

## Troubleshooting

**Login not working?**

- Ensure backend is running on port 8787
- Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
- Verify CORS is enabled in backend

**Styles not applying?**

- Run `pnpm install` to ensure Tailwind is installed
- Check `tailwind.config.ts` configuration

## Related Documentation

- [Backend README](../backend/README.md)
- [Design Style Guide](./design_style.txt)
- [Auth Integration Guide](./AUTH_INTEGRATION_GUIDE.md)
