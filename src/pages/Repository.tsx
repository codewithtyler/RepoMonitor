import { useParams } from 'react-router-dom';
import { RepositoryDetailView } from '@/components/repository/repository-detail-view';

export function Repository() {
    const { owner, name } = useParams<{ owner: string; name: string }>();

    if (!owner || !name) {
        return (
            <div className="p-4 text-red-500">
                Invalid repository URL. Please check the URL and try again.
            </div>
        );
    }

    return <RepositoryDetailView owner={owner} name={name} />;
}
