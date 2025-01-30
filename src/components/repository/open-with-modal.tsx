import { useNavigate } from 'react-router-dom';

interface OpenWithModalProps {
    isOpen: boolean;
    onClose: () => void;
    repositoryUrl: string; // Keep this for future use
}

export function OpenWithModal({ isOpen, onClose }: OpenWithModalProps) {
    if (!isOpen) return null;
    const navigate = useNavigate();

    const handleOpenWith = () => {
        onClose();
        navigate('/work-in-progress');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-[#0d1117] rounded-lg p-6 w-full max-w-md border border-[#30363d] shadow-xl">
                <h2 className="text-lg font-medium text-[#c9d1d9] mb-4">Open With</h2>
                <div className="space-y-3">
                    <button
                        onClick={handleOpenWith}
                        className="w-full px-4 py-2 rounded-md flex items-center justify-center bg-[#0078d4] text-white hover:bg-[#0086ef] transition-colors font-medium"
                    >
                        Open in Bolt
                    </button>
                    <button
                        onClick={handleOpenWith}
                        className="w-full px-4 py-2 rounded-md flex items-center justify-center bg-[#1c1c1c] text-white hover:bg-[#2a2a2a] transition-colors font-medium"
                    >
                        Open in Cursor
                    </button>
                </div>
                <div className="mt-4 text-center">
                    <button
                        onClick={onClose}
                        className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
