export type AuditAction = 
  | 'CREATE'
  | 'UPDATE' 
  | 'DELETE'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'UPLOAD'
  | 'LOGIN'
  | 'LOGOUT';

export interface AuditLog {
  id: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}