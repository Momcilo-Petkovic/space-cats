-- OPTIONAL. The backend creates the database by itself when it can log in as a user
-- with enough rights (e.g. root). Run this only if you want a separate user for the game:
-- change the password below, run it once as root (HeidiSQL or the MariaDB command line),
-- then set DB_USER=space_cats and DB_PASSWORD=<your password> before starting the backend.
CREATE DATABASE IF NOT EXISTS `space_cats` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'space_cats'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON `space_cats`.* TO 'space_cats'@'localhost';
FLUSH PRIVILEGES;
