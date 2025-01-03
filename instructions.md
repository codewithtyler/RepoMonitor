# Converting from Next.js to Vite + React

## 1. Initial Setup
- ✅ Create new Vite project: `npm create vite@latest`
- ✅ Install dependencies:
  ```bash
  npm install react-router-dom @supabase/supabase-js @supabase/auth-helpers-react
  npm install -D tailwindcss postcss autoprefixer
  ```

## 2. File Structure Changes
- ✅ Move components from `app` directory to `src/pages`
- ✅ Rename `page.tsx` files to standard component names (e.g., `Dashboard.tsx`)
- ✅ Create new `src` structure:
  ```
  src/
  ├── components/
  ├── pages/
  ├── lib/
  ├── styles/
  └── routes/
  ```

## 3. Routing Changes
- ✅ Replace Next.js routing with React Router
- ✅ Create `src/routes/index.tsx` for route definitions
- ✅ Convert middleware to route guards
- ✅ Update all `next/navigation` imports to use `react-router-dom`

## 4. Component Updates

### Navigation Components
- ✅ Update `nav-items.tsx`:
  - ✅ Replace `next/navigation` with `react-router-dom`
  - ✅ Update route handling

### Image Components
- ✅ Replace `next/image` with standard `<img>` tags
- ✅ Update `header-logo.tsx` to use standard image handling

### Auth Components
- ✅ Replace `@supabase/auth-helpers-nextjs` with `@supabase/auth-helpers-react`
- ✅ Update `supabase-client.ts` to use standard Supabase client
- ✅ Create new auth provider component

## 5. Configuration Updates
- ✅ Remove `next.config.js`
- ✅ Create `vite.config.ts`
- ✅ Update `tsconfig.json` for Vite
- ✅ Move environment variables to `.env` for Vite

## 6. Style Migration
- ✅ Move global styles from `base.css` to `src/styles/index.css`
- ✅ Update Tailwind config for Vite
- ✅ Ensure all CSS imports are properly configured

## 7. Auth Flow Updates
- ✅ Implement new auth callback handling with React Router
- ✅ Update protected routes logic
- ✅ Create auth context provider

## 8. Specific Component Migrations

### Dashboard Container
- ✅ Update imports for new file structure
- ✅ Modify layout for client-side routing

### Sidebar
- ✅ Update navigation handling for React Router
- ✅ Modify link components

### Home Page
- ✅ Convert `app/page.tsx` to `src/pages/Home.tsx`
- ✅ Update auth flow for client-side

## 9. Testing & Verification
- ✅ Test all routes
- ✅ Verify auth flow
- ✅ Check protected routes
- ✅ Test navigation
- ✅ Verify styling

## 10. Cleanup
- ✅ Remove Next.js specific files and directories
- ✅ Remove unused dependencies
- ✅ Update README.md with new setup instructions

## Note
Remember to handle environment variables differently in Vite:
- ✅ Replace `NEXT_PUBLIC_` prefixes with `VITE_`
- ✅ Update environment variable references in code