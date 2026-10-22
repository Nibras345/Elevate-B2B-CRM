import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import {
  Camera,
  User,
  Mail,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../common/Badge';

export const ProfileSettings: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form input state
  const [fullName, setFullName] = useState<string>(user.fullName || user.name || '');
  const [email, setEmail] = useState<string>(user.email || '');
  const [phone, setPhone] = useState<string>(user.phone || '');
  const [department, setDepartment] = useState<string>(user.department || '');

  // Profile picture states
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(
    user.profilePicture || user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );

  // UI status states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | null;
    text: string;
  }>({ type: null, text: '' });

  // Sync state whenever authenticated user data updates externally
  useEffect(() => {
    setFullName(user.fullName || user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    if (!selectedImageFile) {
      setImagePreview(
        user.profilePicture || user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
      );
    }
  }, [user]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Handle file input change & validation
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStatusMessage({ type: null, text: '' });
    const file = e.target.files?.[0];

    if (!file) return;

    // Validate MIME type
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select a valid image file (JPG, PNG, WEBP, or GIF).';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5MB)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const errorMsg = 'Selected image exceeds the 5MB file size limit.';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Revoke previous blob URL if exists
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImageFile(file);
    setImagePreview(previewUrl);
    notify('Profile photo selected. Click "Save Changes" to upload.', 'info');
  };

  // Revert selected unsaved image back to user's saved photo
  const handleRevertImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImageFile(null);
    setImagePreview(user.profilePicture || user.avatar || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    notify('Image selection cleared', 'info');
  };

  // Reset form inputs back to current user state
  const handleReset = () => {
    setFullName(user.fullName || user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    handleRevertImage();
    setStatusMessage({ type: null, text: '' });
  };

  // Submit profile updates to backend endpoint with Axios
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMessage({ type: null, text: '' });

    // Client-side text validations
    if (!fullName.trim()) {
      const errorMsg = 'Full Name is required.';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
      return;
    }

    if (!email.trim()) {
      const errorMsg = 'Email address is required.';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
      return;
    }

    // Construct FormData object to securely pass text fields and file
    const formData = new FormData();
    formData.append('fullName', fullName.trim());
    formData.append('email', email.toLowerCase().trim());
    formData.append('phone', phone.trim());
    formData.append('department', department.trim());

    if (selectedImageFile) {
      formData.append('profilePicture', selectedImageFile);
    }

    // Retrieve JWT token from local storage
    const token =
      localStorage.getItem('nexcrm_jwt_token') ||
      localStorage.getItem('token') ||
      '';

    if (!token) {
      const errorMsg = 'Authentication token missing. Please log in again.';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.put('/api/users/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const updated = response.data.user;

        // Update global AuthContext state so all UI reflects the new details
        updateProfile({
          name: updated.name || updated.fullName,
          fullName: updated.fullName || updated.name,
          email: updated.email,
          phone: updated.phone || '',
          department: updated.department || '',
          avatar: updated.profilePicture || updated.avatar,
          profilePicture: updated.profilePicture || updated.avatar,
        });

        // Clear local file selection since it is now uploaded to Cloudinary
        setSelectedImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        const successMsg = response.data.message || 'Profile updated successfully!';
        setStatusMessage({ type: 'success', text: successMsg });
        notify(successMsg, 'success');
      } else {
        throw new Error(response.data.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'An error occurred while updating your profile. Please try again.';
      setStatusMessage({ type: 'error', text: errorMsg });
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const hasUnsavedChanges =
    fullName !== (user.fullName || user.name || '') ||
    email !== user.email ||
    phone !== (user.phone || '') ||
    department !== (user.department || '') ||
    selectedImageFile !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* SECTION 1: Profile Picture Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
        <div className="w-full pb-4 border-b border-slate-100 dark:border-slate-800 text-left">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Profile Picture
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Public avatar displayed across workspace deals and invoices
          </p>
        </div>

        {/* Circular Avatar with Camera Icon Overlay */}
        <div className="mt-6 relative group">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto">
            <img
              src={imagePreview}
              alt={fullName || user.name}
              className="w-full h-full rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl ring-4 ring-brand-500/20 group-hover:ring-brand-500/50 transition-all duration-300"
            />

            {/* Quick hover indicator */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-white cursor-pointer"
              aria-label="Upload new profile picture"
            >
              <UploadCloud className="w-6 h-6 mb-1 drop-shadow-md animate-bounce" />
              <span className="text-[11px] font-semibold drop-shadow-md">Change Photo</span>
            </button>

            {/* Small Camera Icon Overlay Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 p-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white rounded-full shadow-lg ring-4 ring-white dark:ring-slate-900 transition-all duration-200 cursor-pointer flex items-center justify-center group-hover:scale-110"
              title="Click to select new profile picture"
              aria-label="Change Avatar Image"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            id="profile-picture-input"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

        {/* Selected file info / revert badge */}
        {selectedImageFile && (
          <div className="mt-4 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center gap-2 max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-brand-700 dark:text-brand-300 truncate max-w-[160px]">
              {selectedImageFile.name}
            </span>
            <button
              type="button"
              onClick={handleRevertImage}
              className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
              title="Cancel image selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* User identification summary */}
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          {fullName || user.name}
        </h3>
        <p className="text-xs text-slate-400 truncate max-w-[220px]">{email || user.email}</p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <Badge variant="primary" size="sm">
            {user.role}
          </Badge>
          <Badge variant="neutral" size="sm">
            Tenant: {user.tenantId}
          </Badge>
        </div>

        {/* Cloudinary specifications info */}
        <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-2 text-slate-500">
          <div className="flex justify-between items-center">
            <span>Supported Formats:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">JPG, PNG, WEBP</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Max File Size:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">5 MB</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Cloud Storage:</span>
            <span className="font-semibold text-brand-600 dark:text-brand-400">Cloudinary CDN</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Upload New Avatar</span>
        </button>
      </div>

      {/* SECTION 2: Personal Information Form */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Personal Information
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update your identity, contact reachability, and corporate department
              </p>
            </div>

            {hasUnsavedChanges && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Unsaved changes
              </span>
            )}
          </div>

          {/* Inline Feedback Alerts */}
          {statusMessage.type && (
            <div
              className={`mt-4 p-4 rounded-xl flex items-start gap-3 border text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-bold block">
                  {statusMessage.type === 'success' ? 'Update Successful' : 'Update Failed'}
                </span>
                <span className="mt-0.5 block">{statusMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusMessage({ type: null, text: '' })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Field 1: Full Name */}
              <div>
                <label
                  htmlFor="profile-fullName"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="profile-fullName"
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your legal or preferred name across CRM reports
                </p>
              </div>

              {/* Field 2: Email Address */}
              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    required
                    placeholder="sarah.admin@apexcorp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Primary corporate email for notifications and logins
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Field 3: Phone Number */}
              <div>
                <label
                  htmlFor="profile-phone"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    id="profile-phone"
                    name="phone"
                    type="tel"
                    placeholder="+1 (555) 234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Direct line or mobile number for client correspondence
                </p>
              </div>

              {/* Field 4: Department */}
              <div>
                <label
                  htmlFor="profile-department"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Department
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    id="profile-department"
                    name="department"
                    type="text"
                    placeholder="e.g. Executive Management / Sales"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:opacity-60"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Organizational unit or team division
                </p>
              </div>
            </div>

            {/* Read-Only Context Fields */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                    Tenant Workspace:
                  </span>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                    <Building className="w-3.5 h-3.5 text-brand-500" />
                    <span>{user.companyName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700">
                      {user.tenantId}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                    Assigned Role:
                  </span>
                  <span className="font-semibold text-brand-600 dark:text-brand-400">
                    {user.role} (Isolated Multi-Tenant Access)
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Discard Changes
                </button>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Cloudinary & DB...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
