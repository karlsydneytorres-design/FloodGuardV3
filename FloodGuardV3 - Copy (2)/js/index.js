document.getElementById('reportForm').addEventListener('submit', function (e) {
    e.preventDefault();

    // Get form values
    const description = document.getElementById('description').value;
    const location = document.getElementById('location').value;
    const severity = document.getElementById('severity').value;

    // Determine severity settings
    let borderClass = '';
    let statusText = '';
    if (severity === 'red') {
      borderClass = 'status-high';
      statusText = 'High Severity';
    } else if (severity === 'orange') {
      borderClass = 'status-moderate';
      statusText = 'Moderate Severity';
    } else {
      borderClass = 'status-normal';
      statusText = 'Low Severity';
    }

    // Create timestamp
    const timestamp = new Date().toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Create new message card
    const newMessage = document.createElement('div');
    newMessage.className = `message-card ${borderClass}`;
    newMessage.innerHTML = `
      <div class="message-header">
        <span class="message-sender">
          <img src="design/images/default-user.png" alt="profile photo" class="profile-photo-small">
          You
        </span>
        <span class="message-location">📍 ${location}</span>
      </div>
      <p class="message-content">${description}</p>
      <div class="message-status ${severity}">${statusText}</div>
      <p class="message-timestamp">Reported just now at ${timestamp}</p>
    `;

    // Append to message list
    document.getElementById('messageList').prepend(newMessage);

    // Clear form fields
    document.getElementById('reportForm').reset();
  });
            // Weather data storage and state management
            let currentWeatherData = null;
            let previousWeatherData = null;
            let weatherUpdateInterval = null;
            let isWeatherLoading = false;
    
            // Enhanced weather fetching with accurate API and change detection
            async function fetchWeather() {
                if (isWeatherLoading) return;
                isWeatherLoading = true;
    
                // Coordinates for Barangay Colgante (more precise location)
                const latitude = 14.9377;
                const longitude = 120.7326;
                
                // Using more comprehensive API endpoint for better accuracy
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,rain,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=temperature_2m,relative_humidity_2m,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila&forecast_days=1`;
    
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Store previous data for comparison
                    previousWeatherData = currentWeatherData;
                    currentWeatherData = data;
                    
                    updateWeatherDisplay(data);
                    
                    // Check for significant weather changes
                    if (previousWeatherData) {
                        checkWeatherChanges(previousWeatherData, data);
                    }
                    
                    updateWeatherStatus('online');
                    
                } catch (error) {
                    console.error("Error fetching weather:", error);
                    displayWeatherError();
                    updateWeatherStatus('offline');
                } finally {
                    isWeatherLoading = false;
                }
            }
    
            function updateWeatherDisplay(data) {
                const weatherContainer = document.getElementById('weatherData');
                const current = data.current;
                
                // Enhanced weather code mapping with more conditions
                const weatherConditions = {
                    0: { condition: "Clear sky", icon: "☀️", alert: false },
                    1: { condition: "Mainly clear", icon: "🌤️", alert: false },
                    2: { condition: "Partly cloudy", icon: "⛅", alert: false },
                    3: { condition: "Overcast", icon: "☁️", alert: false },
                    45: { condition: "Fog", icon: "🌫️", alert: true },
                    48: { condition: "Depositing rime fog", icon: "❄️", alert: true },
                    51: { condition: "Light drizzle", icon: "🌦️", alert: false },
                    53: { condition: "Moderate drizzle", icon: "🌦️", alert: false },
                    55: { condition: "Dense drizzle", icon: "🌧️", alert: true },
                    61: { condition: "Light rain", icon: "🌧️", alert: false },
                    63: { condition: "Moderate rain", icon: "🌧️", alert: true },
                    65: { condition: "Heavy rain", icon: "⛈️", alert: true },
                    71: { condition: "Light snow", icon: "❄️", alert: false },
                    73: { condition: "Moderate snow", icon: "❄️", alert: true },
                    75: { condition: "Heavy snow", icon: "❄️", alert: true },
                    77: { condition: "Snow grains", icon: "❄️", alert: true },
                    80: { condition: "Light rain showers", icon: "🌦️", alert: false },
                    81: { condition: "Moderate rain showers", icon: "🌧️", alert: true },
                    82: { condition: "Violent rain showers", icon: "⛈️", alert: true },
                    95: { condition: "Thunderstorm", icon: "⚡", alert: true },
                    96: { condition: "Thunderstorm with hail", icon: "⛈️", alert: true },
                    99: { condition: "Severe thunderstorm", icon: "⛈️", alert: true }
                };
    
                const weatherInfo = weatherConditions[current.weather_code] || 
                    { condition: "Unknown", icon: "❓", alert: false };
                
                // Get wind direction
                const getWindDirection = (degrees) => {
                    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", 
                                     "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                    return directions[Math.round(degrees / 22.5) % 16];
                };
    
                // Create enhanced weather display
                weatherContainer.innerHTML = `
                    <div class="weather-data">
                        <p><span class="weather-icon">🌡️</span> Temperature: <strong>${current.temperature_2m}°C</strong></p>
                        <p><span class="weather-icon">💧</span> Humidity: <strong>${current.relative_humidity_2m}%</strong></p>
                        <p><span class="weather-icon">${weatherInfo.icon}</span> Condition: <strong>${weatherInfo.condition}</strong></p>
                        <p><span class="weather-icon">🌧️</span> Rain: <strong>${current.rain} mm/h</strong></p>
                        <p><span class="weather-icon">💨</span> Wind: <strong>${current.wind_speed_10m} km/h ${getWindDirection(current.wind_direction_10m)}</strong></p>
                        <p><span class="weather-icon">🎚️</span> Pressure: <strong>${current.pressure_msl} hPa</strong></p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 10px;">
                            <span class="weather-icon">🔄</span> Last updated: ${new Date().toLocaleTimeString()}
                        </p>
                    </div>
                `;
    
                // Check for weather alerts
                checkWeatherAlerts(current, weatherInfo);
            }
    
            function checkWeatherAlerts(current, weatherInfo) {
                const alertContainer = document.getElementById('weatherAlert');
                let alertMessage = '';
                let showAlert = false;
    
                // Check for various weather conditions that might affect flooding
                if (current.rain > 5) {
                    alertMessage = `⚠️ Heavy rainfall detected (${current.rain} mm/h). Monitor flood levels closely.`;
                    showAlert = true;
                } else if (current.wind_speed_10m > 40) {
                    alertMessage = `💨 Strong winds detected (${current.wind_speed_10m} km/h). Potential storm conditions.`;
                    showAlert = true;
                } else if (weatherInfo.alert) {
                    alertMessage = `🌩️ Weather alert: ${weatherInfo.condition}. Stay vigilant for changing conditions.`;
                    showAlert = true;
                } else if (current.relative_humidity_2m > 90 && current.temperature_2m > 25) {
                    alertMessage = `🌡️ High humidity and temperature. Potential for severe weather development.`;
                    showAlert = true;
                }
    
                if (showAlert) {
                    alertContainer.innerHTML = alertMessage;
                    alertContainer.style.display = 'block';
                } else {
                    alertContainer.style.display = 'none';
                }
            }
    
            function checkWeatherChanges(previousData, currentData) {
                if (!previousData || !currentData) return;
    
                const prev = previousData.current;
                const curr = currentData.current;
                
                // Check for significant changes
                const tempChange = Math.abs(curr.temperature_2m - prev.temperature_2m);
                const rainChange = Math.abs(curr.rain - prev.rain);
                const windChange = Math.abs(curr.wind_speed_10m - prev.wind_speed_10m);
                const weatherCodeChange = curr.weather_code !== prev.weather_code;
    
                // Notify of significant changes
                if (tempChange > 3) {
                    console.log(`Temperature change detected: ${tempChange}°C`);
                }
                
                if (rainChange > 2) {
                    console.log(`Rainfall change detected: ${rainChange} mm/h`);
                    // Could trigger notification to user
                }
                
                if (windChange > 10) {
                    console.log(`Wind speed change detected: ${windChange} km/h`);
                }
                
                if (weatherCodeChange) {
                    console.log(`Weather condition changed from ${prev.weather_code} to ${curr.weather_code}`);
                    // Animate the weather card to show change
                    animateWeatherChange();
                }
            }
    
            function animateWeatherChange() {
                const weatherCard = document.querySelector('.weather-card');
                weatherCard.style.transform = 'scale(1.02)';
                weatherCard.style.boxShadow = '0px 15px 35px rgba(0, 0, 0, 0.3)';
                
                setTimeout(() => {
                    weatherCard.style.transform = 'scale(1)';
                    weatherCard.style.boxShadow = '0px 8px 25px rgba(0, 0, 0, 0.15)';
                }, 1000);
            }
    
            function displayWeatherError() {
                const weatherContainer = document.getElementById('weatherData');
                weatherContainer.innerHTML = `
                    <div class="weather-data">
                        <p style="color: rgba(255,255,255,0.8); text-align: center;">
                            <span class="weather-icon">❌</span> Unable to fetch weather data
                        </p>
                        <p style="font-size: 14px; color: rgba(255,255,255,0.6); text-align: center;">
                            Please check your connection and try again
                        </p>
                        <button onclick="fetchWeather()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 16px; border-radius: 5px; margin-top: 10px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            }
    
            function updateWeatherStatus(status) {
                const statusIndicator = document.getElementById('weatherStatus');
                if (status === 'online') {
                    statusIndicator.style.backgroundColor = '#00ff00';
                    statusIndicator.style.boxShadow = '0 0 5px rgba(0, 255, 0, 0.5)';
                } else {
                    statusIndicator.style.backgroundColor = '#ff4444';
                    statusIndicator.style.boxShadow = '0 0 5px rgba(255, 68, 68, 0.5)';
                }
            }
    
            // Initialize weather system
            function initializeWeather() {
                // Fetch weather immediately
                fetchWeather();
                
                // Set up automatic updates every 5 minutes for more responsive updates
                if (weatherUpdateInterval) {
                    clearInterval(weatherUpdateInterval);
                }
                
                weatherUpdateInterval = setInterval(() => {
                    fetchWeather();
                }, 300000); // 5 minutes = 300,000ms
                
                // Also update every 1 minute for rain data during active weather
                setInterval(() => {
                    if (currentWeatherData && currentWeatherData.current.rain > 1) {
                        fetchWeather(); // More frequent updates during rain
                    }
                }, 60000); // 1 minute
            }
    
            // Other existing JavaScript code remains the same
            let currentRating = 0;
            let feedbackSubmitted = false;
    
            // Profile dropdown functionality
            document.addEventListener('DOMContentLoaded', () => {
                // Initialize weather system
                initializeWeather();
                
                const profileDropdown = document.querySelector('.profile-dropdown-container');
                const dropdownMenu = document.querySelector('.profile-dropdown-menu');
    
                profileDropdown.addEventListener('click', (event) => {
                    event.stopPropagation();
                    dropdownMenu.classList.toggle('show');
                });
    
                window.onclick = function(event) {
                    if (!event.target.closest('.profile-dropdown-container')) {
                        if (dropdownMenu.classList.contains('show')) {
                            dropdownMenu.classList.remove('show');
                        }
                    }
                }
            });
    
            // Modal functions
            function showRatingModal() {
                const modal = document.getElementById('ratingModal');
                modal.style.display = 'flex';
                document.body.classList.add('modal-open');
            }
    
            function closeRatingModal() {
                const modal = document.getElementById('ratingModal');
                modal.style.display = 'none';
                document.body.classList.remove('modal-open');
                resetFormAndRating();
            }
    
            window.onclick = function(event) {
                const modal = document.getElementById('ratingModal');
                if (event.target == modal) {
                    closeRatingModal();
                }
            }
    
            // Star Rating System within modal
            const stars = document.querySelectorAll('.modal .star');
            const ratingFeedback = document.getElementById('ratingFeedback');
    
            stars.forEach((star, index) => {
                star.addEventListener('mouseover', () => {
                    if (!feedbackSubmitted) {
                        highlightStars(index + 1);
                    }
                });
    
                star.addEventListener('click', () => {
                    if (!feedbackSubmitted) {
                        currentRating = index + 1;
                        setRating(currentRating);
                        showRatingFeedback();
                    }
                });
            });
    
            function highlightStars(rating) {
                stars.forEach((star, index) => {
                    if (index < rating) {
                        star.classList.add('active');
                    } else {
                        star.classList.remove('active');
                    }
                });
            }
    
            function setRating(rating) {
                currentRating = rating;
                highlightStars(rating);
            }
    
            function showRatingFeedback() {
                const messages = {
                    1: { text: "Thanks for the feedback!", message: "We'll work on improving the dashboard experience." },
                    2: { text: "Thanks for the feedback!", message: "We appreciate your input and will make improvements." },
                    3: { text: "Thank you for rating us!", message: "We're glad you found the dashboard useful." },
                    4: { text: "Great to hear!", message: "We're happy FloodGuard is working well for you." },
                    5: { text: "Excellent! Thank you!", message: "We're thrilled you love using FloodGuard for community safety." }
                };
    
                const feedback = messages[currentRating];
                ratingFeedback.querySelector('.feedback-text').textContent = feedback.text;
                ratingFeedback.querySelector('.feedback-message').textContent = feedback.message;
                ratingFeedback.classList.add('show');
            }
    
            function submitFeedback() {
                if (currentRating === 0) {
                    showNotification('Please select a star rating before submitting.');
                    return;
                }
    
                // Check if at least one form field is filled
                const form = document.getElementById('feedbackForm');
                const formInputs = form.querySelectorAll('input, select, textarea');
                const isFormFilled = Array.from(formInputs).some(input => input.value.trim() !== '');
    
                if (!isFormFilled) {
                    showNotification('Please fill out at least one feedback question.');
                    return;
                }
    
                feedbackSubmitted = true;
                const submitBtn = document.querySelector('.submit-rating-btn');
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
    
                // Simulate API call
                setTimeout(() => {
                    showNotification('Thank you for your valuable feedback! We have received your submission.');
                    closeRatingModal();
                    resetFormAndRating();
                }, 1500);
            }
    
            function showNotification(message) {
                // Placeholder for a more advanced notification system
                alert(message);
            }
    
            function resetFormAndRating() {
                currentRating = 0;
                feedbackSubmitted = false;
                highlightStars(0);
                ratingFeedback.classList.remove('show');
                const submitBtn = document.querySelector('.submit-rating-btn');
                submitBtn.textContent = 'Submit Feedback';
                submitBtn.disabled = false;
                
                const form = document.getElementById('feedbackForm');
                form.reset();
            }
            
            // Logout function
            function logout() {
                if (confirm('Are you sure you want to logout from FloodGuard?')) {
                    document.body.style.transition = 'opacity 0.5s ease';
                    document.body.style.opacity = '0';
                    
                    setTimeout(() => {
                        alert('Logout successful! Redirecting to login page...');
                        location.reload();
                    }, 500);
                }
            }
    
            // Carousel pause on hover functionality
            const carouselSlides = document.querySelector('.carousel-slides');
            const heroSection = document.querySelector('.hero-section');
    
            heroSection.addEventListener('mouseenter', () => {
                carouselSlides.style.animationPlayState = 'paused';
            });
    
            heroSection.addEventListener('mouseleave', () => {
                carouselSlides.style.animationPlayState = 'running';
            });
    
            // Carousel indicator click handlers
            const indicators = document.querySelectorAll('.indicator');
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    const translateX = -index * 20;
                    carouselSlides.style.animation = 'none';
                    carouselSlides.style.transform = `translateX(${translateX}%)`;
                    
                    setTimeout(() => {
                        carouselSlides.style.animation = 'autoSlide 20s infinite';
                    }, 100);
                });
            });
    
            // Enhanced data updates simulation
            function updateFloodData() {
                const waterLevel = document.querySelector('.data-value');
                if (waterLevel) {
                    const currentLevel = parseFloat(waterLevel.textContent);
                    const newLevel = (currentLevel + (Math.random() - 0.5) * 0.1).toFixed(1);
                    waterLevel.textContent = newLevel + 'm';
                }
                
                // Update rainfall
                const rainfallElements = document.querySelectorAll('.data-value');
                if (rainfallElements[1]) {
                    const newRainfall = (Math.random() * 2).toFixed(1);
                    rainfallElements[1].textContent = newRainfall + 'mm/hr';
                }
            }
    
            // Update data every 30 seconds
            setInterval(updateFloodData, 30000);
    
            // Clean up intervals when page unloads
            window.addEventListener('beforeunload', () => {
                if (weatherUpdateInterval) {
                    clearInterval(weatherUpdateInterval);
                }
            });

    // Toggle mobile menu
    function toggleMenu() {
        document.getElementById("navMenu").classList.toggle("active");
    }
