import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const WorkInProgress = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-[#c9d1d9] p-4">
            <div className="max-w-md text-center space-y-6">
                <h1 className="text-4xl font-bold mb-4 animate-bounce">
                    Haha, you just thought...
                </h1>
                <p className="text-xl text-[#8b949e] mb-8">
                    This feature is still cooking in our development kitchen.
                    The chef says it'll be ready... eventually™
                    ¯\_(ツ)_/¯
                </p>
                <div className="p-4 bg-[#21262d] rounded-lg">
                    <p className="text-sm text-[#8b949e] italic">
                        "The only thing more reliable than this feature being ready is finding a bug in production."
                        - Every Developer Ever
                    </p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-8 flex items-center gap-2 text-sm font-medium mx-auto hover:text-[#2ea043] transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Go back and pretend this never happened
                </button>
            </div>
        </div>
    );
};
