# Search Component Documentation

## Overview
The search component allows users to search for GitHub repositories with efficient organization of results and batched display.

## Core Functionality

### Initial Load
- Initial API call fetches 30 results from GitHub (maximum)
- Results are cached for 5 minutes to minimize API calls
- Minimum 3 characters required to trigger search

### Results Organization
1. **Owned Repositories Section**
   - If any results are owned by the current user, they appear at the top
   - Grouped under "Owned" header
   - No pagination within owned repositories

2. **All Results Section**
   - All other repositories appear below owned repositories
   - First separator includes "All Results" label
   - Results are displayed in batches of 10
   - Simple horizontal line separates subsequent batches

### Display Features
- Star count shown for each repository
- Repository name and owner clearly displayed
- Clean, minimal interface without unnecessary text
- Loading spinner during searches
- "End of results" shown when all results are displayed

### Repository Selection
- Clicking a repository:
  - Adds it to recent searches
  - Selects it for viewing details
  - Closes the search dropdown

### Recent Searches
- Shows up to 5 recent searches
- Displayed when search input is empty
- Can be individually removed
- Can be cleared all at once

## Technical Implementation

### Constants
```typescript
const MAX_RECENT_SEARCHES = 5;      // Maximum number of recent searches to store
const INITIAL_PAGE_SIZE = 30;       // Maximum results from API
const DISPLAY_BATCH_SIZE = 10;      // Number of results to show per batch
const CACHE_DURATION = 300000;      // Cache duration (5 minutes)
const MIN_SEARCH_CHARS = 3;         // Minimum characters to trigger search
```

### State Management
- Uses React Context for global state
- Maintains separate states for:
  - All fetched results
  - Currently displayed results
  - Loading state
  - Error state
  - Recent searches

### Caching
- Results are cached by search query
- Cache includes:
  - Search results
  - Timestamp
  - Display count

### Error Handling
- Shows error messages in dropdown
- Handles:
  - Authentication errors
  - API rate limiting
  - Network errors
  - Invalid responses

## User Experience
- Debounced search (300ms)
- Smooth loading transitions
- Clear visual hierarchy
- Keyboard navigation support
- Responsive design
