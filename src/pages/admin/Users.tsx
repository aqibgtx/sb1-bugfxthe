import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Eye, X, Download, FileText, User, Phone, Mail, MapPin, Calendar, RefreshCw, Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface UserDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

const AdminUsers: React.FC = () => {
  const { fetchUsers, loading, setLoading } = useSupabaseData();
  const [users, setUsers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedRole, setSelectedRole] = useState('customer');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [itemsPerPage] = useState(15);

  // Staff type options based on the database schema
  const staffTypeOptions = [
    { value: 'field_staff', label: 'Field Staff', description: 'Car delivery and customer service' },
    { value: 'marketing', label: 'Marketing', description: 'Marketing and promotion activities' },
    { value: 'database_registration', label: 'Database Registration', description: 'Customer registration and data management' },
    { value: 'accounting', label: 'Accounting', description: 'Financial management and bookkeeping' },
    { value: 'supervisor', label: 'Supervisor', description: 'Team supervision and management' },
    { value: 'director', label: 'Director', description: 'Executive leadership and strategy' }
  ];

  const loadUsers = async (page: number = 1) => {
    try {
      setLoading(true);
      const { data: usersData, count } = await fetchUsers({ page, limit: itemsPerPage });
      setUsers(usersData || []);
      setTotalUsers(count || 0);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await loadUsers(currentPage);
      toast.success('Users data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  const loadUserDocuments = async (userId: string) => {
    try {
      setLoadingDocuments(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUserDocuments(data || []);
    } catch (error) {
      console.error('Error loading user documents:', error);
      toast.error('Failed to load user documents');
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, []);

  const toggleUserActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ active: !currentActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(`User ${currentActive ? 'deactivated' : 'activated'} successfully`);
      loadUsers(currentPage);
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          registration_status: 'approved',
          approved: true,
          active: true
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User approved successfully!');
      loadUsers(currentPage);
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      // Update the user's registration status to rejected
      // The database trigger will automatically handle setting approved=false and active=false
      const { error } = await supabase
        .from('users')
        .update({ 
          registration_status: 'rejected'
          // Don't manually set approved/active - let the trigger handle it
        })
        .eq('id', userId);

      if (error) {
        console.error('Database error during rejection:', error);
        throw error;
      }

      toast.success('User registration rejected successfully');
      loadUsers(currentPage);
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user registration');
    }
  };

  const handleViewUserDetails = async (user: any) => {
    setSelectedUser(user);
    setShowUserDetails(true);
    await loadUserDocuments(user.id);
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user? This will also delete all their associated documents.')) {
      try {
        // First, delete all documents associated with this user
        const { error: documentsError } = await supabase
          .from('documents')
          .delete()
          .eq('user_id', id);

        if (documentsError) throw documentsError;

        // Then delete the user
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (userError) throw userError;

        toast.success('User and associated documents deleted successfully');
        loadUsers(currentPage);
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Failed to delete user');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const userData: any = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      role: formData.get('role') as string,
      temp_key: formData.get('temp_key') as string,
      approved: true,
      active: true,
      registration_status: 'approved'
    };

    // Add staff_type if role is staff
    if (userData.role === 'staff') {
      userData.staff_type = formData.get('staff_type') as string;
      
      if (!userData.staff_type) {
        toast.error('Please select a staff type');
        return;
      }
    }

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('User updated successfully');
      } else {
        const { error } = await supabase
          .from('users')
          .insert(userData);

        if (error) throw error;
        toast.success('User created successfully');
      }

      setShowForm(false);
      setEditingUser(null);
      setSelectedRole('customer');
      loadUsers(currentPage);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    }
  };

  const getStatusBadge = (user: any) => {
    if (user.registration_status === 'approved') {
      return <StatusBadge status="approved" type="user" />;
    } else if (user.registration_status === 'rejected') {
      return <StatusBadge status="rejected" type="user" />;
    } else {
      return <StatusBadge status="pending" type="user" />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    switch (type) {
      case 'driving_license':
        return 'Driving License';
      case 'ic_passport':
        return 'IC/Passport';
      case 'payment_receipt':
        return 'Payment Receipt';
      default:
        return 'Other Document';
    }
  };

  const getStaffTypeName = (staffType: string) => {
    const option = staffTypeOptions.find(opt => opt.value === staffType);
    return option ? option.label : staffType;
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalUsers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalUsers);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadUsers(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-6 px-4 py-3 bg-white border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600">
          Showing {startIndex} to {endIndex} of {totalUsers} users
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="min-w-[44px] min-h-[44px] flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          
          <div className="flex space-x-1">
            {pageNumbers.map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "primary" : "ghost"}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                disabled={loading}
                className="min-w-[44px] min-h-[44px]"
              >
                {pageNum}
              </Button>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="min-w-[44px] min-h-[44px] flex items-center space-x-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 md:space-y-8 p-3 sm:p-4 lg:p-0"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Users</h1>
          <p className="text-gray-700 text-sm md:text-base">Manage staff and customer accounts</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 mobile-button min-w-[44px] min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button 
            onClick={() => {
              setShowForm(true);
              setSelectedRole('customer');
            }}
            className="flex items-center space-x-2 mobile-button min-w-[44px] min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            <span>New User</span>
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">User</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">Contact</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">Role</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">Status</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">Created</th>
                <th className="text-left py-4 px-4 text-gray-700 font-medium text-sm md:text-base">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div>
                      <p className="text-gray-900 font-medium text-sm md:text-base">{user.name}</p>
                      <p className="text-gray-600 text-xs md:text-sm">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-gray-700 text-sm md:text-base">{user.phone || 'N/A'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide
                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          user.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'}
                      `}>
                        {user.role}
                      </span>
                      {user.role === 'staff' && user.staff_type && (
                        <div className="text-xs text-gray-600">
                          {getStaffTypeName(user.staff_type)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(user)}
                      {user.active && user.registration_status === 'approved' && (
                        <span className="text-green-600 text-xs">✓ Active</span>
                      )}
                      {!user.active && user.registration_status === 'approved' && (
                        <span className="text-orange-600 text-xs">⚠ Inactive</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-gray-700 text-xs md:text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {user.registration_status === 'pending' && (
                        <>
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApproveUser(user.id)}
                            className="flex items-center space-x-1 min-w-[44px] min-h-[44px]"
                          >
                            <span>Approve</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRejectUser(user.id)}
                            className="flex items-center space-x-1 min-w-[44px] min-h-[44px]"
                          >
                            <span>Reject</span>
                          </Button>
                        </>
                      )}
                      <button
                        onClick={() => handleViewUserDetails(user)}
                        className="text-gray-600 hover:text-blue-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title="View full details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleUserActive(user.id, user.active)}
                        className="text-gray-600 hover:text-gray-900 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        title={user.active ? 'Deactivate user' : 'Activate user'}
                      >
                        {user.active ? 
                          <ToggleRight className="w-6 h-6 text-green-500" /> : 
                          <ToggleLeft className="w-6 h-6" />
                        }
                      </button>
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-gray-600 hover:text-blue-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-gray-600 hover:text-red-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {renderPagination()}
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content modal-lg"
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">User Details</h2>
                <p className="modal-text text-gray-600 mt-1">{selectedUser.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                  setUserDocuments([]);
                }}
                className="modal-close-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <div className="space-y-6">
              {/* Personal Information */}
              <div className="modal-section">
                <h3 className="modal-subtitle flex items-center space-x-2 mb-4">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Personal Information</span>
                </h3>
                <div className="modal-card">
                  <div className="modal-grid gap-4">
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Full Name</label>
                      <p className="modal-text font-medium">{selectedUser.name}</p>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">IC Number</label>
                      <p className="modal-text">{selectedUser.ic_number || 'Not provided'}</p>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Date of Birth</label>
                      <p className="modal-text">
                      {selectedUser.date_of_birth ? new Date(selectedUser.date_of_birth).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Gender</label>
                      <p className="modal-text capitalize">{selectedUser.gender || 'Not provided'}</p>
                  </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="modal-section">
                <h3 className="modal-subtitle flex items-center space-x-2 mb-4">
                  <Phone className="w-5 h-5 text-green-600" />
                  <span>Contact Information</span>
                </h3>
                <div className="modal-card">
                  <div className="modal-grid gap-4">
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Email Address</label>
                      <p className="modal-text break-all">{selectedUser.email}</p>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Phone Number</label>
                      <p className="modal-text">{selectedUser.phone || 'Not provided'}</p>
                  </div>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              {(selectedUser.address_street || selectedUser.address_city || selectedUser.address_state) && (
                <div className="modal-section">
                  <h3 className="modal-subtitle flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-purple-600" />
                    <span>Address Information</span>
                  </h3>
                  <div className="modal-card">
                    <div className="space-y-3">
                    <div>
                        <label className="modal-form-label text-xs text-gray-500">Street Address</label>
                        <p className="modal-text">{selectedUser.address_street || 'Not provided'}</p>
                    </div>
                      <div className="modal-grid gap-3">
                      <div>
                          <label className="modal-form-label text-xs text-gray-500">City</label>
                          <p className="modal-text">{selectedUser.address_city || 'Not provided'}</p>
                      </div>
                      <div>
                          <label className="modal-form-label text-xs text-gray-500">State</label>
                          <p className="modal-text capitalize">{selectedUser.address_state || 'Not provided'}</p>
                      </div>
                      <div>
                          <label className="modal-form-label text-xs text-gray-500">Postal Code</label>
                          <p className="modal-text">{selectedUser.address_postal_code || 'Not provided'}</p>
                      </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div className="modal-section">
                <h3 className="modal-subtitle flex items-center space-x-2 mb-4">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span>Account Information</span>
                </h3>
                <div className="modal-card">
                  <div className="modal-grid gap-4">
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Role</label>
                      <p className="modal-text capitalize font-medium">{selectedUser.role}</p>
                  </div>
                  {selectedUser.role === 'staff' && selectedUser.staff_type && (
                    <div>
                        <label className="modal-form-label text-xs text-gray-500">Staff Type</label>
                      <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                          <p className="modal-text font-medium">{getStaffTypeName(selectedUser.staff_type)}</p>
                      </div>
                    </div>
                  )}
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Registration Status</label>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(selectedUser)}
                    </div>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Account Status</label>
                      <p className={`modal-text font-medium ${selectedUser.active ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedUser.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                      <label className="modal-form-label text-xs text-gray-500">Registration Date</label>
                      <p className="modal-text">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                  </div>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="modal-section">
                <h3 className="modal-subtitle flex items-center space-x-2 mb-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Uploaded Documents</span>
                </h3>
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : userDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {userDocuments.map((document) => (
                      <div key={document.id} className="modal-card p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="modal-text font-medium">{getDocumentTypeName(document.document_type)}</h4>
                          <span className="text-gray-500 text-xs">
                            {new Date(document.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mb-2">
                          <img 
                            src={document.file_url} 
                            alt={document.file_name}
                            className="w-full h-24 sm:h-28 object-cover rounded border border-gray-200"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-full h-24 sm:h-28 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(document.file_url, '_blank')}
                            className="flex items-center space-x-1 flex-1 min-h-[40px] text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = document.file_url;
                              link.download = document.file_name;
                              link.click();
                            }}
                            className="flex items-center space-x-1 flex-1 min-h-[40px] text-xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="modal-card text-center py-6">
                    <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="modal-text text-gray-500">No documents uploaded</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {selectedUser.registration_status === 'pending' && (
                <div className="modal-section pt-4 border-t border-gray-200">
                  <div className="modal-button-group">
                  <Button
                    variant="danger"
                    onClick={() => {
                      handleRejectUser(selectedUser.id);
                      setShowUserDetails(false);
                    }}
                    className="modal-action-button bg-red-600 hover:bg-red-700 text-white"
                  >
                    <span>Reject Registration</span>
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => {
                      handleApproveUser(selectedUser.id);
                      setShowUserDetails(false);
                    }}
                    className="modal-action-button bg-green-600 hover:bg-green-700 text-white"
                  >
                    <span>Approve Registration</span>
                  </Button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add/Edit User Form Modal */}
      {showForm && (
        <div className="modal-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content modal-md"
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingUser ? 'Edit User' : 'New User'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  setSelectedRole('customer');
                }}
                className="modal-close-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="modal-body">
            <form onSubmit={handleSubmit} className="space-y-4" id="user-form">
              <div className="modal-form-group">
              <div>
                  <label className="modal-form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingUser?.name || ''}
                    className="modal-form-input"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                  <label className="modal-form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingUser?.email || ''}
                    className="modal-form-input"
                  placeholder="john@example.com"
                  required
                />
              </div>
              </div>
              
              <div className="modal-form-group">
              <div>
                  <label className="modal-form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingUser?.phone || ''}
                    className="modal-form-input"
                  placeholder="+60123456789"
                />
              </div>
              <div>
                  <label className="modal-form-label">Temporary Key</label>
                <input
                  type="text"
                  name="temp_key"
                  defaultValue={editingUser?.temp_key || ''}
                    className="modal-form-input"
                  placeholder="TEMP123"
                  required
                />
              </div>
              </div>
              
              <div>
                <label className="modal-form-label">Role</label>
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  defaultValue={editingUser?.role || 'customer'}
                  className="modal-form-input"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Staff Type Selection - Only show when role is staff */}
              {selectedRole === 'staff' && (
                <div>
                  <label className="modal-form-label">
                    Staff Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="staff_type"
                    defaultValue={editingUser?.staff_type || 'field_staff'}
                    className="modal-form-input"
                    required
                  >
                    {staffTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="modal-text text-gray-500 text-xs mt-1">
                    This determines the staff member's compensation structure and permissions.
                  </p>
                  
                  {/* Staff Type Descriptions */}
                  <div className="mt-2 space-y-1">
                    {staffTypeOptions.map((option) => (
                      <div key={option.value} className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                        <span className="font-medium">{option.label}:</span> {option.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </form>
            </div>
            
            <div className="modal-footer">
              <div className="modal-button-group">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setSelectedRole('customer');
                  }}
                  className="modal-action-button bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="user-form"
                  className="modal-action-button bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminUsers;