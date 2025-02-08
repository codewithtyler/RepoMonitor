# Search Component Documentation

## Overview
The search component allows users to search for GitHub repositories with efficient organization of results and batched display. The search is designed to prioritize user-accessible repositories while maintaining security and providing relevant public results.

## Core Functionality

### API Request Flow
1. **User Repositories Request (First)**
   - Fetches all repositories the user has access to (public and private)
   - Includes repositories owned by the user and collaborator repositories
   - No limit on results for user's repositories
   - Results filtered client-side by search query
   - Count of matching results used to determine next request's limit

2. **Public Repositories Request (Second)**
   - Only triggered after user repositories request completes
   - Searches all public repositories on GitHub
   - Dynamically calculates limit: `limit = MAX_TOTAL_RESULTS - userMatchingReposCount`
   - Sorted by stars in descending order
   - Security conscious: only returns public repositories
   - Skipped if user matching repos already reach MAX_TOTAL_RESULTS

### Results Organization
1. **User-Accessible Repositories Section**
   - Appears at the top of results
   - Includes both private and public repositories the user has access to
   - Filtered based on search query
   - No pagination within this section
   - Shows all matching results

2. **Public Results Section**
   - Appears below user repositories with a clear separator
   - Limited to (30 - userReposCount) total results
   - Displayed in batches of 10 with separators
   - Each batch shows star count and repository details
   - Sorted by stars in descending order
   - Footer message when all results are shown:
     "End of results. Try refining your search to find more specific repositories."

### Display Features
- Clear visual separation between user and public repositories
- Star count prominently displayed for each repository
- Repository name and owner clearly shown
- Loading states for both API requests
- Horizontal separators every 10 results in public section
- End of results message for better UX
- Loading spinner on the textbox only not in the results area


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

### Security Considerations
- Private repositories only shown if user has explicit access
- Public repository search completely separate from private access
- No leakage of private repository information
- Maintains company security, NDAs, and intellectual property protection

## Technical Implementation

### Constants
```typescript
const MAX_TOTAL_RESULTS = 30;       // Maximum total results to display
const DISPLAY_BATCH_SIZE = 10;      // Number of results to show per batch
const CACHE_DURATION = 300000;      // Cache duration (5 minutes)
const MIN_SEARCH_CHARS = 3;         // Minimum characters to trigger search
```

### API Implementation
```typescript
// Sequential API calls
const searchRepositories = async (query: string) => {
  // First request: Get user's repositories
  const userRepos = await getUserRepositories(query);
  const matchingUserRepos = filterRepositoriesByQuery(userRepos, query);

  // Calculate remaining slots
  const remainingSlots = MAX_TOTAL_RESULTS - matchingUserRepos.length;

  // Only fetch public repos if we have slots remaining
  if (remainingSlots > 0) {
    const publicRepos = await getPublicRepositories(query, remainingSlots);
    return {
      userRepositories: matchingUserRepos,
      publicRepositories: publicRepos
    };
  }

  return {
    userRepositories: matchingUserRepos,
    publicRepositories: []
  };
};

const getUserRepositories = async () => {
  // Fetches all user-accessible repositories (public & private)
  // No query filtering - done client-side for better caching
};

const getPublicRepositories = async (query: string, limit: number) => {
  // Fetches public repositories with calculated limit
  // Sorted by stars DESC
};
```

### State Management
- Maintains separate states for:
  - User-accessible repositories
  - Public search results
  - Loading states for each request
  - Error states
  - Display counts and pagination

### Caching
- Separate caches for:
  - User repository results
  - Public search results
- Cache includes:
  - Results
  - Timestamp
  - Query parameters

### Error Handling
- Handles API rate limiting
- Network errors
- Authentication issues
- Invalid responses
- Graceful fallbacks for each request type

## User Experience
- Immediate feedback during searches
- Clear visual hierarchy between result types
- Smooth loading transitions
- Keyboard navigation support
- Clear end-of-results messaging
- Responsive design for all screen sizes
