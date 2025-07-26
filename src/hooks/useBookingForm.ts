import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InvoiceGenerator } from '../components/invoices/InvoiceGenerator';
import { cloudflareStorageService } from '../services/cloudflareStorageService';
import { getMalaysiaDateString, addDaysInMalaysiaTime } from '../lib/timezone';
import toast from 'react-hot-toast';

export const useBookingForm = () => {
  const { user } = useAuth();
  
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCar, setSelectedCar] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [bookingFor, setBookingFor] = useState('someone_else'); // Staff always booking for someone else
  const [deliveryType, setDeliveryType] = useState('self_pickup');
  const [deliveryDistance, setDeliveryDistance] = useState(0);
  const [bookingDetails, setBookingDetails] = useState({
    startDate: getMalaysiaDateString(),
    endDate: '',
    totalDays: 1,
    rentalAmount: 0,
    deliveryFee: 0
  });
  const [selectedAddOns, setSelectedAddOns] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);
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

  // Fetch data functions
  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('status', 'available')
        .order('brand', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cars:', error);
      throw error;
    }
  };

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'customer')
        .eq('approved', true)
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  };

  const fetchAddOns = async () => {
    try {
      const { data, error } = await supabase
        .from('add_ons')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching add-ons:', error);
      throw error;
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      console.log('Loading initial data...');
      
      // Batch API calls for better performance
      const [carsResult, customersResult, addOnsResult] = await Promise.allSettled([
        fetchCars(),
        fetchCustomers(),
        fetchAddOns()
      ]);

      // Handle cars data
      if (carsResult.status === 'fulfilled') {
        console.log('Cars loaded:', carsResult.value.length);
        setCars(carsResult.value);
      } else {
        console.error('Failed to fetch cars:', carsResult.reason);
        toast.error('Failed to load cars data');
        setCars([]);
      }

      // Handle customers data
      if (customersResult.status === 'fulfilled') {
        console.log('Customers loaded:', customersResult.value.length);
        setCustomers(customersResult.value);
      } else {
        console.error('Failed to fetch customers:', customersResult.reason);
        toast.error('Failed to load customers data');
        setCustomers([]);
      }

      // Handle add-ons data
      if (addOnsResult.status === 'fulfilled') {
        console.log('Add-ons loaded:', addOnsResult.value.length);
        setAddOns(addOnsResult.value);
      } else {
        console.error('Failed to fetch add-ons:', addOnsResult.reason);
        toast.error('Failed to load add-ons data');
        setAddOns([]);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
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
    loadInitialData();
    
    // Cleanup function to clear data on unmount
    return () => {
      setCars([]);
      setCustomers([]);
      setAddOns([]);
    };
  }, []);

  useEffect(() => {
    if (bookingDetails.startDate && bookingDetails.totalDays > 0) {
      const endDate = addDaysInMalaysiaTime(bookingDetails.startDate, bookingDetails.totalDays - 1);
      
      const rentalAmount = selectedCar ? selectedCar.rental_price_daily * bookingDetails.totalDays : 0;
      
      setBookingDetails(prev => ({
        ...prev,
        endDate: getMalaysiaDateString(endDate),
        rentalAmount
      }));
    }
  }, [bookingDetails.startDate, bookingDetails.totalDays, selectedCar]);

  // Update delivery fee when delivery type or distance changes
  useEffect(() => {
    const fee = calculateDeliveryFee(deliveryType, deliveryDistance);
    setBookingDetails(prev => ({
      ...prev,
      deliveryFee: fee
    }));
  }, [deliveryType, deliveryDistance]);

  // Actions
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
    } finally {
      setRefreshing(false);
    }
  };

  const handleCarSelect = (car: any) => {
    console.log('Car selected:', car);
    setSelectedCar(car);
    
    // Auto-advance to next step after a short delay
    setTimeout(() => {
      setCurrentStep(2);
    }, 300);
  };

  const handleCustomerSelect = (customer: any) => {
    console.log('Customer selected:', customer);
    setSelectedCustomer(customer);
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

  const handleSubmitBookingRequest = async () => {
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
      // Step 1: Create booking request (pending admin approval)
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
        booking_for: bookingFor,
        delivery_type: deliveryType,
        delivery_distance: Math.round(deliveryDistance), // Ensure integer value
        requires_deposit: bookingFor === 'someone_else' || deliveryType === 'vip_delivery',
        notes: `${deliveryType !== 'self_pickup' ? `Delivery: ${deliveryType} (${Math.round(deliveryDistance)}km) | ` : ''}Payment method: ${getPaymentMethodCode(paymentMethod)} | Booking request created by staff, awaiting admin approval and payment processing`
      };

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Step 2: Add selected add-ons to booking
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

      // Step 3: Add delivery details if delivery is enabled
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

      // Step 4: Generate Invoice
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

      // Step 5: Handle cash payment upload if needed
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
              approved: false
            });

          if (paymentError) throw paymentError;
          
          toast.success('Receipt uploaded successfully! Awaiting admin approval.');
        } catch (uploadError) {
          console.error('Error uploading receipt:', uploadError);
          toast.error('Failed to upload receipt, but booking was created. You can upload the receipt later.');
        }
      }

      // Step 6: Prepare enhanced modal data
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
        booking_for: bookingFor,
        delivery_type: deliveryType,
        delivery_distance: Math.round(deliveryDistance)
      };

      setEnhancedModalData({
        bookingData: enhancedBookingData,
        invoiceData
      });
      setShowEnhancedModal(true);

      toast.success('Booking request submitted successfully!');
    } catch (error) {
      console.error('Error creating booking request:', error);
      toast.error('Failed to create booking request');
    } finally {
      setSubmittingBooking(false);
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedCar(null);
    setSelectedCustomer(null);
    setBookingFor('someone_else');
    setDeliveryType('self_pickup');
    setDeliveryDistance(0);
    setBookingDetails({
      startDate: getMalaysiaDateString(),
      endDate: '',
      totalDays: 1,
      rentalAmount: 0,
      deliveryFee: 0
    });
    setSelectedAddOns([]);
    setPaymentMethod('');
    setReceiptFile(null);
    setDepositAmount(0);
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

  return {
    // State
    currentStep,
    selectedCar,
    selectedCustomer,
    bookingFor,
    deliveryType,
    deliveryDistance,
    bookingDetails,
    selectedAddOns,
    paymentMethod,
    receiptFile,
    depositAmount,
    loading,
    submittingBooking,
    refreshing,
    showEnhancedModal,
    enhancedModalData,
    isProcessing,
    cars,
    customers,
    addOns,

    // Actions
    setCurrentStep,
    setBookingFor,
    setDeliveryType,
    setDeliveryDistance,
    setBookingDetails,
    setPaymentMethod,
    setDepositAmount,
    handleRefresh,
    handleCarSelect,
    handleCustomerSelect,
    handleDaysChange,
    handleAddOnToggle,
    updateAddOnQuantity,
    calculateTotal,
    handleReceiptFileSelect,
    handleSubmitBookingRequest,
    handleCloseEnhancedModal,
    canProceedToStep
  };
};