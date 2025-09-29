document.addEventListener('DOMContentLoaded', function() {

    // --- Inicialización ---
    function initialize() {
        loadUserData();
        loadUpcomingAppointments();
    }

    // --- Carga de Datos del Usuario y Perfil ---
    function loadUserData() {
        const welcomeMsg = document.getElementById('welcome-message');
        const usernameEl = document.getElementById('username');
        const profileInfoEl = document.getElementById('profile-info');
        const userAvatar = document.getElementById('user-avatar');

        fetch('/api/user-data')
            .then(response => {
                if (!response.ok) throw new Error('No se pudo cargar la información del perfil.');
                return response.json();
            })
            .then(data => {
                const firstName = data.nombre ? data.nombre.split(' ')[0] : 'Paciente';
                welcomeMsg.innerHTML = `<i class="fas fa-hand-holding-heart me-2 text-success"></i> ¡Bienvenido/a, ${firstName}!`;
                usernameEl.textContent = data.nombre || 'Paciente';
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=1E8449&color=fff`;

                profileInfoEl.innerHTML = `
                    <p><strong><i class="fas fa-id-card fa-fw me-2"></i>Cédula:</strong><br>${data.cedula || 'No disponible'}</p>
                    <p><strong><i class="fas fa-envelope fa-fw me-2"></i>Email:</strong><br>${data.email || 'No disponible'}</p>
                    <p><strong><i class="fas fa-phone fa-fw me-2"></i>Teléfono:</strong><br>${data.telefono || 'No disponible'}</p>
                `;
            })
            .catch(error => {
                console.error('Error al cargar datos del usuario:', error);
                profileInfoEl.innerHTML = `<div class="alert alert-danger small">${error.message}</div>`;
            });
    }

    // --- Carga de Próximas Citas ---
    function loadUpcomingAppointments() {
        const appointmentsList = document.getElementById('upcoming-appointments-list');

        fetch('/api/upcoming-appointments')
            .then(response => {
                if (!response.ok) throw new Error('No se pudieron cargar las citas.');
                return response.json();
            })
            .then(appointments => {
                appointmentsList.innerHTML = ''; 
                if (appointments.length === 0) {
                    appointmentsList.innerHTML = `
                        <div class="text-center text-muted py-5">
                            <i class="fas fa-calendar-check fa-3x mb-3"></i>
                            <p class="mb-0">¡Estás al día! No tienes citas próximas.</p>
                        </div>
                    `;
                    return;
                }

                appointments.forEach(appt => {
                    const appointmentCard = document.createElement('div');
                    appointmentCard.className = 'appointment-card';

                    const formattedDate = new Date(appt.date + 'T' + appt.time).toLocaleDateString('es-ES', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    });
                    const formattedTime = new Date(appt.date + 'T' + appt.time).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit'
                    });

                    appointmentCard.innerHTML = `
                        <div class="appointment-date">
                            <div class="day">${new Date(appt.date + 'T00:00:00').getDate()}</div>
                            <div class="month">${new Date(appt.date + 'T00:00:00').toLocaleString('es-ES', { month: 'short' })}</div>
                        </div>
                        <div class="appointment-details">
                            <h6 class="mb-1">Cita con Dr(a). ${appt.doctor_name || 'N/A'}</h6>
                            <p class="text-muted mb-1">
                                <i class="fas fa-calendar-alt fa-fw"></i> ${formattedDate}
                            </p>
                            <p class="text-muted mb-0">
                                <i class="fas fa-clock fa-fw"></i> ${formattedTime}
                            </p>
                        </div>
                        <div class="appointment-status">
                            <span class="badge bg-${getStatusBadgeColor(appt.status)}">${getStatusText(appt.status)}</span>
                        </div>
                    `;
                    appointmentsList.appendChild(appointmentCard);
                });
            })
            .catch(error => {
                console.error('Error al cargar próximas citas:', error);
                appointmentsList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
            });
    }

    // --- Funciones de Utilidad ---
    function getStatusBadgeColor(status) {
        switch (status) {
            case 'confirmada': return 'primary';
            case 'completada': return 'success';
            case 'pendiente': return 'warning';
            case 'cancelada': return 'danger';
            default: return 'secondary';
        }
    }

    function getStatusText(status) {
        if (!status) return 'Desconocido';
        return status.charAt(0).toUpperCase() + status.slice(1);
    }

    // --- Iniciar la aplicación ---
    initialize();
});