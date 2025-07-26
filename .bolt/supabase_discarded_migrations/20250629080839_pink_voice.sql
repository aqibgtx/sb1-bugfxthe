/*
  # Staff Payout System Database Schema

  1. New Fields
    - Add staff_type to users table
    - Add agent booking fields to bookings and payments tables

  2. New Tables
    - `payroll_adjustments` - Manual bonuses, deductions, commissions
    - `attendance_records` - Track work hours, overtime, absences
    - `red_flag_incidents` - Performance management system
    - `staff_performance_metrics` - Monthly performance tracking

  3. Security
    - Enable RLS on all new tables
    - Add policies for admin and staff access
    - Secure sensitive payroll data

  4. Features
    - Comprehensive payroll tracking
    - Attendance and overtime management
    - Red flag system for performance issues
    - Agent booking commission tracking
*/

-- Add staff_type to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'staff_type'
  ) THEN
    ALTER TABLE users ADD COLUMN staff_type text CHECK (staff_type IN ('field_staff', 'marketing', 'database_registration', 'accounting', 'supervisor', 'director')) DEFAULT 'field_staff';
  END IF;
END $$;

-- Add agent booking fields to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'is_agent_booking'
  ) THEN
    ALTER TABLE bookings ADD COLUMN is_agent_booking boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'custom_price_requested'
  ) THEN
    ALTER TABLE bookings ADD COLUMN custom_price_requested decimal(10,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'agent_notes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN agent_notes text;
  END IF;
END $$;

-- Add agent booking fields to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_agent_booking'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_agent_booking boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'custom_price_requested'
  ) THEN
    ALTER TABLE payments ADD COLUMN custom_price_requested decimal(10,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'agent_notes'
  ) THEN
    ALTER TABLE payments ADD COLUMN agent_notes text;
  END IF;
END $$;

-- Payroll Adjustments Table
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('bonus', 'deduction', 'commission', 'overtime', 'penalty', 'allowance')),
  category text NOT NULL CHECK (category IN ('manual_sales_commission', 'performance_bonus', 'late_penalty', 'holiday_penalty', 'absence_penalty', 'red_flag_penalty', 'saman_accident', 'overtime_pay', 'other')),
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  reference_id uuid, -- Can reference booking, incident, etc.
  pay_period_month text NOT NULL, -- Format: YYYY-MM
  created_by uuid REFERENCES users(id) NOT NULL,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  clock_in timestamptz,
  clock_out timestamptz,
  break_start timestamptz,
  break_end timestamptz,
  total_hours decimal(4,2) DEFAULT 0,
  regular_hours decimal(4,2) DEFAULT 0,
  overtime_hours decimal(4,2) DEFAULT 0,
  status text CHECK (status IN ('present', 'absent', 'late', 'half_day', 'sick_leave', 'annual_leave', 'unauthorized_leave')) DEFAULT 'present',
  late_minutes integer DEFAULT 0,
  early_departure_minutes integer DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Red Flag Incidents Table
CREATE TABLE IF NOT EXISTS red_flag_incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('customer_complaint', 'vehicle_damage', 'policy_violation', 'attendance_issue', 'performance_issue', 'safety_violation', 'other')),
  severity text NOT NULL CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
  title text NOT NULL,
  description text NOT NULL,
  incident_date date NOT NULL,
  penalty_amount decimal(10,2) DEFAULT 100.00,
  status text CHECK (status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
  resolution_notes text,
  reported_by uuid REFERENCES users(id) NOT NULL,
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  reference_booking_id uuid REFERENCES bookings(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Staff Performance Metrics Table
CREATE TABLE IF NOT EXISTS staff_performance_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  month_year text NOT NULL, -- Format: YYYY-MM
  total_bookings integer DEFAULT 0,
  total_delivery_km decimal(10,2) DEFAULT 0,
  total_referrals integer DEFAULT 0,
  attendance_days integer DEFAULT 0,
  absent_days integer DEFAULT 0,
  late_occurrences integer DEFAULT 0,
  overtime_hours decimal(4,2) DEFAULT 0,
  red_flags_count integer DEFAULT 0,
  customer_rating decimal(3,2) DEFAULT 0,
  performance_score decimal(5,2) DEFAULT 0,
  basic_salary decimal(10,2) NOT NULL,
  total_earnings decimal(10,2) DEFAULT 0,
  total_deductions decimal(10,2) DEFAULT 0,
  net_payout decimal(10,2) DEFAULT 0,
  calculated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, month_year)
);

-- Enable Row Level Security
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_flag_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payroll_adjustments
CREATE POLICY "Admin can manage all payroll adjustments" ON payroll_adjustments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own payroll adjustments" ON payroll_adjustments
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

-- RLS Policies for attendance_records
CREATE POLICY "Admin and supervisors can manage attendance" ON attendance_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own attendance" ON attendance_records
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

-- RLS Policies for red_flag_incidents
CREATE POLICY "Admin and supervisors can manage red flags" ON red_flag_incidents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own red flags" ON red_flag_incidents
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

-- RLS Policies for staff_performance_metrics
CREATE POLICY "Admin and supervisors can manage performance metrics" ON staff_performance_metrics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

CREATE POLICY "Staff can view own performance metrics" ON staff_performance_metrics
  FOR SELECT TO authenticated
  USING (
    staff_id IN (SELECT id FROM users WHERE auth_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND u.role IN ('admin', 'supervisor')
      AND u.registration_status = 'approved'
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_payroll_adjustments_updated_at BEFORE UPDATE ON payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_red_flag_incidents_updated_at BEFORE UPDATE ON red_flag_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_performance_metrics_updated_at BEFORE UPDATE ON staff_performance_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_staff_month ON payroll_adjustments(staff_id, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_type ON payroll_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_category ON payroll_adjustments(category);
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_status ON payroll_adjustments(status);

CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date ON attendance_records(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_staff ON red_flag_incidents(staff_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_date ON red_flag_incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_status ON red_flag_incidents(status);
CREATE INDEX IF NOT EXISTS idx_red_flag_incidents_severity ON red_flag_incidents(severity);

CREATE INDEX IF NOT EXISTS idx_staff_performance_metrics_staff_month ON staff_performance_metrics(staff_id, month_year);

CREATE INDEX IF NOT EXISTS idx_bookings_is_agent_booking ON bookings(is_agent_booking);
CREATE INDEX IF NOT EXISTS idx_payments_is_agent_booking ON payments(is_agent_booking);

-- Functions for automatic calculations

-- Function to calculate daily attendance
CREATE OR REPLACE FUNCTION calculate_daily_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total hours worked
  IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
    NEW.total_hours = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
    
    -- Subtract break time if applicable
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      NEW.total_hours = NEW.total_hours - (EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 3600);
    END IF;
    
    -- Calculate regular vs overtime hours (8 hours = regular)
    IF NEW.total_hours <= 8 THEN
      NEW.regular_hours = NEW.total_hours;
      NEW.overtime_hours = 0;
    ELSE
      NEW.regular_hours = 8;
      NEW.overtime_hours = NEW.total_hours - 8;
    END IF;
    
    -- Calculate late minutes
    IF NEW.clock_in > (DATE(NEW.clock_in) + INTERVAL '9 hours') THEN
      NEW.late_minutes = EXTRACT(EPOCH FROM (NEW.clock_in - (DATE(NEW.clock_in) + INTERVAL '9 hours'))) / 60;
      IF NEW.status = 'present' THEN
        NEW.status = 'late';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for attendance calculation
CREATE TRIGGER calculate_daily_attendance_trigger
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION calculate_daily_attendance();

-- Function to auto-create red flag penalties
CREATE OR REPLACE FUNCTION create_red_flag_penalty()
RETURNS TRIGGER AS $$
BEGIN
  -- When a red flag is created, automatically create a penalty adjustment
  IF NEW.status = 'active' AND NEW.penalty_amount > 0 THEN
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'penalty',
      'red_flag_penalty',
      -NEW.penalty_amount, -- Negative for deduction
      'Red Flag Penalty: ' || NEW.title,
      NEW.id,
      TO_CHAR(NEW.incident_date, 'YYYY-MM'),
      NEW.reported_by,
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for red flag penalty creation
CREATE TRIGGER create_red_flag_penalty_trigger
  AFTER INSERT ON red_flag_incidents
  FOR EACH ROW EXECUTE FUNCTION create_red_flag_penalty();

-- Function to auto-create overtime pay
CREATE OR REPLACE FUNCTION create_overtime_pay()
RETURNS TRIGGER AS $$
BEGIN
  -- When overtime hours are recorded, automatically create overtime pay adjustment
  IF NEW.overtime_hours > 0 AND (OLD.overtime_hours IS NULL OR OLD.overtime_hours != NEW.overtime_hours) THEN
    -- Delete existing overtime pay for this date if updating
    IF OLD.overtime_hours IS NOT NULL THEN
      DELETE FROM payroll_adjustments 
      WHERE staff_id = NEW.staff_id 
      AND category = 'overtime_pay' 
      AND reference_id = NEW.id;
    END IF;
    
    -- Create new overtime pay adjustment
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'overtime',
      'overtime_pay',
      NEW.overtime_hours * 5, -- RM5 per hour
      'Overtime Pay: ' || NEW.overtime_hours || ' hours on ' || NEW.date,
      NEW.id,
      TO_CHAR(NEW.date, 'YYYY-MM'),
      COALESCE(NEW.recorded_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for overtime pay creation
CREATE TRIGGER create_overtime_pay_trigger
  AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION create_overtime_pay();

-- Function to auto-create late penalties
CREATE OR REPLACE FUNCTION create_late_penalty()
RETURNS TRIGGER AS $$
BEGIN
  -- When late attendance is recorded, automatically create late penalty
  IF NEW.status = 'late' AND NEW.late_minutes > 0 AND (OLD.status IS NULL OR OLD.status != 'late') THEN
    INSERT INTO payroll_adjustments (
      staff_id,
      adjustment_type,
      category,
      amount,
      description,
      reference_id,
      pay_period_month,
      created_by,
      status
    ) VALUES (
      NEW.staff_id,
      'penalty',
      'late_penalty',
      -10, -- RM10 penalty
      'Late Penalty: ' || NEW.late_minutes || ' minutes late on ' || NEW.date,
      NEW.id,
      TO_CHAR(NEW.date, 'YYYY-MM'),
      COALESCE(NEW.recorded_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
      'approved'
    );
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for late penalty creation
CREATE TRIGGER create_late_penalty_trigger
  AFTER INSERT OR UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION create_late_penalty();

-- Update existing users with default staff types
UPDATE users SET staff_type = 'field_staff' WHERE role = 'staff' AND staff_type IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN users.staff_type IS 'Type of staff role determining compensation structure';
COMMENT ON COLUMN bookings.is_agent_booking IS 'Indicates if this is a staff/agent booking (VIP)';
COMMENT ON COLUMN bookings.custom_price_requested IS 'Custom price requested by agent for this booking';
COMMENT ON COLUMN bookings.agent_notes IS 'Special notes for agent/VIP bookings';
COMMENT ON COLUMN payments.is_agent_booking IS 'Indicates if this payment is for a staff/agent booking (VIP)';
COMMENT ON COLUMN payments.custom_price_requested IS 'Custom price requested by agent for this payment';
COMMENT ON COLUMN payments.agent_notes IS 'Special notes for agent/VIP payments';

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON payroll_adjustments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON red_flag_incidents TO authenticated;
GRANT SELECT ON staff_performance_metrics TO authenticated;