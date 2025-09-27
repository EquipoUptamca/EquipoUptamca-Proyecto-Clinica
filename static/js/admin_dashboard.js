document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos del usuario
    fetch('/api/user-data')
        .then(response => response.json())
        .then(data => {
            document.getElementById('username').textContent = data.nombre;
            document.getElementById('userrole').textContent = data.rol;
        })
        .catch(error => {
            console.error('Error al cargar datos del usuario:', error);
        });
    
    // Cargar estadísticas
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(stats => {
            const statsContainer = document.getElementById('stats-container');
            const statsData = [
    { 
        icon: 'user-md', 
        count: stats.doctors || 0, 
        label: 'Médicos',
        link: '/medicos',
        color: 'success'  // Cambiado a success para verde
    },
    { 
        icon: 'procedures', 
        count: stats.patients || 0, 
        label: 'Pacientes',
        link: '/pacientes',
        color: 'success'  // Cambiado a success para verde
    },
    { 
        icon: 'calendar-check', 
        count: stats.appointments || 0, 
        label: 'Citas Hoy',
        link: '/citas',
        color: 'info'  // Mantenido para contraste
    },
    { 
        icon: 'users', 
        count: stats.users || 0, 
        label: 'Usuarios',
        link: '/users',
        color: 'warning'  // Mantenido para contraste
    },
    { 
        icon: 'clock', 
        count: stats.pending_appointments || 0, 
        label: 'Citas Pendientes',
        link: '/citas?estado=pendiente',
        color: 'danger'  // Mantenido para indicar urgencia
    },
    { 
        icon: 'check-circle', 
        count: stats.weekly_completed || 0, 
        label: 'Completadas (7 días)',
        link: '/citas?estado=completada',
        color: 'success'  // Cambiado a success para verde
    }
];
            
            statsContainer.innerHTML = '';
            statsData.forEach(stat => {
                statsContainer.innerHTML += `
                    <div class="col-md-3 mb-3">
                        <a href="${stat.link}" class="text-decoration-none">
                            <div class="card stat-card">
                                <i class="fas fa-${stat.icon} fa-2x mb-2 text-${stat.color}"></i>
                                <h3 class="count">${stat.count}</h3>
                                <p class="label">${stat.label}</p>
                            </div>
                        </a>
                    </div>
                `;
            });
            
            // Mostrar notificación si hay citas pendientes
            if (stats.pending_appointments > 0) {
                document.getElementById('notificationText').textContent = 
                    `Tienes ${stats.pending_appointments} citas pendientes de confirmación.`;
                document.getElementById('notificationAlert').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error al cargar estadísticas:', error);
        });
    
    // Cargar próximas citas
    fetch('/api/upcoming-appointments')
        .then(response => response.json())
        .then(appointments => {
            const tableBody = document.querySelector('#upcoming-appointments tbody');
            tableBody.innerHTML = '';
            
            if (appointments.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="fas fa-calendar-times fa-2x mb-2"></i>
                            <p>No hay citas próximas</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            appointments.forEach(appt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${appt.id}</td>
                    <td>${appt.patient_name || 'N/A'}</td>
                    <td>${appt.doctor_name || 'N/A'}</td>
                    <td>${appt.date} ${appt.time}</td>
                    <td><span class="badge bg-${getStatusBadgeColor(appt.status)}">${getStatusText(appt.status)}</span></td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error al cargar próximas citas:', error);
        });
    
    // Cargar resumen del sistema
    fetch('/api/admin/stats')
        .then(response => response.json())
        .then(stats => {
            const summaryContainer = document.getElementById('system-summary');
            summaryContainer.innerHTML = `
                <div class="system-summary-item">
                    <span>Médicos activos:</span>
                    <span class="value">${stats.doctors || 0}</span>
                </div>
                <div class="system-summary-item">
                    <span>Pacientes activos:</span>
                    <span class="value">${stats.patients || 0}</span>
                </div>
                <div class="system-summary-item">
                    <span>Citas hoy:</span>
                    <span class="value">${stats.appointments || 0}</span>
                </div>
                <div class="system-summary-item">
                    <span>Usuarios totales:</span>
                    <span class="value">${stats.users || 0}</span>
                </div>
                <div class="system-summary-item">
                    <span>Citas pendientes:</span>
                    <span class="value">${stats.pending_appointments || 0}</span>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error al cargar resumen del sistema:', error);
        });
    
    document.getElementById('exportBtn').addEventListener('click', function() {
        alert('Funcionalidad de exportación en desarrollo');
    });
    
    document.getElementById('dateFilterBtn').addEventListener('click', function() {
        alert('Filtro de fecha en desarrollo');
    });

    // Cargar actividad reciente
    function loadRecentActivity() {
        fetch('/api/admin/recent-activity')
            .then(response => response.json())
            .then(activities => {
                const container = document.getElementById('recent-activity');
                container.innerHTML = ''; // Limpiar contenido previo

                if (!activities || activities.length === 0) {
                    container.innerHTML = '<p class="text-muted text-center mt-3">No hay actividad reciente para mostrar.</p>';
                    return;
                }

                const activityList = document.createElement('ul');
                activityList.className = 'list-group list-group-flush';

                activities.forEach(activity => {
                    const item = document.createElement('li');
                    item.className = 'list-group-item d-flex align-items-start border-0 px-0';

                    let iconHtml = '';
                    let textHtml = '';

                    switch (activity.type) {
                        case 'Médico':
                            iconHtml = '<i class="fas fa-user-md fa-lg text-success me-3 mt-1"></i>';
                            textHtml = `<div><strong>Nuevo Médico:</strong> ${activity.name} (${activity.specialty})</div>`;
                            break;
                        case 'Paciente':
                            iconHtml = '<i class="fas fa-user-plus fa-lg text-info me-3 mt-1"></i>';
                            textHtml = `<div><strong>Nuevo Paciente:</strong> ${activity.name}</div>`;
                            break;
                        case 'Cita':
                            iconHtml = '<i class="fas fa-calendar-check fa-lg text-warning me-3 mt-1"></i>';
                            textHtml = `<div><strong>Nueva Cita:</strong> ${activity.details}</div>`;
                            break;
                    }

                    item.innerHTML = `
                        ${iconHtml}
                        <div class="w-100">
                            ${textHtml}
                            <small class="text-muted">${timeAgo(activity.date)}</small>
                        </div>
                    `;
                    activityList.appendChild(item);
                });

                container.appendChild(activityList);
            })
            .catch(error => {
                console.error('Error al cargar actividad reciente:', error);
                const container = document.getElementById('recent-activity');
                container.innerHTML = '<p class="text-center text-danger">Error al cargar la actividad.</p>';
            });
    }

    // Función para inicializar el gráfico de citas
    function initAppointmentsChart(startDate, endDate) {
        let url = '/api/admin/appointments-chart';
        if (startDate && endDate) {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            url += `?${params.toString()}`;
        }

        fetch(url)
            .then(response => response.ok ? response.json() : Promise.reject('Error de red'))
            .then(chartData => {
                const ctx = document.getElementById('appointmentsChart').getContext('2d');
                if (window.myAppointmentsChart) window.myAppointmentsChart.destroy();

                window.myAppointmentsChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.labels.map(label => new Date(label + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })),
                        datasets: [{
                            label: 'Citas',
                            data: chartData.data,
                            backgroundColor: 'rgba(30, 132, 73, 0.6)',
                            borderColor: 'rgba(30, 132, 73, 1)',
                            borderWidth: 1,
                            borderRadius: 5,
                            hoverBackgroundColor: 'rgba(20, 90, 50, 0.8)'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1, callback: value => (value % 1 === 0 ? value : null) } } },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: '#145A32',
                                titleFont: { size: 14, weight: 'bold' },
                                bodyFont: { size: 12 },
                                callbacks: { label: context => ` Citas: ${context.parsed.y}` }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching appointments chart data:', error);
                const chartCanvas = document.getElementById('appointmentsChart');
                if (chartCanvas) chartCanvas.parentElement.innerHTML = '<p class="text-center text-danger my-5">No se pudo cargar el gráfico de citas.</p>';
            });
    }

    // Función para inicializar el gráfico de estado de citas
    function initStatusChart() {
        fetch('/api/admin/appointments-status-chart')
            .then(response => response.ok ? response.json() : Promise.reject('Error de red'))
            .then(chartData => {
                const ctx = document.getElementById('statusChart').getContext('2d');
                if (window.myStatusChart) window.myStatusChart.destroy();

                const statusColors = {
                    'Pendiente': { bg: 'rgba(255, 193, 7, 0.7)', border: 'rgba(255, 193, 7, 1)' },
                    'Completada': { bg: 'rgba(25, 135, 84, 0.7)', border: 'rgba(25, 135, 84, 1)' },
                    'Cancelada': { bg: 'rgba(220, 53, 69, 0.7)', border: 'rgba(220, 53, 69, 1)' }
                };
                const defaultColor = { bg: 'rgba(108, 117, 125, 0.7)', border: 'rgba(108, 117, 125, 1)' };

                window.myStatusChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'Citas',
                            data: chartData.data,
                            backgroundColor: chartData.labels.map(label => (statusColors[label] || defaultColor).bg),
                            borderColor: chartData.labels.map(label => (statusColors[label] || defaultColor).border),
                            borderWidth: 1,
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.label || '';
                                        if (label) { label += ': '; }
                                        if (context.parsed !== null) { label += context.parsed; }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching status chart data:', error);
                const chartCanvas = document.getElementById('statusChart');
                if (chartCanvas) chartCanvas.parentElement.innerHTML = '<p class="text-center text-danger my-5">No se pudo cargar el gráfico de estados.</p>';
            });
    }

    // Llamar a las funciones de inicialización
    document.getElementById('filterChartBtn').addEventListener('click', () => {
        const startDate = document.getElementById('chartDateFrom').value;
        const endDate = document.getElementById('chartDateTo').value;
        if (!startDate || !endDate) {
            alert('Por favor, seleccione una fecha de inicio y de fin.');
            return;
        }
        initAppointmentsChart(startDate, endDate);
    });

    document.getElementById('clearChartFilterBtn').addEventListener('click', () => {
        document.getElementById('chartDateFrom').value = '';
        document.getElementById('chartDateTo').value = '';
        initAppointmentsChart(); // Recarga con los valores por defecto
    });
    initAppointmentsChart();
    initStatusChart();
    loadRecentActivity();
    
    // Funciones auxiliares
    function getStatusBadgeColor(status) {
        switch(status) {
            case 'completada': return 'success';
            case 'pendiente': return 'warning';
            case 'cancelada': return 'danger';
            default: return 'secondary';
        }
    }
    
    function getStatusText(status) {
        switch(status) {
            case 'completada': return 'Completada';
            case 'pendiente': return 'Pendiente';
            case 'cancelada': return 'Cancelada';
            default: return status;
        }
    }

    function timeAgo(dateString) {
        // Reemplaza el espacio por 'T' y añade 'Z' para tratarla como UTC
        const date = new Date(dateString.replace(' ', 'T') + 'Z');
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
    
        let interval = seconds / 31536000;
        if (interval > 1) return `hace ${Math.floor(interval)} años`;
        
        interval = seconds / 2592000;
        if (interval > 1) return `hace ${Math.floor(interval)} meses`;
    
        interval = seconds / 86400;
        if (interval > 1) return `hace ${Math.floor(interval)} días`;
    
        interval = seconds / 3600;
        if (interval > 1) return `hace ${Math.floor(interval)} horas`;
    
        interval = seconds / 60;
        if (interval > 1) return `hace ${Math.floor(interval)} minutos`;
    
        return `hace unos segundos`;
    }
});