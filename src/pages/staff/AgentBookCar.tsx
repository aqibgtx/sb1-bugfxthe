import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, User, Plus, Upload, CheckCircle, RefreshCw } from 'lucide-react';
import Card from '../../components/ui/Card';
import StepProgress from '../../components/ui/StepProgress';
import AgentBookingHeader from '../../components/agent/AgentBookingHeader';
import AgentBookingBanner from '../../components/agent/AgentBookingBanner';
import AgentBookingStepContent from '../../components/agent/AgentBookingStepContent';
import AgentBookingNavigation from '../../components/agent/AgentBookingNavigation';
import AgentBookingLoadingState from '../../components/agent/AgentBookingLoadingState';
import EnhancedCombinedPaymentInvoiceModal from '../../components/modals/EnhancedCombinedPaymentInvoiceModal';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { InvoiceGenerator } from '../../components/invoices/InvoiceGenerator';
import { cloudflareStorageService } from '../../services/cloudflareStorageService';
import toast from 'react-hot-toast';

const StaffAgentBookCar: React.FC = () => {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customPriceRequested, setCustomPriceRequested] = useState<number>(0);
  const [agentNotes, setAgentNotes] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState('self_pickup');
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [bookingDetails, setBookingDetails] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalDays: 1,
    rentalAmount: 0,
    deliveryFee: 0
  });
  const [selectedAddOns, setSelectedAddOns] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEnhancedModal, setShowEnhancedModal] = useState(false);
  const [enhancedModalData, setEnhancedModalData] = useState<{
    bookingData?: any;
    invoiceData?: any;
  }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [cars, setCars] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addOns, setAddOns] = useState<any[]>([]);

  const { user } = useAuth();

  // Batch data fetching
  const fetchData = async () => {
    setLoading(true);
    try {
      const [carsResponse, usersResponse, addOnsResponse] = await Promise.all([
        supabase.from('cars').select('*').eq('status', 'available').limit(20),
        supabase.from('users').select('*').eq('role', 'customer').eq('approved', true).eq('active', true).limit(20),
        supabase.from('add_ons').select('*').eq('active', true).limit(20)
      ]);

      if (carsResponse.error) throw carsResponse.error;
      if (usersResponse.error) throw usersResponse.error;
      if (addOnsResponse.error) throw addOnsResponse.error;

      setCars(carsResponse.data || []);
      setCustomers(usersResponse.data || []);
      setAddOns(addOnsResponse.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate delivery fee based on type and distance
  const calculateDeliveryFee = (type: string, distance: number) => {
    switch (type) {
      case 'self_pickup':
        return 0;
      case 'free_pickup':
        return distance > 7 ? (distance - 7) * 2 : 0;
      case 'vip_delivery':
        return distance * 4;
      default:
        return 0;
    }
  };

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (bookingDetails.startDate && bookingDetails.totalDays > 0) {
      const startDate = new Date(bookingDetails.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + bookingDetails.totalDays - 1);

      const dailyRate = customPriceRequested > 0 ? customPriceRequested : (selectedCar ? selectedCar.rental_price_daily : 0);
      const rentalAmount = dailyRate * bookingDetails.totalDays;
      
      setBookingDetails(prev => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0],
        rentalAmount
      }));
    }
  }, [bookingDetails.startDate, bookingDetails.totalDays, selectedCar, customPriceRequested]);

  useEffect(() => {
    const fee = calculateDeliveryFee(deliveryType, deliveryDistance);
    setBookingDetails(prev => ({
      ...prev,
      deliveryFee: fee
    }));
  }, [deliveryType, deliveryDistance]);

  useEffect(() => {
    if (user && customers.length > 0) {
      const staffAsCustomer = customers.find(customer => customer.email === user.email);
      if (staffAsCustomer) {
        setSelectedCustomer(staffAsCustomer);
      } else {
        const tempCustomer = {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: 'staff'
        };
        setSelectedCustomer(tempCustomer);
      }
    }
  }, [user, customers]);

  // Actions
  const handleCarSelect = (car: any) => {
    setSelectedCar(car);
    setTimeout(() => {
      setCurrentStep(2);
    }, 300);
  };

  const handleDaysChange = (increment: boolean) => {
    const newDays = increment ? bookingDetails.totalDays + 1 : Math.max(1, bookingDetails.totalDays - 1);
    setBookingDetails(prev => ({
      ...prev,
      totalDays: newDays
    }));
  };

  const handleAddOnToggle = (addOn: any) => {
    const isSelected = selectedAddOns.find(item => item.id === addOn.id);

    if (isSelected) {
      setSelectedAddOns(selectedAddOns.filter(item => item.id !== addOn.id));
    } else {
      setSelectedAddOns([...selectedAddOns, { ...addOn, quantity: 1 }]);
    }
  };

  const updateAddOnQuantity = (addOnId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedAddOns(selectedAddOns.filter(item => item.id !== addOnId));
    } else {
      setSelectedAddOns(selectedAddOns.map(item =>
        item.id === addOnId ? { ...item, quantity } : item
      ));
    }
  };

  const handleDeliveryTypeChange = (type: string) => {
    setDeliveryType(type);
  };

  const handleDeliveryDistanceChange = (distance: number) => {
    setDeliveryDistance(distance);
  };

  const calculateTotal = () => {
    const addOnsTotal = selectedAddOns.reduce((sum, addOn) =>
      sum + (addOn.price_daily * addOn.quantity * bookingDetails.totalDays), 0
    );

    return bookingDetails.rentalAmount + addOnsTotal + bookingDetails.deliveryFee;
  };

  const handleReceiptFileSelect = (file: File) => {
    setReceiptFile(file);
    toast.success('Receipt file selected. It will be uploaded when you submit the booking.');
  };

  const getPaymentMethodCode = (method: string) => {
    switch (method) {
      case 'online_banking':
        return 'FPX';
      case 'credit_debit_card':
        return 'CARD';
      case 'qr_code':
        return 'QR';
      case 'cash':
        return 'CASH';
      default:
        return 'UNKNOWN';
    }
  };

  const handleSubmitAgentBookingRequest = async () => {
    if (!selectedCar || !selectedCustomer) {
      toast.error('Please complete all required fields');
      return;
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (paymentMethod === 'cash' && !receiptFile) {
      toast.error('Please select a receipt file to upload for cash payments');
      return;
    }

    setSubmittingBooking(true);
    setIsProcessing(true);

    try {
      const bookingData = {
        customer_id: selectedCustomer.id,
        staff_id: user?.id,
        car_id: selectedCar.id,
        start_date: bookingDetails.startDate,
        end_date: bookingDetails.endDate,
        total_days: bookingDetails.totalDays,
        rental_amount: bookingDetails.rentalAmount,
        add_ons_amount: selectedAddOns.reduce((sum, addOn) => 
          sum + (addOn.price_daily * addOn.quantity * bookingDetails.totalDays), 0
        ),
        delivery_fee: bookingDetails.deliveryFee,
        total_amount: calculateTotal(),
        booking_status: 'pending_approval',
        payment_status: 'pending',
        is_agent_booking: true,
        custom_price_requested: customPriceRequested > 0 ? customPriceRequested : null,
        agent_notes: agentNotes.trim() || null,
        booking_for: 'myself',
        delivery_type: deliveryType,
        delivery_distance: Math.round(deliveryDistance),
        requires_deposit: deliveryType === 'vip_delivery',
        notes: `${deliveryType !== 'self_pickup' ? `Delivery: ${deliveryType} (${Math.round(deliveryDistance)}km) | ` : ''}Payment method: ${getPaymentMethodCode(paymentMethod)} | VIP Agent booking created by staff${customPriceRequested > 0 ? ` | Custom price requested: RM${customPriceRequested}` : ''}${agentNotes ? ` | Agent notes: ${agentNotes}` : ''}`
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      if (selectedAddOns.length > 0) {
        const addOnInserts = selectedAddOns.map(addOn => ({
          booking_id: booking.id,
          add_on_id: addOn.id,
          quantity: addOn.quantity,
          price_daily: addOn.price_daily,
          total_amount: addOn.price_daily * addOn.quantity * bookingDetails.totalDays
        }));

        const { error: addOnError } = await supabase
          .from('booking_add_ons')
          .insert(addOnInserts);

        if (addOnError) throw addOnError;
      }

      if (deliveryType !== 'self_pickup') {
        const deliveryAddress = deliveryType === 'free_pickup' 
          ? (deliveryDistance <= 7 ? 'Free pickup within 7km' : `Pickup service - ${deliveryDistance}km (RM2/km beyond 7km)`)
          : `VIP delivery service - ${Math.round(deliveryDistance)}km`;

        const { error: deliveryError } = await supabase
          .from('delivery_details')
          .insert({
            booking_id: booking.id,
            delivery_address: deliveryAddress,
            pickup_address: 'Same as delivery address'
          });

        if (deliveryError) throw deliveryError;
      }

      let invoiceData = null;
      try {
        const invoiceResult = await InvoiceGenerator.generateInvoice(booking.id);
        invoiceData = {
          invoiceId: invoiceResult.invoiceId,
          invoiceNumber: invoiceResult.invoiceNumber,
          previewUrl: invoiceResult.previewUrl,
          customerEmail: selectedCustomer.email,
          customerName: selectedCustomer.name,
          totalAmount: calculateTotal()
        };
      } catch (error) {
        console.error('Error generating invoice:', error);
        toast.error('Failed to generate invoice, but booking was created');
      }

      if (paymentMethod === 'cash' && receiptFile) {
        try {
          const uploadUrl = await cloudflareStorageService.uploadPaymentReceipt(
            receiptFile, 
            booking.id
          );
          
          const { error: paymentError } = await supabase
            .from('payments')
            .insert({
              booking_id: booking.id,
              amount: calculateTotal(),
              payment_method_code: getPaymentMethodCode(paymentMethod),
              receipt_url: uploadUrl,
              approved: false,
              is_agent_booking: true,
              custom_price_requested: customPriceRequested > 0 ? customPriceRequested : null,
              agent_notes: agentNotes.trim() || null
            });

          if (paymentError) throw paymentError;
          
          toast.success('VIP Agent booking created with receipt uploaded successfully!');
        } catch (uploadError) {
          console.error('Error uploading receipt:', uploadError);
          toast.error('Failed to upload receipt, but VIP booking was created. You can upload the receipt later.');
        }
      }

      const enhancedBookingData = {
        id: booking.id,
        booking_number: booking.booking_number,
        customer: {
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone
        },
        car: {
          brand: selectedCar.brand,
          make: selectedCar.make,
          plate_number: selectedCar.plate_number
        },
        total_days: bookingDetails.totalDays,
        total_amount: calculateTotal(),
        is_agent_booking: true,
        custom_price_requested: customPriceRequested > 0 ? customPriceRequested : null,
        agent_notes: agentNotes.trim() || null,
        booking_for: 'myself',
        delivery_type: deliveryType,
        delivery_distance: Math.round(deliveryDistance)
      };

      setEnhancedModalData({
        bookingData: enhancedBookingData,
        invoiceData
      });
      setShowEnhancedModal(true);

      toast.success('VIP Agent booking request submitted successfully!');
    } catch (error) {
      console.error('Error creating VIP agent booking request:', error);
      toast.error('Failed to create VIP agent booking request');
    } finally {
      setSubmittingBooking(false);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCar(null);
    setCustomPriceRequested(0);
    setAgentNotes('');
    setDeliveryType('self_pickup');
    setDeliveryDistance(0);
    setBookingDetails({
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      totalDays: 1,
      rentalAmount: 0,
      deliveryFee: 0
    });
    setSelectedAddOns([]);
    setPaymentMethod('');
    setReceiptFile(null);
  };

  const handleCloseEnhancedModal = () => {
    setShowEnhancedModal(false);
    setEnhancedModalData({});
    resetForm();
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return selectedCar !== null;
      case 3:
        return selectedCustomer !== null && bookingDetails.startDate && bookingDetails.totalDays > 0;
      case 4:
        return true;
      case 5:
        return paymentMethod !== '';
      default:
        return true;
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const steps = [
    { number: 1, title: 'Select Car', icon: Car },
    { number: 2, title: 'Customer & Pricing', icon: User },
    { number: 3, title: 'Add-ons', icon: Plus },
    { number: 4, title: 'Payment Method', icon: Upload },
    { number: 5, title: 'Review & Submit', icon: CheckCircle }
  ];

  if (loading) {
    return <AgentBookingLoadingState />;
  }

  return (
    <div className="min-h-screen space-y-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-8"
      >
        <AgentBookingHeader 
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />

        <AgentBookingBanner />

        <StepProgress currentStep={currentStep} steps={steps} />

        <Card>
          <AgentBookingStepContent
            currentStep={currentStep}
            cars={cars}
            customers={customers}
            addOns={addOns}
            selectedCar={selectedCar}
            selectedCustomer={selectedCustomer}
            bookingDetails={bookingDetails}
            selectedAddOns={selectedAddOns}
            paymentMethod={paymentMethod}
            receiptFile={receiptFile}
            customPriceRequested={customPriceRequested}
            agentNotes={agentNotes}
            deliveryType={deliveryType}
            deliveryDistance={deliveryDistance}
            handleCarSelect={handleCarSelect}
            handleDaysChange={handleDaysChange}
            handleAddOnToggle={handleAddOnToggle}
            updateAddOnQuantity={updateAddOnQuantity}
            handleDeliveryTypeChange={handleDeliveryTypeChange}
            handleDeliveryDistanceChange={handleDeliveryDistanceChange}
            handleReceiptFileSelect={handleReceiptFileSelect}
            calculateTotal={calculateTotal}
            setBookingDetails={setBookingDetails}
            setPaymentMethod={setPaymentMethod}
            setCustomPriceRequested={setCustomPriceRequested}
            setAgentNotes={setAgentNotes}
          />
        </Card>

        <AgentBookingNavigation
          currentStep={currentStep}
          canProceedToStep={canProceedToStep}
          onPreviousStep={handlePreviousStep}
          onNextStep={handleNextStep}
          onSubmit={handleSubmitAgentBookingRequest}
          submittingBooking={submittingBooking}
          isProcessing={isProcessing}
          paymentMethod={paymentMethod}
          receiptFile={receiptFile}
        />

        <EnhancedCombinedPaymentInvoiceModal
          isOpen={showEnhancedModal}
          onClose={handleCloseEnhancedModal}
          bookingData={enhancedModalData.bookingData}
          paymentMethod={paymentMethod}
          invoiceData={enhancedModalData.invoiceData}
        />
      </motion.div>
    </div>
  );
};

export default StaffAgentBookCar;