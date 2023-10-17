#!/usr/bin/env bash
PGPASSWORD=postgres psql -U postgres -p 9932 -h 127.0.0.1 -tc "SELECT 1 FROM pg_database WHERE datname = 'eloan_test'" | grep -q 1 || PGPASSWORD=postgres psql -p 9932 -h 127.0.0.1 -U postgres -c "CREATE DATABASE eloan_test";

# explanation https://stackoverflow.com/questions/18389124/simulate-create-database-if-not-exists-for-postgresql

NODE_ENV=test yarn mg:latest
