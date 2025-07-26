export interface OverdueBooking {
  id: string;
  booking_number: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  car: {
    brand: string;
    make: string;
    plate_number: string;
  };
  start_date: string;
  end_date: string;
  total_days: number;
  rental_amount: number;
  daily_rate: number;
  payment_status: string;
  booking_status: string;
  return_marked: boolean;
  handover_time: string;
  handover_marked: boolean;
  created_at: string;
  hours_overdue: number;
  overdue_fee: number;
  severity: 'warning' | 'critical';
  expected_return_time: string;
}