import { useParams, useNavigate } from 'react-router-dom';
import { RepositoryDetailView } from '@/components/repository/repository-detail-view';
import type { SearchResult } from '@/lib/contexts/search-context';

export function Repository() {
    const { owner, name } = useParams<{ owner: string; name: string }>();
    const navigate = useNavigate();

    if (!owner || !name) {
        return (
            <div className="p-4 text-red-500">
                Invalid repository URL. Please check the URL and try again.
            </div>
        );
    }

    const repository: SearchResult = {
        id: 0, // This will be updated when details are loaded
        owner,
        name,
        description: null,
        url: `https://github.com/${owner}/${name}`,
        visibility: 'public',
        stargazersCount: 0,
        forksCount: 0,
        openIssuesCount: 0,
        subscribersCount: 0,
        isFork: false
    };

    return (
        <RepositoryDetailView
            repository={repository}
            onBack={() => navigate(-1)}
        />
    );
}
