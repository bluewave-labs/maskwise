import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Helper decorator for admin-only routes
export const AdminOnly = () => SetMetadata(ROLES_KEY, ['ADMIN']);

// Helper decorator for member and admin access
export const MemberAccess = () => SetMetadata(ROLES_KEY, ['ADMIN', 'MEMBER']);