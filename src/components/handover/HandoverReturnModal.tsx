import React, { useState, useRef, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  Camera, 
  Upload, 
  X, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Copy,
  ExternalLink,
  Wallet,
  Shield,
  FileText,
  Plus,
  Trash2,
  Eye,
  Car
} from 'lucide-react';
import { getMalaysiaTime, formatMalaysiaDateTime } from '../../lib/timezone';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import { EnhancedInvoiceGenerator } from '../invoices/EnhancedInvoiceGenerator';
import { HandoverReturnInvoiceGenerator } from '../invoices/HandoverReturnInvoiceGenerator';
import { formatDuration } from '../../utils/calculateLateFee';
import LateFeePaymentMethodForm from '../forms/LateFeePaymentMethodForm';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import DepositDeductionModal from '../modals/DepositDeductionModal';
import EnhancedCombinedPaymentInvoiceModal from '../modals/EnhancedCombinedPaymentInvoiceModal';

interface HandoverReturnModalProps {
  selectedBooking: any;
  modalType: 'handover' | 'return';
  onClose: () => void;
  onConfirm: (photoUrl: string, actionTime: string, lateFee?: number, invoiceData?: any, depositData?: any, returnData?: any, currentMileage?: number) => void;
  processing: boolean;
  isClientView?: boolean; // New prop to determine if this is client view
  isAdmin?: boolean; // New prop to determine if user is admin
}

const HandoverReturnModal: React.FC<HandoverReturnModalProps> = ({
  selectedBooking,
  modalType,
  onClose,
  onConfirm,
  processing,
  isClientView = false,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Multiple photo upload for return process
  const [returnPhotos, setReturnPhotos] = useState<{ file: File; preview: string; type: 'deposit' | 'car' }[]>([]);
  const [depositReturnPhotos, setDepositReturnPhotos] = useState<{ file: File; preview: string }[]>([]);
  
  // Fixed to Kuala Lumpur timezone - not editable for consistency
  // This ensures all handover/return times are standardized
  const [actionTime] = useState(() => {
    // Use the timezone utility to get proper Malaysia time
    return getMalaysiaTime().toISOString();
  });
  const [invoiceLink, setInvoiceLink] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  
  // State for displaying invoice data in UI
  const [displayInvoiceData, setDisplayInvoiceData] = useState<any>(null);
  
  // Share modal state
  const [showEnhancedPaymentModal, setShowEnhancedPaymentModal] = useState(false);
  
  // Deposit collection state
  const [depositAmount, setDepositAmount] = useState<number>();
  const [showDepositCollection, setShowDepositCollection] = useState(false);
  
  // Deposit deduction state
  const [showDepositDeductionModal, setShowDepositDeductionModal] = useState(false);
  const [submittingDeductionRequest, setSubmittingDeductionRequest] = useState(false);
  const [adminDepositDeduction, setAdminDepositDeduction] = useState<number>();
  const [adminDeductionReason, setAdminDeductionReason] = useState<string>('');
  
  // Car mileage state for return modal
  const [currentMileage, setCurrentMileage] = useState<number>();
  
  // Check for pending deduction requests
  const [pendingDeductionRequests, setPendingDeductionRequests] = useState<any[]>([]);
  const [loadingDeductionRequests, setLoadingDeductionRequests] = useState(false);
  
  // Late fee payment URL state
  const [lateFeePaymentUrl, setLateFeePaymentUrl] = useState<string>('');
  
  // Late fee payment method state
  const [lateFeePaymentMethod, setLateFeePaymentMethod] = useState<string>('credit_debit_card');
  const [showLateFeePaymentMethod, setShowLateFeePaymentMethod] = useState(false);
  
  // Cash payment receipt upload state
  const [cashReceiptFile, setCashReceiptFile] = useState<File | null>(null);
  const [cashReceiptPreview, setCashReceiptPreview] = useState<string>('');
  const cashReceiptInputRef = useRef<HTMLInputElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const depositPhotoInputRef = useRef<HTMLInputElement>(null);
  const carPhotoInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, validateFile, uploading } = useCloudflareUpload();

  // Load pending deduction requests for return modal
  useEffect(() => {
    if (modalType === 'return' && !isClientView) {
      loadPendingDeductionRequests();
    }
  }, [modalType, selectedBooking.id, isClientView]);

  // Initialize form values
  useEffect(() => {
    setDepositAmount(selectedBooking.deposit_amount || undefined);
    setCurrentMileage(selectedBooking.car?.current_mileage || undefined);
    setAdminDepositDeduction(undefined);
  }, [selectedBooking]);

  const loadPendingDeductionRequests = async () => {
    try {
      setLoadingDeductionRequests(true);
      const { data, error } = await supabase
        .from('deposit_deduction_requests')
        .select(`
          *,
          requested_by:users!deposit_deduction_requests_requested_by_fkey(name),
          approved_by:users!deposit_deduction_requests_approved_by_fkey(name)
        `)
        .eq('booking_id', selectedBooking.id)
        .eq('status', 'pending');

      if (error) throw error;
      setPendingDeductionRequests(data || []);
    } catch (error) {
      console.error('Error loading deduction requests:', error);
    } finally {
      setLoadingDeductionRequests(false);
    }
  };

  // Check if deposit already exists and determine if deposit collection should be shown
  useEffect(() => {
    if (modalType === 'handover') {
      // ALWAYS show deposit section for ALL handovers - staff should be able to collect deposit for any booking
      // This ensures consistent behavior regardless of booking origin (staff, client, or admin forwarded)
      const shouldShowDeposit = true;
      
      setShowDepositCollection(shouldShowDeposit);
    }
  }, [modalType, selectedBooking]);

  // Get current Kuala Lumpur time for display
  const getCurrentKLTime = () => {
    return formatMalaysiaDateTime(getMalaysiaTime(), {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Calculate overdue info for returns - works regardless of which staff processes it
  const calculateOverdueInfo = () => {
    if (modalType !== 'return' || !selectedBooking.handover_time || !selectedBooking.end_date) {
      return { isOverdue: false, hoursOverdue: 0, lateFee: 0 };
    }

    const returnTime = new Date(actionTime);
    
    // Use the current end_date from booking (which includes any extensions)
    const endDate = new Date(selectedBooking.end_date + 'T23:59:59.999Z'); // End of day
    const expectedReturn = new Date(endDate);
    
    const diffMs = returnTime.getTime() - expectedReturn.getTime();
    const hoursOverdue = Math.max(0, diffMs / (1000 * 60 * 60));
    const isOverdue = hoursOverdue >= 1; // Mark as overdue if 1 hour or more
    const dailyRate = selectedBooking.rental_amount / selectedBooking.total_days;
    const lateFee = isOverdue ? hoursOverdue * dailyRate * 0.1 : 0;
    
    return { isOverdue, hoursOverdue, lateFee, expectedReturn };
  };

  const overdueInfo = calculateOverdueInfo();

  // Generate ONLY late fee invoice when modal opens for overdue returns
  // This works for any staff member processing the return
  useEffect(() => {
    // Late fee invoice is now handled within the return invoice generator
    // No separate late fee invoice generation needed
  }, [modalType, overdueInfo.isOverdue, overdueInfo.lateFee, selectedBooking.id, actionTime]);

  // Calculate deposit information
  const depositCollected = selectedBooking.deposit_amount || 0;
  const depositAlreadyDeducted = selectedBooking.deposit_deducted || 0;
  const remainingDeposit = depositCollected - depositAlreadyDeducted;

  // Handle deposit deduction request (for staff)
  const handleDepositDeductionRequest = async (deductionData: {
    requestedAmount: number;
    reason: string;
    damageDescription?: string;
    evidencePhotos: string[];
  }) => {
    try {
      setSubmittingDeductionRequest(true);
      
      const { error } = await supabase
        .from('deposit_deduction_requests')
        .insert({
          booking_id: selectedBooking.id,
          requested_by: user?.id,
          requested_amount: deductionData.requestedAmount,
          reason: deductionData.reason,
          damage_description: deductionData.damageDescription,
          evidence_photos: deductionData.evidencePhotos
        });

      if (error) throw error;

      toast.success('Deposit deduction request submitted for admin approval');
      setShowDepositDeductionModal(false);
      
      // Immediately reload pending deduction requests to reflect the new request
      await loadPendingDeductionRequests();
    } catch (error) {
      console.error('Error submitting deposit deduction request:', error);
      toast.error('Failed to submit deposit deduction request');
    } finally {
      setSubmittingDeductionRequest(false);
    }
  };

  // Handle admin direct deposit deduction
  const handleAdminDepositDeduction = async () => {
    if (!isAdmin) return;
    
    if (adminDepositDeduction <= 0 || adminDepositDeduction > remainingDeposit) {
      toast.error('Invalid deduction amount');
      return;
    }
    
    if (!adminDeductionReason.trim()) {
      toast.error('Please provide a reason for the deduction');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          deposit_deducted: depositAlreadyDeducted + adminDepositDeduction,
          deposit_deduction_reason: adminDeductionReason.trim(),
          deposit_deducted_at: new Date().toISOString(),
          deposit_deducted_by: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      toast.success(`Deposit deduction of RM ${adminDepositDeduction} applied successfully`);
      
      // Reset admin deduction form
      setAdminDepositDeduction(undefined);
      setAdminDeductionReason('');
      
      // Update local booking data
      selectedBooking.deposit_deducted = depositAlreadyDeducted + adminDepositDeduction;
      selectedBooking.deposit_deduction_reason = adminDeductionReason.trim();
    } catch (error) {
      console.error('Error applying deposit deduction:', error);
      toast.error('Failed to apply deposit deduction');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        validateFile(file, { maxSize: 5, allowedTypes });
        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Invalid file type');
      }
    }
  };

  // Handle multiple photo uploads for return process
  const handleDepositPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const totalPhotos = depositReturnPhotos.length + files.length;
    if (totalPhotos > 10) {
      toast.error('Maximum 10 photos allowed for deposit return proof');
      return;
    }

    const newPhotos: { file: File; preview: string }[] = [];
    files.forEach(file => {
      try {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        validateFile(file, { maxSize: 5, allowedTypes });
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview });
      } catch (error) {
        toast.error(`Invalid file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    setDepositReturnPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleCarPhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const currentCarPhotos = returnPhotos.filter(p => p.type === 'car').length;
    const totalPhotos = currentCarPhotos + files.length;
    if (totalPhotos > 10) {
      toast.error('Maximum 10 photos allowed for car return proof');
      return;
    }

    const newPhotos: { file: File; preview: string; type: 'deposit' | 'car' }[] = [];
    files.forEach(file => {
      try {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        validateFile(file, { maxSize: 5, allowedTypes });
        const preview = URL.createObjectURL(file);
        newPhotos.push({ file, preview, type: 'car' });
      } catch (error) {
        toast.error(`Invalid file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    setReturnPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleCashReceiptSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        validateFile(file, { maxSize: 5, allowedTypes });
        setCashReceiptFile(file);
        const url = URL.createObjectURL(file);
        setCashReceiptPreview(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Invalid file type');
      }
    }
  };

  // Generate late fee payment URL when there's a late fee
  useEffect(() => {
    if (modalType === 'return' && overdueInfo.isOverdue && overdueInfo.lateFee > 0) {
      // Show payment method selection for late fees
      setShowLateFeePaymentMethod(true);
    }
  }, [modalType, overdueInfo.isOverdue, overdueInfo.lateFee]);

  const removeDepositPhoto = (index: number) => {
    setDepositReturnPhotos(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleConfirm = async () => {
    // Validation for handover
    if (modalType === 'handover') {
      if (!selectedFile) {
        toast.error('Please select a photo first');
        return;
      }
    }
    
    // Validation for return
    if (modalType === 'return') {
      // Check for pending deduction requests (only for non-admin users)
      if (!isAdmin && pendingDeductionRequests.length > 0) {
        toast.error('Cannot process return while deposit deduction requests are pending admin approval');
        return;
      }
      
      // For return, we need at least the main photo (selectedFile)
      if (!selectedFile) {
        toast.error('Please select a return photo first');
        return;
      }
      
      // If deposit exists, require deposit return photos
      if (remainingDeposit > 0 && depositReturnPhotos.length === 0) {
        toast.error('Deposit return proof photos are required when returning deposit');
        return;
      }
      
      // Validate current mileage
      if (currentMileage === undefined || currentMileage <= 0) {
        toast.error('Please enter the current car mileage');
        return;
      }
      
      if (currentMileage < (selectedBooking.car?.current_mileage || 0)) {
        toast.error('Current mileage cannot be less than the previous mileage');
        return;
      }
      
      // Validate cash receipt if cash payment method is selected for late fee
      if (overdueInfo.isOverdue && overdueInfo.lateFee > 0 && lateFeePaymentMethod === 'cash' && !cashReceiptFile) {
        toast.error('Please upload cash payment receipt for late fee');
        return;
      }
    }
    
    if (!actionTime) {
      toast.error('Please select the action time');
      return;
    }

    try {
      let mainPhotoUrl = '';
      let depositReturnProofUrls: string[] = [];
      let cashReceiptUrl = '';
      
      // Upload main photo for handover
      if (modalType === 'handover' && selectedFile) {
        const result = await uploadFile(
          selectedFile,
          `${modalType}_${selectedBooking.id}`,
          { folder: 'handovers' }
        );
        mainPhotoUrl = result.publicUrl;
      }
      
      // Upload main photo for return
      if (modalType === 'return') {
        if (selectedFile) {
          const result = await uploadFile(
            selectedFile,
            `return_${selectedBooking.id}`,
            { folder: 'returns' }
          );
          mainPhotoUrl = result.publicUrl;
        }
        
        // Upload deposit return proof photos
        if (depositReturnPhotos.length > 0) {
          const depositUploads = await Promise.all(
            depositReturnPhotos.map((photo, index) =>
              uploadFile(
                photo.file,
                `deposit_return_${selectedBooking.id}_${index}`,
                { folder: 'deposit_returns' }
              )
            )
          );
          depositReturnProofUrls = depositUploads.map(upload => upload.publicUrl);
        }
        
        // Upload cash receipt if cash payment method is selected
        if (overdueInfo.isOverdue && overdueInfo.lateFee > 0 && lateFeePaymentMethod === 'cash' && cashReceiptFile) {
          const result = await uploadFile(
            cashReceiptFile,
            `cash_receipt_${selectedBooking.id}`,
            { folder: 'cash_receipts' }
          );
          cashReceiptUrl = result.publicUrl;
        }
      }
      
      // Generate handover/return invoice
      let invoiceData = null;
      try {
        if (modalType === 'handover') {
          // Generate handover invoice
          const handoverInvoiceResult = await HandoverReturnInvoiceGenerator.generateHandoverInvoice({
            booking: {
              id: selectedBooking.id,
              booking_number: selectedBooking.booking_number,
              customer: selectedBooking.customer,
              car: selectedBooking.car,
              total_days: selectedBooking.total_days,
              rental_amount: selectedBooking.rental_amount,
              start_date: selectedBooking.start_date,
              end_date: selectedBooking.end_date
            },
            handover: {
              handover_time: actionTime,
              deposit_amount: depositAmount > 0 ? depositAmount : undefined,
              proof_photo_urls: [mainPhotoUrl],
              staff_name: user?.name || 'Staff'
            }
          }, user?.id || '');
          
          invoiceData = {
            invoiceUrl: handoverInvoiceResult.previewUrl,
            invoiceNumber: handoverInvoiceResult.invoiceNumber,
            type: 'handover'
          };
        } else if (modalType === 'return') {
          // Generate return invoice
          const returnInvoiceResult = await HandoverReturnInvoiceGenerator.generateReturnInvoice({
            booking: {
              id: selectedBooking.id,
              booking_number: selectedBooking.booking_number,
              customer: selectedBooking.customer,
              car: selectedBooking.car,
              total_days: selectedBooking.total_days,
              rental_amount: selectedBooking.rental_amount,
              start_date: selectedBooking.start_date,
              end_date: selectedBooking.end_date,
              handover_time: selectedBooking.handover_time,
              handover_photo_url: selectedBooking.handover_photo_url
            },
            return: {
              return_time: actionTime,
              deposit_returned: remainingDeposit > 0 ? remainingDeposit : undefined,
              late_fee: overdueInfo.lateFee > 0 ? overdueInfo.lateFee : undefined,
              proof_photo_urls: [mainPhotoUrl],
              deposit_return_proof_urls: depositReturnProofUrls,
              car_return_proof_urls: [mainPhotoUrl], // Use main photo as car return proof
              staff_name: user?.name || 'Staff',
              current_mileage: currentMileage
            }
          }, user?.id || '');
          
          invoiceData = {
            invoiceUrl: returnInvoiceResult.previewUrl,
            invoiceNumber: returnInvoiceResult.invoiceNumber,
            type: 'return'
          };
        }
      } catch (invoiceError) {
        console.error('Error generating invoice:', invoiceError);
        // Continue without invoice - don't block the main process
      }
      
      // Prepare invoice data for late fee returns
      let lateFeeInvoiceData = null;
      if (modalType === 'return' && overdueInfo.isOverdue && overdueInfo.lateFee > 0) {
        lateFeeInvoiceData = {
          invoiceUrl: invoiceLink,
          invoiceNumber: invoiceNumber
        };
      }
      
      // Prepare deposit data for handover
      let depositData = null;
      if (modalType === 'handover' && depositAmount && depositAmount > 0) {
        depositData = {
          amount: depositAmount,
          collectedBy: user?.id,
          collectedAt: actionTime
        };
      }
      
      // Prepare return data with photo arrays
      let returnData = null;
      if (modalType === 'return') {
        returnData = {
          depositReturnProofUrls,
          carReturnProofUrls: [mainPhotoUrl], // Use main photo as car return proof
          depositStatus: remainingDeposit > 0 ? 'returned' : 'pending',
          depositReturnedAt: remainingDeposit > 0 ? actionTime : null,
          depositReturnedBy: remainingDeposit > 0 ? user?.id : null
        };
      }
      
      // Create payment record for late fee if applicable
      if (modalType === 'return' && overdueInfo.isOverdue && overdueInfo.lateFee > 0) {
        try {
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: selectedBooking.id,
              amount: overdueInfo.lateFee,
              payment_method_code: lateFeePaymentMethod.toUpperCase(),
              admin_approval_status: 'pending',
              payment_completion_status: 'pending',
              receipt_url: cashReceiptUrl || null,
              car_name: selectedBooking.car?.brand + ' ' + selectedBooking.car?.make,
              car_plate_number: selectedBooking.car?.plate_number,
              is_agent_booking: selectedBooking.is_agent_booking || false,
              notes: `Late fee payment for ${Math.ceil(overdueInfo.hoursOverdue)} hours overdue return. Payment method: ${lateFeePaymentMethod}${cashReceiptUrl ? '. Cash receipt uploaded.' : ''}. Generated during vehicle return process.`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (paymentError) {
            console.error('Error creating late fee payment record:', paymentError);
            // Don't throw error - continue with return process but log the issue
            toast.error('Late fee recorded but payment record creation failed');
          } else {
            console.log('Late fee payment record created successfully');
            
            // Generate payment URL based on selected method
            let generatedPaymentUrl = '';
            if (lateFeePaymentMethod === 'cash') {
              // For cash payments, no payment URL needed as receipt is uploaded
              generatedPaymentUrl = '';
            } else if (lateFeePaymentMethod === 'qr_code') {
              // For QR payments, direct to QR payment page
              generatedPaymentUrl = `${window.location.origin}/staff/qr-payment/${selectedBooking.id}`;
            } else {
              // For other methods, this would be handled by Stripe webhooks or other payment processors
              generatedPaymentUrl = `${window.location.origin}/payment-pending/${selectedBooking.id}`;
            }
            
            // Update the payment record with the generated URL (only if not cash)
            if (generatedPaymentUrl) {
              const { error: updateError } = await supabase
                .from('payments')
                .update({
                  payment_url: generatedPaymentUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('booking_id', selectedBooking.id)
                .eq('payment_method_code', lateFeePaymentMethod.toUpperCase())
                .order('created_at', { ascending: false })
                .limit(1);

              if (!updateError) {
                setLateFeePaymentUrl(generatedPaymentUrl);
              }
            }
          }
        } catch (paymentCreationError) {
          console.error('Error creating late fee payment:', paymentCreationError);
          // Don't throw error - continue with return process
        }
      }
      
      // Update display invoice data state for UI rendering
      if (invoiceData) {
        setDisplayInvoiceData(invoiceData);
      }
      
      // Pass the selected payment method along with other data
      await onConfirm(
        mainPhotoUrl, 
        actionTime, 
        overdueInfo.lateFee, 
        null, // lateFeeInvoiceData - not used in this context
        depositData, 
        returnData, 
        currentMileage, 
        invoiceData,
        lateFeePaymentMethod // Add payment method to the callback
      );
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      
      // Clean up photo previews
      depositReturnPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
    } catch (error) {
      console.error(`Error uploading ${modalType} photo:`, error);
      toast.error(`Failed to upload ${modalType} photo`);
    }
  };

  const handleClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    depositReturnPhotos.forEach(photo => URL.revokeObjectURL(photo.preview));
    if (cashReceiptPreview) URL.revokeObjectURL(cashReceiptPreview);
    onClose();
  };

  const copyInvoiceLink = () => {
    if (invoiceLink) {
      navigator.clipboard.writeText(invoiceLink);
      toast.success('Invoice link copied to clipboard!');
    }
  };

  const openInvoiceLink = () => {
    if (invoiceLink) {
      window.open(invoiceLink, '_blank');
    }
  };

  // Get appropriate terminology based on view type (staff vs client)
  const getTerminology = () => {
    if (isClientView) {
      return {
        handover: {
          title: 'Vehicle Pickup Confirmation',
          action: 'Pickup',
          description: 'Confirm that you have received your rental vehicle',
          timeLabel: 'Pickup Time',
          buttonText: 'Confirm Pickup'
        },
        return: {
          title: 'Vehicle Drop-off Confirmation', 
          action: 'Drop-off',
          description: 'Confirm that you are returning your rental vehicle',
          timeLabel: 'Drop-off Time',
          buttonText: 'Confirm Drop-off'
        }
      };
    } else {
      return {
        handover: {
          title: 'Vehicle Handover Verification',
          action: 'Handover', 
          description: 'Verify vehicle handover to customer',
          timeLabel: 'Handover Time',
          buttonText: 'Confirm Handover'
        },
        return: {
          title: 'Vehicle Return Verification',
          action: 'Return',
          description: 'Verify vehicle return from customer', 
          timeLabel: 'Return Time',
          buttonText: 'Confirm Return'
        }
      };
    }
  };

  const terminology = getTerminology();
  const currentTerms = terminology[modalType];

  // Get the current website URL for invoice links
  const getCurrentWebsiteUrl = () => {
    return window.location.origin;
  };
  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl max-h-[85vh] sm:max-h-[80vh] md:max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">
            {currentTerms.title}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Booking Info */}
            <Card className="bg-gray-50 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Booking:</span>
                  <p className="font-medium">#{selectedBooking.booking_number}</p>
                </div>
                <div>
                  <span className="text-gray-600">{isClientView ? 'Your Name' : 'Customer'}:</span>
                  <p className="font-medium">{selectedBooking.customer?.name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">{selectedBooking.car?.brand} {selectedBooking.car?.make}</p>
                </div>
                <div>
                  <span className="text-gray-600">Rental Period:</span>
                  <p className="font-medium">{selectedBooking.total_days} days</p>
                </div>
              </div>
            </Card>

            {/* Fixed Action Time Display */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {currentTerms.timeLabel} (Kuala Lumpur Time)
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 min-h-[44px] flex items-center">
                <Clock className="w-4 h-4 text-gray-500 mr-2" />
                <span className="text-gray-900 font-medium">{getCurrentKLTime()}</span>
              </div>
              <p className="text-xs text-gray-500">
                Time is automatically set to current Kuala Lumpur time and cannot be modified.
              </p>
            </div>

            {/* Overdue Warning and Invoice Link for Returns */}
            {modalType === 'return' && overdueInfo.isOverdue && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <h4 className="text-red-800 font-medium">Late Return Detected</h4>
                    <p className="text-red-700 text-sm">
                      Vehicle is {Math.ceil(overdueInfo.hoursOverdue)} hours overdue.
                      Late fee: RM {overdueInfo.lateFee.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Late Fee Payment Method Selection */}
                {showLateFeePaymentMethod && (
                  <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg">
                    <LateFeePaymentMethodForm
                      selectedMethod={lateFeePaymentMethod}
                      onMethodChange={setLateFeePaymentMethod}
                      lateFeeAmount={overdueInfo.lateFee}
                    />
                    
                    {/* Cash Receipt Upload Section */}
                    {lateFeePaymentMethod === 'cash' && (
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Upload Cash Payment Receipt <span className="text-red-500">*</span>
                        </label>
                        
                        {cashReceiptPreview ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <img 
                                src={cashReceiptPreview} 
                                alt="Cash receipt preview" 
                                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setCashReceiptFile(null);
                                  setCashReceiptPreview('');
                                  if (cashReceiptInputRef.current) cashReceiptInputRef.current.value = '';
                                }}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <input
                              ref={cashReceiptInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleCashReceiptSelect}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => cashReceiptInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors min-h-[120px] flex flex-col items-center justify-center"
                            >
                              <Camera className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-gray-600">Click to upload cash receipt</p>
                              <p className="text-gray-500 text-sm">JPG, PNG up to 5MB</p>
                            </button>
                          </div>
                        )}
                        
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <p className="text-orange-800 text-sm">
                            <strong>Cash Payment:</strong> Upload a clear photo of the cash payment receipt. 
                            This will be submitted for admin verification and approval.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Method Notice */}
                {lateFeePaymentMethod && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800">Payment Method Selected</span>
                    </div>
                    <p className="text-blue-700 text-sm">
                      {lateFeePaymentMethod === 'cash' ? 'Cash payment receipt will be uploaded and submitted for admin approval.' : `Late fee payment link will be generated for ${
                        lateFeePaymentMethod === 'online_banking' ? 'Online Banking (FPX)' :
                        lateFeePaymentMethod === 'credit_debit_card' ? 'Credit/Debit Card' :
                        lateFeePaymentMethod === 'qr_code' ? 'QR Code Payment' : 'selected payment method'} upon return confirmation.`}
                    </p>
                  </div>
                )}
                </div>
            )}

            {/* Deposit Collection Section - Only for Handover */}
            {modalType === 'handover' && (
              <Card className="bg-yellow-50 border border-yellow-200 p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Wallet className="w-5 h-5 text-yellow-600" />
                  <h4 className="text-yellow-800 font-medium">Deposit Collection</h4>
                </div>
                
                  <div className="space-y-3">
                    {selectedBooking.deposit_amount > 0 && selectedBooking.deposit_collected_at && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Existing Deposit</span>
                        </div>
                        <p className="text-blue-700 text-sm">
                          A deposit of RM {selectedBooking.deposit_amount} was previously collected. 
                          You can modify the amount below if needed.
                        </p>
                      </div>
                    )}
                    
                    <p className="text-yellow-700 text-sm">
                      Security deposits help protect against vehicle damage and ensure timely returns. 
                      You can collect a deposit during handover or modify an existing deposit amount.
                    </p>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-yellow-800">
                        Deposit Amount (Recommended: RM 200-500)
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-700">RM</span>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={depositAmount || ''}
                          onChange={(e) => setDepositAmount(Number(e.target.value))}
                          className="flex-1 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 min-h-[44px]"
                          placeholder="Enter deposit amount (e.g., 300)"
                        />
                      </div>
                      <p className="text-xs text-yellow-600">
                        Enter the security deposit amount to collect from the customer. Set to 0 if no deposit is required for this specific booking.
                      </p>
                    </div>
                    
                    {depositAmount && depositAmount > 0 && (
                      <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          <strong>Deposit Collection:</strong> RM {depositAmount} will be {selectedBooking.deposit_amount > 0 ? 'updated and' : ''} recorded as collected during this handover.
                          The deposit can be refunded or deducted upon vehicle return.
                        </p>
                      </div>
                    )}
                    
                    {(!depositAmount || depositAmount === 0) && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-700 text-sm">
                          <strong>No Deposit:</strong> No security deposit will be collected for this handover. 
                          You can still enter an amount above if needed.
                        </p>
                      </div>
                    )}
                  </div>
              </Card>
            )}

            {/* Deposit Information and Deduction Section - Only for Return */}
            {modalType === 'return' && (
              <Card className="bg-purple-50 border border-purple-200 p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <h4 className="text-purple-800 font-medium">Security Deposit</h4>
                </div>
                
                {depositCollected > 0 ? (
                  <>
                    {/* Deposit Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm mb-4">
                      <div>
                        <span className="text-purple-600">Collected:</span>
                        <p className="font-medium text-purple-800">RM {depositCollected}</p>
                      </div>
                      <div>
                        <span className="text-purple-600">Deducted:</span>
                        <p className="font-medium text-red-600">RM {depositAlreadyDeducted}</p>
                      </div>
                      <div>
                        <span className="text-purple-600">Remaining:</span>
                        <p className="font-medium text-green-600">RM {remainingDeposit}</p>
                      </div>
                    </div>

                    {/* Pending Deduction Requests Warning */}
                    {pendingDeductionRequests.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-red-800">Pending Deduction Requests</span>
                        </div>
                        <p className="text-red-700 text-sm mb-2">
                          <strong>Cannot process return:</strong> There are {pendingDeductionRequests.length} pending deposit deduction request(s) awaiting admin approval. 
                          The vehicle return cannot be processed until all deduction requests are approved or rejected by an admin.
                        </p>
                        {pendingDeductionRequests.map((request, index) => (
                          <div key={request.id} className="mt-2 p-2 bg-white border border-red-200 rounded text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-red-800">Request #{index + 1}</p>
                                <p className="text-red-700">Amount: RM {request.requested_amount}</p>
                                <p className="text-red-700">Reason: {request.reason}</p>
                                <p className="text-red-600 text-xs">
                                  Requested by: {request.requested_by?.name} on {new Date(request.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <p className="text-yellow-800">
                            <strong>Next Steps:</strong> Contact an admin to review and approve/reject these deduction requests before proceeding with the vehicle return.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Show existing deduction reason if any */}
                    {selectedBooking.deposit_deduction_reason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-red-800">Previous Deduction</span>
                        </div>
                        <p className="text-red-700 text-sm">{selectedBooking.deposit_deduction_reason}</p>
                      </div>
                    )}

                    {/* Deposit Deduction Actions */}
                    {remainingDeposit > 0 && !isClientView && pendingDeductionRequests.length === 0 && (
                      <div className="space-y-4">
                        <div className="border-t border-purple-200 pt-4">
                          <h5 className="text-purple-800 font-medium mb-3">Deposit Deduction</h5>
                          
                          {isAdmin ? (
                            // Admin can directly deduct
                            <div className="space-y-3">
                              <p className="text-purple-700 text-sm">
                                As an admin, you can directly deduct from the deposit if damage is found.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-sm font-medium text-purple-700 mb-1">
                                    Deduction Amount (RM)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={remainingDeposit}
                                    step="0.01"
                                    value={adminDepositDeduction || ''}
                                    onChange={(e) => setAdminDepositDeduction(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-purple-700 mb-1">
                                    Reason
                                  </label>
                                  <input
                                    type="text"
                                    value={adminDeductionReason}
                                    onChange={(e) => setAdminDeductionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[44px]"
                                    placeholder="e.g., Vehicle damage"
                                  />
                                </div>
                              </div>
                              
                              {adminDepositDeduction && adminDepositDeduction > 0 && adminDeductionReason.trim() && (
                                <Button
                                  onClick={handleAdminDepositDeduction}
                                  className="w-full bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                                >
                                  Deduct RM {adminDepositDeduction} from Deposit
                                </Button>
                              )}
                            </div>
                          ) : (
                            // Staff can only request deduction
                            <div className="space-y-3">
                              <p className="text-purple-700 text-sm">
                                If damage is found, you can request a deposit deduction for admin approval.
                              </p>
                              
                              <Button
                                onClick={() => setShowDepositDeductionModal(true)}
                                variant="secondary"
                                className="w-full flex items-center space-x-2 min-h-[44px]"
                              >
                                <FileText className="w-4 h-4" />
                                <span>Request Deposit Deduction</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-700 text-sm">
                      No deposit was collected for this booking.
                    </p>
                  </div>
                )}
              </Card>
            )}

            {/* Mileage Section - Only for Return */}
            {modalType === 'return' && (
              <Card className="bg-blue-50 border border-blue-200 p-3 sm:p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <Car className="w-5 h-5 text-blue-600" />
                  <h4 className="text-blue-800 font-medium">Vehicle Mileage Update</h4>
                </div>
                
                <div className="space-y-3">
                  <p className="text-blue-700 text-sm">
                    Please enter the current mileage reading from the vehicle's odometer. This will update the car's mileage record.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Previous Mileage
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg min-h-[44px] flex items-center">
                        <span className="text-gray-700 font-medium">
                          {(selectedBooking.car?.current_mileage || 0).toLocaleString()} km
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-700 mb-1">
                        Current Mileage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={selectedBooking.car?.current_mileage || 0}
                        value={currentMileage || ''}
                        onChange={(e) => setCurrentMileage(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
                        placeholder="Enter current mileage"
                      />
                    </div>
                  </div>
                  
                  {currentMileage && currentMileage > 0 && currentMileage >= (selectedBooking.car?.current_mileage || 0) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 text-sm">
                        <strong>Mileage Update:</strong> Vehicle mileage will be updated from {(selectedBooking.car?.current_mileage || 0).toLocaleString()} km to {currentMileage.toLocaleString()} km 
                        ({(currentMileage - (selectedBooking.car?.current_mileage || 0)).toLocaleString()} km driven during rental).
                      </p>
                    </div>
                  )}
                  
                  {currentMileage && currentMileage > 0 && currentMileage < (selectedBooking.car?.current_mileage || 0) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">
                        <strong>Invalid Mileage:</strong> Current mileage cannot be less than the previous mileage of {(selectedBooking.car?.current_mileage || 0).toLocaleString()} km.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Client Request Notice */}
            {isClientView && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                  <h4 className="text-blue-800 font-medium">Approval Required</h4>
                </div>
                <p className="text-blue-700 text-sm">
                  Your {modalType === 'handover' ? 'pickup' : 'drop-off'} request will be submitted for staff approval. 
                  You will be notified once it has been reviewed and {modalType === 'handover' ? 'confirmed' : 'processed'}.
                </p>
              </div>
            )}

            {/* Photo Upload Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Upload {modalType === 'handover' ? 'Handover' : 'Return'} Photo <span className="text-red-500">*</span>
              </label>
              
              {previewUrl ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl('');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors min-h-[120px] flex flex-col items-center justify-center"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-600">Click to take or select photo</p>
                    <p className="text-gray-500 text-sm">JPG, PNG up to 5MB</p>
                  </button>
                </div>
              )}
            </div>

            {/* Deposit Return Photos - Only for return if deposit exists */}
            {modalType === 'return' && remainingDeposit > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Deposit Return Proof Photos <span className="text-red-500">*</span>
                  <span className="text-gray-500 text-sm ml-2">(At least 1 required, max 10)</span>
                </label>
                
                {depositReturnPhotos.length > 0 ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img 
                        src={depositReturnPhotos[0].preview} 
                        alt="Deposit return preview" 
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDepositReturnPhotos([]);
                          if (depositPhotoInputRef.current) depositPhotoInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 min-h-[32px] min-w-[32px] flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {depositReturnPhotos.length > 1 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {depositReturnPhotos.slice(1).map((photo, index) => (
                          <div key={index + 1} className="relative">
                        <img 
                          src={photo.preview} 
                              alt={`Deposit return ${index + 2}`} 
                          className="w-full h-24 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                              onClick={() => removeDepositPhoto(index + 1)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 min-h-[24px] min-w-[24px] flex items-center justify-center"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                    )}
                  </div>
                ) : (
                
                <div>
                  <input
                    ref={depositPhotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleDepositPhotoSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => depositPhotoInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors min-h-[120px] flex flex-col items-center justify-center"
                  >
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-gray-600">Click to take or select deposit return photos</p>
                    <p className="text-gray-500 text-sm">JPG, PNG up to 5MB each</p>
                  </button>
                </div>
                )}
              </div>
            )}

            </div>
        </div>
        
        {/* Modal Footer */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={uploading || processing}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={
                uploading || 
                !selectedFile ||
                (modalType === 'return' && (
                  (remainingDeposit > 0 && depositReturnPhotos.length === 0) ||
                  (!isAdmin && pendingDeductionRequests.length > 0) ||
                  currentMileage === undefined || currentMileage <= 0 ||
                  (currentMileage && currentMileage < (selectedBooking.car?.current_mileage || 0)) ||
                  (overdueInfo.isOverdue && overdueInfo.lateFee > 0 && lateFeePaymentMethod === 'cash' && !cashReceiptFile)
                ))
              }
              className="w-full sm:w-auto min-h-[44px]"
            >
              {uploading || processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{uploading ? 'Uploading...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{currentTerms.buttonText}</span>
                </>
              )}
            </Button>
          </div>
        </div>
          
      {/* Success Message with Invoice Link */}
        {displayInvoiceData && (
          <div className="absolute bottom-24 left-4 right-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg">
            {/* Share Button for Return Invoices */}
            {modalType === 'return' && (
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-800">Return Invoice Generated</span>
                  </div>
                </div>
                <Button onClick={() => setShowEnhancedPaymentModal(true)} variant="secondary" size="sm" className="flex items-center space-x-2">
                  <Share2 className="w-4 h-4" />
                  <span>Share with Customer</span>
                </Button>
              </div>
            )}
            {modalType === 'handover' && (
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold text-green-800">
                {modalType === 'handover' ? 'Handover' : 'Return'} Invoice Generated
              </span>
            </div>
            )}
            <p className="text-green-700 text-sm mb-3">
              Invoice #{displayInvoiceData.invoiceNumber} has been generated with photo verification.
            </p>
            <Button
              onClick={() => window.open(`${getCurrentWebsiteUrl()}${displayInvoiceData.invoiceUrl}`, '_blank')}
              variant="secondary"
              size="sm"
              className="flex items-center space-x-2"
            >
              <Eye className="w-4 h-4" />
              <span>View Invoice</span>
            </Button>
          </div>
        )}
        
        {/* Additional warning for pending requests */}
        {modalType === 'return' && !isAdmin && pendingDeductionRequests.length > 0 && (
          <div className="absolute bottom-24 left-4 right-4 p-3 bg-red-100 border border-red-300 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-red-800">Return Blocked</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              This vehicle cannot be returned until all pending deposit deduction requests are resolved by an admin. 
              The return button is disabled for safety and data integrity.
            </p>
          </div>
        )}
        
        {/* Admin Override Notice */}
        {isAdmin && pendingDeductionRequests.length > 0 && (
          <div className="absolute bottom-24 left-4 right-4 p-3 bg-purple-50 border border-purple-200 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-purple-800">Admin Override</span>
            </div>
            <p className="text-purple-700 text-sm">
              As an admin, you can process this return despite pending deduction requests. The requests will remain pending for your review.
            </p>
          </div>
        )}
      </motion.div>
    </div>

    {/* Deposit Deduction Modal for Staff */}
    {showDepositDeductionModal && (
      <DepositDeductionModal
        isOpen={showDepositDeductionModal}
        onClose={() => setShowDepositDeductionModal(false)}
        booking={selectedBooking}
        onSubmit={handleDepositDeductionRequest}
        submitting={submittingDeductionRequest}
      />
    )}
    
    {/* Share Return Details Modal */}
    {showEnhancedPaymentModal && modalType === 'return' && displayInvoiceData && (
      <EnhancedCombinedPaymentInvoiceModal
        isOpen={showEnhancedPaymentModal}
        onClose={() => setShowEnhancedPaymentModal(false)}
        bookingData={{
          id: selectedBooking.id,
          booking_number: `${selectedBooking.booking_number} (Late Fee)`,
          customer: selectedBooking.customer,
          car: selectedBooking.car || { brand: selectedBooking.car_name || 'Unknown', make: '' },
          total_days: selectedBooking.total_days,
          total_amount: overdueInfo.lateFee
        }}
        paymentMethod={lateFeePaymentMethod}
        invoiceData={{
          invoiceId: displayInvoiceData.invoiceUrl.split('/').pop() || '',
          invoiceNumber: displayInvoiceData.invoiceNumber,
          previewUrl: displayInvoiceData.invoiceUrl,
          customerEmail: selectedBooking.customer?.email || '',
          customerName: selectedBooking.customer?.name || '',
          totalAmount: overdueInfo.lateFee
        }}
      />
    )}
    </>
  );
};

export default HandoverReturnModal;