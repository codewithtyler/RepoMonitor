import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useRepositoryDetails } from '@/lib/hooks/use-repository-details';

export function Repository() {
    const { owner, name } = useParams();
    const { repository, isLoading, error } = useRepositoryDetails(owner!, name!);

    console.log('[Repository] Rendering repository page:', { owner, name, repository, isLoading, error });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !repository) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h2 className="text-red-700 font-semibold">Error Loading Repository</h2>
                    <p className="text-red-600 mt-1">
                        {error instanceof Error ? error.message : 'Failed to load repository details'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            {repository.name}
                        </h1>
                        <p className="text-gray-600 mt-1">{repository.description}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {repository.visibility}
                        </div>
                        <div className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {repository.language}
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Statistics</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Stars</div>
                            <div>{repository.stargazers_count}</div>
                            <div>Forks</div>
                            <div>{repository.forks_count}</div>
                            <div>Open Issues</div>
                            <div>{repository.open_issues_count}</div>
                        </div>
                    </div>

                    <div className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Details</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>Default Branch</div>
                            <div>{repository.default_branch}</div>
                            <div>Created</div>
                            <div>{new Date(repository.created_at).toLocaleDateString()}</div>
                            <div>Last Updated</div>
                            <div>{new Date(repository.updated_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
