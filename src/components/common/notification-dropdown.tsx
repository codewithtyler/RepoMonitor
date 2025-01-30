import { useState, useRef, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';

// Note: This project uses plain React + TailwindCSS.
// We intentionally avoid Next.js, Shadcn UI, and Radix UI.
// All components are built from scratch using TailwindCSS for styling.

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null!);
    const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAllAsRead = () => {
        markAllAsRead();
        setIsOpen(false);
    };

    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 transition-colors hover:bg-gray-500/10 text-[#c9d1d9]"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span
                        className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#238636]"
                    />
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-96 rounded-lg border border-[#30363d] bg-[#161b22] shadow-lg z-50"
                    >
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-[#c9d1d9]">
                                    Notifications
                                </h3>
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleMarkAllAsRead}
                                        className="text-xs hover:opacity-80 text-[#8b949e]"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-[#8b949e]" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="text-center py-8 text-[#8b949e]">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No notifications yet</p>
                                    <p className="text-xs mt-1">We'll let you know when something happens</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={`flex items-start p-3 rounded-lg transition-colors hover:bg-gray-500/10 ${notification.is_read ? 'bg-transparent' : 'bg-[#0d1117]'
                                                }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-[#c9d1d9]">
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs mt-1 text-[#8b949e]">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs mt-1 text-[#8b949e]">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="ml-2 text-xs hover:opacity-80 text-[#238636]"
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
