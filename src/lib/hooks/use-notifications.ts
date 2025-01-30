import { useEffect, useState } from 'react';
import { useUser } from '../auth/hooks';
import { supabase } from '../auth/supabase-client';
import { logger } from '@/lib/utils/logger';

export type NotificationType = 'SYSTEM_ERROR' | 'DATA_COLLECTION_COMPLETE' | 'PROCESSING_COMPLETE' |
    'ANALYSIS_COMPLETE' | 'REPORT_COMPLETE' | 'PROCESSING_ERROR' | 'ANALYSIS_ERROR';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata: Record<string, any>;
    is_read: boolean;
    created_at: string;
}

export function useNotifications() {
    const { user } = useUser();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        // Initial fetch
        fetchNotifications();

        // Subscribe to new notifications
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            logger.error('Error fetching notifications:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);

            if (error) throw error;

            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
        } catch (error) {
            logger.error('Error marking notification as read:', error);
            throw error;
        }
    };

    const markAllAsRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user?.id)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            logger.error('Error marking all notifications as read:', error);
            throw error;
        }
    };

    return {
        notifications,
        loading,
        markAsRead,
        markAllAsRead,
        unreadCount: notifications.filter(n => !n.is_read).length
    };
}

export async function createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    metadata?: Record<string, any>;
}) {
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                metadata: data.metadata || {},
                is_read: false
            });

        if (error) throw error;
    } catch (error) {
        logger.error('Error creating notification:', error);
        throw error;
    }
}
