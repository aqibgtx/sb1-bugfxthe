/*
  # Add Number Plates to Cars

  1. Schema Changes
    - Add plate_number column to cars table
    - Make it unique and required
    - Add index for better performance

  2. Data Migration
    - Generate sample plate numbers for existing cars
    - Ensure uniqueness and proper format
*/

-- Add plate_number column to cars table
ALTER TABLE cars ADD COLUMN IF NOT EXISTS plate_number text;

-- Make plate_number unique and not null
ALTER TABLE cars ADD CONSTRAINT cars_plate_number_unique UNIQUE (plate_number);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cars_plate_number ON cars(plate_number);

-- Generate sample plate numbers for existing cars (Malaysian format)
DO $$
DECLARE
    car_record RECORD;
    plate_prefix text[] := ARRAY['WA', 'WB', 'WC', 'WD', 'WE', 'WF', 'WG', 'WH', 'WJ', 'WK'];
    generated_plate_number text;
    counter integer := 1;
BEGIN
    FOR car_record IN SELECT id FROM cars WHERE cars.plate_number IS NULL
    LOOP
        -- Generate Malaysian-style plate number (e.g., WA1234A)
        generated_plate_number := plate_prefix[((counter - 1) % array_length(plate_prefix, 1)) + 1] || 
                                 LPAD((1000 + counter)::text, 4, '0') || 
                                 chr(65 + ((counter - 1) % 26));
        
        UPDATE cars 
        SET plate_number = generated_plate_number 
        WHERE id = car_record.id;
        
        counter := counter + 1;
    END LOOP;
END $$;

-- Now make plate_number NOT NULL
ALTER TABLE cars ALTER COLUMN plate_number SET NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN cars.plate_number IS 'Vehicle registration plate number (e.g., WA1234A)';