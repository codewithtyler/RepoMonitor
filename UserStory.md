# RepoMonitor - GitHub Issue Duplicate Detection System

## Overview
RepoMonitor is an application designed to help development teams manage and identify duplicate issues in GitHub repositories, particularly useful for large codebases with numerous open issues. The system uses OpenAI's text-embedding-3-small model to analyze and identify duplicate issues, making issue management more efficient.

## Core Features

### 1. Authentication & Connection
- Users can log in to the application
- Connect to their GitHub account
- Import repositories for analysis

### 2. Issue Analysis
- Pull open issues from connected GitHub repositories
- Utilize OpenAI's text-embedding-3-small model for issue analysis
- Identify duplicate issues by comparing against enhancement-labeled stories
- Group duplicate issues under their corresponding enhancement stories

### 3. Data Management
- Store analysis results in a database
- Maintain history of issue relationships
- Manual resync capability to update analysis with latest open issues

### 4. Repository Access Levels
- Contributor Access
  - Full access to repository management features - Future enhancement
  - Ability to perform automated actions (commenting, tagging, closure) - Future enhancement
  - Historical analysis tracking
  - View duplicate issue relationships
  - Analysis capabilities for any public repository that the user is not a contributor to
- Read-only Access
  - Analysis capabilities for any public repository
  - View duplicate issue relationships
  - No automated management features

### 5. Dashboard Interface
- Repository Analysis Section
  - List of analyzed repositories with their last sync date
  - Quick actions to trigger new analysis
  - Status indicators for ongoing analysis
- Issue Management
  - Display enhancement stories with their identified duplicates
  - Filter view by repository
  - Action buttons for contributor-level features when available
- Analysis Results
  - Visual representation of duplicate relationships
  - Confidence scores for duplicate matches
  - Export functionality for analysis results

## Future Enhancements

### Automated Issue Management
- Auto-comment functionality on duplicate issues (contributor repos only)
- Automatically tag original enhancement stories in duplicates
- Automated closure of duplicate issues
- Smart issue linking and relationship management

## Technical Requirements
- GitHub API integration
- OpenAI API integration for text embeddings
- Database storage for analysis results
- Real-time synchronization capabilities
- Secure authentication system

## Success Criteria
- Successful identification of duplicate issues
- Reduced time spent on manual issue triage
- Improved issue tracking and management
- Enhanced visibility of related issues
- Streamlined issue resolution process