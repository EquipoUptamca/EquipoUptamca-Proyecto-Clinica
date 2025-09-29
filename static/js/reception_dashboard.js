document.addEventListener('DOMContentLoaded', function() {
    // Cache de elementos del DOM para un acceso más rápido y centralizado
    const elements = {
        todayAppointments: document.getElementById('today-appointments'),
        toConfirm: document.getElementById('to-confirm'),
        weeklyNewPatients: document.getElementById('weekly-new-patients'),
        pendingAppointments: document.getElementById('pending-appointments'),
        username: document.getElementById('username'),
        userRole: document.getElementById('userrole')
    };

    // Función reutilizable para actualizar una tarjeta de estadística
    const updateStatCard = (element, value, isError = false) => {
        if (element) {
            if (isError) {
                element.innerHTML = '<span class="text-danger" title="Error al cargar">Error</span>';
            } else {
                element.textContent = value;
            }
        }
    };

    const fetchStats = async () => {
        // Mostrar indicador de carga en todas las tarjetas
        const loadingSpinner = '<i class="fas fa-spinner fa-spin"></i>';
        Object.values(elements).forEach(el => {
            if (el) el.innerHTML = loadingSpinner;
        });

        try {
            const response = await fetch('/api/reception/stats');

            if (response.status === 401) {
                // Redirigir al login si la sesión ha expirado
                window.location.href = '/login?session_expired=true';
                return;
            }

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const stats = await response.json();

            // Actualizar las tarjetas con los datos recibidos
            updateStatCard(elements.todayAppointments, stats.today_appointments ?? 0);
            updateStatCard(elements.toConfirm, stats.to_confirm ?? 0);
            updateStatCard(elements.weeklyNewPatients, stats.weekly_new_patients ?? 0);
            updateStatCard(elements.pendingAppointments, stats.pending_appointments ?? 0);

        } catch (error) {
            console.error('Error en fetchStats:', error);
            // En caso de error, mostrarlo en todas las tarjetas
            Object.values(elements).forEach(el => {
                updateStatCard(el, null, true);
            });
        }
    };

    const fetchUserData = async () => {
        try {
            const response = await fetch('/api/user-data');
            if (!response.ok) {
                throw new Error('No se pudieron cargar los datos del usuario.');
            }
            const userData = await response.json();

            if (elements.username) {
                elements.username.textContent = userData.nombre || 'Usuario';
            }
            if (elements.userRole) {
                elements.userRole.textContent = userData.rol || 'Desconocido';
            }

            // Actualizar la imagen de perfil dinámicamente
            const profileImg = document.querySelector('.user-profile img');
            if (profileImg) {
                const nameInitial = (userData.nombre || 'R').charAt(0).toUpperCase();
                profileImg.src = `https://ui-avatars.com/api/?name=${nameInitial}&background=8E44AD&color=fff`;
            }

        } catch (error) {
            console.error('Error en fetchUserData:', error);
        }
    };

    // Cargar tanto las estadísticas como los datos del usuario al iniciar
    fetchStats();
    fetchUserData();
});