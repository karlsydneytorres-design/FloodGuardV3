// Weather data storage and state management
    let currentWeatherData = null;
    let previousWeatherData = null;
    let weatherUpdateInterval = null;
    let isWeatherLoading = false;

    // Enhanced weather fetching with accurate API and change detection
    async function fetchWeather() {
        if (isWeatherLoading) return;
        isWeatherLoading = true;

        const latitude = 14.9377;
        const longitude = 120.7326;
        
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,rain,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=temperature_2m,relative_humidity_2m,rain,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FManila&forecast_days=1`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            previousWeatherData = currentWeatherData;
            currentWeatherData = data;
            
            updateWeatherDisplay(data);
            
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
        
        const weatherConditions = {
            0:  { condition: "Clear sky",               icon: "☀️",  alert: false },
            1:  { condition: "Mainly clear",             icon: "🌤️", alert: false },
            2:  { condition: "Partly cloudy",            icon: "⛅",  alert: false },
            3:  { condition: "Overcast",                 icon: "☁️",  alert: false },
            45: { condition: "Fog",                      icon: "🌫️", alert: true  },
            48: { condition: "Depositing rime fog",      icon: "❄️",  alert: true  },
            51: { condition: "Light drizzle",            icon: "🌦️", alert: false },
            53: { condition: "Moderate drizzle",         icon: "🌦️", alert: false },
            55: { condition: "Dense drizzle",            icon: "🌧️", alert: true  },
            61: { condition: "Light rain",               icon: "🌧️", alert: false },
            63: { condition: "Moderate rain",            icon: "🌧️", alert: true  },
            65: { condition: "Heavy rain",               icon: "⛈️",  alert: true  },
            71: { condition: "Light snow",               icon: "❄️",  alert: false },
            73: { condition: "Moderate snow",            icon: "❄️",  alert: true  },
            75: { condition: "Heavy snow",               icon: "❄️",  alert: true  },
            77: { condition: "Snow grains",              icon: "❄️",  alert: true  },
            80: { condition: "Light rain showers",       icon: "🌦️", alert: false },
            81: { condition: "Moderate rain showers",    icon: "🌧️", alert: true  },
            82: { condition: "Violent rain showers",     icon: "⛈️",  alert: true  },
            95: { condition: "Thunderstorm",             icon: "⚡",  alert: true  },
            96: { condition: "Thunderstorm with hail",   icon: "⛈️",  alert: true  },
            99: { condition: "Severe thunderstorm",      icon: "⛈️",  alert: true  }
        };

        const weatherInfo = weatherConditions[current.weather_code] || 
            { condition: "Unknown", icon: "❓", alert: false };
        
        const getWindDirection = (degrees) => {
            const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
            return directions[Math.round(degrees / 22.5) % 16];
        };

        weatherContainer.innerHTML = `
            <div class="weather-data">
                <p><span class="weather-icon">🌡️</span> Temperature: <strong>${current.temperature_2m}°C</strong></p>
                <p><span class="weather-icon">💧</span> Humidity: <strong>${current.relative_humidity_2m}%</strong></p>
                <p><span class="weather-icon">${weatherInfo.icon}</span> Condition: <strong>${weatherInfo.condition}</strong></p>
                <p><span class="weather-icon">🌧️</span> Rain: <strong>${current.rain} mm/h</strong></p>
                <p><span class="weather-icon">💨</span> Wind: <strong>${current.wind_speed_10m} km/h ${getWindDirection(current.wind_direction_10m)}</strong></p>
                <p><span class="weather-icon">🎚️</span> Pressure: <strong>${current.pressure_msl} hPa</strong></p>
                <p style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:10px;">
                    <span class="weather-icon">🔄</span> Last updated: ${new Date().toLocaleTimeString()}
                </p>
            </div>
        `;

        checkWeatherAlerts(current, weatherInfo);
    }

    function checkWeatherAlerts(current, weatherInfo) {
        const alertContainer = document.getElementById('weatherAlert');
        let alertMessage = '';
        let showAlert = false;

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
        
        const tempChange        = Math.abs(curr.temperature_2m   - prev.temperature_2m);
        const rainChange        = Math.abs(curr.rain             - prev.rain);
        const windChange        = Math.abs(curr.wind_speed_10m   - prev.wind_speed_10m);
        const weatherCodeChange = curr.weather_code !== prev.weather_code;

        if (tempChange > 3)        console.log(`Temperature change detected: ${tempChange}°C`);
        if (rainChange > 2)        console.log(`Rainfall change detected: ${rainChange} mm/h`);
        if (windChange > 10)       console.log(`Wind speed change detected: ${windChange} km/h`);
        if (weatherCodeChange) {
            console.log(`Weather condition changed from ${prev.weather_code} to ${curr.weather_code}`);
            animateWeatherChange();
        }
    }

    function animateWeatherChange() {
        const weatherCard = document.querySelector('.weather-card');
        if (!weatherCard) return;
        weatherCard.style.transform  = 'scale(1.02)';
        weatherCard.style.boxShadow  = '0px 15px 35px rgba(0,0,0,0.3)';
        setTimeout(() => {
            weatherCard.style.transform = 'scale(1)';
            weatherCard.style.boxShadow = '0px 8px 25px rgba(0,0,0,0.15)';
        }, 1000);
    }

    function displayWeatherError() {
        const weatherContainer = document.getElementById('weatherData');
        weatherContainer.innerHTML = `
            <div class="weather-data">
                <p style="color:rgba(255,255,255,0.8);text-align:center;">
                    <span class="weather-icon">❌</span> Unable to fetch weather data
                </p>
                <p style="font-size:14px;color:rgba(255,255,255,0.6);text-align:center;">
                    Please check your connection and try again
                </p>
                <button onclick="fetchWeather()"
                        style="background:rgba(255,255,255,0.2);color:white;border:none;
                            padding:8px 16px;border-radius:5px;margin-top:10px;cursor:pointer;">
                    Retry
                </button>
            </div>
        `;
    }

    function updateWeatherStatus(status) {
        const statusIndicator = document.getElementById('weatherStatus');
        if (!statusIndicator) return;
        if (status === 'online') {
            statusIndicator.style.backgroundColor = '#00ff00';
            statusIndicator.style.boxShadow       = '0 0 5px rgba(0,255,0,0.5)';
        } else {
            statusIndicator.style.backgroundColor = '#ff4444';
            statusIndicator.style.boxShadow       = '0 0 5px rgba(255,68,68,0.5)';
        }
    }

    function initializeWeather() {
        fetchWeather();
        
        if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
        
        weatherUpdateInterval = setInterval(() => {
            fetchWeather();
        }, 300000); // 5 minutes

        setInterval(() => {
            if (currentWeatherData && currentWeatherData.current.rain > 1) {
                fetchWeather();
            }
        }, 60000); // 1 minute during rain
    }

    // ── Rating / Feedback ─────────────────────────────────────────
    let currentRating    = 0;
    let feedbackSubmitted = false;

    const stars          = document.querySelectorAll('.modal .star');
    const ratingFeedback = document.getElementById('ratingFeedback');

    stars.forEach((star, index) => {
        star.addEventListener('mouseover', () => {
            if (!feedbackSubmitted) highlightStars(index + 1);
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
            star.classList.toggle('active', index < rating);
        });
    }

    function setRating(rating) {
        currentRating = rating;
        highlightStars(rating);
    }

    function showRatingFeedback() {
        const messages = {
            1: { text: "Thanks for the feedback!",  message: "We'll work on improving the dashboard experience." },
            2: { text: "Thanks for the feedback!",  message: "We appreciate your input and will make improvements." },
            3: { text: "Thank you for rating us!",  message: "We're glad you found the dashboard useful." },
            4: { text: "Great to hear!",             message: "We're happy FloodGuard is working well for you." },
            5: { text: "Excellent! Thank you!",      message: "We're thrilled you love using FloodGuard for community safety." }
        };
        const feedback = messages[currentRating];
        ratingFeedback.querySelector('.feedback-text').textContent    = feedback.text;
        ratingFeedback.querySelector('.feedback-message').textContent = feedback.message;
        ratingFeedback.classList.add('show');
    }

    function showRatingModal() {
        document.getElementById('ratingModal').style.display = 'flex';
        document.body.classList.add('modal-open');
    }

    function closeRatingModal() {
        document.getElementById('ratingModal').style.display = 'none';
        document.body.classList.remove('modal-open');
        resetFormAndRating();
    }

    function resetFormAndRating() {
        currentRating     = 0;
        feedbackSubmitted = false;
        highlightStars(0);
        ratingFeedback.classList.remove('show');
        const submitBtn = document.querySelector('.submit-rating-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Submit Feedback';
            submitBtn.disabled    = false;
        }
        document.getElementById('feedbackForm')?.reset();
    }

    function showNotification(message) {
        alert(message);
    }

    // submitFeedback is overridden by the module script in index.html
    // This plain version is a fallback only
    function submitFeedback() {
        if (currentRating === 0) {
            showNotification('Please select a star rating before submitting.');
            return;
        }
        const form       = document.getElementById('feedbackForm');
        const formInputs = form.querySelectorAll('input, select, textarea');
        const isFormFilled = Array.from(formInputs).some(i => i.value.trim() !== '');
        if (!isFormFilled) {
            showNotification('Please fill out at least one feedback question.');
            return;
        }
        feedbackSubmitted = true;
        const submitBtn   = document.querySelector('.submit-rating-btn');
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled    = true;
        setTimeout(() => {
            showNotification('Thank you for your valuable feedback!');
            closeRatingModal();
            resetFormAndRating();
        }, 1500);
    }

    // ── Logout ────────────────────────────────────────────────────
    async function logout() {
        if (confirm('Are you sure you want to logout from FloodGuard?')) {
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity    = '0';
            const { logOut } = await import('./js/auth.js');
            await logOut();
        }
    }

    // ── Flood data simulation ─────────────────────────────────────
    function updateFloodData() {
        const waterLevel = document.querySelector('.data-value');
        if (waterLevel) {
            const currentLevel = parseFloat(waterLevel.textContent);
            const newLevel     = (currentLevel + (Math.random() - 0.5) * 0.1).toFixed(1);
            waterLevel.textContent = newLevel + 'm';
        }
        const rainfallElements = document.querySelectorAll('.data-value');
        if (rainfallElements[1]) {
            rainfallElements[1].textContent = (Math.random() * 2).toFixed(1) + 'mm/hr';
        }
    }

    setInterval(updateFloodData, 30000);

    // ── Toggle mobile menu ────────────────────────────────────────
    function toggleMenu() {
        const navMenu = document.getElementById("navMenu");
        if (navMenu) {
            navMenu.classList.toggle("active");
        }
    }

    // ── DOMContentLoaded — single unified event hub ───────────────
    document.addEventListener('DOMContentLoaded', () => {

        // Weather
        initializeWeather();

        // Carousel pause on hover
        const carouselSlides = document.querySelector('.carousel-slides');
        const heroSection    = document.querySelector('.hero-section');
        if (carouselSlides && heroSection) {
            heroSection.addEventListener('mouseenter', () => {
                carouselSlides.style.animationPlayState = 'paused';
            });
            heroSection.addEventListener('mouseleave', () => {
                carouselSlides.style.animationPlayState = 'running';
            });
        }

        // Carousel indicators
        const indicators = document.querySelectorAll('.indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                if (!carouselSlides) return;
                carouselSlides.style.animation  = 'none';
                carouselSlides.style.transform  = `translateX(${-index * 20}%)`;
                setTimeout(() => {
                    carouselSlides.style.animation = 'autoSlide 20s infinite';
                }, 100);
            });
        });

        // ── Dropdown ──────────────────────────────────────────────
        const profileDropdown = document.querySelector('.profile-dropdown-container');
        const dropdownMenu    = document.querySelector('.profile-dropdown-menu');

        if (profileDropdown && dropdownMenu) {
            profileDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });

            // Prevent clicks inside the menu from bubbling up and closing it
            dropdownMenu.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // ── Single document click: closes dropdown, mobile nav, and modal backdrop
        document.addEventListener('click', (e) => {
            // Close dropdown
            if (dropdownMenu && profileDropdown && !profileDropdown.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }

            // Close mobile nav when tapping outside
            const navMenu = document.getElementById('navMenu');
            if (navMenu && !navMenu.contains(e.target) && !e.target.closest('.hamburger')) {
                navMenu.classList.remove('active');
            }

            // Close modal on backdrop click
            const modal = document.getElementById('ratingModal');
            if (modal && e.target === modal) {
                closeRatingModal();
            }
        });

        // Clean up on unload
        window.addEventListener('beforeunload', () => {
            if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
        });
    });