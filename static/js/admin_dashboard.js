document.addEventListener('DOMContentLoaded', function() {
    // Variables globales para las gráficas
    let myAppointmentsChart = null;
    let myStatusChart = null;

    // Inicializar la aplicación
    initDashboard();

    function initDashboard() {
        loadUserData();
        loadStatistics();
        loadUpcomingAppointments();
        loadSystemSummary();
        loadRecentActivity();
        initCharts();
        setupEventListeners();
    }

    // Cargar datos del usuario
    function loadUserData() {
        fetch('/api/user-data')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(data => {
                document.getElementById('username').textContent = data.nombre || 'Administrador';
                document.getElementById('userrole').textContent = data.rol || 'Admin';
            })
            .catch(error => {
                console.error('Error al cargar datos del usuario:', error);
                showToast('Error al cargar datos del usuario', 'error');
            });
    }

    // Cargar estadísticas
    function loadStatistics() {
        fetch('/api/admin/stats')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(stats => {
                updateStatsCards(stats);
                
                // Mostrar notificación si hay citas pendientes
                if (stats.pending_appointments > 0) {
                    document.getElementById('notificationText').textContent = 
                        `Tienes ${stats.pending_appointments} citas pendientes de confirmación.`;
                    document.getElementById('notificationAlert').style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error al cargar estadísticas:', error);
                showToast('Error al cargar estadísticas', 'error');
            });
    }

    // Actualizar tarjetas de estadísticas
    function updateStatsCards(stats) {
        const statsContainer = document.getElementById('stats-container');
        const statsData = [
            { 
                icon: 'user-md', 
                count: stats.doctors || 0, 
                label: 'Médicos',
                link: '/medicos',
                color: 'success'
            },
            { 
                icon: 'procedures', 
                count: stats.patients || 0, 
                label: 'Pacientes',
                link: '/pacientes',
                color: 'success'
            },
            { 
                icon: 'calendar-check', 
                count: stats.appointments || 0, 
                label: 'Citas Hoy',
                link: '/citas',
                color: 'info'
            },
            { 
                icon: 'users', 
                count: stats.users || 0, 
                label: 'Usuarios',
                link: '/users',
                color: 'warning'
            },
            { 
                icon: 'clock', 
                count: stats.pending_appointments || 0, 
                label: 'Citas Pendientes',
                link: '/citas?estado=pendiente',
                color: 'danger'
            },
            { 
                icon: 'check-circle', 
                count: stats.weekly_completed || 0, 
                label: 'Completadas (7 días)',
                link: '/citas?estado=completada',
                color: 'success'
            }
        ];
        
        statsContainer.innerHTML = '';
        statsData.forEach(stat => {
            statsContainer.innerHTML += `
                <div class="col-md-4 col-lg-3 mb-3">
                    <a href="${stat.link}" class="text-decoration-none">
                        <div class="card stat-card hover-lift">
                            <div class="card-body text-center p-4">
                                <i class="fas fa-${stat.icon} fa-2x mb-3 text-${stat.color}"></i>
                                <h3 class="count text-dark fw-bold">${stat.count}</h3>
                                <p class="label text-muted mb-0">${stat.label}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        });
    }

    // Cargar próximas citas
    function loadUpcomingAppointments() {
        fetch('/api/upcoming-appointments')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
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
                const tableBody = document.querySelector('#upcoming-appointments tbody');
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                            <p>Error al cargar las citas</p>
                        </td>
                    </tr>
                `;
            });
    }

    // Cargar resumen del sistema
    function loadSystemSummary() {
        fetch('/api/admin/stats')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
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
                    <div class="system-summary-item">
                        <span>Citas completadas (semana):</span>
                        <span class="value">${stats.weekly_completed || 0}</span>
                    </div>
                `;
            })
            .catch(error => {
                console.error('Error al cargar resumen del sistema:', error);
                const summaryContainer = document.getElementById('system-summary');
                summaryContainer.innerHTML = '<p class="text-danger">Error al cargar el resumen</p>';
            });
    }

    // Cargar actividad reciente
    function loadRecentActivity() {
        fetch('/api/admin/recent-activity')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(activities => {
                const container = document.getElementById('recent-activity');
                container.innerHTML = '';

                if (!activities || activities.length === 0) {
                    container.innerHTML = '<p class="text-muted text-center mt-3">No hay actividad reciente para mostrar.</p>';
                    return;
                }

                const activityList = document.createElement('ul');
                activityList.className = 'list-group list-group-flush';

                activities.forEach(activity => {
                    const item = document.createElement('li');
                    item.className = 'list-group-item d-flex align-items-start border-0 px-0 py-3';

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
                        default:
                            iconHtml = '<i class="fas fa-info-circle fa-lg text-secondary me-3 mt-1"></i>';
                            textHtml = `<div><strong>Actividad:</strong> ${activity.details || 'Sin detalles'}</div>`;
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

    // Inicializar gráficas
    function initCharts() {
        initAppointmentsChart();
        initStatusChart();
    }

    // Gráfica de rendimiento de citas
    function initAppointmentsChart(startDate = null, endDate = null) {
        let url = '/api/admin/appointments-chart';
        if (startDate && endDate) {
            const params = new URLSearchParams({
                start_date: startDate,
                end_date: endDate
            });
            url += `?${params.toString()}`;
        }

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(chartData => {
                const ctx = document.getElementById('appointmentsChart').getContext('2d');
                
                // Destruir gráfica existente si existe
                if (myAppointmentsChart) {
                    myAppointmentsChart.destroy();
                }

                myAppointmentsChart = new Chart(ctx, {
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
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    callback: value => (value % 1 === 0 ? value : null)
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                backgroundColor: '#145A32',
                                titleFont: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                bodyFont: {
                                    size: 12
                                },
                                callbacks: {
                                    label: context => ` Citas: ${context.parsed.y}`
                                }
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching appointments chart data:', error);
                const chartCanvas = document.getElementById('appointmentsChart');
                if (chartCanvas) {
                    chartCanvas.parentElement.innerHTML = `
                        <div class="text-center text-danger my-5">
                            <i class="fas fa-chart-bar fa-3x mb-3 opacity-50"></i>
                            <p>No se pudo cargar el gráfico de citas</p>
                            <button class="btn btn-sm btn-outline-danger mt-2" onclick="initAppointmentsChart()">
                                <i class="fas fa-redo me-1"></i> Reintentar
                            </button>
                        </div>
                    `;
                }
            });
    }

    // Gráfica de estado de citas
    function initStatusChart() {
        fetch('/api/admin/appointments-status-chart')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(chartData => {
                const ctx = document.getElementById('statusChart').getContext('2d');
                
                // Destruir gráfica existente si existe
                if (myStatusChart) {
                    myStatusChart.destroy();
                }

                const statusColors = {
                    'Pendiente': { bg: 'rgba(255, 193, 7, 0.7)', border: 'rgba(255, 193, 7, 1)' },
                    'Completada': { bg: 'rgba(25, 135, 84, 0.7)', border: 'rgba(25, 135, 84, 1)' },
                    'Cancelada': { bg: 'rgba(220, 53, 69, 0.7)', border: 'rgba(220, 53, 69, 1)' },
                    'Confirmada': { bg: 'rgba(13, 110, 253, 0.7)', border: 'rgba(13, 110, 253, 1)' }
                };
                
                const defaultColor = { bg: 'rgba(108, 117, 125, 0.7)', border: 'rgba(108, 117, 125, 1)' };

                myStatusChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'Citas',
                            data: chartData.data,
                            backgroundColor: chartData.labels.map(label => (statusColors[label] || defaultColor).bg),
                            borderColor: chartData.labels.map(label => (statusColors[label] || defaultColor).border),
                            borderWidth: 2,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true,
                                    pointStyle: 'circle'
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((value / total) * 100);
                                        return `${label}: ${value} (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        cutout: '60%'
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching status chart data:', error);
                const chartCanvas = document.getElementById('statusChart');
                if (chartCanvas) {
                    chartCanvas.parentElement.innerHTML = `
                        <div class="text-center text-danger my-5">
                            <i class="fas fa-chart-pie fa-3x mb-3 opacity-50"></i>
                            <p>No se pudo cargar el gráfico de estados</p>
                            <button class="btn btn-sm btn-outline-danger mt-2" onclick="initStatusChart()">
                                <i class="fas fa-redo me-1"></i> Reintentar
                            </button>
                        </div>
                    `;
                }
            });
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Filtro de gráfica de citas
        document.getElementById('filterChartBtn').addEventListener('click', () => {
            const startDate = document.getElementById('chartDateFrom').value;
            const endDate = document.getElementById('chartDateTo').value;
            if (!startDate || !endDate) {
                showToast('Por favor, seleccione una fecha de inicio y de fin.', 'error');
                return;
            }
            initAppointmentsChart(startDate, endDate);
            showToast('Filtro aplicado correctamente', 'success');
        });

        // Limpiar filtro de gráfica
        document.getElementById('clearChartFilterBtn').addEventListener('click', () => {
            document.getElementById('chartDateFrom').value = '';
            document.getElementById('chartDateTo').value = '';
            initAppointmentsChart();
            showToast('Filtro limpiado', 'info');
        });

        // Exportar PDF
        document.getElementById('exportChartsPdfBtn').addEventListener('click', function(e) {
            e.preventDefault();
            exportChartsToPdfAdvanced();
        });

        // Filtro de fecha
        document.getElementById('dateFilterBtn').addEventListener('click', function() {
            showToast('Funcionalidad de filtro de fecha en desarrollo', 'info');
        });

        // Actualizar datos cada 5 minutos
        setInterval(() => {
            loadStatistics();
            loadUpcomingAppointments();
        }, 300000); // 5 minutos
    }

    // FUNCIONES DE EXPORTACIÓN PDF

    // Función principal para exportar a PDF
    function exportChartsToPdfAdvanced(options = {}) {
        const {
            includeAppointmentsChart = true,
            includeStatusChart = true,
            includeStats = true,
            fileName = `reporte-citas-${new Date().toISOString().split('T')[0]}.pdf`
        } = options;

        // Mostrar indicador de carga
        const exportBtn = document.getElementById('exportChartsPdfBtn');
        const originalText = exportBtn.innerHTML;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Generando PDF...';
        exportBtn.disabled = true;

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let yPosition = 20;
            
            // Encabezado
            doc.setFontSize(20);
            doc.setTextColor(30, 102, 62);
            doc.text('Reporte de Citas - Dashboard', 105, yPosition, { align: 'center' });
            yPosition += 15;
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`, 105, yPosition, { align: 'center' });
            yPosition += 20;
            
            // Gráfica de rendimiento de citas
            if (includeAppointmentsChart && myAppointmentsChart) {
                const chartCanvas = document.getElementById('appointmentsChart');
                if (chartCanvas) {
                    // Verificar si necesitamos nueva página
                    if (yPosition > 150) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.setFontSize(16);
                    doc.setTextColor(30, 102, 62);
                    doc.text('Rendimiento de Citas', 20, yPosition);
                    yPosition += 10;
                    
                    const chartImage = chartCanvas.toDataURL('image/png', 1.0);
                    doc.addImage(chartImage, 'PNG', 20, yPosition, 170, 80);
                    yPosition += 95;
                }
            }
            
            // Gráfica de estado de citas
            if (includeStatusChart && myStatusChart) {
                const statusCanvas = document.getElementById('statusChart');
                if (statusCanvas) {
                    // Verificar si necesitamos nueva página
                    if (yPosition > 150) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.setFontSize(16);
                    doc.setTextColor(30, 102, 62);
                    doc.text('Distribución de Citas por Estado', 20, yPosition);
                    yPosition += 10;
                    
                    const statusImage = statusCanvas.toDataURL('image/png', 1.0);
                    doc.addImage(statusImage, 'PNG', 20, yPosition, 170, 80);
                    yPosition += 95;
                }
            }
            
            // Estadísticas
            if (includeStats) {
                if (yPosition > 180) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.setFontSize(16);
                doc.setTextColor(30, 102, 62);
                doc.text('Resumen de Estadísticas', 20, yPosition);
                yPosition += 15;
                
                const stats = getCurrentStats();
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                
                stats.forEach((stat, index) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(`${stat.label}:`, 20, yPosition);
                    doc.text(stat.value, 180, yPosition, { align: 'right' });
                    yPosition += 8;
                });
            }
            
            // Pie de página en todas las páginas
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Página ${i} de ${pageCount}`, 105, 285, { align: 'center' });
                doc.text('Sistema Clínico - Reporte Generado Automáticamente', 105, 290, { align: 'center' });
            }
            
            // Guardar PDF
            doc.save(fileName);
            
            // Mostrar mensaje de éxito
            showToast('PDF generado exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            showToast('Error al generar el PDF', 'error');
        } finally {
            // Restaurar botón
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }
    }

    // Función para exportar gráfica individual
    function exportChartToPdf(chartId, fileName) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const chartCanvas = document.getElementById(chartId);
            if (!chartCanvas) {
                showToast('No se encontró la gráfica especificada.', 'error');
                return;
            }
            
            // Título
            doc.setFontSize(18);
            doc.setTextColor(30, 102, 62);
            doc.text(getChartTitle(chartId), 105, 20, { align: 'center' });
            
            // Fecha
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 30, { align: 'center' });
            
            // Imagen de la gráfica
            const chartImage = chartCanvas.toDataURL('image/png', 1.0);
            doc.addImage(chartImage, 'PNG', 20, 40, 170, 120);
            
            // Pie de página
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Sistema Clínico - Reporte Generado Automáticamente', 105, 290, { align: 'center' });
            
            doc.save(fileName);
            showToast('Gráfica exportada exitosamente', 'success');
            
        } catch (error) {
            console.error('Error al exportar gráfica:', error);
            showToast('Error al exportar la gráfica', 'error');
        }
    }

    // FUNCIONES AUXILIARES

    // Obtener estadísticas actuales
    function getCurrentStats() {
        const stats = [];
        
        // Obtener estadísticas de las tarjetas
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const count = card.querySelector('.count')?.textContent || '0';
            const label = card.querySelector('.label')?.textContent || 'Sin etiqueta';
            stats.push({ label, value: count });
        });
        
        return stats;
    }

    // Obtener título de gráfica
    function getChartTitle(chartId) {
        const titles = {
            'appointmentsChart': 'Rendimiento de Citas',
            'statusChart': 'Distribución de Citas por Estado'
        };
        return titles[chartId] || 'Gráfica';
    }

    // Mostrar notificaciones toast
    function showToast(message, type = 'info') {
        // Crear toast dinámicamente si no existe
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        const toastId = 'toast-' + Date.now();
        const bgColor = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info';
        
        const toastHTML = `
            <div id="${toastId}" class="toast align-items-center text-white ${bgColor} border-0" role="alert">
                <div class="d-flex">
                    <div class="toast-body">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Mostrar toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
        
        // Remover del DOM después de ocultar
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    // Obtener color del badge según estado
    function getStatusBadgeColor(status) {
        switch(status) {
            case 'completada': return 'success';
            case 'pendiente': return 'warning';
            case 'cancelada': return 'danger';
            case 'confirmada': return 'info';
            default: return 'secondary';
        }
    }
    
    // Obtener texto del estado
    function getStatusText(status) {
        switch(status) {
            case 'completada': return 'Completada';
            case 'pendiente': return 'Pendiente';
            case 'cancelada': return 'Cancelada';
            case 'confirmada': return 'Confirmada';
            default: return status;
        }
    }

    // Función para mostrar tiempo relativo
    function timeAgo(dateString) {
        if (!dateString) return 'Fecha desconocida';
        
        try {
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
        } catch (error) {
            console.error('Error parsing date:', error);
            return 'Fecha inválida';
        }
    }

    // Hacer funciones disponibles globalmente para reintentos
    window.initAppointmentsChart = initAppointmentsChart;
    window.initStatusChart = initStatusChart;
    window.exportChartToPdf = exportChartToPdf;
});

// Inicializar el sidebar toggle
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
            document.getElementById('mainContent').classList.toggle('collapsed');
        });
    }
});