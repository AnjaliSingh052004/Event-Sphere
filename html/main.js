document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80, // Adjust for fixed header
                    behavior: 'smooth'
                });

                // Close mobile menu after clicking a link
                if (navLinks && navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                }
            }
        });
    });

    // Counter animation
    const counters = document.querySelectorAll('.achieve-container h3');
    const speed = 200; // The higher the number, the slower the speed

    counters.forEach(counter => {
        const updateCount = () => {
            const target = +counter.getAttribute('data-target');
            const count = +counter.innerText;
            const increment = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = target;
            }
        };

        // Trigger counter when in view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCount();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(counter);
    });

    // Initialize event registration form
    initializeEventRegistration();

    // Initialize carousel
    initializeCarousel();
});

// Global variable to store current selected event
let currentSelectedEvent = null;

// Function to open events modal
function openEventsModal() {
    const modal = document.getElementById('eventsModal');
    const eventsContainer = document.getElementById('eventsContainer');

    if (modal) {
        modal.style.display = 'block';
        loadEvents();
    }
}

// Function to close events modal
function closeEventsModal() {
    const modal = document.getElementById('eventsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Function to open registration modal
function openRegistrationModal(event) {
    currentSelectedEvent = event;
    const modal = document.getElementById('registrationModal');
    const eventInfo = document.getElementById('selectedEventInfo');

    if (modal && eventInfo) {
        // Populate event information
        eventInfo.innerHTML = `
            <div class="selected-event-info">
                <div class="selected-event-title">${event.title}</div>
                <div class="selected-event-details">
                    <span><i class="fa-solid fa-calendar"></i> ${formatDate(event.date)}</span>
                    <span><i class="fa-solid fa-clock"></i> ${formatTime(event.time)}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${event.location}</span>
                    <span><i class="fa-solid fa-tag"></i> ${event.category}</span>
                    <span><i class="fa-solid fa-dollar-sign"></i> $${event.price}</span>
                </div>
            </div>
        `;

        // Clear form
        document.getElementById('eventRegistrationForm').reset();

        modal.style.display = 'block';
    }
}

// Function to close registration modal
function closeRegistrationModal() {
    const modal = document.getElementById('registrationModal');
    if (modal) {
        modal.style.display = 'none';
        currentSelectedEvent = null;
    }
}

// Function to load events from API
async function loadEvents() {
    const eventsContainer = document.getElementById('eventsContainer');

    try {
        eventsContainer.innerHTML = '<div class="loading">Loading events...</div>';

        const response = await fetch('/api/events');
        const events = await response.json();

        if (events.length === 0) {
            eventsContainer.innerHTML = '<div class="no-events">No events available at the moment.</div>';
            return;
        }

        const eventsGrid = document.createElement('div');
        eventsGrid.className = 'events-grid';

        events.forEach(event => {
            const eventCard = createEventCard(event);
            eventsGrid.appendChild(eventCard);
        });

        eventsContainer.innerHTML = '';
        eventsContainer.appendChild(eventsGrid);

    } catch (error) {
        console.error('Error loading events:', error);
        eventsContainer.innerHTML = '<div class="no-events">Error loading events. Please try again later.</div>';
    }
}

// Function to create event card
function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    card.innerHTML = `
        <img src="${event.imageUrl}" alt="${event.title}" class="event-image" onerror="this.src='../assets/images/pic1.jpg'">
        <div class="event-info">
            <div class="event-title">${event.title}</div>
            <div class="event-description">${event.description}</div>
            <div class="event-details">
                <div class="event-detail">
                    <i class="fa-solid fa-calendar"></i>
                    <span>${formatDate(event.date)}</span>
                </div>
                <div class="event-detail">
                    <i class="fa-solid fa-clock"></i>
                    <span>${formatTime(event.time)}</span>
                </div>
                <div class="event-detail">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${event.location}</span>
                </div>
                <div class="event-detail">
                    <i class="fa-solid fa-tag"></i>
                    <span>${event.category}</span>
                </div>
                <div class="event-detail">
                    <i class="fa-solid fa-users"></i>
                    <span>Max ${event.maxAttendees} attendees</span>
                </div>
            </div>
            <div class="event-price">$${event.price}</div>
            <button class="register-btn" onclick="openRegistrationModal(${JSON.stringify(event).replace(/"/g, '&quot;')})">
                Register Now
            </button>
        </div>
    `;

    return card;
}

// Function to initialize event registration form
function initializeEventRegistration() {
    const form = document.getElementById('eventRegistrationForm');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentSelectedEvent) {
                alert('No event selected. Please try again.');
                return;
            }

            const formData = new FormData(form);
            const registrationData = {
                eventId: currentSelectedEvent.id,
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone') || '',
                message: formData.get('message') || ''
            };

            try {
                // Disable submit button
                const submitBtn = form.querySelector('.btn-submit');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Registering...';

                const response = await fetch('/api/events/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(registrationData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Registration successful! You will receive a confirmation email shortly.');
                    closeRegistrationModal();
                } else {
                    alert('Registration failed: ' + (result.error || 'Unknown error'));
                }

            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration failed. Please try again.');
            } finally {
                // Re-enable submit button
                const submitBtn = form.querySelector('.btn-submit');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const eventsModal = document.getElementById('eventsModal');
    const registrationModal = document.getElementById('registrationModal');

    if (e.target === eventsModal) {
        closeEventsModal();
    }

    if (e.target === registrationModal) {
        closeRegistrationModal();
    }
});

// Carousel functionality
let currentSlide = 0;
let carouselInterval;

function initializeCarousel() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const indicators = document.querySelectorAll('.indicator');

    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            changeSlide(-1);
        });

        nextBtn.addEventListener('click', () => {
            changeSlide(1);
        });
    }

    // Add click events to indicators
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', () => {
            goToSlide(index);
        });
    });

    // Start auto-play
    startCarouselAutoPlay();

    // Pause auto-play on hover
    const carouselWrapper = document.querySelector('.carousel-wrapper');
    if (carouselWrapper) {
        carouselWrapper.addEventListener('mouseenter', stopCarouselAutoPlay);
        carouselWrapper.addEventListener('mouseleave', startCarouselAutoPlay);
    }
}

function changeSlide(direction) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');

    if (slides.length === 0) return;

    // Remove active class from current slide and indicator
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');

    // Calculate new slide index
    currentSlide += direction;

    // Handle wrap around
    if (currentSlide >= slides.length) {
        currentSlide = 0;
    } else if (currentSlide < 0) {
        currentSlide = slides.length - 1;
    }

    // Add active class to new slide and indicator
    slides[currentSlide].classList.add('active');
    indicators[currentSlide].classList.add('active');

    // Update carousel track position
    const carouselTrack = document.getElementById('carouselTrack');
    if (carouselTrack) {
        carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
}

function goToSlide(slideIndex) {
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');

    if (slideIndex >= 0 && slideIndex < slides.length) {
        // Remove active class from current slide and indicator
        slides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');

        // Set new slide
        currentSlide = slideIndex;

        // Add active class to new slide and indicator
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');

        // Update carousel track position
        const carouselTrack = document.getElementById('carouselTrack');
        if (carouselTrack) {
            carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        }
    }
}

function startCarouselAutoPlay() {
    stopCarouselAutoPlay(); // Clear any existing interval
    carouselInterval = setInterval(() => {
        changeSlide(1);
    }, 5000); // Change slide every 5 seconds
}

function stopCarouselAutoPlay() {
    if (carouselInterval) {
        clearInterval(carouselInterval);
        carouselInterval = null;
    }
}

// Keyboard navigation for carousel
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(1);
    }
});