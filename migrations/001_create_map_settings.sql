-- Create map_settings table
CREATE TABLE IF NOT EXISTS map_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grid_scale DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  grid_offset_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  grid_offset_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_map_settings_created_at ON map_settings(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE map_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
-- For now, allowing all operations. You may want to restrict this based on user authentication
CREATE POLICY "Allow all operations on map_settings" ON map_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_map_settings_updated_at
  BEFORE UPDATE ON map_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

