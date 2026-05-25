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

// Dummy function for logout
function logout() {
 alert('Logging out...');
 // In a real application, you would redirect to a login page or clear the session.
}

document.addEventListener('DOMContentLoaded', () => {
 const sensors = document.querySelectorAll('.sensor-signal');
 sensors.forEach(sensor => {
     sensor.addEventListener('click', () => {
         const sensorId = sensor.getAttribute('data-sensor-id');
         alert(`Sensor ${sensorId} details: \n- Status: ${sensor.title}\n- Last Updated: Just now`);
     });
 });

 const statusCards = document.querySelectorAll('.status-card');
 statusCards.forEach(card => {
     card.addEventListener('click', () => {
         const sensorId = card.getAttribute('data-sensor-id');
         alert(`Opening detailed view for Sensor ${sensorId}`);
     });
 });
});