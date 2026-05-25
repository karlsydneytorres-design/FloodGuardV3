/*
  Firebase has been removed from this project.
  The admin page now shows a static placeholder message.
*/

const tableBody = document.getElementById('user-table-body');
if (tableBody) {
    tableBody.innerHTML = '<tr><td colspan="4">Admin functionality is unavailable because Firebase was removed.</td></tr>';
}

const logoutButton = document.getElementById('logout-button');
if (logoutButton) {
    logoutButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/auth/auth.html';
        }
    });
}

