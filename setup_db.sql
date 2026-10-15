ALTER USER postgres WITH PASSWORD 'CollegoProd2026Pass!';

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'collego') THEN
    CREATE USER collego WITH PASSWORD 'collego123';
  ELSE
    ALTER USER collego WITH PASSWORD 'collego123';
  END IF;
END
$$;

SELECT 'User collego ready' AS status;
