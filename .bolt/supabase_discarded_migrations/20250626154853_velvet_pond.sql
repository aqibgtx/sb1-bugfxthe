/*
  # Create terms and conditions table

  1. New Tables
    - `terms_and_conditions`
      - `id` (uuid, primary key)
      - `content` (text, terms content)
      - `version` (text, version identifier)
      - `effective_date` (date, when terms become effective)
      - `last_updated` (timestamp, when terms were last updated)
      - `created_at` (timestamp, when record was created)
      - `is_active` (boolean, whether these terms are currently active)

  2. Security
    - Enable RLS on `terms_and_conditions` table
    - Add policy for everyone to read active terms
    - Add policy for admin to manage terms

  3. Initial Data
    - Insert default terms and conditions
*/

CREATE TABLE IF NOT EXISTS terms_and_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  version text NOT NULL,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE terms_and_conditions ENABLE ROW LEVEL SECURITY;

-- Policy for everyone to read active terms
CREATE POLICY "Everyone can read active terms"
  ON terms_and_conditions
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Policy for admin to manage terms
CREATE POLICY "Admin can manage terms"
  ON terms_and_conditions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.role = 'admin'
      AND u.registration_status = 'approved'
    )
  );

-- Insert default terms and conditions
INSERT INTO terms_and_conditions (content, version, effective_date, is_active) VALUES (
  '# Terms and Conditions

## 1. Acceptance of Terms
By using our car rental service, you agree to be bound by these Terms and Conditions.

## 2. Rental Agreement
- All rentals are subject to availability
- Valid driving license required
- Minimum age requirement: 21 years
- Security deposit may be required

## 3. Vehicle Use
- Vehicles must be used for lawful purposes only
- No smoking in vehicles
- Return vehicle in same condition as received
- Report any accidents or damage immediately

## 4. Payment Terms
- Payment due at time of booking
- Late fees may apply for overdue returns
- Cancellation fees may apply

## 5. Insurance and Liability
- Basic insurance coverage included
- Driver responsible for damages not covered by insurance
- Third-party liability coverage required

## 6. Cancellation Policy
- Cancellations must be made through authorized staff
- Refund policies vary by booking type
- Emergency cancellations subject to review

## 7. Privacy Policy
- Personal information collected for rental purposes only
- Data protected according to applicable privacy laws
- Information not shared with third parties without consent

## 8. Modifications
These terms may be updated from time to time. Continued use constitutes acceptance of modified terms.

## 9. Contact Information
For questions about these terms, please contact our customer service team.

*Last updated: ' || CURRENT_DATE || '*',
  '1.0',
  CURRENT_DATE,
  true
);