# Codebase Restoration Plan

## Overview
During our feature implementations and fixes, we inadvertently deviated from the original codebase structure. This document outlines the steps needed to restore the original UI and functionality while preserving our feature improvements.

## Database Migrations to Preserve

### 1. Schema Changes
- Maintain favorites table structure:
  ```sql
  - user_id (references auth.users)
  - repository_id
  - created_at
  - owner
  - name
  ```
- Preserve token encryption changes:
  ```sql
  - pgsodium integration
  - crypto_aead_det encryption
  - token format validation
  ```
- Keep analysis results structure:
  ```sql
  - analysis_results table
  - embeddings storage
  - relationship mappings
  ```

### 2. Migration Files
- Preserve in order:
  ```bash
  - 00008_add_favorites.sql
  - 00009_token_encryption.sql
  - 00010_fix_rls_and_search_paths.sql
  ```
- Maintain RLS policies
- Keep function definitions
- Preserve triggers and indexes

### 3. Database Optimizations
- Keep pgvector extension setup
- Maintain analysis cleanup jobs
- Preserve storage optimizations
- Retain performance improvements

## Core Components to Restore

### 1. Header Component
- Restore `HeaderLogo` component
- Reimplement `NotificationDropdown`
- Restore `UserProfile` component
- Maintain original header layout (height: 14, border-bottom)
- Preserve original styling and theme integration

### 2. Dashboard Layout
- Restore three-column layout:
  ```typescript
  - Left Sidebar (300px)
  - Main Content
  - Right Sidebar (300px, conditional)
  ```
- Reimplement Framer Motion animations
- Restore original padding and spacing
- Maintain theme consistency

### 3. Repository Analysis View
- Restore detailed stats cards:
  - Open Issues
  - Duplicate Issues
  - Estimated Duplicates
  - Average Age
- Reimplement progress stages with visual indicators
- Restore "Back to Dashboard" functionality
- Maintain original animation transitions

### 4. Stats Display
- Restore original stats metrics:
  ```typescript
  interface DashboardStats {
    trackedRepos: number
    analyzedRepos: number
    openIssues: number
    activeAutomations: number
  }
  ```
- Reimplement stats card layouts
- Preserve original styling and animations

## Feature Improvements to Preserve

### 1. Search Functionality
- Keep improved search implementation
- Maintain enhanced error handling
- Preserve performance optimizations
- Keep theme integration improvements

### 2. Favorites System
- Maintain Supabase integration
- Keep real-time updates
- Preserve optimistic updates
- Retain type safety improvements

### 3. Authentication
- Keep enhanced token handling
- Maintain improved session management
- Preserve security improvements

## Implementation Steps

1. **Database Migration Verification**
   ```bash
   - Verify migration order is correct
   - Test migrations in clean environment
   - Validate RLS policies
   - Check function permissions
   ```

2. **Component Restoration**
   ```bash
   - Restore src/components/layout/header-logo.tsx
   - Restore src/components/common/notification-dropdown.tsx
   - Restore src/components/common/user-profile.tsx
   ```

3. **Layout Fixes**
   ```typescript
   - Revert Dashboard.tsx to original layout structure
   - Restore Framer Motion integration
   - Reinstate original component hierarchy
   ```

4. **Animation Restoration**
   ```typescript
   - Reimplement AnimatePresence
   - Restore motion.div components
   - Reinstate transition effects
   ```

5. **Theme Integration**
   - Ensure all restored components use original theme structure
   - Maintain dark mode compatibility
   - Preserve existing color schemes

## Testing Plan

1. **Database Testing**
   - Run migrations on fresh database
   - Verify data integrity
   - Test RLS policies
   - Validate function behaviors

2. **Visual Regression**
   - Compare with original repository screenshots
   - Verify layout measurements
   - Check animation behaviors

3. **Functionality Testing**
   - Verify all navigation flows
   - Test analysis view transitions
   - Confirm stats display accuracy

4. **Integration Testing**
   - Test search functionality
   - Verify favorites system
   - Check authentication flow
   - Validate database interactions

## PR Preparation

1. **Code Organization**
   - Separate restoration commits from feature improvements
   - Clear commit messages explaining changes
   - Proper documentation updates

2. **Change Scope**
   ```markdown
   - Database migrations and optimizations
   - Feature improvements (search, favorites, auth)
   - Bug fixes
   - Performance optimizations
   - NO complete rewrites
   - NO unnecessary structural changes
   ```

3. **Documentation**
   - Update relevant documentation
   - Clear explanation of improvements
   - Document database changes
   - Maintain original documentation structure

## Success Criteria
- [ ] All database migrations tested and working
- [ ] RLS policies properly configured
- [ ] Database functions operating correctly
- [ ] All original UI components restored
- [ ] Original layout structure preserved
- [ ] Animations functioning as before
- [ ] Feature improvements properly integrated
- [ ] Clean git history for PR
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No conflicts with base repository
