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
    console.log(`[${new Date().toISOString()}] Processing job: ${jobId}`);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error(`[${new Date().toISOString()}] Error fetching job:`, jobError);
      throw jobError;
    }

    if (!job) {
      console.error(`[${new Date().toISOString()}] Job not found: ${jobId}`);
      throw new Error('Job not found');
    }

    console.log(`[${new Date().toISOString()}] Job details:`, {
      stage: job.processing_stage,
      stageNumber: job.processing_stage_number,
      totalIssues: job.total_issues_count,
      processedIssues: job.processed_issues_count,
      embeddedIssues: job.embedded_issues_count,
      stageProgress: job.stage_progress
    });

    // Stage 2: Processing (Embeddings)
    if (job.processing_stage === 'fetching') {
      console.log(`[${new Date().toISOString()}] Transitioning from Stage 1 to Stage 2`);
      // Mark Stage 1 as complete before moving to Stage 2
      const { error: updateError } = await supabase
        .from('analysis_jobs')
        .update({
          processing_stage: 'embedding',
          processing_stage_number: 2,
          stage_progress: 0,
          processed_issues_count: job.total_issues_count, // Mark Stage 1 issues as processed
          embedded_issues_count: 0 // Reset embedding progress for Stage 2
        })
        .eq('id', jobId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Error updating job stage:`, updateError);
        throw updateError;
      }
    }

    // Get unprocessed items count for this stage
    const { count: pendingCount, error: pendingError } = await supabase
      .from('analysis_job_items')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('embedding_status', 'pending');

    if (pendingError) {
      console.error(`[${new Date().toISOString()}] Error getting pending count:`, pendingError);
      throw pendingError;
    }

    const { count: failedCount, error: failedError } = await supabase
      .from('analysis_job_items')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('embedding_status', 'error')
      .lt('retry_count', MAX_RETRIES);

    if (failedError) {
      console.error(`[${new Date().toISOString()}] Error getting failed count:`, failedError);
      throw failedError;
    }

    console.log(`[${new Date().toISOString()}] Item status:`, {
      pending: pendingCount,
      failed: failedCount,
      maxRetries: MAX_RETRIES
    });

    // Get items in processing state for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count: stuckCount, error: stuckError } = await supabase
      .from('analysis_job_items')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
      .eq('embedding_status', 'processing')
      .lt('processed_at', fiveMinutesAgo);

    if (stuckError) {
      console.error(`[${new Date().toISOString()}] Error getting stuck count:`, stuckError);
      throw stuckError;
    }

    if (stuckCount) {
      console.log(`[${new Date().toISOString()}] Found ${stuckCount} items stuck in processing state`);
      // Reset stuck items to pending
      const { error: resetError } = await supabase
        .from('analysis_job_items')
        .update({
          embedding_status: 'pending',
          processed_at: null
        })
        .eq('job_id', jobId)
        .eq('embedding_status', 'processing')
        .lt('processed_at', fiveMinutesAgo);

      if (resetError) {
        console.error(`[${new Date().toISOString()}] Error resetting stuck items:`, resetError);
        throw resetError;
      }
    }

    if (!pendingCount && !failedCount) {
      // Check if we have any permanent failures
      const { count: permanentFailures, error: permanentError } = await supabase
        .from('analysis_job_items')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .eq('embedding_status', 'error')
        .gte('retry_count', MAX_RETRIES);

      if (permanentError) {
        console.error(`[${new Date().toISOString()}] Error getting permanent failures:`, permanentError);
        throw permanentError;
      }

      console.log(`[${new Date().toISOString()}] Moving to analysis stage. Permanent failures: ${permanentFailures}`);

      // Move to analysis stage if all embeddings are done (or permanently failed)
      const { error: updateError } = await supabase
        .from('analysis_jobs')
        .update({
          processing_stage: 'analyzing',
          processing_stage_number: 3,
          stage_progress: 0,
          failed_items_count: permanentFailures || 0
        })
        .eq('id', jobId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Error updating job stage:`, updateError);
        throw updateError;
      }
    } else {
      // Process embeddings in batches
      let processedCount = job.embedded_issues_count || 0;

      // Get total items to process for accurate progress
      const { count: totalItems, error: totalError } = await supabase
        .from('analysis_job_items')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', jobId);

      if (totalError) {
        console.error(`[${new Date().toISOString()}] Error getting total items:`, totalError);
        throw totalError;
      }

      if (!totalItems) {
        console.log(`[${new Date().toISOString()}] No items to process`);
        return;
      }

      console.log(`[${new Date().toISOString()}] Processing batch. Total items: ${totalItems}, Processed: ${processedCount}`);

      // First try to get failed items that can be retried
      const { data: retryItems, error: retryError } = await supabase
        .from('analysis_job_items')
        .select('id, issue_title, issue_body, retry_count')
        .eq('job_id', jobId)
        .eq('embedding_status', 'error')
        .lt('retry_count', MAX_RETRIES)
        .order('issue_number')
        .limit(BATCH_SIZE);

      if (retryError) {
        console.error(`[${new Date().toISOString()}] Error getting retry items:`, retryError);
        throw retryError;
      }

      // If no retry items, get pending items
      const { data: pendingItems, error: pendingItemsError } = !retryItems?.length ? await supabase
        .from('analysis_job_items')
        .select('id, issue_title, issue_body')
        .eq('job_id', jobId)
        .eq('embedding_status', 'pending')
        .order('issue_number')
        .limit(BATCH_SIZE) : { data: null, error: null };

      if (pendingItemsError) {
        console.error(`[${new Date().toISOString()}] Error getting pending items:`, pendingItemsError);
        throw pendingItemsError;
      }

      const itemsToProcess = retryItems || pendingItems;
      if (!itemsToProcess?.length) {
        console.log(`[${new Date().toISOString()}] No items to process in this batch`);
        return;
      }

      console.log(`[${new Date().toISOString()}] Processing ${itemsToProcess.length} items`);

      // Mark batch as processing
      const { error: markError } = await supabase
        .from('analysis_job_items')
        .update({ embedding_status: 'processing' })
        .in('id', itemsToProcess.map(item => item.id));

      if (markError) {
        console.error(`[${new Date().toISOString()}] Error marking items as processing:`, markError);
        throw markError;
      }

      try {
        // Generate embeddings for the batch
        const texts = itemsToProcess.map(item =>
          `${item.issue_title}\n\n${item.issue_body}`
        );

        console.log(`[${new Date().toISOString()}] Generating embeddings for ${texts.length} items`);

        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: texts,
          dimensions: 1536,
        });

        // Prepare updates, handling any individual embedding errors
        const updates = itemsToProcess.map((item, index) => {
          const embedding = response.data[index]?.embedding;
          if (!embedding) {
            console.log(`[${new Date().toISOString()}] Failed to generate embedding for item ${item.id}`);
            return {
              id: item.id,
              embedding_status: 'error',
              error_message: 'Failed to generate embedding',
              retry_count: (item.retry_count || 0) + (retryItems ? 1 : 0)
            };
          }
          return {
            id: item.id,
            embedding: embedding,
            embedding_status: 'completed',
            processed_at: new Date().toISOString(),
            retry_count: (item.retry_count || 0) + (retryItems ? 1 : 0)
          };
        });

        // Update all items in batch
        const { error: updateError } = await supabase
          .from('analysis_job_items')
          .upsert(updates);

        if (updateError) {
          console.error(`[${new Date().toISOString()}] Error updating items:`, updateError);
          throw updateError;
        }

        // Count successful embeddings
        const successCount = updates.filter(u => u.embedding_status === 'completed').length;
        processedCount += successCount;

        console.log(`[${new Date().toISOString()}] Successfully processed ${successCount} items`);

        // Calculate progress based on total items in job_items table
        const progress = Math.min((processedCount / totalItems) * 100, 100);
        const { error: progressError } = await supabase
          .from('analysis_jobs')
          .update({
            embedded_issues_count: processedCount,
            stage_progress: progress
          })
          .eq('id', jobId);

        if (progressError) {
          console.error(`[${new Date().toISOString()}] Error updating progress:`, progressError);
          throw progressError;
        }

        console.log(`[${new Date().toISOString()}] Updated progress: ${progress}%`);

      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error processing batch:`, error);

        // Mark all items in batch as failed but continue processing
        for (const item of itemsToProcess) {
          const { error: failureError } = await supabase
            .from('analysis_job_items')
            .update({
              embedding_status: 'error',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              retry_count: (item.retry_count || 0) + 1,
              last_retry_at: new Date().toISOString()
            })
            .eq('id', item.id);

          if (failureError) {
            console.error(`[${new Date().toISOString()}] Error marking item as failed:`, failureError);
          }
        }
      }

      // Add delay between batches
      await new Promise(resolve => setTimeout(resolve, MIN_BATCH_INTERVAL));
    }

    // Stage 3: Analysis
    if (job.processing_stage === 'analyzing') {
      console.log(`[${new Date().toISOString()}] Starting analysis stage`);

      // Only analyze items that were successfully embedded
      const { error: analysisError } = await supabase.rpc('find_similar_issues', {
        p_job_id: jobId,
        p_similarity_threshold: 0.9
      });

      if (analysisError) {
        console.error(`[${new Date().toISOString()}] Error analyzing issues:`, analysisError);
        throw analysisError;
      }

      console.log(`[${new Date().toISOString()}] Moving to reporting stage`);

      // Move to reporting stage
      const { error: updateError } = await supabase
        .from('analysis_jobs')
        .update({
          processing_stage: 'reporting',
          processing_stage_number: 4,
          stage_progress: 0
        })
        .eq('id', jobId);

      if (updateError) {
        console.error(`[${new Date().toISOString()}] Error updating job stage:`, updateError);
        throw updateError;
      }
    }

    // Stage 4: Reporting
    if (job.processing_stage === 'reporting') {
      console.log(`[${new Date().toISOString()}] Completing job`);

      // Complete the job
      const { error: completeError } = await supabase
        .from('analysis_jobs')
        .update({
          status: 'completed',
          stage_progress: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (completeError) {
        console.error(`[${new Date().toISOString()}] Error completing job:`, completeError);
        throw completeError;
      }

      console.log(`[${new Date().toISOString()}] Job completed successfully`);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing job:`, error);

    // Update job with error but don't mark as failed unless it's a critical error
    const { error: updateError } = await supabase
      .from('analysis_jobs')
      .update({
        error: error instanceof Error ? error.message : 'Unknown error',
        // Only mark as failed if it's not a recoverable error
        ...(error instanceof Error && error.message.includes('CRITICAL') ? {
          status: 'failed',
          completed_at: new Date().toISOString()
        } : {})
      })
      .eq('id', jobId);

    if (updateError) {
      console.error(`[${new Date().toISOString()}] Error updating job with error:`, updateError);
    }
  }
}

async function checkQueueState(jobId: string) {
  console.log(`[${new Date().toISOString()}] Checking queue state for job: ${jobId}`);

  // Get counts for each status
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
      console.log(`[${new Date().toISOString()}] ${status}: ${count}`);
    }
  }

  // Get items that might be stuck
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

// HTTP endpoint for processing jobs
serve(async (req) => {
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      throw new Error('Job ID is required');
    }

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
