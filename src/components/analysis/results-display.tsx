import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/common/button';
import { Badge } from '@/components/common/badge';

interface Issue {
  id: number;
  number: number;
  title: string;
  labels: string[];
  duplicates: Array<{
    id: number;
    number: number;
    title: string;
    confidence: number;
  }>;
}

interface ResultsDisplayProps {
  repositoryUrl: string;
  issues: Issue[];
}

export function ResultsDisplay({ repositoryUrl, issues }: ResultsDisplayProps) {
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  function toggleIssue(issueId: number) {
    setExpandedIssues(current => {
      const next = new Set(current);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (expandAll) {
      setExpandedIssues(new Set());
    } else {
      setExpandedIssues(new Set(issues.map(i => i.id)));
    }
    setExpandAll(!expandAll);
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analysis Results</h1>
        <Button variant="outline" onClick={toggleAll}>
          {expandAll ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      <div className="space-y-4">
        {issues.map(issue => (
          <div key={issue.id} className="border rounded-lg bg-white shadow-sm">
            {/* Main issue row */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => toggleIssue(issue.id)}
            >
              <div className="flex items-center space-x-4">
                <div className="text-gray-500">
                  {expandedIssues.has(issue.id) ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`${repositoryUrl}/issues/${issue.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:underline"
                      onClick={e => e.stopPropagation()}
                    >
                      #{issue.number}
                    </a>
                    <span className="font-medium">{issue.title}</span>
                  </div>

                  <div className="flex gap-2 mt-1">
                    {issue.labels.map(label => (
                      <Badge key={label} variant="default">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Badge variant="default">
                  {issue.duplicates.length} duplicates
                </Badge>
                <a
                  href={`${repositoryUrl}/issues/${issue.number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                </a>
              </div>
            </div>

            {/* Duplicates section */}
            {expandedIssues.has(issue.id) && issue.duplicates.length > 0 && (
              <div className="border-t bg-gray-50">
                <div className="p-2 pl-12">
                  {issue.duplicates.map(duplicate => (
                    <div
                      key={duplicate.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <a
                          href={`${repositoryUrl}/issues/${duplicate.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          #{duplicate.number}
                        </a>
                        <span className="text-sm">{duplicate.title}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge>
                          {Math.round(duplicate.confidence * 100)}% match
                        </Badge>
                        <a
                          href={`${repositoryUrl}/issues/${duplicate.number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
