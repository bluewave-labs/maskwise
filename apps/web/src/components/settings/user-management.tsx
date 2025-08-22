'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { CreateUserForm } from './create-user-form';
import { EditUserForm } from './edit-user-form';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import api from '@/lib/api';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical,
  User,
  Mail,
  Calendar,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash2
} from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

interface UserManagementProps {
  className?: string;
}

export function UserManagement({ className }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?limit=100');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to fetch users:', error);
      if (error.response?.status !== 401) {
        toast({
          title: 'Error',
          description: 'Failed to load users',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      fetchUsers();
    }
  }, [isAuthenticated, authLoading]);

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setShowEditForm(true);
  };

  const handleUserUpdated = async () => {
    await fetchUsers();
    setShowEditForm(false);
    setUserToEdit(null);
  };

  const handleDeactivateClick = (user: User) => {
    setUserToDeactivate(user);
    setShowDeactivateDialog(true);
  };

  const handleDeactivateConfirm = async () => {
    if (!userToDeactivate) return;

    setDeactivateLoading(true);
    try {
      await api.delete(`/users/${userToDeactivate.id}`);
      await fetchUsers(); // Refresh the list
      toast({
        title: 'User deactivated',
        description: `${userToDeactivate.firstName} ${userToDeactivate.lastName} has been deactivated`,
      });
      setShowDeactivateDialog(false);
      setUserToDeactivate(null);
    } catch (error: any) {
      console.error('Failed to deactivate user:', error);
      let errorMessage = 'Failed to deactivate user';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = 'User not found';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setDeactivateLoading(false);
    }
  };

  const handleCancelDeactivate = () => {
    setShowDeactivateDialog(false);
    setUserToDeactivate(null);
  };

  const handleCreateUser = () => {
    setShowCreateForm(true);
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'moderator':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  if (authLoading || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold">User Management</h3>
            <p className="text-muted-foreground text-sm">
              Manage system users, roles, and access permissions
            </p>
          </div>
        </div>
        
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-muted-foreground">Loading users...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Authentication required</p>
        </div>
      </Card>
    );
  }

  const handleUserCreated = async () => {
    // Refresh the user list and return to the main view
    await fetchUsers();
    setShowCreateForm(false);
  };

  if (showCreateForm) {
    return (
      <div className={`space-y-6 ${className}`}>
        <CreateUserForm
          onCancel={() => setShowCreateForm(false)}
          onUserCreated={handleUserCreated}
        />
      </div>
    );
  }

  if (showEditForm && userToEdit) {
    return (
      <div className={`space-y-6 ${className}`}>
        <EditUserForm
          user={userToEdit}
          onCancel={() => {
            setShowEditForm(false);
            setUserToEdit(null);
          }}
          onUserUpdated={handleUserUpdated}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">User Management</h3>
          <p className="text-muted-foreground text-sm">
            Manage system users, roles, and access permissions
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredUsers.length} of {users.length} users
          </div>
        </div>
        
        <Button onClick={handleCreateUser} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">
                {users.filter(u => u.role === 'ADMIN').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <div className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            System Users
          </h4>
          
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            Inactive
                          </Badge>
                        )}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(user.createdAt)}
                        </span>
                        <span>
                          Last login: {formatLastLogin(user.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user.isActive ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        Inactive
                      </div>
                    )}
                    
                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit user"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateClick(user)}
                          disabled={!user.isActive}
                          title={user.isActive ? "Deactivate user" : "User already inactive"}
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Deactivation Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeactivateDialog}
        onClose={handleCancelDeactivate}
        onConfirm={handleDeactivateConfirm}
        title="Deactivate User"
        description={
          userToDeactivate 
            ? `Are you sure you want to deactivate ${userToDeactivate.firstName} ${userToDeactivate.lastName}? This will disable their access to the system and they will no longer be able to log in. This action can be reversed later by reactivating the user.`
            : ''
        }
        confirmText="Deactivate User"
        cancelText="Cancel"
        variant="destructive"
        loading={deactivateLoading}
      />
    </div>
  );
}