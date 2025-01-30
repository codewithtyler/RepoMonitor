import { ExternalLink } from 'lucide-react';

interface OpenWithModalProps {
    isOpen: boolean;
    onClose: () => void;
    repositoryUrl: string;
}

export function OpenWithModal({ isOpen, onClose, repositoryUrl }: OpenWithModalProps) {
    if (!isOpen) return null;

    const handleOpenWith = (service: 'bolt' | 'cursor') => {
        const protocol = service === 'bolt' ? 'bolt://' : 'cursor://';
        window.location.href = `${protocol}${repositoryUrl}`;
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#161b22] rounded-xl p-6 w-full max-w-md border border-[#30363d] shadow-xl">
                <h2 className="text-lg font-medium text-[#c9d1d9] mb-4">Open With</h2>
                <div className="space-y-4">
                    <button
                        onClick={() => handleOpenWith('bolt')}
                        className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open in Bolt
                    </button>
                    <button
                        onClick={() => handleOpenWith('cursor')}
                        className="w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#238636] text-white hover:bg-[#2ea043] transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Open in Cursor
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="mt-4 w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d] transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
