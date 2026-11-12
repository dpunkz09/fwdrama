-- Create database for Drama Laravel application
CREATE DATABASE IF NOT EXISTS drama_laravel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Optional: Create a dedicated user (recommended for production)
-- CREATE USER IF NOT EXISTS 'drama_user'@'localhost' IDENTIFIED BY 'your_password_here';
-- GRANT ALL PRIVILEGES ON drama_laravel.* TO 'drama_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Show database created
SHOW DATABASES LIKE 'drama_laravel';
