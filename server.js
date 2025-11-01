const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;

const app = express();
const PORT = 4000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// File-based storage paths
const EVENTS_FILE = './data/events.json';
const REGISTRATIONS_FILE = './data/registrations.json';

// MySQL database configuration (fallback)
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Akshat@5346', // Add your MySQL password here
  database: 'eventsphere_db'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Variable to track database type
let useFileStorage = false;

// Initialize storage
async function initializeStorage() {
  try {
    // Try MySQL first
    const connection = await pool.getConnection();
    await connection.query('CREATE DATABASE IF NOT EXISTS eventsphere_db');
    await connection.query('USE eventsphere_db');

    const createUsersTableQuery = `
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
      )
    `;

    const createEventsTableQuery = `
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
      )
    `;

    const createEventRegistrationsTableQuery = `
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
      )
    `;

    await connection.execute(createUsersTableQuery);
    await connection.execute(createEventsTableQuery);
    await connection.execute(createEventRegistrationsTableQuery);
    connection.release();
    console.log('MySQL database initialized successfully');
    useFileStorage = false;
  } catch (error) {
    console.error('MySQL connection failed:', error.message);
    console.error('Error code:', error.code);
    console.log('Falling back to file storage');
    useFileStorage = true;
    await initializeFileStorage();
  }
}

// Initialize file storage
async function initializeFileStorage() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir('./data', { recursive: true });

    // Initialize events file
    try {
      await fs.access(EVENTS_FILE);
    } catch {
      await fs.writeFile(EVENTS_FILE, '[]');
    }

    // Initialize registrations file
    try {
      await fs.access(REGISTRATIONS_FILE);
    } catch {
      await fs.writeFile(REGISTRATIONS_FILE, '[]');
    }

    console.log('File storage initialized successfully');
  } catch (error) {
    console.error('Error initializing file storage:', error);
  }
}

// Helper function to insert user into database
async function insertUser(userData) {
  try {
    const connection = await pool.getConnection();
    const insertQuery = `
      INSERT INTO users
      (firstName, lastName, email, password, accountType, eventType, decorations, profilePicture, age, referrer, suggestion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      userData.firstName,
      userData.lastName,
      userData.email,
      userData.password,
      userData.accountType,
      userData.eventType,
      userData.decorations,
      userData.profilePicture,
      userData.age,
      userData.referrer,
      userData.suggestion
    ]);

    connection.release();
    return result;
  } catch (error) {
    console.error('Error inserting user:', error);
    throw error;
  }
}

// Helper function to check if email exists
async function emailExists(email) {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    connection.release();
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
}

// Helper function to get all events
async function getAllEvents() {
  if (useFileStorage) {
    try {
      const data = await fs.readFile(EVENTS_FILE, 'utf8');
      const events = JSON.parse(data);
      return events.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error fetching events from file:', error);
      return [];
    }
  } else {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute('SELECT * FROM events ORDER BY date ASC, time ASC');
      connection.release();
      return rows;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }
}

// Helper function to insert event registration
async function insertEventRegistration(registrationData) {
  if (useFileStorage) {
    try {
      const data = await fs.readFile(REGISTRATIONS_FILE, 'utf8');
      const registrations = JSON.parse(data);

      const newRegistration = {
        id: registrations.length + 1,
        ...registrationData,
        registrationDate: new Date().toISOString()
      };

      registrations.push(newRegistration);
      await fs.writeFile(REGISTRATIONS_FILE, JSON.stringify(registrations, null, 2));

      return { insertId: newRegistration.id };
    } catch (error) {
      console.error('Error inserting event registration to file:', error);
      throw error;
    }
  } else {
    try {
      const connection = await pool.getConnection();
      const insertQuery = `
        INSERT INTO event_registrations
        (eventId, firstName, lastName, email, phone, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [result] = await connection.execute(insertQuery, [
        registrationData.eventId,
        registrationData.firstName,
        registrationData.lastName,
        registrationData.email,
        registrationData.phone,
        registrationData.message
      ]);

      connection.release();
      return result;
    } catch (error) {
      console.error('Error inserting event registration:', error);
      throw error;
    }
  }
}

// Helper function to insert sample events
async function insertSampleEvents() {
  const sampleEvents = [
    {
      id: 1,
      title: 'Summer Music Festival',
      description: 'A vibrant outdoor music festival featuring local and international artists across multiple genres.',
      date: '2025-07-15',
      time: '18:00:00',
      location: 'Central Park, New York',
      category: 'Music',
      price: 75.00,
      maxAttendees: 500,
      imageUrl: '../assets/images/music festival.jpg'
    },
    {
      id: 2,
      title: 'Tech Innovation Conference',
      description: 'Join industry leaders and innovators for a day of tech talks, networking, and product showcases.',
      date: '2025-08-20',
      time: '09:00:00',
      location: 'Convention Center, San Francisco',
      category: 'Technology',
      price: 150.00,
      maxAttendees: 300,
      imageUrl: '../assets/images/techfest.jpg'
    },
    {
      id: 3,
      title: 'Cultural Arts Exhibition',
      description: 'Explore diverse cultural expressions through art, music, dance, and traditional crafts.',
      date: '2025-09-10',
      time: '10:00:00',
      location: 'Art Museum, Chicago',
      category: 'Cultural',
      price: 25.00,
      maxAttendees: 200,
      imageUrl: '../assets/images/art.jpg'
    },
    {
      id: 4,
      title: 'Family Fun Fair',
      description: 'A delightful family event with games, rides, food stalls, and entertainment for all ages.',
      date: '2025-10-05',
      time: '12:00:00',
      location: 'City Fairgrounds, Los Angeles',
      category: 'Family',
      price: 20.00,
      maxAttendees: 1000,
      imageUrl: '../assets/images/fun fair.jpg'
    },
    {
      id: 5,
      title: 'Corporate Leadership Summit',
      description: 'Professional development event focused on leadership skills and business strategy.',
      date: '2025-11-12',
      time: '08:30:00',
      location: 'Business Center, Houston',
      category: 'Corporate',
      price: 200.00,
      maxAttendees: 150,
      imageUrl: '../assets/images/corporate.jpg'
    }
  ];

  if (useFileStorage) {
    try {
      const data = await fs.readFile(EVENTS_FILE, 'utf8');
      const events = JSON.parse(data);

      if (events.length === 0) {
        await fs.writeFile(EVENTS_FILE, JSON.stringify(sampleEvents, null, 2));
        console.log('Sample events inserted to file successfully');
      }
    } catch (error) {
      console.error('Error inserting sample events to file:', error);
    }
  } else {
    try {
      const connection = await pool.getConnection();
      const [existingEvents] = await connection.execute('SELECT COUNT(*) as count FROM events');

      if (existingEvents[0].count > 0) {
        connection.release();
        return;
      }

      for (const event of sampleEvents) {
        const insertQuery = `
          INSERT INTO events (title, description, date, time, location, category, price, maxAttendees, imageUrl)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await connection.execute(insertQuery, [
          event.title, event.description, event.date, event.time,
          event.location, event.category, event.price, event.maxAttendees, event.imageUrl
        ]);
      }

      connection.release();
      console.log('Sample events inserted to database successfully');
    } catch (error) {
      console.error('Error inserting sample events:', error);
    }
  }
}

// Initialize storage on startup
initializeStorage().then(() => {
  insertSampleEvents();
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'html', 'register.html'));
});

app.post('/register', upload.single('file'), async (req, res) => {
  try {
    const {
      'first-name': firstName,
      'last-name': lastName,
      email,
      'new-password': password,
      'account-type': accountType,
      'event-type': eventType,
      decoration,
      age,
      referrer,
      suggestion
    } = req.body;

    // Handle decorations array
    const decorations = Array.isArray(decoration) ? decoration.join(', ') : decoration || '';

    // Handle profile picture
    const profilePicture = req.file ? req.file.filename : null;

    const userData = {
      firstName,
      lastName,
      email,
      password,
      accountType,
      eventType,
      decorations,
      profilePicture,
      age: age ? parseInt(age) : null,
      referrer,
      suggestion
    };

    // Check if email already exists
    const exists = await emailExists(email);
    if (exists) {
      return res.status(400).send(`
        <html>
          <head><title>Registration Error</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>Registration Failed</h2>
            <p>Email already exists. Please use a different email.</p>
            <a href="/register" style="color: blue; text-decoration: underline;">Go back to registration</a>
          </body>
        </html>
      `);
    }

    // Insert new user into database
    const result = await insertUser(userData);
    console.log('User registered successfully:', userData.email);
    console.log('User ID:', result.insertId);

    // Redirect to thank you page
    res.redirect('/thank-you');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send(`
      <html>
        <head><title>Registration Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h2>Registration Failed</h2>
          <p>An error occurred during registration. Please try again.</p>
          <a href="/register" style="color: blue; text-decoration: underline;">Go back to registration</a>
        </body>
      </html>
    `);
  }
});

// API route to get all events
app.get('/api/events', async (req, res) => {
  try {
    const events = await getAllEvents();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// API route to register for an event
app.post('/api/events/register', async (req, res) => {
  try {
    const { eventId, firstName, lastName, email, phone, message } = req.body;

    const registrationData = {
      eventId,
      firstName,
      lastName,
      email,
      phone: phone || '',
      message: message || ''
    };

    const result = await insertEventRegistration(registrationData);
    console.log('Event registration successful:', email, 'for event ID:', eventId);

    res.json({
      success: true,
      message: 'Registration successful!',
      registrationId: result.insertId
    });
  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

app.get('/thank-you', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You - EventSphere</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .thank-you-container {
                background: white;
                padding: 40px;
                border-radius: 15px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                width: 90%;
            }
            h1 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 2.5em;
            }
            .checkmark {
                color: #28a745;
                font-size: 4em;
                margin-bottom: 20px;
            }
            p {
                color: #666;
                font-size: 1.1em;
                line-height: 1.6;
                margin-bottom: 30px;
            }
            .home-button {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                border: none;
                border-radius: 25px;
                font-size: 1.1em;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                transition: transform 0.3s ease;
            }
            .home-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
        </style>
    </head>
    <body>
        <div class="thank-you-container">
            <div class="checkmark">✓</div>
            <h1>Thank You!</h1>
            <p>Your registration has been successfully submitted to our database. We're excited to help you create an amazing event experience!</p>
            <p>Our team will contact you soon with more details about your event planning.</p>
            <a href="/" class="home-button">Return to Home</a>
        </div>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to install dependencies with: npm install');
  console.log('Make sure MySQL is running and create database "eventsphere_db"');
});