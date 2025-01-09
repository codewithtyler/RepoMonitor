/// <reference types="deno" />
// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const BATCH_SIZE = 50; // Process 50 issues at a time
const WORKER_ID = crypto.randomUUID();
const LOCK_DURATION = 600; // 10 minutes
const MIN_BATCH_INTERVAL = 0; // No delay between batches

// Initialize clients
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public'
    }
  }
);

// Function to get GitHub token for a user
async function getGitHubToken(userId: string): Promise<string> {
  // Get user's token from database
  const { data: tokenData, error } = await supabase
    .from('github_tokens')
    .select('token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData?.token) {
    throw new Error('Failed to get GitHub token');
  }

  // Check if token is expired
  if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
    throw new Error('GitHub token has expired');
  }

  // Decrypt token using our database function
  const { data: decryptedToken, error: decryptError } = await supabase
    .rpc('decrypt_github_token', { encrypted_token: tokenData.token });

  if (decryptError || !decryptedToken) {
    throw new Error('Failed to decrypt GitHub token');
  }

  return decryptedToken;
}

// Function to fetch issues from GitHub
async function fetchGitHubIssues(token: string, owner: string, name: string, page: number = 1): Promise<any> {
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/issues?state=open&per_page=100&page=${page}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'RepoMonitor'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API error: ${error.message}`);
  }

  return response.json();
}

// Initialize OpenAI client with error handling
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
if (!openaiApiKey) {
  console.error(`[${new Date().toISOString()}] OpenAI API key is missing`);
  throw new Error('CRITICAL: OpenAI API key is required');
}

if (openaiApiKey.startsWith('sk-') === false) {
  console.error(`[${new Date().toISOString()}] Invalid OpenAI API key format`);
  throw new Error('CRITICAL: Invalid OpenAI API key format - should start with sk-');
}

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Test OpenAI connection and check for available credits
try {
  console.log(`[${new Date().toISOString()}] Testing OpenAI connection and checking credits...`);
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'test',
    dimensions: 1536,
  });
  console.log(`[${new Date().toISOString()}] OpenAI connection test successful`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] OpenAI connection test failed:`, error);
  if (error instanceof Error && error.message.includes('insufficient_quota')) {
    throw new Error('CRITICAL: OpenAI API key has insufficient credits');
  }
  if (error instanceof Error && error.message.includes('invalid_api_key')) {
    throw new Error('CRITICAL: Invalid OpenAI API key');
  }
  throw error;
}

interface JobItem {
  id: string;
  issue_title: string;
  issue_body: string;
  retry_count?: number;
}

interface ProcessingError {
  itemId: string;
  error: string;
  timestamp: string;
  retryCount: number;
}

const MAX_RETRIES = 3;

// Add notification types
type NotificationType = 'SYSTEM_ERROR' | 'DATA_COLLECTION_COMPLETE' | 'PROCESSING_COMPLETE' |
  'ANALYSIS_COMPLETE' | 'REPORT_COMPLETE' | 'PROCESSING_ERROR' | 'ANALYSIS_ERROR';

interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, any>;
}

async function createNotification(supabase: any, userId: string, data: NotificationData) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: data.title,
      message: data.message,
      type: data.type,
      metadata: data.metadata || {}
    });

  if (error) {
    console.error('Error creating notification:', error);
  }
}

async function createAdminNotification(supabase: any, data: NotificationData) {
  const { error } = await supabase.rpc('create_admin_notification', {
    p_title: data.title,
    p_message: data.message,
    p_type: data.type,
    p_metadata: data.metadata || {}
  });

  if (error) {
    console.error('Error creating admin notification:', error);
  }
}

async function batchUpdateProgress(
  jobId: string,
  progress: number,
  step: 'fetching_issues' | 'generating_embeddings' | 'finding_duplicates'
) {
  await supabase.rpc('update_job_progress', {
    p_job_id: jobId,
    p_progress: progress,
    p_step: step,
    p_worker_id: WORKER_ID
  });
}

async function processJob(jobId: string) {
  try {
    // Get job details including user_id and repository info
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*, repositories!inner(*)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Failed to get job details');
    }

    // Get GitHub token for the user
    const token = await getGitHubToken(job.user_id);

    // Get total issue count first
    const response = await fetch(`https://api.github.com/search/issues?q=repo:${job.repositories.owner}/${job.repositories.name}+is:issue+is:open`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'RepoMonitor'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${error.message}`);
    }

    const searchData = await response.json();
    const totalIssues = searchData.total_count;

    // Update job with total count
    await supabase
      .from('analysis_jobs')
      .update({
        total_issues_count: totalIssues,
        last_processed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Fetch issues in batches
    let page = 1;
    let processedCount = 0;

    while (processedCount < totalIssues) {
      const issues = await fetchGitHubIssues(token, job.repositories.owner, job.repositories.name, page);

      // Process each issue in the batch
      for (const issue of issues) {
        const { error: insertError } = await supabase
          .from('analysis_job_items')
          .upsert({
            job_id: jobId,
            issue_number: issue.number,
            issue_title: issue.title,
            issue_body: issue.body || '',
            embedding_status: 'pending'
          });

        if (insertError) {
          console.error(`Error inserting issue ${issue.number}:`, insertError);
          continue;
        }

        processedCount++;
      }

      // Update job progress
      const progress = Math.min((processedCount / totalIssues) * 100, 100);
      await batchUpdateProgress(jobId, progress, 'fetching_issues');

      page++;
    }

    // Move to embedding generation stage
    await supabase
      .from('analysis_jobs')
      .update({
        status: 'processing',
        processing_stage: 'generating_embeddings',
        processing_stage_number: 2,
        stage_progress: 0,
        last_processed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Send notification for data collection complete
    await createNotification(supabase, job.user_id, {
      title: 'Data Collection Complete',
      message: `Successfully collected ${totalIssues} issues from ${job.repositories.owner}/${job.repositories.name}`,
      type: 'DATA_COLLECTION_COMPLETE',
      metadata: {
        jobId: jobId,
        repository: `${job.repositories.owner}/${job.repositories.name}`,
        issueCount: totalIssues
      }
    });

  } catch (error) {
    console.error(`Error processing job:`, error);
    throw error;
  }
}

async function checkQueueState(jobId: string) {
  console.log(`[${new Date().toISOString()}] Checking queue state for job: ${jobId}`);

  // Get counts for each embedding status
  const statuses = ['pending', 'processing', 'completed', 'error'];
  for (const status of statuses) {
    const { count, error } = await supabase
      .from('analysis_job_items')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('embedding_status', status);

    if (error) {
      console.error(`[${new Date().toISOString()}] Error getting ${status} count:`, error);
    } else {
      console.log(`[${new Date().toISOString()}] Embedding ${status}: ${count}`);
    }
  }

  // Get items that might be stuck in processing
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: stuckItems, error: stuckError } = await supabase
    .from('analysis_job_items')
    .select('id, processed_at')
    .eq('job_id', jobId)
    .eq('embedding_status', 'processing')
    .lt('processed_at', fiveMinutesAgo);

  if (stuckError) {
    console.error(`[${new Date().toISOString()}] Error getting stuck items:`, stuckError);
  } else if (stuckItems?.length) {
    console.log(`[${new Date().toISOString()}] Found ${stuckItems.length} stuck items:`, stuckItems);

    // Reset stuck items to pending
    const { error: resetError } = await supabase
      .from('analysis_job_items')
      .update({
        embedding_status: 'pending',
        processed_at: null
      })
      .in('id', stuckItems.map(item => item.id));

    if (resetError) {
      console.error(`[${new Date().toISOString()}] Error resetting stuck items:`, resetError);
    } else {
      console.log(`[${new Date().toISOString()}] Reset ${stuckItems.length} stuck items to pending`);
    }
  }

  // Get a sample of pending items
  const { data: pendingItems, error: pendingError } = await supabase
    .from('analysis_job_items')
    .select('id, issue_title, issue_body')
    .eq('job_id', jobId)
    .eq('embedding_status', 'pending')
    .limit(5);

  if (pendingError) {
    console.error(`[${new Date().toISOString()}] Error getting pending items:`, pendingError);
  } else if (pendingItems?.length) {
    console.log(`[${new Date().toISOString()}] Sample of pending items:`, pendingItems);
  }
}

// Update the function that inserts duplicate issues
async function insertDuplicateIssues(jobId: string, duplicates: Array<{ issue_number: number, duplicate_issue_number: number, confidence: number }>) {
  const { data: job, error: jobError } = await supabase
    .from('analysis_jobs')
    .select('repository_id')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  const duplicateRecords = duplicates.map(d => ({
    job_id: jobId,
    repository_id: job.repository_id, // Add repository_id
    issue_number: d.issue_number,
    duplicate_issue_number: d.duplicate_issue_number,
    confidence: d.confidence,
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('duplicate_issues')
    .upsert(duplicateRecords);

  if (error) throw error;
}

// HTTP endpoint for processing jobs
serve(async (req) => {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Get job details including user_id
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*, repositories!inner(*)')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Failed to get job details');
    }

    // Get GitHub token for the user
    const token = await getGitHubToken(job.user_id);

    // Now we can use this token for GitHub API calls
    // Rest of the processing logic...

    // Check queue state before processing
    await checkQueueState(jobId);

    // Process the job
    await processJob(jobId);

    // Check queue state after processing
    await checkQueueState(jobId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
