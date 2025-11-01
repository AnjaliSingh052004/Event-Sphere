-- Create database
CREATE DATABASE IF NOT EXISTS eventsphere_db;

-- Use the database
USE eventsphere_db;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    accountType VARCHAR(50),
    eventType VARCHAR(100),
    decorations TEXT,
    profilePicture VARCHAR(255),
    age INT,
    referrer VARCHAR(255),
    suggestion TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) DEFAULT 0.00,
    maxAttendees INT DEFAULT 100,
    imageUrl VARCHAR(500),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create event_registrations table
CREATE TABLE IF NOT EXISTS event_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    message TEXT,
    registrationDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
);

-- Insert sample events
INSERT INTO events (title, description, date, time, location, category, price, maxAttendees, imageUrl) VALUES
('Summer Music Festival', 'A vibrant outdoor music festival featuring local and international artists across multiple genres.', '2025-07-15', '18:00:00', 'Central Park, New York', 'Music', 75.00, 500, '../assets/images/music festival.jpg'),
('Tech Innovation Conference', 'Join industry leaders and innovators for a day of tech talks, networking, and product showcases.', '2025-08-20', '09:00:00', 'Convention Center, San Francisco', 'Technology', 150.00, 300, '../assets/images/techfest.jpg'),
('Cultural Arts Exhibition', 'Explore diverse cultural expressions through art, music, dance, and traditional crafts.', '2025-09-10', '10:00:00', 'Art Museum, Chicago', 'Cultural', 25.00, 200, '../assets/images/art.jpg'),
('Family Fun Fair', 'A delightful family event with games, rides, food stalls, and entertainment for all ages.', '2025-10-05', '12:00:00', 'City Fairgrounds, Los Angeles', 'Family', 20.00, 1000, '../assets/images/fun fair.jpg'),
('Corporate Leadership Summit', 'Professional development event focused on leadership skills and business strategy.', '2025-11-12', '08:30:00', 'Business Center, Houston', 'Corporate', 200.00, 150, '../assets/images/corporate.jpg');

-- Show table structures
DESCRIBE users;
DESCRIBE events;
DESCRIBE event_registrations;