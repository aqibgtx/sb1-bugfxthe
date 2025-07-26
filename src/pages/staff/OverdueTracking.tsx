import React, { useState } from 'react';
import { motion } from 'framer-motion';
import OverdueTrackingHeader from '../../components/overdue/OverdueTrackingHeader';
import OverdueTrackingInfoBanner from '../../components/overdue/OverdueTrackingInfoBanner';
import OverdueTrackingStats from '../../components/overdue/OverdueTrackingStats';
import OverdueBookingsList from '../../components/overdue/OverdueBookingsList';
import OverdueBookingDetailsModal from '../../components/overdue/OverdueBookingDetailsModal';
import { useOverdueBookings } from '../../hooks/useOverdueBookings';
import { OverdueBooking } from '../../types/overdue';

const StaffOverdueTracking: React.FC = () => {
  const {
    overdueBookings,
    loading,
    refreshing,
    currentPage,
    totalPages,
    handleRefresh,
    handleContactCustomer,
    handlePageChange
  } = useOverdueBookings();

  const [selectedBooking, setSelectedBooking] = useState<OverdueBooking | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const handleViewDetails = (booking: OverdueBooking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
    setShowDetailsModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner w-32 h-32"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 lg:space-y-8"
    >
      <OverdueTrackingHeader
        onRefresh={handleRefresh}
        loading={loading}
        refreshing={refreshing}
      />

      <OverdueTrackingInfoBanner />

      <OverdueTrackingStats overdueBookings={overdueBookings} />

      <OverdueBookingsList
        overdueBookings={overdueBookings}
        onViewDetails={handleViewDetails}
        onContactCustomer={handleContactCustomer}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      <OverdueBookingDetailsModal
        isOpen={showDetailsModal}
        booking={selectedBooking}
        onClose={handleCloseModal}
        onContactCustomer={handleContactCustomer}
      />
    </motion.div>
  );
};

export default StaffOverdueTracking;