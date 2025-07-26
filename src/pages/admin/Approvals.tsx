import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, Users, AlertTriangle, History, RefreshCw, Plus, ArrowRight, Shield } from 'lucide-react';
import ApprovalTabs from '../../components/admin/approvals/ApprovalTabs';
import EnhancedUserApprovalCard from '../../components/admin/approvals/EnhancedUserApprovalCard';
import UserDetailsModal from '../../components/admin/approvals/UserDetailsModal';
import BookingApprovalCard from '../../components/admin/approvals/BookingApprovalCard';
import PaymentApprovalCard from '../../components/admin/approvals/PaymentApprovalCard';
import CancellationApprovalCard from '../../components/admin/approvals/CancellationApprovalCard';
import DepositDeductionApprovalCard from '../../components/admin/approvals/DepositDeductionApprovalCard';
import ApprovalHistoryTable from '../../components/admin/approvals/ApprovalHistoryTable';
import UserRejectionModal from '../../components/admin/approvals/UserRejectionModal';
import EmptyApprovalState from '../../components/admin/approvals/EmptyApprovalState';
import StaffForwardingModal from '../../components/admin/approvals/StaffForwardingModal';
import PaymentRefundModal from '../../components/modals/PaymentRefundModal';
import Button from '../../components/ui/Button';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface HistoryItem {
  type: string;
  id: string;
  title: string;
  customer?: string;
  staff?: string;
  amount: string;
  date: string;
  status: string;
  action?: string;
}

const AdminApprovals: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'bookings' | 'payments' | 'cancellations' | 'extensions' | 'deposits' | 'history'>('users');
  const { fetchUsers, fetchBookings, fetchPayments, loading, setLoading } = useSupabaseData();
  const { user } = useAuth();
  
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<any[]>([]);
  const [extensionRequests, setExtensionRequests] = useState<any[]>([]);
  const [depositDeductionRequests, setDepositDeductionRequests] = useState<any[]>([]);
  const [groupedPayments, setGroupedPayments] = useState<any[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // User details modal state
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingUser, setRejectingUser] = useState<any>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Staff forwarding modal state
  const [showForwardingModal, setShowForwardingModal] = useState(false);
  const [forwardingBooking, setForwardingBooking] = useState<any>(null);
  const [isForwarding, setIsForwarding] = useState(false);
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundingPayment, setRefundingPayment] = useState<any>(null);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      
      // Batch API calls for better performance
      const [{ data: users }, { data: bookings }, { data: payments }, cancellations, extensions, depositDeductions] = await Promise.all([
        fetchUsers(),
        fetchBookings(),
        fetchPayments(),
        supabase
          .from('cancellation_requests')
          .select(`
            *,
            booking:booking_id(
              id,
              booking_number,
              booking_status,
              payment_status,
              customer:customer_id(id, name, email),
              car:car_id(id, brand, make)
            ),
            staff:staff_id(id, name, email)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('booking_extensions')
          .select(`
            *,
            booking:booking_id(
              id,
              booking_number,
              booking_status,
              payment_status,
              customer:customer_id(id, name, email),
              car:car_id(id, brand, make)
            ),
            created_by_user:created_by(id, name, email, role)
          `)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('deposit_deduction_requests')
          .select(`
            *,
            booking:booking_id(
              id,
              booking_number,
              booking_status,
              payment_status,
              deposit_amount,
              deposit_deducted,
              customer:customer_id(id, name, email),
              car:car_id(id, brand, make, plate_number)
            ),
            requested_by_user:requested_by(id, name, email, role)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ]);

      // Also fetch booking extensions for grouping with payments
      const { data: allExtensions } = await supabase
        .from('booking_extensions')
        .select(`
            *,
            booking:booking_id(
              id,
              booking_number,
              booking_status,
              payment_status,
              customer:customer_id(id, name, email),
              car:car_id(id, brand, make)
            ),
            created_by_user:created_by(id, name, email, role)
          `)
          .order('created_at', { ascending: false });

      // Filter pending users (using registration_status)
      const unapprovedUsers = users.filter(user => 
        user.registration_status === 'pending' || (!user.approved && user.registration_status !== 'rejected')
      );
      setPendingUsers(unapprovedUsers);

      // Filter pending bookings (booking_status = pending_approval)
      const unapprovedBookings = bookings.filter(booking => 
        booking.booking_status === 'pending_approval' && 
        booking.payment_status !== 'cancelled' &&
        booking.payment_status !== 'rejected' &&
        booking.booking_status !== 'cancelled'
      );
      setPendingBookings(unapprovedBookings);

      // Group payments with extensions for the same booking
      const allPendingPayments = payments.filter(payment => {
        // Don't show cancelled payments in approvals
        if (payment.admin_approval_status === 'cancelled' || 
            payment.payment_completion_status === 'cancelled') {
          return false;
        }
        
        // Don't show rejected payments in approvals
        if (payment.admin_approval_status === 'rejected') {
          return false;
        }
        
        // Don't show payments for cancelled bookings
        if (payment.booking?.booking_status === 'cancelled' || 
            payment.booking?.payment_status === 'cancelled') {
          return false;
        }
        
        // Don't show payments for rejected bookings
        if (payment.booking?.payment_status === 'rejected') {
          return false;
        }
        
        // Show payments that are pending admin approval
        const isPendingApproval = payment.admin_approval_status === 'pending' || payment.admin_approval_status === null;
        
        // Also show payments that have been completed via Stripe but not yet approved by admin
        const isCompletedButNotApproved = payment.payment_completion_status === 'completed' && 
                                         payment.admin_approval_status !== 'approved';
        
        // Show payments that are not yet approved by admin (regardless of completion status)
        const isNotApproved = payment.approved === false || payment.approved === null;
        
        return isPendingApproval || isCompletedButNotApproved || isNotApproved;
      });
      
      // Group payments with their extensions based on completion status
      const groupedPaymentData = [];
      
      for (const payment of allPendingPayments) {
        // Find extensions for this booking
        const bookingExtensions = (allExtensions || []).filter(ext => 
          ext.booking_id === payment.booking_id
        );
        
        // Check if main payment is already approved/paid
        const mainPaymentPaid = payment.admin_approval_status === 'approved' || 
                               payment.payment_completion_status === 'completed';
        
        // Get pending extensions (not paid)
        const pendingExtensions = bookingExtensions.filter(ext => 
          ext.payment_status === 'pending'
        );
        
        // Get paid extensions
        const paidExtensions = bookingExtensions.filter(ext => 
          ext.payment_status === 'paid'
        );
        
        // Logic for what to display:
        // 1. If main payment is pending and no extensions are paid -> show main payment with pending extensions
        // 2. If main payment is pending and some extensions are paid -> show only main payment
        // 3. If main payment is paid and extensions are pending -> show only pending extensions
        // 4. If both main payment and extensions are paid -> don't show anything
        
        if (!mainPaymentPaid && paidExtensions.length === 0) {
          // Case 1: Main payment pending, no paid extensions -> show main payment with pending extensions
          const extensionAmount = pendingExtensions.reduce((sum, ext) => sum + parseFloat(ext.extension_amount || 0), 0);
          const totalAmount = parseFloat(payment.amount) + extensionAmount;
          
          groupedPaymentData.push({
            ...payment,
            extensions: pendingExtensions,
            total_amount_with_extensions: totalAmount,
            has_pending_extensions: pendingExtensions.length > 0,
            extension_count: pendingExtensions.length,
            extension_amount: extensionAmount,
            payment_type: 'main_with_extensions'
          });
        } else if (!mainPaymentPaid && paidExtensions.length > 0) {
          // Case 2: Main payment pending, some extensions paid -> show only main payment
          groupedPaymentData.push({
            ...payment,
            extensions: [],
            total_amount_with_extensions: parseFloat(payment.amount),
            has_pending_extensions: false,
            extension_count: 0,
            extension_amount: 0,
            payment_type: 'main_only'
          });
        } else if (mainPaymentPaid && pendingExtensions.length > 0) {
          // Case 3: Main payment paid, extensions pending -> show only pending extensions
          for (const extension of pendingExtensions) {
            groupedPaymentData.push({
              id: `ext_${extension.id}`,
              booking_id: extension.booking_id,
              booking: payment.booking,
              amount: extension.extension_amount,
              payment_method_code: 'EXTENSION',
              admin_approval_status: 'pending',
              payment_completion_status: 'pending',
              approved: false,
              car_name: payment.car_name,
              car_plate_number: payment.car_plate_number,
              is_agent_booking: payment.is_agent_booking,
              custom_price_requested: payment.custom_price_requested,
              agent_notes: payment.agent_notes,
              created_at: extension.created_at,
              updated_at: extension.updated_at,
              extensions: [extension],
              total_amount_with_extensions: parseFloat(extension.extension_amount),
              has_pending_extensions: true,
              extension_count: 1,
              extension_amount: parseFloat(extension.extension_amount),
              payment_type: 'extension_only',
              extension_data: extension
            });
          }
        }
        // Case 4: Both paid -> don't add anything to groupedPaymentData
      }
      
      // Sort by total amount (main payment + extensions) descending
      groupedPaymentData.sort((a, b) => b.total_amount_with_extensions - a.total_amount_with_extensions);
      
      setGroupedPayments(groupedPaymentData);
      setPendingPayments(groupedPaymentData);

      // Filter extension requests that don't have associated pending payments
      const extensionsWithoutPayments = extensions.data?.filter(ext => {
        // Only show extensions that don't have a pending payment for the same booking
        const hasAssociatedPayment = allPendingPayments.some(payment => 
          payment.booking_id === ext.booking_id
        );
        return !hasAssociatedPayment && ext.payment_status === 'pending';
      }) || [];
      
      setExtensionRequests(extensionsWithoutPayments);

      // Handle deposit deduction requests
      if (depositDeductions.error) {
        console.error('Error fetching deposit deduction requests:', depositDeductions.error);
        setDepositDeductionRequests([]);
      } else {
        setDepositDeductionRequests(depositDeductions.data || []);
      }

      // Get approval history
      const processedBookings = bookings.filter(booking => 
        booking.booking_status === 'approved' || 
        booking.booking_status === 'cancelled' || 
        booking.payment_status === 'rejected'
      );
      const processedPayments = payments.filter(payment => 
        payment.admin_approval_status === 'approved' || 
        payment.admin_approval_status === 'cancelled' ||
        payment.admin_approval_status === 'rejected'
      );
      const approvedCancellations = cancellations.data?.filter(req => req.status === 'approved') || [];
      
      const history = [
        ...processedBookings.map(booking => {
          // Determine actual status from real data
          let actualStatus = 'approved';
          let actualAmount = booking.total_amount;
          
          if (booking.booking_status === 'cancelled') {
            actualStatus = 'cancelled';
            actualAmount = '0';
          } else if (booking.payment_status === 'rejected') {
            actualStatus = 'rejected';
            actualAmount = '0';
          }
          
          return {
            type: 'booking',
            id: booking.id,
            title: `Booking #${booking.booking_number}`,
            booking_number: booking.booking_number,
            customer: booking.customer?.name,
            customer_email: booking.customer?.email,
            customer_phone: booking.customer?.phone,
            staff: booking.staff?.name,
            staff_email: booking.staff?.email,
            amount: actualAmount,
            date: booking.updated_at,
            status: actualStatus,
            action: booking.booking_status === 'cancelled' ? 'cancelled' : 
                    booking.payment_status === 'rejected' ? 'rejected' : 'approved',
            car_brand: booking.car?.brand,
            car_make: booking.car?.make,
            car_plate: booking.car_plate_number || booking.car?.plate_number,
            start_date: booking.start_date,
            end_date: booking.end_date,
            total_days: booking.total_days,
            delivery_type: booking.delivery_type,
            notes: booking.notes
          };
        }),
        ...processedPayments.map(payment => {
          // Determine actual status from real data
          let actualStatus = 'approved';
          let actualAmount = payment.amount;
          
          if (payment.admin_approval_status === 'cancelled') {
            actualStatus = 'cancelled';
            actualAmount = '0';
          } else if (payment.admin_approval_status === 'rejected') {
            actualStatus = 'rejected';
            actualAmount = '0';
          }
          
          return {
            type: 'payment',
            id: payment.id,
            title: `Payment for #${payment.booking?.booking_number}`,
            booking_number: payment.booking?.booking_number,
            customer: payment.booking?.customer?.name,
            customer_email: payment.booking?.customer?.email,
            customer_phone: payment.booking?.customer?.phone,
            staff: payment.booking?.staff?.name,
            staff_email: payment.booking?.staff?.email,
            amount: actualAmount,
            date: payment.approved_at,
            status: actualStatus,
            action: actualStatus,
            car_brand: payment.car_name ? payment.car_name.split(' ')[0] : payment.booking?.car?.brand,
            car_make: payment.car_name ? payment.car_name.split(' ').slice(1).join(' ') : payment.booking?.car?.make,
            car_plate: payment.car_plate_number || payment.booking?.car?.plate_number,
            start_date: payment.booking?.start_date,
            end_date: payment.booking?.end_date,
            total_days: payment.booking?.total_days,
            payment_method: payment.payment_method_code,
            delivery_type: payment.booking?.delivery_type,
            notes: payment.notes
          };
        })
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setApprovalHistory(history);

      if (cancellations.error) throw cancellations.error;
      setCancellationRequests(cancellations.data || []);

    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Failed to load approval data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await loadApprovals();
      toast.success('Approvals data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleViewUserDetails = (user: any) => {
    setSelectedUser(user);
    setShowUserDetailsModal(true);
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
      // Force immediate refresh
      await loadApprovals();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = (user: any) => {
    setRejectingUser(user);
    setShowRejectModal(true);
  };

  const confirmRejectUser = async (reason: string) => {
    if (!rejectingUser) return;
    
    try {
      setIsRejecting(true);
      
      // Only update registration_status - the database trigger will handle the rest
      const { error } = await supabase
        .from('users')
        .update({ 
          registration_status: 'rejected'
        })
        .eq('id', rejectingUser.id);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      toast.success('User registration rejected successfully');
      setShowRejectModal(false);
      setRejectingUser(null);
      
      // Force immediate refresh to show updated data
      await loadApprovals();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user registration');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleForwardToStaff = (booking: any) => {
    setForwardingBooking(booking);
    setShowForwardingModal(true);
  };

  const handleConfirmForward = async (staffId: string, staffName: string) => {
    if (!forwardingBooking) return;
    
    try {
      setIsForwarding(true);
      
      // Update booking to assign it to the selected staff and approve it
      const { error } = await supabase
        .from('bookings')
        .update({ 
          staff_id: staffId,
          booking_status: 'approved',
          notes: `Booking approved and forwarded to ${staffName} by admin`,
          updated_at: new Date().toISOString()
        })
        .eq('id', forwardingBooking.id);

      if (error) {
        console.error('Error forwarding booking:', error);
        throw error;
      }

      toast.success(`Booking approved and forwarded to ${staffName} successfully!`);
      setShowForwardingModal(false);
      setForwardingBooking(null);
      
      // Force immediate refresh
      await loadApprovals();
    } catch (error) {
      console.error('Error forwarding booking:', error);
      toast.error('Failed to forward booking to staff');
    } finally {
      setIsForwarding(false);
    }
  };

  const closeForwardingModal = () => {
    setShowForwardingModal(false);
    setForwardingBooking(null);
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      // ONLY update booking_status to approved - this will trigger car status change
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'approved',
          notes: 'Booking approved by admin - car is now reserved',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Error approving booking:', error);
        throw error;
      }

      toast.success('Booking approved successfully! Car is now reserved and marked as rented.');
      loadApprovals();
    } catch (error) {
      console.error('Error approving booking:', error);
      toast.error('Failed to approve booking');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      // Update booking_status to cancelled
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: 'cancelled',
          notes: `Booking rejected by admin. Reason: ${reason || 'No reason provided'}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast.success('Booking rejected successfully');
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Failed to reject booking');
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      // Check if this is an extension payment
      if (paymentId.startsWith('ext_')) {
        const extensionId = paymentId.replace('ext_', '');
        
        // Update extension payment status to paid
        const { error } = await supabase
          .from('booking_extensions')
          .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', extensionId);

        if (error) {
          console.error('Error approving extension payment:', error);
          throw error;
        }

        toast.success('Extension payment approved successfully!');
      } else {
        // Update main payment admin_approval_status to approved
        const { error } = await supabase
          .from('payments')
          .update({
            admin_approval_status: 'approved',
            approved: true, // Also set the legacy approved field
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
            notes: 'Payment approved by admin'
          })
          .eq('id', paymentId);

        if (error) {
          console.error('Error approving payment:', error);
          throw error;
        }

        toast.success('Payment approved successfully!');
      }
      
      loadApprovals();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      // Check if this is an extension payment
      if (paymentId.startsWith('ext_')) {
        const extensionId = paymentId.replace('ext_', '');
        
        const confirmReject = confirm(
          'Rejecting this extension payment will mark it as cancelled. This action cannot be undone. Continue?'
        );
        
        if (!confirmReject) {
          return;
        }

        // Update extension payment status to cancelled
        const { error } = await supabase
          .from('booking_extensions')
          .update({
            payment_status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', extensionId);

        if (error) throw error;

        toast.success('Extension payment rejected successfully');
      } else {
        const payment = pendingPayments.find(p => p.id === paymentId);
        
        if (!payment) {
          toast.error('Payment not found');
          return;
        }

        const confirmReject = confirm(
          'Rejecting this payment will mark both the payment and booking as rejected. This action cannot be undone. Continue?'
        );
        
        if (!confirmReject) {
          return;
        }

        // Update payment admin_approval_status to rejected
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            admin_approval_status: 'rejected',
            approved: false, // Also set the legacy approved field
            notes: reason || 'Rejected by admin'
          })
          .eq('id', paymentId);

        if (paymentError) throw paymentError;

        // Also update the related booking payment_status to rejected
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            payment_status: 'rejected',
            notes: `Payment rejected by admin. Reason: ${reason || 'No reason provided'}`
          })
          .eq('id', payment.booking_id);

        if (bookingError) throw bookingError;

        toast.success('Payment rejected successfully');
      }
      
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const handleApproveCancellation = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({
          status: 'approved',
          admin_notes: 'Approved by admin'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Cancellation request approved successfully');
      loadApprovals();
    } catch (error) {
      console.error('Error approving cancellation:', error);
      toast.error('Failed to approve cancellation request');
    }
  };

  const handleRejectCancellation = async (requestId: string) => {
    const adminNotes = prompt('Reason for rejection (optional):');
    
    try {
      const { error } = await supabase
        .from('cancellation_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || 'Rejected by admin'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Cancellation request rejected');
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting cancellation:', error);
      toast.error('Failed to reject cancellation request');
    }
  };

  const handleApproveExtension = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('booking_extensions')
        .update({
          payment_status: 'approved'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Extension request approved successfully');
      loadApprovals();
    } catch (error) {
      console.error('Error approving extension:', error);
      toast.error('Failed to approve extension request');
    }
  };

  const handleRejectExtension = async (requestId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    try {
      const { error } = await supabase
        .from('booking_extensions')
        .update({
          payment_status: 'cancelled'
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Extension request rejected');
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting extension:', error);
      toast.error('Failed to reject extension request');
    }
  };

  const handleApproveDepositDeduction = async (requestId: string, adminNotes?: string) => {
    try {
      const { error } = await supabase.rpc('approve_deposit_deduction', {
        request_id: requestId,
        admin_id: user?.id,
        admin_notes_param: adminNotes
      });

      if (error) throw error;

      toast.success('Deposit deduction approved successfully');
      loadApprovals();
    } catch (error) {
      console.error('Error approving deposit deduction:', error);
      toast.error('Failed to approve deposit deduction');
    }
  };

  const handleRejectDepositDeduction = async (requestId: string, adminNotes: string) => {
    try {
      const { error } = await supabase.rpc('reject_deposit_deduction', {
        request_id: requestId,
        admin_id: user?.id,
        admin_notes_param: adminNotes
      });

      if (error) throw error;

      toast.success('Deposit deduction request rejected');
      loadApprovals();
    } catch (error) {
      console.error('Error rejecting deposit deduction:', error);
      toast.error('Failed to reject deposit deduction request');
    }
  };

  const handleViewDepositEvidence = (photos: string[]) => {
    // Open photos in a new window/modal
    photos.forEach((photoUrl, index) => {
      setTimeout(() => {
        window.open(photoUrl, '_blank');
      }, index * 100); // Stagger opening to avoid popup blocking
    });
  };

  const handleRefundPayment = (payment: any) => {
    setRefundingPayment(payment);
    setShowRefundModal(true);
  };

  const handleRefund = (payment: any) => {
    setRefundingPayment(payment);
    setShowRefundModal(true);
  };

  const handleRefundComplete = async () => {
    setShowRefundModal(false);
    setRefundingPayment(null);
    await loadApprovals();
  };

  // Pagination logic
  const getCurrentPageData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  const renderPagination = (data: any[]) => {
    const totalPages = getTotalPages(data);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-6 px-4">
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, data.length)} of {data.length} items
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="min-w-[44px] min-h-[44px]"
          >
            Previous
          </Button>
          
          {/* Page numbers */}
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="min-w-[44px] min-h-[44px]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="min-w-[44px] min-h-[44px]"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        const paginatedUsers = getCurrentPageData(pendingUsers);
        return (
          <div className="space-y-3 md:space-y-4">
            {paginatedUsers.length > 0 ? (
              <>
                {paginatedUsers.map((user, index) => (
                  <EnhancedUserApprovalCard
                    key={user.id}
                    user={user}
                    index={index}
                    onApprove={handleApproveUser}
                    onReject={handleRejectUser}
                    onViewDetails={handleViewUserDetails}
                  />
                ))}
                {renderPagination(pendingUsers)}
              </>
            ) : (
              <EmptyApprovalState
                title="All Caught Up!"
                message="No pending user approvals at the moment."
              />
            )}
          </div>
        );

      case 'bookings':
        const paginatedBookings = getCurrentPageData(pendingBookings);
        return (
          <div className="space-y-3 md:space-y-4">
            {/* Staff Forwarding Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <h4 className="text-blue-900 font-semibold">Staff Forwarding Available</h4>
              </div>
              <p className="text-blue-800 text-sm">
                For customer self-bookings (bookings without assigned staff), you can approve and forward them to specific staff members. 
                This ensures proper handover and return management while maintaining accountability.
              </p>
            </div>
            
            {paginatedBookings.length > 0 ? (
              <>
                {paginatedBookings.map((booking, index) => (
                  <BookingApprovalCard
                    key={booking.id}
                    booking={booking}
                    index={index}
                    onApprove={handleApproveBooking}
                    onReject={handleRejectBooking}
                    onForwardToStaff={handleForwardToStaff}
                  />
                ))}
                {renderPagination(pendingBookings)}
              </>
            ) : (
              <EmptyApprovalState
                title="All Caught Up!"
                message="No pending booking requests at the moment."
              />
            )}
          </div>
        );

      case 'payments':
        const paginatedPayments = getCurrentPageData(groupedPayments);
        return (
          <div className="space-y-3 md:space-y-4">
            {paginatedPayments.length > 0 ? (
              <>
                {paginatedPayments.map((payment, index) => (
                  <PaymentApprovalCard
                    key={payment.id}
                    payment={payment}
                    index={index}
                    onApprove={handleApprovePayment}
                    onReject={handleRejectPayment}
                    showPaymentReceived={payment.payment_completion_status === 'completed'}
                    onRefund={handleRefund}
                  />
                ))}
                {renderPagination(groupedPayments)}
              </>
            ) : (
              <EmptyApprovalState
                title="All Caught Up!"
                message="No pending payment approvals at the moment."
              />
            )}
          </div>
        );

      case 'cancellations':
        const pendingCancellations = cancellationRequests.filter(req => req.status === 'pending');
        const paginatedCancellations = getCurrentPageData(pendingCancellations);
        
        return (
          <div className="space-y-3 md:space-y-4">
            {paginatedCancellations.length > 0 ? (
              <>
                {paginatedCancellations.map((request, index) => (
                  <CancellationApprovalCard
                    key={request.id}
                    request={request}
                    index={index}
                    onApprove={handleApproveCancellation}
                    onReject={handleRejectCancellation}
                  />
                ))}
                {renderPagination(pendingCancellations)}
              </>
            ) : (
              <EmptyApprovalState
                title="No Pending Cancellations"
                message="No cancellation requests awaiting approval."
              />
            )}
          </div>
        );

      case 'extensions':
        const paginatedExtensions = getCurrentPageData(extensionRequests);
        
        return (
          <div className="space-y-3 md:space-y-4">
            {paginatedExtensions.length > 0 ? (
              <>
                {paginatedExtensions.map((request, index) => (
                  <ExtensionApprovalCard
                    key={request.id}
                    request={request}
                    index={index}
                    onApprove={handleApproveExtension}
                    onReject={handleRejectExtension}
                  />
                ))}
                {renderPagination(extensionRequests)}
              </>
            ) : (
              <EmptyApprovalState
                title="No Pending Extensions"
                message="No extension requests awaiting approval."
              />
            )}
          </div>
        );

      case 'deposits':
        const paginatedDepositRequests = getCurrentPageData(depositDeductionRequests);
        
        return (
          <div className="space-y-3 md:space-y-4">
            {paginatedDepositRequests.length > 0 ? (
              <>
                {paginatedDepositRequests.map((request, index) => (
                  <DepositDeductionApprovalCard
                    key={request.id}
                    request={request}
                    index={index}
                    onApprove={handleApproveDepositDeduction}
                    onReject={handleRejectDepositDeduction}
                    onViewEvidence={handleViewDepositEvidence}
                  />
                ))}
                {renderPagination(depositDeductionRequests)}
              </>
            ) : (
              <EmptyApprovalState
                title="No Pending Deposit Deductions"
                message="No deposit deduction requests awaiting approval."
              />
            )}
          </div>
        );

      case 'history':
        return <ApprovalHistoryTable history={getCurrentPageData(approvalHistory)} loading={loading} pagination={renderPagination(approvalHistory)} onRefund={handleRefund} />;

      default:
        return null;
    }
  };

  const pendingCancellationsCount = cancellationRequests.filter(req => req.status === 'pending').length;
  const pendingExtensionsCount = extensionRequests.length + groupedPayments.filter(p => p.has_pending_extensions).length;
  const pendingDepositDeductionsCount = depositDeductionRequests.length;

  const tabs = [
    { key: 'users', label: 'User Registrations', icon: Users, count: pendingUsers.length },
    { key: 'bookings', label: 'Booking Requests', icon: Calendar, count: pendingBookings.length },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: groupedPayments.length },
    { key: 'cancellations', label: 'Cancellations', icon: AlertTriangle, count: pendingCancellationsCount },
    { key: 'extensions', label: 'Extensions', icon: Plus, count: pendingExtensionsCount },
    { key: 'deposits', label: 'Deposit Deductions', icon: Shield, count: pendingDepositDeductionsCount },
    { key: 'history', label: 'History', icon: History, count: approvalHistory.length },
  ];

  if (loading) {
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
      className="space-y-8 p-4 md:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Approvals</h1>
          <p className="text-gray-700 text-sm md:text-base">Manage pending approvals for user registrations, booking requests, payments, and cancellation requests</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="ghost"
          className="flex items-center space-x-2 mobile-button min-w-[44px] min-h-[44px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-0 shadow-none"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Tabs */}
      <ApprovalTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div className="min-h-[60vh]">
        {renderTabContent()}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={showUserDetailsModal}
        onClose={() => {
          setShowUserDetailsModal(false);
          setSelectedUser(null);
        }}
        onApprove={handleApproveUser}
        onReject={handleRejectUser}
      />

      {/* Rejection Modal */}
      <UserRejectionModal
        user={rejectingUser}
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectingUser(null);
        }}
        onConfirm={confirmRejectUser}
        loading={isRejecting}
      />
      
      {/* Staff Forwarding Modal */}
      <StaffForwardingModal
        booking={forwardingBooking}
        isOpen={showForwardingModal}
        onClose={closeForwardingModal}
        onForward={handleConfirmForward}
        loading={isForwarding}
      />
      
      {/* Refund Modal */}
      <PaymentRefundModal
        payment={refundingPayment}
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setRefundingPayment(null);
        }}
        onRefundComplete={handleRefundComplete}
      />
    </motion.div>
  );
};

// Extension Approval Card Component
const ExtensionApprovalCard: React.FC<{
  request: any;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}> = ({ request, index, onApprove, onReject }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-200 rounded-lg p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Extension Request - #{request.booking?.booking_number}
          </h3>
          <p className="text-gray-600">
            Requested by: {request.created_by_user?.name} ({request.created_by_user?.role})
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">
            RM {request.extension_amount}
          </div>
          <div className="text-sm text-gray-500">{request.extension_days} days</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-600">Customer: <span className="text-gray-900">{request.booking?.customer?.name}</span></p>
          <p className="text-gray-600">Vehicle: <span className="text-gray-900">{request.booking?.car?.brand} {request.booking?.car?.make}</span></p>
        </div>
        <div>
          <p className="text-gray-600">Original End: <span className="text-gray-900">{new Date(request.original_end_date).toLocaleDateString()}</span></p>
          <p className="text-gray-600">New End: <span className="text-gray-900">{new Date(request.extended_end_date).toLocaleDateString()}</span></p>
        </div>
      </div>
      <div className="flex space-x-3">
        <Button
          variant="success"
          onClick={() => onApprove(request.id)}
          className="flex-1 min-h-[44px]"
        >
          Approve Extension
        </Button>
        <Button
          variant="danger"
          onClick={() => onReject(request.id)}
          className="flex-1 min-h-[44px]"
        >
          Reject Extension
        </Button>
      </div>
    </motion.div>
  );
};

export default AdminApprovals;