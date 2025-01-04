# RepoMonitor Implementation Instructions

## Implementation Scope
This implementation guide covers the core functionality of RepoMonitor's initial release. Specifically:
- GitHub authentication and repository access
- Issue analysis and duplicate detection using OpenAI embeddings
- Viewing and managing analysis results
- Basic repository management
- Shared analysis results for public repositories

Note: The following features are planned for future releases and are NOT covered in these instructions:
- Automated issue commenting
- Automated issue closure
- Automated issue tagging/linking
- Any other automated repository management features

## Setup & Configuration
- ✅ Set up OpenAI API integration
  - ✅ Create environment variables for API key
  - ✅ Implement API client wrapper
  - ✅ Set up rate limiting and error handling

- ✅ Enhance GitHub OAuth Implementation
  - ✅ Request additional scopes for repository access:
    - ✅ `repo` scope for private repository access (includes org repos)
    - ✅ `public_repo` scope for public repository access
  - ✅ Token Management
    - ✅ Securely store user's OAuth token
    - ✅ Implement token refresh mechanism
    - ✅ Handle token revocation
  - ✅ API Request Handling
    - ✅ Use user's OAuth token for all GitHub API calls
    - ✅ Track per-user rate limits
    - ✅ Handle rate limit errors gracefully
    - ✅ Implement request retries with backoff
  - ✅ Error Handling
    - ✅ Handle authentication failures
    - ✅ Handle permission changes
    - ✅ Handle token expiration
    - ✅ Provide clear user feedback
  - ✅ Repository Access Flow
    1. ✅ Check repository visibility (public/private) using user's GitHub token
    2. ✅ If public:
       - ✅ Use user's token to fetch repository details
       - ✅ Look for existing recent analysis
       - ✅ If found, immediately offer to view existing analysis
       - ✅ Show last analysis timestamp and analyzer
       - ✅ Provide option to run new analysis if preferred
       - ✅ If running new analysis, use user's token for all GitHub API calls
    3. ✅ If private:
       - ✅ Check user's repository permissions via their GitHub token
       - ✅ If user has access:
         - ✅ Look for existing analysis from team members
         - ✅ If found, offer to view team's analysis
         - ✅ Show which team member ran it and when
         - ✅ If running new analysis, use user's token for all GitHub API calls
       - ✅ If no access:
         - ✅ Return "Repository not found" message
         - ✅ Log failed attempt without exposing repository details
    4. ✅ For new analysis:
       - ✅ Use user's token for all GitHub API operations
       - ✅ Replace existing analysis for that repository
       - ✅ Update timestamps and analyzer info
       - ✅ All rate limits count against requesting user's quota

Note: All GitHub API operations (public or private repos) use the requesting user's OAuth token to:
- Ensure proper rate limit management
- Maintain clear accountability
- Prevent system-wide rate limit issues
- Protect against abuse

## Database Setup & Optimization
- ✅ Design and implement optimized database schema
  - ✅ User table (link to GitHub account)
  - ✅ Repositories table (tracked repositories)
    - ✅ Add last_analysis_timestamp
    - ✅ Add analyzed_by_user reference
    - ✅ Add repository_permissions field (from GitHub)
  - ✅ Analysis table
    - ✅ Utilize pgvector extension for efficient embedding storage
    - ✅ Implement vector similarity search
    - ✅ Store only the most recent analysis per repository
    - ✅ Implement automatic cleanup of old analysis when new one is created
    - ✅ Add public access tracking
    - ✅ Link to GitHub repository permissions
  - ✅ Issues table
    - ✅ Store only essential issue data
    - ✅ Use compression for large text fields
    - ✅ Maintain only current state (no historical data)
  - ✅ Duplicates table (relationship mapping)
    - ✅ Store only issue IDs and confidence scores
    - ✅ Implement cascade deletion with parent issues
    - ✅ Clear previous relationships when new analysis is run

- ✅ Storage Optimization Strategies
  - ✅ Enable pgvector extension in Supabase
  - ✅ Implement single-analysis policy
    - ✅ Replace old analysis results when new analysis is run
    - ✅ Clean up associated embeddings and relationships
  - ✅ Set up database maintenance
    - ✅ Regular VACUUM operations
    - ✅ Index optimization
    - ✅ Table partitioning for large datasets
  - ✅ Implement data pruning
    - ✅ Remove duplicate embeddings
    - ✅ Clean up orphaned data
    - ✅ Automatic cleanup triggers for replaced analyses

- ✅ Monitoring & Maintenance
  - ✅ Set up storage usage alerts
  - ✅ Create database size monitoring dashboard
  - ✅ Track embedding storage metrics
  - ✅ Monitor analysis replacement operations

## Core Functionality
- ✅ Repository Management
  - ✅ Implement repository search/selection interface
  - ✅ Add repository tracking functionality
  - ✅ Create repository sync mechanism
  - ✅ Add repository removal capability

- ✅ Issue Processing
  - ✅ Implement GitHub Issues API integration
  - ✅ Create issue fetching mechanism
  - ✅ Filter enhancement-labeled stories
  - ✅ Store issue data in database

- [✅] Text Analysis System
  - [✅] OpenAI Embeddings Integration
    - [✅] Implement text-embedding-3-small model integration
    - [✅] Create text preprocessing pipeline for issue content
    - [✅] Generate embeddings for issue titles and descriptions
    - [✅] Handle API rate limits and errors
    - [✅] Implement batch processing for multiple issues

  - [✅] Vector Storage & Similarity Search
    - [✅] Store embeddings in pgvector-enabled database
    - [✅] Implement vector similarity search queries
    - [✅] Create indexes for efficient vector operations
    - [✅] Set up distance threshold configuration

  - [✅] Duplicate Detection Pipeline
    - [✅] Process enhancement-labeled stories first
    - [✅] Generate embeddings for each issue
    - [✅] Use pgvector to find similar issues
    - [✅] Calculate and store confidence scores
    - [✅] Group issues by similarity threshold

  - [✅] Analysis Flow
    1. [✅] Text → Embeddings: Convert issue text to vectors using OpenAI
    2. [✅] Storage: Store vectors in pgvector-enabled database
    3. [✅] Search: Use pgvector to find similar vectors/issues
    4. [✅] Results: Group and display similar issues with confidence scores

- [✅] Shared Analysis System
  - [✅] Repository Access Verification
    - [✅] Check user's repository permissions via GitHub API
    - [✅] Cache permission results
    - [✅] Handle organization and team-based access
    - [✅] Implement permission refresh mechanism

  - [✅] Analysis Sharing
    - [✅] Store analyses with permission context
    - [✅] Track analysis age and metadata
    - [✅] Implement analysis reuse logic based on permissions
    - [✅] Handle permission changes (revoke access)

  - [✅] User Interface Elements
    - [✅] Show "existing analysis" notification for accessible repos
    - [✅] Display last analysis timestamp and analyzer
    - [✅] Offer option to view existing or run new
    - [✅] Show which team member ran the analysis
    - [✅] Indicate if analysis access was revoked

  - [✅] Analysis Flow Updates
    1. [✅] Check repository visibility (public/private) using user's GitHub token
    2. [✅] If public:
       - [✅] Use user's token to fetch repository details
       - [✅] Look for existing recent analysis
       - [✅] If found, immediately offer to view existing analysis
       - [✅] Show last analysis timestamp and analyzer
       - [✅] Provide option to run new analysis if preferred
       - [✅] If running new analysis, use user's token for all GitHub API calls
    3. [✅] If private:
       - [✅] Check user's repository permissions via their GitHub token
       - [✅] If user has access:
         - [✅] Look for existing analysis from team members
         - [✅] If found, offer to view team's analysis
         - [✅] Show which team member ran it and when
         - [✅] If running new analysis, use user's token for all GitHub API calls
       - [✅] If no access:
         - [✅] Return "Repository not found" message
         - [✅] Log failed attempt without exposing repository details
    4. [✅] For new analysis:
       - [✅] Use user's token for all GitHub API operations
       - [✅] Replace existing analysis for that repository
       - [✅] Update timestamps and analyzer info
       - [✅] All rate limits count against requesting user's quota

Note: All GitHub API operations (public or private repos) use the requesting user's OAuth token to:
- Ensure proper rate limit management
- Maintain clear accountability
- Prevent system-wide rate limit issues
- Protect against abuse

- [✅] User Interface
  - [✅] Repository Analysis Dashboard
    - [✅] Create repository list view
    - [✅] Add analysis trigger button
    - [✅] Implement sync status indicators
    - [✅] Show last analysis timestamp

  - [✅] Results Display
    - [✅] Enhancement Stories Table
      - [✅] Create main table structure
      - [✅] Implement column headers (Issue #, Title, Labels, Actions)
      - [✅] Add GitHub issue linking for issue numbers and titles
      - [✅] Style enhancement label badges
      - [✅] Add expand/collapse functionality
      - [✅] Include disabled action buttons for future features
      - [✅] Show confidence score indicator

    - [✅] Duplicate Issues Display
      - [✅] Create expandable accordion sections
      - [✅] Style nested duplicate issues table
      - [✅] Implement indentation for visual hierarchy
      - [✅] Add GitHub issue linking for duplicates
      - [✅] Show confidence score for each duplicate
      - [✅] Add visual distinction for expanded sections
      - [✅] Include placeholder for future action buttons

    - [✅] Interactive Features
      - [✅] Implement smooth expand/collapse animations
      - [✅] Add hover states for clickable elements
      - [✅] Ensure accessible keyboard navigation
      - [✅] Add loading states during expansion
      - [✅] Implement bulk expand/collapse all option

  - [✅] Filtering & Navigation
    - [✅] Add repository filter
    - [✅] Implement issue search
    - [✅] Create navigation between related issues

## Initial Deployment Steps
- [ ] Database Setup
  - [ ] Create Supabase project
  - [ ] Enable pgvector extension
  - [ ] Run initial migrations
  - [ ] Set up database policies
  - [ ] Configure backups

- [ ] Edge Functions
  - [ ] Deploy OpenAI integration function
  - [ ] Set up GitHub webhook handlers
  - [ ] Configure rate limiting
  - [ ] Set up monitoring

- [ ] Frontend Deployment
  - [ ] Build production assets
  - [ ] Configure environment variables
  - [ ] Set up CDN caching
  - [ ] Deploy to Vercel

- [ ] Monitoring Setup
  - [ ] Configure error tracking
  - [ ] Set up performance monitoring
  - [ ] Create alert policies
  - [ ] Set up logging

## Testing & Validation
- [ ] Unit Tests
  - [ ] Auth flow tests
  - [ ] API integration tests
  - [ ] Embedding generation tests
  - [ ] Duplicate detection tests

- [ ] Integration Tests
  - [ ] GitHub API integration
  - [ ] OpenAI API integration
  - [ ] Database operations
  - [ ] Edge function calls

- [ ] UI Tests
  - [ ] Component rendering
  - [ ] User interactions
  - [ ] Error states
  - [ ] Loading states

- [ ] Performance Tests
  - [ ] API response times
  - [ ] UI responsiveness
  - [ ] Database query optimization
  - [ ] Resource usage monitoring

- [ ] Security Tests
  - [ ] Authentication flows
  - [ ] Authorization checks
  - [ ] Data access controls
  - [ ] API endpoint security

## Documentation
- [ ] API Documentation
  - [ ] Document endpoints
  - [ ] Include request/response examples
  - [ ] Error handling documentation

- [ ] User Documentation
  - [ ] Setup instructions
  - [ ] Usage guidelines
  - [ ] Troubleshooting guide

## Deployment
- [ ] Setup Production Environment
  - [ ] Configure production database
  - [ ] Set up environment variables
  - [ ] Configure API keys
  - [ ] Set up monitoring

- [ ] Performance Optimization
  - [ ] Implement caching strategy
  - [ ] Optimize database queries
  - [ ] Add rate limiting
  - [ ] Set up job queues for analysis tasks

## Security
- [ ] Security Measures
  - [ ] Implement API key rotation
  - [ ] Set up token encryption
  - [ ] Add request validation
  - [ ] Implement rate limiting
  - [ ] Add audit logging

## Monetization & Usage Tracking
- [ ] Usage Monitoring
  - [ ] Track OpenAI API token usage per analysis
  - [ ] Monitor analysis counts per user/team
  - [ ] Track repository sizes and processing times
  - [ ] Set up usage alerts and notifications

- [ ] Subscription Management
  - [ ] Implement tiered pricing system
    - [ ] Free Tier
      - [ ] 3 analyses per month
      - [ ] Public repositories only
      - [ ] Basic features
      - [ ] $0/month
    - [ ] Pro Tier
      - [ ] 50 analyses per month
      - [ ] Public & private repositories
      - [ ] Team sharing capabilities
      - [ ] No support included
      - [ ] $10/month or $100/year (2 months free)

  - [ ] Usage Limits
    - [ ] Implement monthly analysis counter
    - [ ] Add usage warnings (80% of limit)
    - [ ] Handle limit exceeded scenarios
    - [ ] Provide clear self-service upgrade path
    - [ ] Reset counters on 1st of each month

  - [ ] Billing Integration
    - [ ] Set up automated payment processing
    - [ ] Handle subscription changes
    - [ ] Implement usage-based billing
    - [ ] Generate automated invoices/receipts

- [ ] Analytics & Reporting
  - [ ] Track cost per analysis
  - [ ] Monitor profit margins
  - [ ] Generate usage reports
  - [ ] Track user engagement metrics
