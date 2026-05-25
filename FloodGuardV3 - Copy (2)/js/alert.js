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

// Sample alert data
const alertsData = [
 {
     id: 1,
     type: 'critical',
     title: 'FLOOD EMERGENCY - IMMEDIATE EVACUATION REQUIRED',
     message: 'Water levels have reached critical thresholds at 3.8m. All residents in low-lying areas must evacuate immediately to designated centers. Emergency response teams are deploying.',
     time: '2025-08-14 15:30:00',
     status: 'active',
     location: 'Sitio Riverside, Barangay Colgante'
 },
 {
     id: 2,
     type: 'warning',
     title: 'FLOOD WARNING - Elevated Water Levels Detected',
     message: 'Current water level at 2.3m and rising. Residents are advised to prepare for possible evacuation. Monitor official channels for updates.',
     time: '2025-08-14 14:15:00',
     status: 'active',
     location: 'Main River Channel'
 },
 {
     id: 3,
     type: 'info',
     title: 'Weather Advisory - Heavy Rainfall Expected',
     message: 'Philippine Atmospheric, Geophysical and Astronomical Services Administration (PAGASA) reports continuous heavy rainfall expected for the next 6-8 hours.',
     time: '2025-08-14 13:00:00',
     status: 'active',
     location: 'Barangay Colgante'
 },
 {
     id: 4,
     type: 'info',
     title: 'System Maintenance Completed',
     message: 'All flood monitoring sensors have been successfully calibrated and are operating at optimal levels. Real-time data transmission restored.',
     time: '2025-08-14 10:30:00',
     status: 'acknowledged',
     location: 'Monitoring Station Alpha'
 },
 {
     id: 5,
     type: 'warning',
     title: 'FLOOD WARNING CANCELLED - Water Levels Receding',
     message: 'Previous flood warning has been cancelled. Water levels have dropped below warning threshold at 1.8m. Normal monitoring continues.',
     time: '2025-08-14 08:45:00',
     status: 'resolved',
     location: 'All Affected Areas'
 }
];

let currentFilter = 'all';

// Initialize the page
function initializePage() {
 displayAlerts();
 updateTimestamps();
 setupCarousel();
 setInterval(updateTimestamps, 60000); // Update timestamps every minute
 setInterval(autoSlideCarousel, 4000); // Auto-slide carousel every 4 seconds
}

// Display alerts based on current filter
function displayAlerts() {
 const alertList = document.getElementById('alertList');
 let filteredAlerts = alertsData;

 // Apply filter
 if (currentFilter !== 'all') {
     filteredAlerts = alertsData.filter(alert => {
         if (currentFilter === 'active') {
             return alert.status === 'active';
         }
         return alert.type === currentFilter;
     });
 }

 // Sort alerts by time, most recent first
 filteredAlerts.sort((a, b) => new Date(b.time) - new Date(a.time));

 // Generate HTML for alerts
 alertList.innerHTML = filteredAlerts.map(alert => {
     const isCritical = alert.type === 'critical';
     const pulseClass = isCritical ? 'pulse' : '';
     const alertStatus = alert.status === 'active' ? `<span class="alert-type ${alert.type} ${pulseClass}">Active</span>` : `<span class="alert-type">Resolved</span>`;
     
     return `
         <div class="alert-item ${alert.type}">
             <div class="alert-header">
                 <span class="alert-type ${alert.type}">${alert.type}</span>
                 <span class="alert-time" data-timestamp="${alert.time}">${formatTimeAgo(alert.time)}</span>
             </div>
             <div class="alert-content">
                 <h3>${alert.title}</h3>
                 <p>${alert.message}</p>
                 <p><strong>Location:</strong> ${alert.location}</p>
             </div>
             <div class="alert-actions">
                 <button class="alert-btn acknowledge">Acknowledge</button>
                 <button class="alert-btn dismiss">Dismiss</button>
                 <button class="alert-btn details">View Details</button>
             </div>
         </div>
     `;
 }).join('');
}

// Update time ago strings
function updateTimestamps() {
 document.querySelectorAll('.alert-time').forEach(element => {
     const timestamp = element.getAttribute('data-timestamp');
     element.textContent = formatTimeAgo(timestamp);
 });
}

// Helper function to format time ago
function formatTimeAgo(timestamp) {
 const now = new Date();
 const then = new Date(timestamp);
 const seconds = Math.round((now - then) / 1000);
 const minutes = Math.round(seconds / 60);
 const hours = Math.round(minutes / 60);
 const days = Math.round(hours / 24);
 const months = Math.round(days / 30);
 const years = Math.round(days / 365);

 if (seconds < 60) return `${seconds}s ago`;
 if (minutes < 60) return `${minutes}m ago`;
 if (hours < 24) return `${hours}h ago`;
 if (days < 30) return `${days}d ago`;
 if (months < 12) return `${months}mo ago`;
 return `${years}y ago`;
}

// Filter alerts
function filterAlerts(filter) {
 currentFilter = filter;
 document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
 document.querySelector(`.filter-btn[onclick="filterAlerts('${filter}')"]`).classList.add('active');
 displayAlerts();
}

// Carousel functionality for emergency status
let carouselIndex = 0;
function setupCarousel() {
 const carousel = document.getElementById('statusCarousel');
 const cards = carousel.querySelectorAll('.status-card');
 const cardWidth = cards[0].offsetWidth + parseFloat(getComputedStyle(carousel).gap);
 const totalWidth = cardWidth * cards.length;

 carousel.style.width = totalWidth + 'px';
}

function autoSlideCarousel() {
 const carousel = document.getElementById('statusCarousel');
 const cards = carousel.querySelectorAll('.status-card');
 const cardWidth = cards[0].offsetWidth + parseFloat(getComputedStyle(carousel).gap);
 const numVisibleCards = Math.floor(carousel.parentElement.offsetWidth / cardWidth);

 if (carouselIndex >= cards.length - numVisibleCards) {
     carouselIndex = 0;
 } else {
     carouselIndex++;
 }
 carousel.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
}

// Functions to show custom message box instead of native alerts
function showMessageBox(title, body) {
 const messageBox = document.querySelector('.message-box');
 const overlay = document.querySelector('.message-box-overlay');
 document.getElementById('message-box-title').textContent = title;
 document.getElementById('message-box-body').textContent = body;
 messageBox.style.display = 'block';
 overlay.style.display = 'block';
}

function closeMessageBox() {
 document.querySelector('.message-box').style.display = 'none';
 document.querySelector('.message-box-overlay').style.display = 'none';
}

// Updated dummy functions to use the new custom message box
function logout() {
 showMessageBox('Logout', 'You have been logged out.');
}
function triggerEmergencyAlert() {
 showMessageBox('Emergency Alert Triggered', 'Immediate evacuation is required. Proceed to the nearest designated evacuation center immediately.');
}
function triggerWarningAlert() {
 showMessageBox('Warning Alert Triggered', 'Water levels are rising. Prepare your emergency kit and be ready to evacuate if advised.');
}
function triggerInfoAlert() {
 showMessageBox('Info Notice Sent', 'Stay informed about the latest weather updates and road conditions.');
}
function clearAllAlerts() {
 showMessageBox('All Clear', 'The alert has been cancelled. The situation is now clear.');
}

// Start everything on page load
document.addEventListener('DOMContentLoaded', initializePage);