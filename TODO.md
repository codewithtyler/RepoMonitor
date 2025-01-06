# TODO List

## Rate Limiting Improvements

### GitHub API Rate Limiting
Currently, the GitHub client handles rate limits reactively (only after hitting the limit). Need to implement proactive rate limiting similar to OpenAI and Supabase implementations.

**Required Changes:**
1. Implement proper rate limit tracking using GitHub API response headers:
   - `x-ratelimit-limit`
   - `x-ratelimit-remaining`
   - `x-ratelimit-reset`

2. Add proactive rate limit checking:
   - Check remaining limits before making requests
   - Implement waiting mechanism if close to limit
   - Use reset time from headers for accurate waiting

3. Update the RateLimiter implementation:
   - Currently only tracks request count
   - Need to incorporate actual GitHub rate limit data
   - Sync limiter state with GitHub's reported limits

**Files to Update:**
- `src/lib/github.ts`
- Specifically the `GitHubClientImpl` class

**Reference Implementations:**
- OpenAI rate limiting in `lib/openai.ts`
- Supabase batch processing in `supabase/functions/process-analysis-queue/index.ts`

## Security
- [ ] Configure proper RLS policies for:
  - analysis_job_items table
  - analysis_jobs table
  - repositories table