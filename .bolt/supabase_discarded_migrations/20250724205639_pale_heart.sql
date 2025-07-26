/*
  # Malaysia Timezone Configuration

  1. Database Configuration
    - Set default timezone to Asia/Kuala_Lumpur (UTC+8)
    - Create timezone utility functions
    - Add timezone-aware triggers for timestamps

  2. Utility Functions
    - malaysia_now(): Get current time in Malaysia timezone
    - to_malaysia_time(): Convert any timestamp to Malaysia timezone
    - is_business_hours(): Check if current time is within business hours

  3. Updated Triggers
    - Ensure all timestamp fields use Malaysia timezone
    - Update existing triggers to be timezone-aware
*/

-- Set session timezone to Malaysia
SET timezone = 'Asia/Kuala_Lumpur';

-- Create utility function to get current Malaysia time
CREATE OR REPLACE FUNCTION malaysia_now()
RETURNS timestamptz AS $$
BEGIN
  RETURN now() AT TIME ZONE 'Asia/Kuala_Lumpur';
END;
$$ LANGUAGE plpgsql;

-- Create function to convert any timestamp to Malaysia timezone
CREATE OR REPLACE FUNCTION to_malaysia_time(input_time timestamptz)
RETURNS timestamptz AS $$
BEGIN
  RETURN input_time AT TIME ZONE 'Asia/Kuala_Lumpur';
END;
$$ LANGUAGE plpgsql;

-- Create function to check business hours (Monday-Friday 9AM-6PM, Saturday 9AM-1PM)
CREATE OR REPLACE FUNCTION is_business_hours()
RETURNS boolean AS $$
DECLARE
  malaysia_time timestamptz;
  day_of_week integer;
  hour_of_day integer;
BEGIN
  malaysia_time := malaysia_now();
  day_of_week := EXTRACT(dow FROM malaysia_time); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  hour_of_day := EXTRACT(hour FROM malaysia_time);
  
  -- Sunday is closed
  IF day_of_week = 0 THEN
    RETURN false;
  END IF;
  
  -- Monday to Friday: 9AM to 6PM
  IF day_of_week BETWEEN 1 AND 5 THEN
    RETURN hour_of_day >= 9 AND hour_of_day < 18;
  END IF;
  
  -- Saturday: 9AM to 1PM
  IF day_of_week = 6 THEN
    RETURN hour_of_day >= 9 AND hour_of_day < 13;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate overdue hours in Malaysia timezone
CREATE OR REPLACE FUNCTION calculate_overdue_hours_malaysia(end_date date)
RETURNS numeric AS $$
DECLARE
  malaysia_now timestamptz;
  end_of_day timestamptz;
  diff_hours numeric;
BEGIN
  malaysia_now := malaysia_now();
  end_of_day := (end_date::timestamptz + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Kuala_Lumpur';
  
  diff_hours := EXTRACT(epoch FROM (malaysia_now - end_of_day)) / 3600;
  
  RETURN GREATEST(0, diff_hours);
END;
$$ LANGUAGE plpgsql;

-- Update the update_updated_at_column function to use Malaysia timezone
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = malaysia_now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to ensure created_at uses Malaysia timezone
CREATE OR REPLACE FUNCTION set_malaysia_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = malaysia_now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to ensure all new records use Malaysia timezone for created_at
DO $$
DECLARE
  table_name text;
  tables_with_created_at text[] := ARRAY[
    'users', 'cars', 'bookings', 'payments', 'invoices', 'handover_invoices',
    'booking_extensions', 'cancellation_requests', 'deposit_deduction_requests',
    'red_flag_incidents', 'staff_performance_metrics', 'payroll_adjustments',
    'overdue_alerts', 'handover_logs', 'return_logs', 'service_records',
    'maintenance_records', 'car_documents', 'documents', 'delivery_details',
    'payment_reminders', 'acquisition_details', 'sold_cars', 'terms_and_conditions'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_with_created_at
  LOOP
    -- Check if table exists and has created_at column
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE columns.table_name = table_name AND column_name = 'created_at'
    ) THEN
      -- Drop existing trigger if it exists
      EXECUTE format('DROP TRIGGER IF EXISTS set_malaysia_created_at_trigger ON %I', table_name);
      
      -- Create new trigger
      EXECUTE format('
        CREATE TRIGGER set_malaysia_created_at_trigger
        BEFORE INSERT ON %I
        FOR EACH ROW
        EXECUTE FUNCTION set_malaysia_created_at()
      ', table_name);
      
      RAISE NOTICE 'Added Malaysia timezone trigger to table: %', table_name;
    END IF;
  END LOOP;
END $$;

-- Create a view for overdue bookings using Malaysia timezone
CREATE OR REPLACE VIEW overdue_bookings_malaysia AS
SELECT 
  b.*,
  c.brand as car_brand,
  c.make as car_make,
  c.plate_number,
  u.name as customer_name,
  u.email as customer_email,
  calculate_overdue_hours_malaysia(b.end_date) as hours_overdue,
  CASE 
    WHEN calculate_overdue_hours_malaysia(b.end_date) > 0 THEN true
    ELSE false
  END as is_overdue
FROM bookings b
JOIN cars c ON b.car_id = c.id
JOIN users u ON b.customer_id = u.id
WHERE b.booking_status IN ('ongoing', 'handed_over')
  AND b.return_marked = false
  AND calculate_overdue_hours_malaysia(b.end_date) > 0
ORDER BY calculate_overdue_hours_malaysia(b.end_date) DESC;

-- Add comment to document the timezone setup
COMMENT ON FUNCTION malaysia_now() IS 'Returns current timestamp in Malaysia timezone (UTC+8)';
COMMENT ON FUNCTION to_malaysia_time(timestamptz) IS 'Converts any timestamp to Malaysia timezone';
COMMENT ON FUNCTION is_business_hours() IS 'Checks if current Malaysia time is within business hours';
COMMENT ON FUNCTION calculate_overdue_hours_malaysia(date) IS 'Calculates overdue hours based on Malaysia timezone';
COMMENT ON VIEW overdue_bookings_malaysia IS 'View of overdue bookings calculated using Malaysia timezone';