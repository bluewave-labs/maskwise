'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { 
  UserPlus,
  User,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  ArrowLeft,
  Check
} from 'lucide-react';

interface CreateUserFormProps {
  onCancel: () => void;
  onUserCreated: () => void;
}

interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
}

const USER_ROLES = [
  { value: 'DATA_ENGINEER', label: 'Data Engineer', description: 'Data processing and analysis access' },
  { value: 'ML_ENGINEER', label: 'ML Engineer', description: 'Machine learning model management' },
  { value: 'COMPLIANCE_OFFICER', label: 'Compliance Officer', description: 'Audit and compliance monitoring' },
  { value: 'ADMIN', label: 'Admin', description: 'Full system administrator access' }
];

export function CreateUserForm({ onCancel, onUserCreated }: CreateUserFormProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'DATA_ENGINEER'
  });
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<CreateUserData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateUserData> = {};

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CreateUserData) => (value: string) => {
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

    setLoading(true);
    try {
      const response = await api.post('/users', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      });

      toast({
        title: 'User created successfully',
        description: `${formData.firstName} ${formData.lastName} has been added to the system`,
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'DATA_ENGINEER'
      });

      onUserCreated();
    } catch (error: any) {
      console.error('Failed to create user:', error);
      
      let errorMessage = 'Failed to create user';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage = 'A user with this email already exists';
      }

      toast({
        title: 'Error creating user',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    // Generate a secure random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
    setShowPassword(true);
    
    // Copy to clipboard
    navigator.clipboard.writeText(password).then(() => {
      toast({
        title: 'Password generated',
        description: 'Password copied to clipboard',
      });
    });
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
      {/* Create User Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
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
                <p className="text-[13px] text-red-600">{errors.firstName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
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
                <p className="text-[13px] text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">
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
              <p className="text-[13px] text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password')(e.target.value)}
                  className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={generatePassword}
                disabled={loading}
              >
                Generate
              </Button>
            </div>
            {errors.password && (
              <p className="text-[13px] text-red-600">{errors.password}</p>
            )}
            <p className="text-[13px] text-muted-foreground">
              Password will be shared with the user. Consider using the generate button for a secure password.
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">
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
                      <span className="font-normal">{role.label} ({role.description})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-[13px] text-red-600">{errors.role}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {loading ? 'Creating User...' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>

      {/* Instructions Card */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-lg">
        <h4 className="font-normal text-slate-700 dark:text-slate-300 mb-2">
          User Creation Guidelines
        </h4>
        <ul className="text-[13px] text-slate-600 dark:text-slate-400 space-y-1">
          <li>• The user will receive their credentials (email and password) from you directly</li>
          <li>• Make sure to provide a secure password or use the generate button</li>
          <li>• Users can change their password after first login through their profile</li>
          <li>• Role permissions: User (basic), Moderator (management), Admin (full access)</li>
        </ul>
      </div>
    </div>
  );
}