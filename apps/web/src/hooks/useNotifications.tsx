import { useEffect, useRef, useCallback } from 'react';

interface NotificationOptions {
  /**
   * Notification title
   */
  title: string;
  
  /**
   * Notification body text
   */
  body?: string;
  
  /**
   * Notification icon URL
   */
  icon?: string;
  
  /**
   * Auto close the notification after this many milliseconds
   */
  autoClose?: number;
  
  /**
   * Custom click handler
   */
  onClick?: () => void;
}

interface UseNotificationsOptions {
  /**
   * Request permission automatically when hook is used
   * @default true
   */
  requestPermission?: boolean;
  
  /**
   * Only show notifications when page is hidden
   * @default true
   */
  onlyWhenHidden?: boolean;
  
  /**
   * Custom permission request message
   */
  permissionMessage?: string;
}

/**
 * Hook for managing browser notifications with automatic permission handling
 */
export function useNotifications({
  requestPermission = true,
  onlyWhenHidden = true,
  permissionMessage = 'Enable notifications to receive updates when processing completes'
}: UseNotificationsOptions = {}) {
  const permissionStatusRef = useRef<NotificationPermission>('default');
  const notificationsRef = useRef<Notification[]>([]);

  // Check if notifications are supported
  const isSupported = typeof window !== 'undefined' && 'Notification' in window;

  // Update permission status
  useEffect(() => {
    if (isSupported) {
      permissionStatusRef.current = Notification.permission;
    }
  }, [isSupported]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (permissionStatusRef.current === 'granted') {
      return true;
    }

    if (permissionStatusRef.current === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      permissionStatusRef.current = permission;
      return permission === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Show a notification
  const showNotification = useCallback(async ({
    title,
    body,
    icon = '/favicon.ico',
    autoClose = 5000,
    onClick
  }: NotificationOptions): Promise<boolean> => {
    // Check if we should show notification (based on page visibility)
    if (onlyWhenHidden && !document.hidden) {
      return false;
    }

    // Ensure we have permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return false;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: `maskwise-${Date.now()}`, // Unique tag to prevent duplicates
        requireInteraction: false,
        silent: false
      });

      // Store reference for cleanup
      notificationsRef.current.push(notification);

      // Handle click
      if (onClick) {
        notification.onclick = () => {
          onClick();
          notification.close();
        };
      }

      // Auto close
      if (autoClose > 0) {
        setTimeout(() => {
          notification.close();
        }, autoClose);
      }

      // Cleanup when notification is closed
      notification.onclose = () => {
        notificationsRef.current = notificationsRef.current.filter(n => n !== notification);
      };

      return true;
    } catch (error) {
      console.warn('Failed to show notification:', error);
      return false;
    }
  }, [onlyWhenHidden, requestNotificationPermission]);

  // Show job completion notification
  const showJobCompletionNotification = useCallback(async (
    jobType: string,
    fileName: string,
    success: boolean = true
  ): Promise<boolean> => {
    const title = success 
      ? `${jobType} Complete` 
      : `${jobType} Failed`;
    
    const body = success
      ? `${fileName} has been processed successfully`
      : `${fileName} processing failed. Please try again.`;

    return showNotification({
      title,
      body,
      onClick: () => {
        // Focus the window when notification is clicked
        window.focus();
      }
    });
  }, [showNotification]);

  // Show upload completion notification
  const showUploadCompletionNotification = useCallback(async (
    fileName: string,
    piiCount: number
  ): Promise<boolean> => {
    const title = 'PII Analysis Complete';
    const body = piiCount > 0
      ? `${fileName}: ${piiCount} PII entities detected`
      : `${fileName}: No PII detected - Clean dataset`;

    return showNotification({
      title,
      body,
      onClick: () => {
        window.focus();
      }
    });
  }, [showNotification]);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    notificationsRef.current.forEach(notification => {
      notification.close();
    });
    notificationsRef.current = [];
  }, []);

  // Request permission on mount if enabled
  useEffect(() => {
    if (requestPermission && isSupported) {
      requestNotificationPermission();
    }
  }, [requestPermission, isSupported, requestNotificationPermission]);

  // Cleanup notifications on unmount
  useEffect(() => {
    return () => {
      clearNotifications();
    };
  }, [clearNotifications]);

  return {
    isSupported,
    permission: permissionStatusRef.current,
    requestPermission: requestNotificationPermission,
    showNotification,
    showJobCompletionNotification,
    showUploadCompletionNotification,
    clearNotifications,
    hasPermission: permissionStatusRef.current === 'granted'
  };
}