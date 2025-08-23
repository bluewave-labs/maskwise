'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc
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

type SortField = 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt';

export function UserManagement({ className }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'USER'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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
    setShowEditDialog(true);
  };

  const handleUserUpdated = async () => {
    await fetchUsers();
    setShowEditDialog(false);
    setUserToEdit(null);
  };

  const handleStatusToggleClick = (user: User) => {
    setUserToDeactivate(user);
    setShowDeactivateDialog(true);
  };

  const handleStatusToggleConfirm = async () => {
    if (!userToDeactivate) return;

    const isCurrentlyActive = userToDeactivate.isActive;
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    
    setDeactivateLoading(true);
    try {
      if (isCurrentlyActive) {
        // Deactivate user
        await api.delete(`/users/${userToDeactivate.id}`);
      } else {
        // Activate user - we'll need to create this endpoint
        await api.put(`/users/${userToDeactivate.id}/activate`);
      }
      
      await fetchUsers(); // Refresh the list
      toast({
        title: `User ${action}d successfully`,
        description: `${userToDeactivate.firstName} ${userToDeactivate.lastName} has been ${action}d`,
      });
      setShowDeactivateDialog(false);
      setUserToDeactivate(null);
    } catch (error: any) {
      console.error(`Failed to ${action} user:`, error);
      let errorMessage = `Failed to ${action} user`;
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

  const handleCancelStatusToggle = () => {
    setShowDeactivateDialog(false);
    setUserToDeactivate(null);
  };

  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  // Filter and sort users
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'active' && user.isActive) ||
                          (statusFilter === 'inactive' && !user.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'role':
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'lastLoginAt':
          aValue = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
          bValue = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

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
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'moderator':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
    }
  };

  if (authLoading || loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">User Management</h3>
            <p className="text-muted-foreground text-[13px]">
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
    setShowCreateDialog(false);
  };


  return (
    <div className={`space-y-6 ${className}`}>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-[34px]"
          />
        </div>
        <div className="flex items-center gap-4">
          <Select value={roleFilter} onValueChange={(value: 'all' | 'ADMIN' | 'USER') => setRoleFilter(value)}>
            <SelectTrigger className="w-32 h-[34px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'active' | 'inactive') => setStatusFilter(value)}>
            <SelectTrigger className="w-32 h-[34px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleCreateUser} className="h-[34px]">
            <UserPlus className="h-4 w-4 mr-2" />
            Create User
          </Button>
        </div>
      </div>

      {/* Results Info */}
      {filteredUsers.length !== users.length && (
        <div className="text-[13px] text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 && !loading ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-normal text-foreground mb-2">No Users Found</h3>
          <p className="text-[13px] text-muted-foreground mb-6">
            {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first user.'
            }
          </p>
          {!searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
            <Button onClick={handleCreateUser}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Role
                      {getSortIcon('role')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Status</th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-2">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th 
                    className="text-left p-4 font-normal text-[13px] cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => handleSort('lastLoginAt')}
                  >
                    <div className="flex items-center gap-2">
                      Last Login
                      {getSortIcon('lastLoginAt')}
                    </div>
                  </th>
                  <th className="text-left p-4 font-normal text-[13px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className="border-b hover:bg-muted/25 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-normal text-[13px] flex items-center gap-2">
                        {user.firstName} {user.lastName}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-[11px]">You</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">{user.email}</td>
                    <td className="p-4">
                      <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-normal ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-4 text-[13px] text-muted-foreground">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td className="p-4">
                      {user.id !== currentUser?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            {user.isActive ? (
                              <DropdownMenuItem 
                                onClick={() => handleStatusToggleClick(user)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                onClick={() => handleStatusToggleClick(user)}
                                className="text-green-600 focus:text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-[13px] text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-[13px] text-muted-foreground">Rows per page:</span>
                  <Select 
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[13px] px-3">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <CreateUserForm
            onCancel={() => setShowCreateDialog(false)}
            onUserCreated={handleUserCreated}
          />
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          {userToEdit && (
            <EditUserForm
              user={userToEdit}
              onCancel={() => {
                setShowEditDialog(false);
                setUserToEdit(null);
              }}
              onUserUpdated={handleUserUpdated}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeactivateDialog}
        onClose={handleCancelStatusToggle}
        onConfirm={handleStatusToggleConfirm}
        title={userToDeactivate?.isActive ? "Deactivate User" : "Activate User"}
        description={
          userToDeactivate 
            ? userToDeactivate.isActive
              ? `Are you sure you want to deactivate ${userToDeactivate.firstName} ${userToDeactivate.lastName}? This will disable their access to the system and they will no longer be able to log in. This action can be reversed later by reactivating the user.`
              : `Are you sure you want to activate ${userToDeactivate.firstName} ${userToDeactivate.lastName}? This will restore their access to the system and they will be able to log in again.`
            : ''
        }
        confirmText={userToDeactivate?.isActive ? "Deactivate User" : "Activate User"}
        cancelText="Cancel"
        variant={userToDeactivate?.isActive ? "destructive" : "default"}
        loading={deactivateLoading}
      />
    </div>
  );
}