import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Hash,
  CreditCard
} from 'lucide-react';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import StatusBadge from '../../ui/StatusBadge';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

interface UserDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  file_size?: number;
  mime_type?: string;
}

interface UserDetailsModalProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (userId: string) => void;
  onReject: (user: any) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onApprove,
  onReject
}) => {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadUserDocuments();
    }
  }, [isOpen, user]);

  const loadUserDocuments = async () => {
    try {
      setLoadingDocuments(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading user documents:', error);
      toast.error('Failed to load user documents');
    } finally {
      setLoadingDocuments(false);
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

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'driving_license':
        return CreditCard;
      case 'ic_passport':
        return Hash;
      case 'payment_receipt':
        return FileText;
      default:
        return FileText;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleImageLoad = (imageUrl: string) => {
    setImageLoading(null);
  };

  const handleImageError = (imageUrl: string) => {
    setImageLoading(null);
    toast.error('Failed to load image');
  };

  const handleDownload = (document: UserDocument) => {
    const link = document.createElement('a');
    link.href = document.file_url;
    link.download = document.file_name;
    link.target = '_blank';
    link.click();
  };

  const handleApproveUser = () => {
    onApprove(user.id);
    onClose();
  };

  const handleRejectUser = () => {
    onReject(user);
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full h-full flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white border border-gray-200 rounded-lg sm:rounded-xl w-full max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            maxHeight: 'calc(100vh - 2rem)',
            maxHeight: 'calc(100dvh - 2rem)',
            height: 'auto',
            minHeight: '20rem'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed at top */}
          <div className="flex-shrink-0 flex justify-between items-center p-3 sm:p-4 lg:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="p-1.5 sm:p-2 lg:p-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex-shrink-0">
                <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate leading-tight">{user.name}</h2>
                <p className="text-xs sm:text-sm lg:text-base text-gray-700 truncate">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1 flex-wrap">
                  <StatusBadge status={user.registration_status} type="user" />
                  {user.referred_by && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                      Referred
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-lg flex-shrink-0 ml-1 sm:ml-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
            <div className="p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4 lg:space-y-5">
              {/* Personal Information */}
              <Card className="p-3 sm:p-4 lg:p-5 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center space-x-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                  <span>Personal Information</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Full Name</label>
                      <p className="text-gray-900 font-medium bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">{user.name}</p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">IC Number</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md font-mono text-xs sm:text-sm lg:text-base">
                        {user.ic_number || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Date of Birth</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">
                        {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Gender</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md capitalize text-xs sm:text-sm lg:text-base">
                        {user.gender || 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Contact Information */}
              <Card className="p-3 sm:p-4 lg:p-5 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center space-x-2">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                  <span>Contact Information</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div>
                    <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Email Address</label>
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md">
                      <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-gray-900 text-xs sm:text-sm lg:text-base truncate">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Phone Number</label>
                    <div className="flex items-center space-x-2 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <p className="text-gray-900 text-xs sm:text-sm lg:text-base">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Address Information */}
              {(user.address_street || user.address_city || user.address_state) && (
                <Card className="p-3 sm:p-4 lg:p-5 bg-white border border-gray-200 rounded-lg">
                  <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center space-x-2">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
                    <span>Address Information</span>
                  </h3>
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Street Address</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">
                        {user.address_street || 'Not provided'}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                      <div>
                        <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">City</label>
                        <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">
                          {user.address_city || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">State</label>
                        <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md capitalize text-xs sm:text-sm lg:text-base">
                          {user.address_state || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Postal Code</label>
                        <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">
                          {user.address_postal_code || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Account Information */}
              <Card className="p-3 sm:p-4 lg:p-5 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
                  <span>Account Information</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Role</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md capitalize text-xs sm:text-sm lg:text-base font-medium">
                        {user.role || 'User'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Registration Date</label>
                      <p className="text-gray-900 bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md text-xs sm:text-sm lg:text-base">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Not available'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Account Status</label>
                      <p className={`text-xs sm:text-sm lg:text-base font-medium bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md ${
                        user.active ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {user.active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-600 text-xs sm:text-sm font-medium mb-1">Approval Status</label>
                      <div className="bg-gray-50 p-2 sm:p-2.5 lg:p-3 rounded-md">
                        <StatusBadge status={user.registration_status} type="user" />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Documents Section */}
              <Card className="p-3 sm:p-4 lg:p-5 bg-white border border-gray-200 rounded-lg">
                <h3 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4 flex items-center space-x-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
                  <span>Uploaded Documents</span>
                </h3>
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-6 sm:py-8 lg:py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                    {documents.map((document) => {
                      const IconComponent = getDocumentIcon(document.document_type);
                      return (
                        <motion.div
                          key={document.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 border border-gray-200 rounded-md p-3 sm:p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-2 sm:mb-3">
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              <div className="p-1 sm:p-1.5 lg:p-2 bg-blue-100 rounded-md flex-shrink-0">
                                <IconComponent className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5 text-blue-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base truncate">
                                  {getDocumentTypeName(document.document_type)}
                                </h4>
                                <p className="text-xs text-gray-600 truncate">
                                  {document.file_name}
                                </p>
                                {document.file_size && (
                                  <p className="text-xs text-gray-500">
                                    {formatFileSize(document.file_size)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {document.mime_type?.startsWith('image/') && (
                            <div className="mb-2 sm:mb-3">
                              <div className="w-full h-24 sm:h-32 lg:h-40 bg-gray-100 rounded-md flex items-center justify-center relative">
                                {imageLoading === document.id && (
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                )}
                                <img
                                  src={document.file_url} 
                                  alt={document.file_name}
                                  onLoad={() => handleImageLoad(document.id)}
                                  className="w-full h-24 sm:h-32 lg:h-40 object-cover rounded-md border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedImage(document.file_url)}
                                  onError={() => handleImageError(document.id)}
                                  style={{ display: imageLoading === document.id ? 'none' : 'block' }}
                                />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                            <Button
                              variant="ghost"
                              onClick={() => setSelectedImage(document.file_url)}
                              className="flex items-center justify-center space-x-1 flex-1 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] py-1.5 sm:py-2"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>View Full Size</span>
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => handleDownload(document)}
                              className="flex items-center justify-center space-x-1 flex-1 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] py-1.5 sm:py-2"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>Download</span>
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-10 lg:py-12">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h4 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No Documents</h4>
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600">This user hasn't uploaded any documents yet.</p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          {user.registration_status === 'pending' && (
            <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 lg:space-x-4 p-3 sm:p-4 lg:p-5 border-t border-gray-200 bg-gray-50">
              <Button
                variant="danger"
                onClick={handleRejectUser}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6"
              >
                <XCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Reject Registration</span>
              </Button>
              <Button
                variant="success"
                onClick={handleApproveUser}
                className="flex items-center justify-center space-x-2 w-full sm:w-auto min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm lg:text-base px-3 sm:px-4 lg:px-6"
              >
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span>Approve Registration</span>
              </Button>
            </div>
          )}
        </motion.div>
      </div>

        {/* Full Size Image Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-2 sm:p-4"
              onClick={() => setSelectedImage(null)}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                className="relative max-w-[95vw] max-h-[95vh] max-h-[95dvh]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 text-white hover:text-gray-300 transition-colors z-10 bg-black/60 rounded-full p-2 min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <img
                  src={selectedImage}
                  alt="Document preview"
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
};

export default UserDetailsModal;