import { useNavigate } from 'react-router-dom';

interface OpenWithModalProps {
    isOpen: boolean;
    onClose: () => void;
    repositoryUrl: string;
}

export function OpenWithModal({ isOpen, onClose, repositoryUrl }: OpenWithModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleOpenWith = (service: 'bolt' | 'cursor') => {
        onClose();
        navigate('/work-in-progress');
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#21262d] rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-[#c9d1d9]">
                    Open your project with...
                </h2>

                <div className="space-y-3">
                    <button
                        onClick={() => handleOpenWith('bolt')}
                        className="w-full px-4 py-3 rounded-lg bg-[#0969da] text-white hover:bg-[#1f6feb] transition-colors flex items-center justify-center gap-2"
                    >
                        Bolt.new
                    </button>

                    <button
                        onClick={() => handleOpenWith('cursor')}
                        className="w-full px-4 py-3 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                    >
                        Cursor
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
