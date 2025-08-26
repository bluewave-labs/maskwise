import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { SSEService } from '../sse/sse.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  category: 'SYSTEM' | 'JOB' | 'SECURITY' | 'USER';
  metadata?: any;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  categories: {
    SYSTEM: boolean;
    JOB: boolean;
    SECURITY: boolean;
    USER: boolean;
  };
}

/**
 * Comprehensive Notification System
 * 
 * Manages all types of notifications including real-time delivery via SSE,
 * persistent storage, user preferences, and notification history.
 * 
 * Features:
 * - Real-time notifications via SSE
 * - Persistent notification history
 * - User preferences and filtering
 * - Multiple notification channels
 * - Event-driven architecture
 * - Notification templates and categories
 */
@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly eventEmitter = new EventEmitter2();

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SSEService))
    private sseService: SSEService,
  ) {}

  onModuleInit() {
    this.setupEventListeners();
  }

  /**
   * Send notification to user
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check user preferences
      const preferences = await this.getUserPreferences(payload.userId);
      
      if (!this.shouldSendNotification(payload, preferences)) {
        return;
      }

      // Store notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          category: payload.category,
          metadata: payload.metadata || {},
          actionUrl: payload.actionUrl,
          actionLabel: payload.actionLabel,
          isRead: false,
        },
      });

      // Send real-time notification via SSE (temporarily commented out)
      if (preferences.inApp) {
        try {
          this.sseService.sendNotification(
            payload.userId,
            payload.title,
            payload.message,
            payload.type.toLowerCase() as 'info' | 'success' | 'warning' | 'error'
          );
        } catch (error) {
          console.warn('SSE service not available:', error.message);
        }
      }

      // Emit event for other handlers (email, webhooks, etc.)
      this.eventEmitter.emit('notification.sent', {
        notification,
        preferences,
        payload,
      });

      // Update user's unread count
      await this.updateUnreadCount(payload.userId);

    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotification(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>
  ): Promise<void> {
    const promises = userIds.map(userId =>
      this.sendNotification({ ...payload, userId })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get notifications for user with pagination
   */
  async getNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      type?: string;
      unreadOnly?: boolean;
    } = {}
  ) {
    const { page = 1, limit = 20, category, type, unreadOnly } = options;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    
    if (category) where.category = category;
    if (type) where.type = type;
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    await this.updateUnreadCount(userId);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    await this.updateUnreadCount(userId);
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    await this.updateUnreadCount(userId);
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    const defaultPreferences: NotificationPreferences = {
      email: true,
      inApp: true,
      categories: {
        SYSTEM: true,
        JOB: true,
        SECURITY: true,
        USER: true,
      },
    };

    if (!user?.notificationPreferences) {
      return defaultPreferences;
    }

    return {
      ...defaultPreferences,
      ...(user.notificationPreferences as any),
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const current = await this.getUserPreferences(userId);
    const updated = { ...current, ...preferences };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationPreferences: updated,
      },
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Clean up old notifications (keep last 1000 per user)
   */
  async cleanupOldNotifications(): Promise<void> {
    const users = await this.prisma.user.findMany({
      select: { id: true },
    });

    for (const user of users) {
      const notifications = await this.prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip: 1000, // Keep last 1000
        select: { id: true },
      });

      if (notifications.length > 0) {
        const idsToDelete = notifications.map(n => n.id);
        await this.prisma.notification.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });
      }
    }
  }

  // Event-driven notification methods

  /**
   * Job completion notification
   */
  async notifyJobComplete(userId: string, jobId: string, datasetName: string, findingsCount: number): Promise<void> {
    const type = findingsCount > 0 ? 'WARNING' : 'SUCCESS';
    const message = findingsCount > 0
      ? `Found ${findingsCount} PII entities in ${datasetName}`
      : `No PII detected in ${datasetName}`;

    await this.sendNotification({
      userId,
      title: 'Analysis Complete',
      message,
      type,
      category: 'JOB',
      metadata: { jobId, datasetName, findingsCount },
      actionUrl: `/datasets?highlight=${jobId}`,
      actionLabel: 'View Results',
    });
  }

  /**
   * Security alert notification
   */
  async notifySecurityAlert(userId: string, alertType: string, details: any): Promise<void> {
    await this.sendNotification({
      userId,
      title: 'Security Alert',
      message: `Security event detected: ${alertType}`,
      type: 'ERROR',
      category: 'SECURITY',
      metadata: { alertType, ...details },
      actionUrl: '/audit',
      actionLabel: 'View Audit Log',
    });
  }

  /**
   * System maintenance notification
   */
  async notifySystemMaintenance(message: string, scheduledTime?: Date): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const userIds = users.map(u => u.id);

    await this.sendBulkNotification(userIds, {
      title: 'System Maintenance',
      message,
      type: 'INFO',
      category: 'SYSTEM',
      metadata: { scheduledTime },
    });
  }

  /**
   * Welcome notification for new users
   */
  async notifyWelcome(userId: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    
    await this.sendNotification({
      userId,
      title: `Welcome to Maskwise${firstName ? `, ${firstName}` : ''}!`,
      message: 'Get started by uploading your first dataset for PII analysis.',
      type: 'INFO',
      category: 'USER',
      actionUrl: '/datasets',
      actionLabel: 'Upload Dataset',
    });
  }

  // Private helper methods

  private shouldSendNotification(
    payload: NotificationPayload,
    preferences: NotificationPreferences
  ): boolean {
    return preferences.inApp && preferences.categories[payload.category];
  }

  private async updateUnreadCount(userId: string): Promise<void> {
    const count = await this.getUnreadCount(userId);
    
    // Send real-time unread count update
    try {
      this.sseService.sendNotification(
        userId,
        'unread_count_updated',
        count.toString(),
        'info'
      );
    } catch (error) {
      console.warn('SSE service not available for unread count update:', error.message);
    }
  }

  private setupEventListeners(): void {
    // Listen for various system events and send appropriate notifications
    this.eventEmitter.on('job.completed', this.handleJobCompleted.bind(this));
    this.eventEmitter.on('security.alert', this.handleSecurityAlert.bind(this));
    this.eventEmitter.on('user.registered', this.handleUserRegistered.bind(this));
  }

  private async handleJobCompleted(event: any): Promise<void> {
    const { userId, jobId, datasetName, findingsCount } = event;
    await this.notifyJobComplete(userId, jobId, datasetName, findingsCount);
  }

  private async handleSecurityAlert(event: any): Promise<void> {
    const { userId, alertType, details } = event;
    await this.notifySecurityAlert(userId, alertType, details);
  }

  private async handleUserRegistered(event: any): Promise<void> {
    const { userId, firstName } = event;
    await this.notifyWelcome(userId, firstName);
  }
}