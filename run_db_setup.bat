@echo off
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h 127.0.0.1 -p 5432 -f "d:\Collego\setup_db.sql" < NUL
echo EXIT_CODE=%ERRORLEVEL%
