import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

print("Connecting to PostgreSQL...")
# Connect as postgres superuser (trust auth)
conn = psycopg2.connect(host="127.0.0.1", port=5432, user="postgres", dbname="postgres", password="dummy")
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

# Reset postgres password
print("Resetting postgres password...")
cur.execute("ALTER USER postgres WITH PASSWORD 'CollegoProd2026Pass!'")

# Create collego user if not exists
print("Creating collego user...")
cur.execute("SELECT 1 FROM pg_roles WHERE rolname='collego'")
if not cur.fetchone():
    cur.execute("CREATE USER collego WITH PASSWORD 'collego123'")
    print("  -> collego user created")
else:
    cur.execute("ALTER USER collego WITH PASSWORD 'collego123'")
    print("  -> collego user already exists, password updated")

# Create collego database if not exists
print("Creating collego database...")
cur.execute("SELECT 1 FROM pg_database WHERE datname='collego'")
if not cur.fetchone():
    cur.execute("CREATE DATABASE collego OWNER collego")
    print("  -> collego database created")
else:
    print("  -> collego database already exists")

# Grant privileges
cur.execute("GRANT ALL PRIVILEGES ON DATABASE collego TO collego")

cur.close()
conn.close()
print("Done! All setup complete.")
