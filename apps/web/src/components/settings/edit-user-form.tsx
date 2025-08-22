'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { 
  User,
  Mail,
  Shield,
  ArrowLeft,
  Save,
  X
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

interface EditUserFormProps {
  user: User;
  onCancel: () => void;
  onUserUpdated: () => void;
}

interface UpdateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const USER_ROLES = [
  { value: 'DATA_ENGINEER', label: 'Data Engineer', description: 'Data processing and analysis access' },
  { value: 'ML_ENGINEER', label: 'ML Engineer', description: 'Machine learning model management' },
  { value: 'COMPLIANCE_OFFICER', label: 'Compliance Officer', description: 'Audit and compliance monitoring' },
  { value: 'ADMIN', label: 'Admin', description: 'Full system administrator access' }
];

export function EditUserForm({ user, onCancel, onUserUpdated }: EditUserFormProps) {
  const [formData, setFormData] = useState<UpdateUserData>({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<UpdateUserData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdateUserData> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateUserData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check if anything actually changed
    const hasChanges = 
      formData.firstName !== user.firstName ||
      formData.lastName !== user.lastName ||
      formData.email !== user.email ||
      formData.role !== user.role;

    if (!hasChanges) {
      toast({
        title: 'No changes detected',
        description: 'No modifications were made to the user profile',
      });
      onCancel();
      return;
    }

    setLoading(true);
    try {
      const response = await api.put(`/users/${user.id}`, {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      });

      toast({
        title: 'User updated successfully',
        description: `${formData.firstName} ${formData.lastName} has been updated`,
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Failed to update user:', error);
      
      let errorMessage = 'Failed to update user';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage = 'A user with this email already exists';
      } else if (error.response?.status === 404) {
        errorMessage = 'User not found';
      }

      toast({
        title: 'Error updating user',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (roleValue: string) => {
    switch (roleValue) {
      case 'ADMIN':
        return 'text-red-600';
      case 'COMPLIANCE_OFFICER':
        return 'text-orange-600';
      case 'ML_ENGINEER':
        return 'text-purple-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <User className="h-6 w-6 text-blue-600" />
        <div>
          <h3 className="text-lg font-semibold">Edit User</h3>
          <p className="text-muted-foreground text-sm">
            Update user profile information and role permissions
          </p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      {/* Edit User Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                <User className="h-4 w-4 inline mr-2" />
                First Name
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Enter first name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName')(e.target.value)}
                className={errors.firstName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                <User className="h-4 w-4 inline mr-2" />
                Last Name
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Enter last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName')(e.target.value)}
                className={errors.lastName ? 'border-red-500' : ''}
                disabled={loading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email')(e.target.value)}
              className={errors.email ? 'border-red-500' : ''}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">
              <Shield className="h-4 w-4 inline mr-2" />
              Role
            </Label>
            <Select 
              value={formData.role} 
              onValueChange={handleInputChange('role')}
              disabled={loading}
            >
              <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <Shield className={`h-4 w-4 ${getRoleColor(role.value)}`} />
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          User Update Guidelines
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1">
          <li>• Email changes will require the user to verify their new email address</li>
          <li>• Role changes take effect immediately and may affect user permissions</li>
          <li>• Users will receive a notification about profile changes</li>
          <li>• All changes are logged for audit and compliance purposes</li>
        </ul>
      </Card>
    </div>
  );
}