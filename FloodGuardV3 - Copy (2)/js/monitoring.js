(function() {
    // --- Utilities: random-walk generator for smooth realistic values ---
    function generateRandomWalk(start, points, step, min, max) {
        const arr = [start];
        for (let i = 1; i < points; i++) {
            // small random step biased by previous trend
            const change = (Math.random() - 0.45) * step;
            let next = arr[i-1] + change;
            // gently clamp
            if (next < min) next = min + Math.random() * (step/2);
            if (next > max) next = max - Math.random() * (step/2);
            arr.push(parseFloat(next.toFixed(2)));
        }
        return arr;
    }

    // --- Label builders ---
    function labelsFor24h() {
        const now = new Date();
        const labels = [];
        // 24 points back, label each hour
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(d.getHours().toString().padStart(2, '0') + ':00');
        }
        return labels;
    }

    function labelsForMonth(days = 30) {
        const labels = [];
        const now = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            labels.push((d.getMonth()+1) + '/' + d.getDate());
        }
        return labels;
    }

    function labelsForYear() {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        // show last 12 months ending this month
        const now = new Date();
        const labels = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(months[d.getMonth()] + ' ' + d.getFullYear().toString().slice(-2));
        }
        return labels;
    }

    // --- Data generators (realistic ranges for flood monitoring) ---
    // Baseline depends on the type of sensor. We'll use ~1.4m baseline for 24h,
    // slightly more variability on month, and seasonal shift for year.
    function dataForRange(range) {
        if (range === '24h') {
            // hourly values - 24 points - small variations around ~1.4m to 2.3m
            const start = 1.45 + (Math.random()-0.5)*0.2;
            return generateRandomWalk(start, 24, 0.12, 0.6, 3.8);
        } else if (range === 'month') {
            // daily values - 30 points - moderate variability, possible wet period
            const start = 1.3 + (Math.random()-0.5)*0.4;
            return generateRandomWalk(start, 30, 0.18, 0.4, 4.2);
        } else if (range === 'year') {
            // monthly values - 12 points - smoother seasonal trend, slightly higher extremes
            // start around 1.2 - seasonal ups and downs
            const start = 1.2 + (Math.random()-0.5)*0.6;
            return generateRandomWalk(start, 12, 0.25, 0.3, 5.0);
        }
        return [];
    }

    // --- Chart initialization ---
    const canvas = document.getElementById('waterLevelChart');
    const ctx = canvas.getContext('2d');

    // Create gradient fill (sky blue -> deeper blue)
    function createGradient() {
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0, 'rgba(30,144,255,0.18)');  // top (soft)
        g.addColorStop(0.6, 'rgba(77,184,255,0.08)');
        g.addColorStop(1, 'rgba(8,47,73,0)');
        return g;
    }

    // Create new Chart instance
    let waterChart = null;
    function buildChart(labels, data) {
        const dataset = {
            label: 'Water Level (m)',
            data: data,
            tension: 0.35, // smooth curve
            borderWidth: 2.5,
            pointRadius: 3.5,
            pointHoverRadius: 6,
            fill: true,
            backgroundColor: createGradient(),
            borderColor: '#0ea5e9', // medium sky blue
            pointBackgroundColor: '#0369a1'
        };

        const cfg = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [dataset]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#374151',
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 12
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return value + ' m';
                            },
                            color: '#374151'
                        },
                        grid: {
                            color: 'rgba(15,23,42,0.06)'
                        },
                        // suggested bounds to keep chart readable
                        suggestedMin: 0,
                        suggestedMax: 6
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ' + context.parsed.y.toFixed(2) + ' m';
                            }
                        },
                        titleColor: '#0f172a',
                        bodyColor: '#0f172a',
                        backgroundColor: '#ffffff',
                        borderColor: 'rgba(15,23,42,0.06)',
                        borderWidth: 1,
                        padding: 10
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                animation: {
                    duration: 600,
                    easing: 'easeOutQuad'
                }
            }
        };

        if (waterChart) {
            waterChart.destroy();
        }
        // set a specific height for nicer look
        canvas.style.height = '360px';
        waterChart = new Chart(ctx, cfg);
    }

    // --- Update chart with new range (handles label/data generation) ---
    function updateChartForRange(range) {
        let labels, data;
        if (range === '24h') {
            labels = labelsFor24h();
            data = dataForRange('24h');
        } else if (range === 'month') {
            labels = labelsForMonth(30);
            data = dataForRange('month');
        } else if (range === 'year') {
            labels = labelsForYear();
            data = dataForRange('year');
        } else {
            labels = labelsFor24h();
            data = dataForRange('24h');
        }

        buildChart(labels, data);
    }

    // --- Wire up range selector ---
    const rangeSelect = document.getElementById('rangeSelect');
    rangeSelect.addEventListener('change', function() {
        // immediately update chart when user selects a range
        updateChartForRange(this.value);
        // also update last update timestamp for clarity
        updateLastUpdate();
    });

    // --- Last update display ---
    function updateLastUpdate() {
        const now = new Date();
        // Format: Sep 11, 2025 07:24:15 PM (Asia/Manila)
        const options = {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        document.getElementById('lastUpdate').textContent = now.toLocaleString('en-PH', options);
    }

    // --- Periodic refresh to simulate live feed (only updates chart data values, preserving labels & shape) ---
    function refreshChartDataPreserveLabels() {
        if (!waterChart) return;
        // produce a new dataset array by applying a tiny random-walk step to existing points
        const old = waterChart.data.datasets[0].data.slice();
        const stepped = old.map((v, i) => {
            // small change; keep changes realistic
            const delta = (Math.random() - 0.48) * 0.08;
            let nv = parseFloat((v + delta).toFixed(2));
            if (nv < 0) nv = 0.0;
            return nv;
        });
        // Replace data and update chart
        waterChart.data.datasets[0].data = stepped;
        // regenerate gradient (in case of resize)
        waterChart.data.datasets[0].backgroundColor = createGradient();
        waterChart.update();
        updateLastUpdate();
    }

    // --- Initialize with 24h by default ---
    updateChartForRange('24h');
    updateLastUpdate();

    // Refresh the chart values every 5 minutes in real app, but for demo use 5s so you see updates.
    // In your production site you can change the interval to 300000 (5 minutes).
    const demoIntervalMs = 5000; // for demonstrative live feeling
    setInterval(refreshChartDataPreserveLabels, demoIntervalMs);

    // Also keep lastUpdate ticking every second to match other time displays
    setInterval(updateLastUpdate, 1000);

    // Accessibility: keyboard control for select
    rangeSelect.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            updateChartForRange(this.value);
        }
    });

    // Rebuild gradient on window resize for crispness
    window.addEventListener('resize', () => {
        if (waterChart) {
            waterChart.data.datasets[0].backgroundColor = createGradient();
            waterChart.update('none');
        }
    });
})();
        document.addEventListener('DOMContentLoaded', () => {
            // Profile dropdown functionality
            const profileDropdown = document.querySelector('.profile-dropdown-container');
            const dropdownMenu = document.querySelector('.profile-dropdown-menu');

            if (profileDropdown && dropdownMenu) {
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
            }

            // Live data simulation
            function updateTime() {
                const now = new Date();
                document.getElementById('currentTime').textContent = 
                    'Last Updated: ' + now.toLocaleString('en-PH', {
                        timeZone: 'Asia/Manila',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('en-PH', {
                    timeZone: 'Asia/Manila'
                });
            }

            function generateRealisticData() {
                // Main dashboard metrics (simulated)
                const waterLevel = 1.45 + (Math.random() - 0.5) * 0.3; // River Water Level
                const rainfall = 12.3 + (Math.random() - 0.5) * 8;
                const temperature = 28.5 + (Math.random() - 0.5) * 4;
                const windSpeed = 15.2 + (Math.random() - 0.5) * 10;
                
                // Update warning status based on river water level
                const statusDot = document.getElementById('statusDot');
                const statusText = document.getElementById('statusText');
                
                if (statusDot && statusText) {
                    if (waterLevel < 2.0) {
                        statusDot.className = 'status-dot green';
                        statusText.textContent = 'System Operational - Normal Conditions';
                    } else if (waterLevel < 3.5) {
                        statusDot.className = 'status-dot orange';
                        statusText.textContent = 'Warning Level - Elevated Water Detected';
                    } else {
                        statusDot.className = 'status-dot red';
                        statusText.textContent = 'Critical Alert - Immediate Response Required';
                    }
                }
                
                // Update main metrics
                if (document.getElementById('waterLevel')) document.getElementById('waterLevel').textContent = waterLevel.toFixed(2) + 'm';
                if (document.getElementById('rainfall')) document.getElementById('rainfall').textContent = rainfall.toFixed(1) + 'mm/h';
                if (document.getElementById('temperature')) document.getElementById('temperature').textContent = temperature.toFixed(1) + '°C';
                if (document.getElementById('windSpeed')) document.getElementById('windSpeed').textContent = windSpeed.toFixed(1) + ' km/h';
            }

            // Professional Sensor Data Updates
            function updateSensorData() {
                // Sensor 1: River Water Level & Rainfall
                const riverWaterLevel = 1.42 + (Math.random() - 0.5) * 0.4;
                const riverRainfall = 12.8 + (Math.random() - 0.5) * 8;
                if (document.getElementById('sensor1Display')) document.getElementById('sensor1Display').textContent = riverWaterLevel.toFixed(2) + 'm';
                if (document.getElementById('sensor1Rainfall')) document.getElementById('sensor1Rainfall').textContent = Math.max(0, riverRainfall).toFixed(1) + ' mm/h';
                if (document.getElementById('sensor1Flow')) document.getElementById('sensor1Flow').textContent = Math.floor(840 + Math.random() * 40) + ' L/s';
                if (document.getElementById('sensor1Turbidity')) document.getElementById('sensor1Turbidity').textContent = (12 + Math.random() * 3).toFixed(1) + ' NTU';
                if (document.getElementById('sensor1Temp')) document.getElementById('sensor1Temp').textContent = (28 + Math.random() * 2).toFixed(1) + '°C';
                
                // Update Sensor 1 lights based on river water level
                updateSensorLights('sensor1', riverWaterLevel, [2.0, 3.5]);

                // Sensor 2: Barangay Entrance Flood Level
                const entranceFloodLevel = 0.5 + (Math.random() - 0.5) * 0.8;
                const entranceRainfall = 15.8 + (Math.random() - 0.5) * 8;
                if (document.getElementById('sensor2Display')) document.getElementById('sensor2Display').textContent = Math.max(0, entranceFloodLevel).toFixed(2) + 'm';
                if (document.getElementById('sensor2Rainfall')) document.getElementById('sensor2Rainfall').textContent = Math.max(0, entranceRainfall).toFixed(1) + ' mm/h';
                if (document.getElementById('sensor2Temp')) document.getElementById('sensor2Temp').textContent = (27 + Math.random() * 3).toFixed(1) + '°C';
                if (document.getElementById('sensor2Humidity')) document.getElementById('sensor2Humidity').textContent = Math.floor(85 + Math.random() * 8) + '%';
                if (document.getElementById('sensor2Wind')) document.getElementById('sensor2Wind').textContent = (18 + Math.random() * 6).toFixed(1) + ' km/h';
                
                // Update Sensor 2 lights based on flood level
                updateSensorLights('sensor2', entranceFloodLevel, [0.5, 1.0]);

                // Sensor 3: Barangay Middle Flood & Environment
                const middleFloodLevel = 0.2 + (Math.random() - 0.5) * 0.5;
                const soilMoisture = 78.6 + (Math.random() - 0.5) * 12;
                if (document.getElementById('sensor3Display')) document.getElementById('sensor3Display').textContent = Math.max(0, middleFloodLevel).toFixed(2) + 'm';
                if (document.getElementById('sensor3SoilMoisture')) document.getElementById('sensor3SoilMoisture').textContent = Math.max(0, Math.min(100, soilMoisture)).toFixed(1) + '%';
                if (document.getElementById('sensor3GroundWater')) document.getElementById('sensor3GroundWater').textContent = (1.8 + Math.random() * 0.3).toFixed(2) + 'm';
                if (document.getElementById('sensor3Salinity')) document.getElementById('sensor3Salinity').textContent = (0.4 + Math.random() * 0.2).toFixed(2) + ' ppt';
                if (document.getElementById('sensor3Compaction')) document.getElementById('sensor3Compaction').textContent = (2.7 + Math.random() * 0.4).toFixed(1) + ' MPa';
                
                // Update Sensor 3 lights based on flood level
                updateSensorLights('sensor3', middleFloodLevel, [0.4, 0.7]);
            }

            function updateSensorLights(sensorId, value, thresholds) {
                const green = document.getElementById(sensorId + 'Green');
                const yellow = document.getElementById(sensorId + 'Yellow');
                const red = document.getElementById(sensorId + 'Red');
                
                // Reset all lights
                if (green) green.classList.remove('active');
                if (yellow) yellow.classList.remove('active');
                if (red) red.classList.remove('active');
                
                // Activate appropriate light based on thresholds
                if (value < thresholds[0] && green) {
                    green.classList.add('active');
                } else if (value < thresholds[1] && yellow) {
                    yellow.classList.add('active');
                } else if (red) {
                    red.classList.add('active');
                }
            }

            // Add interactive effects to sensor panels
            function initializeSensorInteractivity() {
                document.querySelectorAll('.sensor-panel').forEach(panel => {
                    panel.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-3px)';
                        this.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
                    });
                    
                    panel.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = 'none';
                    });
                });
                
                // Add click effect to warning lights
                document.querySelectorAll('.light-bulb').forEach(bulb => {
                    bulb.addEventListener('click', function() {
                        // Add a temporary pulse effect
                        this.style.transform = 'scale(1.1)';
                        setTimeout(() => {
                            this.style.transform = 'scale(1)';
                        }, 200);
                    });
                });
            }

            // Initialize and update data
            updateTime();
            generateRealisticData();
            updateSensorData();
            initializeSensorInteractivity();
            
            // Update time every second
            setInterval(updateTime, 1000);
            
            // Update main sensor data every 5 seconds
            setInterval(generateRealisticData, 5000);
            
            // Update professional sensor data every 3 seconds
            setInterval(updateSensorData, 3000);
            
            // Add some interactive effects to monitoring cards
            document.querySelectorAll('.monitoring-card').forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(255, 255, 255, 1)';
                });
                card.addEventListener('mouseleave', function() {
                    this.style.background = 'rgba(255, 255, 255, 0.95)';
                });
            });
        });