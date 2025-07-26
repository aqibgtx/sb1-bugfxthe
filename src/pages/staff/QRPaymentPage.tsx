import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Car, 
  User, 
  Calendar, 
  DollarSign,
  FileText,
  ArrowLeft,
  Clock,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  AlertTriangle
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useCloudflareUpload } from '../../hooks/useCloudflareUpload';
import { formatFileSize, validateFileType } from '../../services/cloudflareStorageService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PaymentMethod {
  id: string;
  name: string;
  qrCode: string;
  accountDetails?: string;
  additionalInfo?: string;
  link?: string;
  showWhatsAppPopup?: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'bank',
    name: 'Bank QR',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/bank-qr-code.png',
    accountDetails: 'Bank: Maybank\nAccount: 1234567890\nAccount Name: Budget Plus Rental Sdn Bhd',
    additionalInfo: 'Please include your booking number in the payment reference'
  },
  {
    id: 'crypto',
    name: 'Crypto Transfer',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/btc-qr-code.png',
    accountDetails: 'BTC Address: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    additionalInfo: 'Bitcoin payments only. Please allow 30 minutes for confirmation'
  },
  {
    id: 'grabpay',
    name: 'GrabPay',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/grabpay-qr-code.png',
    accountDetails: 'GrabPay ID: +60123456789\nAccount Name: Budget Plus Rental',
    additionalInfo: 'Scan with GrabPay app'
  },
  {
    id: 'boost',
    name: 'Boost',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/boost-qr-code.png',
    accountDetails: 'Boost ID: +60123456789\nAccount Name: Budget Plus Rental',
    additionalInfo: 'Scan with Boost app'
  },
  {
    id: 'tng',
    name: 'Touch \'n Go',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/tng-qr-code.png',
    accountDetails: 'TnG ID: +60123456789\nAccount Name: Budget Plus Rental',
    additionalInfo: 'Scan with Touch \'n Go eWallet'
  },
  {
    id: 'bigpay',
    name: 'BigPay',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/bigpay-qr-code.png',
    accountDetails: 'BigPay ID: +60123456789\nAccount Name: Budget Plus Rental',
    additionalInfo: 'Scan with BigPay app'
  },
  {
    id: 'wise',
    name: 'Wise',
    qrCode: 'https://res.cloudinary.com/dm1viavof/image/upload/v1734518400/budget-plus/qr-codes/wise-qr-code.png',
    accountDetails: 'Wise Payment Link',
    additionalInfo: 'International payments accepted',
    link: 'https://wise.com/pay/me/mohanadm18',
    showWhatsAppPopup: true
  }
];

const QRPaymentPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  
  // Get URL parameters for context
  const urlParams = new URLSearchParams(window.location.search);
  const paymentType = urlParams.get('type'); // 'extension' or 'late_fee'
  const extensionId = urlParams.get('extension_id');
  const contextAmount = urlParams.get('amount');
  const extensionDays = urlParams.get('extension_days');
  
  const [booking, setBooking] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [lateFeeAmount, setLateFeeAmount] = useState<number | null>(
    paymentType === 'late_fee' && contextAmount ? parseFloat(contextAmount) : null
  );
  const [extensionAmount, setExtensionAmount] = useState<number | null>(
    paymentType === 'extension' && contextAmount ? parseFloat(contextAmount) : null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(paymentMethods[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { uploadFile, uploading } = useCloudflareUpload();

  const fetchData = useCallback(async () => {
    if (!bookingId) return;
    
    try {
      setLoading(true);
      
      // Batch API calls for better performance - prioritize based on context
      const [bookingResponse, contextPaymentResponse, lateFeePaymentResponse, regularPaymentResponse] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            customer:customer_id(id, name, email, phone),
            staff:staff_id(id, name, email),
            car:car_id(id, brand, make, spec, image_url),
            booking_extensions!booking_extensions_booking_id_fkey(*)
          `)
          .eq('id', bookingId)
          .maybeSingle(),
        // Check for context-specific payments first
        paymentType === 'extension' && extensionId ? 
          supabase
            .from('payments')
            .select('*')
            .eq('booking_id', bookingId)
            .like('notes', `%Extension payment for ${extensionId}%`)
            .order('created_at', { ascending: false })
            .maybeSingle() :
          Promise.resolve({ data: null, error: null }),
        // Check for late fee payments first (highest priority)
        supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .or('notes.ilike.%Late fee payment%,payment_method_code.eq.QR_CODE,payment_method_code.eq.LATE_FEE')
          .order('created_at', { ascending: false })
          .maybeSingle(),
        // Then check for regular QR payments
        supabase
          .from('payments')
          .select('*')
          .eq('booking_id', bookingId)
          .like('payment_method_code', 'QR%')
          .order('created_at', { ascending: false })
          .maybeSingle()
      ]);

      if (bookingResponse.error) throw bookingResponse.error;
      
      // Handle case where booking is not found
      if (!bookingResponse.data) {
        setBooking(null);
        return;
      }
      
      setBooking(bookingResponse.data);

      // Prioritize context-specific payments first
      if (!contextPaymentResponse.error && contextPaymentResponse.data) {
        const contextPayment = contextPaymentResponse.data;
        setPayment(contextPayment);
        if (paymentType === 'extension') {
          setExtensionAmount(contextPayment.amount);
        }
        if (contextPayment.receipt_url) setUploadSuccess(true);
        console.log('Context-specific payment detected:', contextPayment);
      } else if (!lateFeePaymentResponse.error && lateFeePaymentResponse.data) {
        const lateFeePayment = lateFeePaymentResponse.data;
        setPayment(lateFeePayment);
        setLateFeeAmount(lateFeePayment.amount);
        if (lateFeePayment.receipt_url) setUploadSuccess(true);
        console.log('Late fee payment detected:', lateFeePayment);
      } else if (!regularPaymentResponse.error && regularPaymentResponse.data) {
        const regularPayment = regularPaymentResponse.data;
        setPayment(regularPayment);
        if (regularPayment.receipt_url) setUploadSuccess(true);
        console.log('Regular QR payment detected:', regularPayment);
      }
    } catch (error) {
      console.error('Error loading booking data:', error);
      toast.error('Failed to load booking information');
    } finally {
      setLoading(false);
    }
  }, [bookingId, paymentType, extensionId, contextAmount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validateFileType(file, allowedTypes)) {
          throw new Error('Invalid file type. Please upload a JPEG or PNG image.');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size too large. Maximum size is 5MB.');
        }
        setUploadedFile(file);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Invalid file');
      }
    }
  };

  const handleUploadReceipt = async () => {
    if (!uploadedFile || !bookingId) {
      toast.error('Please select a file first');
      return;
    }

    // Generate payment method code based on selected payment method and payment type
    const baseMethodCode = selectedPaymentMethod.id.toUpperCase();
    const paymentMethodCode = (lateFeeAmount || extensionAmount) ? `QR_CODE` : `QR-${baseMethodCode}`;

    try {
      const result = await uploadFile(uploadedFile, `qr_receipt_${bookingId}`, {
        folder: 'receipts'
      });
      
      // Determine the amount and payment type based on context
      const paymentAmount = lateFeeAmount !== null ? lateFeeAmount : 
                           extensionAmount !== null ? extensionAmount : 
                           booking.total_amount;
      const isLateFeePayment = lateFeeAmount !== null;
      const isExtensionPayment = extensionAmount !== null;
      
      if (payment) {
        // Update existing payment record
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            receipt_url: result.publicUrl,
            payment_method_code: paymentMethodCode,
            payment_completion_status: 'pending',
            updated_at: new Date().toISOString(),
            notes: isLateFeePayment 
              ? `Late fee QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${lateFeeAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Generated from overdue vehicle return.`
              : isExtensionPayment
              ? `Extension QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${extensionAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Extension ID: ${extensionId}.`
              : `QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${paymentAmount}`
          })
          .eq('id', payment.id);
        if (updateError) throw updateError;
      } else {
        // Create new payment record
        const paymentNotes = isLateFeePayment 
          ? `Late fee QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${lateFeeAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Generated from overdue vehicle return.`
          : isExtensionPayment
          ? `Extension QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${extensionAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}. Extension ID: ${extensionId}.`
          : `QR payment receipt uploaded by customer via ${selectedPaymentMethod.name}. Amount: RM ${paymentAmount}`;
          
        const { error: insertError } = await supabase
          .from('payments')
          .insert({
            booking_id: bookingId,
            amount: paymentAmount,
            payment_method_code: paymentMethodCode,
            receipt_url: result.publicUrl,
            payment_completion_status: 'pending',
            admin_approval_status: 'pending',
            car_name: booking.car?.brand + ' ' + booking.car?.make,
            car_plate_number: booking.car?.plate_number,
            is_agent_booking: booking.is_agent_booking || false,
            notes: paymentNotes
          });
        if (insertError) throw insertError;
      }

      setUploadSuccess(true);
      toast.success('Payment receipt uploaded successfully!');
      await fetchData(); // Refresh data after upload
    } catch (error) {
      console.error('Error uploading receipt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Failed to upload receipt: ${errorMessage}`);
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setShowDropdown(false);
    
    if (method.showWhatsAppPopup) {
      setShowWhatsAppModal(true);
    }
  };

  const handleWhatsAppContact = () => {
    const phoneNumber = '+601116885706';
    const paymentAmount = lateFeeAmount !== null ? lateFeeAmount : 
                         extensionAmount !== null ? extensionAmount : 
                         booking?.total_amount;
    const paymentTypeText = lateFeeAmount ? 'late fee payment' : 
                           extensionAmount ? 'extension payment' : 
                           'booking payment';
    const message = `Hi! I would like to make a Wise ${paymentTypeText} for booking #${booking?.booking_number}. Amount: RM ${paymentAmount?.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setShowWhatsAppModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Card className="text-center p-6 md:p-8 bg-white border border-gray-200 rounded-lg shadow-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
          <p className="text-gray-700 mb-6">
            The booking you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/')}>Go to Homepage</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0"
        >
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)} 
              className="flex items-center space-x-2 min-h-[44px] min-w-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">QR Payment</h1>
              <p className="text-gray-700">Complete your payment using QR code</p>
            </div>
          </div>
          
          <Button
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 min-h-[44px]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </motion.div>

        {/* Payment Status Banner */}
        {uploadSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-green-50 border border-green-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="text-green-800 font-semibold">Payment Receipt Uploaded!</h3>
                <p className="text-green-700 text-sm">
                  Your payment receipt has been submitted and is pending admin approval.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Section */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Scan QR Code to Pay</h2>
                <p className="text-gray-700 mb-6">Choose your preferred payment method and scan to pay</p>

                {/* Payment Method Dropdown */}
                <div className="mb-6">
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-white hover:border-blue-400 transition-colors"
                    >
                      <span className="font-medium">{selectedPaymentMethod.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        {paymentMethods.map((method) => (
                          <button
                            key={method.id}
                            onClick={() => handlePaymentMethodSelect(method)}
                            className="w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            {method.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border-2 border-dashed border-gray-300 mb-6">
                  <img
                    src={selectedPaymentMethod.qrCode}
                    alt={`${selectedPaymentMethod.name} QR Code`}
                    className="w-48 h-48 mx-auto"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' fill='%23f3f4f6'/%3E%3Ctext x='96' y='96' text-anchor='middle' dy='0.3em' font-family='Arial' font-size='14' fill='%236b7280'%3EQR Code%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                {/* Account Details */}
                {selectedPaymentMethod.accountDetails && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                    <h4 className="text-gray-900 font-semibold mb-2">Account Details</h4>
                    <div className="text-gray-800 text-sm whitespace-pre-line text-left">
                      {selectedPaymentMethod.accountDetails}
                    </div>
                  </div>
                )}

                {/* Payment Link for Wise */}
                {selectedPaymentMethod.link && (
                  <div className="mb-4">
                    <Button
                      onClick={() => window.open(selectedPaymentMethod.link, '_blank')}
                      className="flex items-center space-x-2"
                      variant="secondary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Payment Link</span>
                    </Button>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-blue-900 font-semibold mb-2">Payment Instructions</h4>
                  <div className="text-blue-800 text-sm space-y-1 text-left">
                    <p>1. Open your {selectedPaymentMethod.name} app</p>
                    <p>2. Select "Scan QR" or "Pay by QR"</p>
                    <p>3. Scan the QR code above</p>
                    <p className="text-gray-600 mb-2">
                      Confirm payment of RM {(lateFeeAmount || extensionAmount || booking.total_amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </p>
                    <p>5. Upload your payment receipt below</p>
                    {selectedPaymentMethod.additionalInfo && (
                      <p className="text-blue-700 font-medium mt-2">
                        Note: {selectedPaymentMethod.additionalInfo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Booking Details & Upload Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.2 }} 
            className="space-y-6"
          >
            {/* Booking Details */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Booking Details</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Booking Number:</span>
                    <span className="font-mono font-semibold">#{booking.booking_number}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center space-x-3">
                      <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium truncate">{booking.customer.name}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Car className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-medium truncate">{booking.car.brand} {booking.car.make}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">
                        {extensionAmount && extensionDays ? 
                          `${extensionDays} extension day${parseInt(extensionDays) > 1 ? 's' : ''}` : 
                          `${booking.total_days} day${booking.total_days > 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-600">
                        {lateFeeAmount ? 'Late Fee Amount:' : 
                         extensionAmount ? 'Extension Amount:' : 
                         'Total Amount:'}
                      </span>
                      <span className={`font-bold text-lg ${lateFeeAmount ? 'text-red-600' : extensionAmount ? 'text-blue-600' : 'text-green-600'}`}>
                        RM {(lateFeeAmount || extensionAmount || booking.total_amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(lateFeeAmount || extensionAmount) && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-red-800 text-sm font-semibold">
                            {lateFeeAmount ? 'Late Fee Payment' : 'Extension Payment'}
                          </span>
                        </div>
                        <div className="text-red-700 text-xs space-y-1">
                          {lateFeeAmount ? (
                            <>
                              <p>• This is a late fee for overdue vehicle return</p>
                              <p>• Late fee must be paid before booking completion</p>
                            </>
                          ) : (
                            <>
                              <p>• This is an extension payment for additional rental days</p>
                              <p>• Extension payment must be completed to confirm the extension</p>
                            </>
                          )}
                          <p>• Original booking amount: RM {booking.total_amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {booking.staff && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      <strong>Referred by:</strong> {booking.staff.name}
                    </p>
                    {booking.staff.email && (
                      <p className="text-blue-700 text-xs">Contact: {booking.staff.email}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Upload Receipt Section */}
            <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="p-6">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload Payment Receipt</span>
                </h3>
                {!uploadSuccess ? (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <FileUpload
                        onUpload={(url, fileInfo) => {
                          setUploadedFile(fileInfo as any);
                        }}
                        onError={(error) => {
                          toast.error(`Failed to select file: ${error}`);
                        }}
                        accept="image/*"
                        maxSize={5}
                        folder="receipts"
                        fileName={`qr_receipt_${bookingId}`}
                        disabled={uploading}
                      />
                    </div>


                    <Button 
                      onClick={handleUploadReceipt} 
                      disabled={!uploadedFile || uploading} 
                      className="w-full flex items-center justify-center space-x-2 min-h-[44px]"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Uploading to R2...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload Receipt</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        {lateFeeAmount ? 'Late Fee ' : extensionAmount ? 'Extension ' : ''}Payment Receipt Uploaded!
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Your {lateFeeAmount ? 'late fee ' : extensionAmount ? 'extension ' : ''}payment receipt has been submitted successfully and is pending admin approval.
                        {lateFeeAmount ? ' Once approved, your booking will be marked as completed.' : 
                         extensionAmount ? ' Once approved, your booking extension will be confirmed.' : ''}
                      </p>
                      {payment?.receipt_url && (
                        <Button 
                          variant="secondary" 
                          onClick={() => window.open(payment.receipt_url, '_blank')} 
                          className="flex items-center space-x-2 min-h-[44px]"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Uploaded Receipt</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-800 font-semibold">
                        {lateFeeAmount ? 'Late Fee Payment Status' : 
                         extensionAmount ? 'Extension Payment Status' : 
                         'Payment Status'}
                      </h4>
                      <p className="text-yellow-700 text-sm">
                        {uploadSuccess 
                          ? `Pending admin approval - you will be notified once your ${lateFeeAmount ? 'late fee ' : extensionAmount ? 'extension ' : ''}payment is approved${lateFeeAmount ? ' and your booking is completed' : extensionAmount ? ' and your extension is confirmed' : ''}`
                          : `Waiting for ${lateFeeAmount ? 'late fee ' : extensionAmount ? 'extension ' : ''}payment receipt upload${lateFeeAmount ? ' to complete your booking' : extensionAmount ? ' to confirm your extension' : ''}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }}
        >
          <Card className="text-center p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <p className="text-gray-600 mb-4">Need help? Contact our support team for assistance.</p>
            <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="min-h-[44px]"
              >
                Back to Home
              </Button>
              {booking.staff?.email && (
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.href = `mailto:${booking.staff.email}`}
                  className="min-h-[44px]"
                >
                  Contact Staff
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* WhatsApp Modal for Wise Payments */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 max-w-md w-full"
          >
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Admin for Wise Payments</h3>
              <p className="text-gray-600 mb-6">
                Please contact our admin via WhatsApp to process your Wise {lateFeeAmount ? 'late fee ' : extensionAmount ? 'extension ' : ''}payment{lateFeeAmount ? ' and complete your booking' : extensionAmount ? ' and confirm your extension' : ''}.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWhatsAppContact}
                  className="flex-1 bg-green-500 hover:bg-green-600 flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat Now!</span>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default QRPaymentPage;