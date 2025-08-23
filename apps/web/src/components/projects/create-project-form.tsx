'use client';

import { useState } from 'react';
import { CreateProjectRequest } from '@/types/project';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateProjectFormProps {
  onSubmit: (data: CreateProjectRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: CreateProjectRequest;
}

export function CreateProjectForm({ onSubmit, onCancel, loading, initialData }: CreateProjectFormProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: initialData?.name || '',
    description: initialData?.description || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Project name must be less than 50 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input
          id="name"
          placeholder="Enter project name..."
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-[13px] text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          placeholder="Describe your project and its purpose..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className={`w-full min-h-[100px] px-3 py-2 border border-input bg-background rounded-md text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none ${
            errors.description ? 'border-destructive' : ''
          }`}
          rows={4}
        />
        {errors.description && (
          <p className="text-[13px] text-destructive">{errors.description}</p>
        )}
        <p className="text-[13px] text-muted-foreground">
          {formData.description?.length || 0}/500 characters
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.name.trim()}
          className="flex-1"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}