$(document).ready(function() {
    let activityTable = null;
    let newPatientsTable = null;
    let complianceTable = null;
    let doctorRankingTable = null;

    // Variables para almacenar instancias de gráficos
    let activityTimeSeriesChart = null;
    let activityStatusChart = null;
    let newPatientsTrendChart = null;
    let newPatientsGenderChart = null;
    let complianceChart = null;
    let doctorRankingChart = null;

    // --- INICIALIZACIÓN ---
    const initialize = () => {
        // Establecer fechas por defecto (últimos 30 días)
        const today = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30));
        $('#reportDateTo').val(today.toISOString().split('T')[0]);
        $('#reportDateFrom').val(thirtyDaysAgo.toISOString().split('T')[0]);

        setupEventListeners();
        // Generar reporte inicial al cargar la página
        generateReports();
    };

    const setupEventListeners = () => {
        $('#generateReportBtn').on('click', function(e) {
            e.preventDefault();
            generateReports();
        });

        // Listeners para botones de exportación
        $(document).on('click', '.export-excel', function() {
            const tableId = $(this).data('table');
            const table = $(`#${tableId}`).DataTable();
            if (table) {
                table.button('.buttons-excel').trigger();
            }
        });

        $(document).on('click', '.export-pdf', function() {
            const tableId = $(this).data('table');
            const table = $(`#${tableId}`).DataTable();
            if (table) {
                table.button('.buttons-pdf').trigger();
            }
        });
    };

    // --- LÓGICA DE REPORTES ---
    function generateReports() {
        const startDate = $('#reportDateFrom').val();
        const endDate = $('#reportDateTo').val();

        if (!startDate || !endDate) {
            showAlert('Por favor, seleccione un rango de fechas.', 'warning');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            showAlert('La fecha de inicio no puede ser mayor a la fecha final.', 'warning');
            return;
        }

        // Deshabilitar botón mientras se generan
        const btn = $('#generateReportBtn');
        const originalText = btn.html();
        btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Generando...');

        // Limpiar alertas anteriores
        clearAlerts();

        // Generar todos los reportes
        Promise.allSettled([
            generateActivityReport(startDate, endDate),
            generateNewPatientsReport(startDate, endDate),
            generateComplianceReport(startDate, endDate),
            generateOccupancyReport(startDate, endDate)
        ]).then((results) => {
            // Contar resultados exitosos
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;
            
            if (failed > 0) {
                showAlert(`Se completaron ${successful} reportes, ${failed} con errores.`, 'warning');
            } else {
                showAlert('Todos los reportes se generaron correctamente.', 'success');
            }
        }).finally(() => {
            // Siempre restaurar el botón
            restoreGenerateButton();
        });
    }

    function restoreGenerateButton() {
        const btn = $('#generateReportBtn');
        btn.prop('disabled', false).html('<i class="fas fa-sync-alt me-2"></i>Generar');
    }

    function generateActivityReport(startDate, endDate) {
        return new Promise((resolve, reject) => {
            $('#activityTable tbody').html('<tr><td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>');
            
            // Destruir gráficos anteriores
            destroyChart(activityTimeSeriesChart);
            destroyChart(activityStatusChart);

            fetch(`/api/reports/activity?start_date=${startDate}&end_date=${endDate}`)
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login'; // Redirigir si no está autenticado
                        throw new Error('Sesión expirada. Redirigiendo al login...');
                    }
                    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    if (!data || !data.time_series || !data.details) {
                        throw new Error("Datos de reporte de actividad incompletos.");
                    }

                    // 1. Gráfico de serie temporal (líneas)
                    const timeSeriesCtx = document.getElementById('activityTimeSeriesChart');
                    if (timeSeriesCtx) {
                        activityTimeSeriesChart = new Chart(timeSeriesCtx, {
                            type: 'line',
                            data: {
                                labels: data.time_series.labels,
                                datasets: [{
                                    label: 'Citas por Día',
                                    data: data.time_series.data,
                                    borderColor: 'rgb(26, 147, 111)',
                                    backgroundColor: 'rgba(26, 147, 111, 0.1)',
                                    tension: 0.4,
                                    fill: true,
                                    pointBackgroundColor: 'rgb(26, 147, 111)',
                                    pointBorderColor: '#fff',
                                    pointBorderWidth: 2,
                                    pointRadius: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Tendencia de Citas por Día',
                                        font: { size: 14, weight: 'bold' }
                                    },
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Número de Citas'
                                        },
                                        ticks: {
                                            stepSize: 1
                                        }
                                    },
                                    x: {
                                        title: {
                                            display: true,
                                            text: 'Fecha'
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // 2. Gráfico de estados (dona) - COLORES CORREGIDOS
                    const statusCtx = document.getElementById('activityStatusChart');
                    if (statusCtx && data.summary) {
                        const statusLabels = Object.keys(data.summary);
                        const statusData = Object.values(data.summary);
                        
                        // Colores para diferentes estados - CORREGIDOS
                        const statusColors = {
                            'programada': 'rgba(52, 152, 219, 0.8)',
                            'confirmada': 'rgba(243, 156, 18, 0.8)',
                            'completada': 'rgba(46, 204, 113, 0.8)',
                            'cancelada': 'rgba(231, 76, 60, 0.8)',
                            'pendiente': 'rgba(149, 165, 166, 0.8)',
                            'ausente': 'rgba(155, 89, 182, 0.8)'
                        };

                        const borderColors = {
                            'programada': 'rgba(52, 152, 219, 1)',
                            'confirmada': 'rgba(243, 156, 18, 1)',
                            'completada': 'rgba(46, 204, 113, 1)',
                            'cancelada': 'rgba(231, 76, 60, 1)',
                            'pendiente': 'rgba(149, 165, 166, 1)',
                            'ausente': 'rgba(155, 89, 182, 1)'
                        };

                        const backgroundColors = statusLabels.map(label => 
                            statusColors[label.toLowerCase()] || 'rgba(201, 203, 207, 0.8)'
                        );

                        const borderColorsArray = statusLabels.map(label => 
                            borderColors[label.toLowerCase()] || 'rgba(201, 203, 207, 1)'
                        );

                        activityStatusChart = new Chart(statusCtx, {
                            type: 'doughnut',
                            data: {
                                labels: statusLabels,
                                datasets: [{
                                    data: statusData,
                                    backgroundColor: backgroundColors,
                                    borderColor: borderColorsArray,
                                    borderWidth: 2
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Distribución por Estado',
                                        font: { size: 14, weight: 'bold' }
                                    },
                                    legend: {
                                        position: 'bottom'
                                    },
                                    tooltip: {
                                        callbacks: {
                                            label: function(context) {
                                                const label = context.label || '';
                                                const value = context.raw || 0;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = Math.round((value / total) * 100);
                                                return `${label}: ${value} (${percentage}%)`;
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }

                    // 3. Tabla de detalles
                    const details = data.details || [];
                    if (activityTable) activityTable.destroy();
                    activityTable = $('#activityTable').DataTable({
                        data: details,
                        columns: [
                            { 
                                data: 'fecha',
                                render: function(data) {
                                    return new Date(data).toLocaleDateString('es-ES');
                                }
                            },
                            { data: 'hora' },
                            { data: 'paciente' },
                            { data: 'medico' },
                            { data: 'especialidad' },
                            { 
                                data: 'estado',
                                render: function(data, type, row) {
                                    const statusClass = {
                                        'programada': 'badge bg-primary',
                                        'confirmada': 'badge bg-warning',
                                        'completada': 'badge bg-success',
                                        'cancelada': 'badge bg-danger',
                                        'pendiente': 'badge bg-secondary',
                                        'ausente': 'badge bg-info'
                                    }[data] || 'badge bg-light text-dark';
                                    
                                    return `<span class="${statusClass}">${data}</span>`;
                                }
                            }
                        ],
                        language: getDataTableSpanishConfig(),
                        dom: 'Bfrtip',
                        buttons: getExportButtons('Reporte_Actividad'),
                        responsive: true,
                        order: [[0, 'desc']],
                        pageLength: 10
                    });

                    resolve();
                })
                .catch(error => {
                    console.error('Error en reporte de actividad:', error);
                    $('#activityTable tbody').html(`<tr><td colspan="6" class="text-center text-danger">Error al cargar el reporte: ${error.message}</td></tr>`);
                    
                    // Mostrar mensaje en gráficos
                    showChartError('activityTimeSeriesChart', 'Error al cargar datos');
                    showChartError('activityStatusChart', 'Error al cargar datos');
                    reject(error);
                });
        });
    }

    function generateNewPatientsReport(startDate, endDate) {
        return new Promise((resolve, reject) => {
            $('#newPatientsTable tbody').html('<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>');

            // Destruir gráficos anteriores
            destroyChart(newPatientsTrendChart);
            destroyChart(newPatientsGenderChart);

            fetch(`/api/reports/new-patients?start_date=${startDate}&end_date=${endDate}`)
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Sesión expirada. Redirigiendo al login...');
                    }
                    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    console.log('Datos recibidos para pacientes nuevos:', data);
                    
                    if (!data) {
                        throw new Error("No se recibieron datos del servidor.");
                    }

                    // Actualizar resumen de pacientes
                    updatePatientsSummary(data);

                    // 1. Gráfico de tendencia
                    const trendCtx = document.getElementById('newPatientsTrendChart');
                    if (trendCtx) {
                        if (data.time_series && data.time_series.labels.length > 0) {
                            newPatientsTrendChart = new Chart(trendCtx, {
                                type: 'bar',
                                data: {
                                    labels: data.time_series.labels,
                                    datasets: [{
                                        label: 'Nuevos Pacientes',
                                        data: data.time_series.data,
                                        backgroundColor: 'rgba(75, 192, 192, 0.8)',
                                        borderColor: 'rgba(75, 192, 192, 1)',
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: 'Registro de Nuevos Pacientes por Día',
                                            font: { size: 14, weight: 'bold' }
                                        },
                                        legend: {
                                            display: false
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                stepSize: 1
                                            },
                                            title: {
                                                display: true,
                                                text: 'Número de Pacientes'
                                            }
                                        },
                                        x: {
                                            title: {
                                                display: true,
                                                text: 'Fecha'
                                            }
                                        }
                                    }
                                }
                            });
                        } else {
                            showChartError('newPatientsTrendChart', 'No hay datos para mostrar');
                        }
                    }

                    // 2. Gráfico de género - COLORES CORREGIDOS
                    const genderCtx = document.getElementById('newPatientsGenderChart');
                    if (genderCtx) {
                        const genderData = data.gender_summary || {};
                        console.log('Datos de género para gráfico:', genderData);
                        
                        const labels = Object.keys(genderData).filter(k => genderData[k] > 0);
                        const values = labels.map(k => genderData[k]);

                        if (values.length > 0 && values.some(v => v > 0)) {
                            const colorMap = {
                                'Masculino': 'rgba(54, 162, 235, 0.8)',
                                'Femenino': 'rgba(255, 99, 132, 0.8)',
                                'No especificado': 'rgba(201, 203, 207, 0.8)'
                            };
                            
                            const borderColorMap = {
                                'Masculino': 'rgba(54, 162, 235, 1)',
                                'Femenino': 'rgba(255, 99, 132, 1)',
                                'No especificado': 'rgba(201, 203, 207, 1)'
                            };
                            
                            const backgroundColors = labels.map(label => colorMap[label] || colorMap['No especificado']);
                            const borderColors = labels.map(label => borderColorMap[label] || borderColorMap['No especificado']);

                            newPatientsGenderChart = new Chart(genderCtx, {
                                type: 'doughnut',
                                data: {
                                    labels: labels,
                                    datasets: [{
                                        data: values,
                                        backgroundColor: backgroundColors,
                                        borderColor: borderColors,
                                        borderWidth: 3,
                                        hoverOffset: 15
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        title: {
                                            display: true,
                                            text: 'Distribución por Género',
                                            font: { size: 14, weight: 'bold' }
                                        },
                                        legend: {
                                            position: 'bottom',
                                            labels: {
                                                padding: 20,
                                                usePointStyle: true,
                                                font: {
                                                    size: 12
                                                }
                                            }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function(context) {
                                                    const label = context.label || '';
                                                    const value = context.raw || 0;
                                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                    const percentage = Math.round((value / total) * 100);
                                                    return `${label}: ${value} paciente${value !== 1 ? 's' : ''} (${percentage}%)`;
                                                }
                                            }
                                        }
                                    },
                                    cutout: '45%'
                                }
                            });
                        } else {
                            showChartError('newPatientsGenderChart', 'No hay datos de género disponibles');
                        }
                    }

                    // 3. Tabla de pacientes
                    const patientsData = data.details || [];
                    if (newPatientsTable) {
                        newPatientsTable.destroy();
                    }
                    
                    newPatientsTable = $('#newPatientsTable').DataTable({
                        data: patientsData,
                        columns: [
                            { 
                                data: 'nombre_completo',
                                render: function(data) {
                                    return data || 'No especificado';
                                }
                            },
                            { 
                                data: 'cedula',
                                render: function(data) {
                                    return data || 'No especificado';
                                }
                            },
                            { 
                                data: 'telefono',
                                render: function(data) {
                                    return data || 'No especificado';
                                }
                            },
                            { 
                                data: 'email',
                                render: function(data) {
                                    return data || 'No especificado';
                                }
                            },
                            { 
                                data: 'fecha_registro',
                                render: function(data) {
                                    if (data) {
                                        return new Date(data).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        });
                                    }
                                    return 'No especificado';
                                }
                            }
                        ],
                        language: getDataTableSpanishConfig(),
                        dom: 'Bfrtip',
                        buttons: getExportButtons('Reporte_Pacientes_Nuevos'),
                        responsive: true,
                        order: [[4, 'desc']],
                        pageLength: 10,
                        lengthMenu: [10, 25, 50, 100]
                    });

                    resolve();
                })
                .catch(error => {
                    console.error('Error en reporte de pacientes nuevos:', error);
                    $('#newPatientsTable tbody').html(`<tr><td colspan="5" class="text-center text-danger">Error al cargar el reporte: ${error.message}</td></tr>`);
                    
                    showChartError('newPatientsTrendChart', 'Error al cargar datos');
                    showChartError('newPatientsGenderChart', 'Error al cargar datos');
                    reject(error);
                });
        });
    }

    function generateComplianceReport(startDate, endDate) {
        return new Promise((resolve, reject) => {
            $('#complianceTable tbody').html('<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>');
            
            // Destruir gráfico anterior
            destroyChart(complianceChart);

            fetch(`/api/reports/appointment-compliance?start_date=${startDate}&end_date=${endDate}`)
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Sesión expirada. Redirigiendo al login...');
                    }
                    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    if (!data || !data.summary) {
                        throw new Error("Datos de reporte de cumplimiento incompletos.");
                    }

                    // Gráfico de cumplimiento - COLORES CORREGIDOS
                    const ctx = document.getElementById('complianceChart');
                    if (ctx) {
                        const labels = Object.keys(data.summary);
                        const values = Object.values(data.summary);
                        
                        // PALETA DE COLORES CORREGIDA - Usar colores sólidos en formato rgba
                        const colorMap = {
                            'Completada': 'rgba(46, 204, 113, 0.8)',
                            'Cancelada': 'rgba(231, 76, 60, 0.8)',
                            'Ausente': 'rgba(155, 89, 182, 0.8)',
                            'Programada': 'rgba(52, 152, 219, 0.8)',
                            'Confirmada': 'rgba(243, 156, 18, 0.8)',
                            'Pendiente': 'rgba(149, 165, 166, 0.8)'
                        };

                        const borderColorMap = {
                            'Completada': 'rgba(46, 204, 113, 1)',
                            'Cancelada': 'rgba(231, 76, 60, 1)', 
                            'Ausente': 'rgba(155, 89, 182, 1)',
                            'Programada': 'rgba(52, 152, 219, 1)',
                            'Confirmada': 'rgba(243, 156, 18, 1)',
                            'Pendiente': 'rgba(149, 165, 166, 1)'
                        };

                        const backgroundColors = labels.map((label, index) => 
    colorMap[label] || ['rgba(46, 204, 113, 0.8)', 'rgba(231, 76, 60, 0.8)', 'rgba(243, 156, 18, 0.8)' ][index % 3]
);

                        const borderColors = labels.map(label => 
                            borderColorMap[label] || 'rgba(243, 239, 18, 1)'
                        );

                        const hoverBackgroundColors = labels.map(label => 
                            colorMap[label] ? colorMap[label].replace('0.8', '1') : 'rgba(135, 37, 155, 1)'
                        );

                        complianceChart = new Chart(ctx, { 
                            type: 'doughnut',
                            data: {
                                labels: labels,
                                datasets: [{
                                    data: values,
                                    backgroundColor: backgroundColors,
                                    borderColor: borderColors,
                                    borderWidth: 3,
                                    hoverBackgroundColor: hoverBackgroundColors,
                                    hoverBorderColor: borderColors,
                                    hoverBorderWidth: 4
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Distribución de Estados de Citas',
                                        font: { 
                                            size: 16, 
                                            weight: 'bold',
                                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                                        },
                                        color: '#2c3e50',
                                        padding: 20
                                    },
                                    legend: {
                                        position: 'bottom',
                                        labels: {
                                            padding: 20,
                                            usePointStyle: true,
                                            pointStyle: 'circle',
                                            font: {
                                                size: 12,
                                                weight: '600'
                                            },
                                            color: '#34495e'
                                        }
                                    },
                                    tooltip: {
                                        backgroundColor: 'rgba(44, 62, 80, 0.9)',
                                        titleFont: {
                                            size: 13,
                                            weight: 'bold'
                                        },
                                        bodyFont: {
                                            size: 12
                                        },
                                        padding: 12,
                                        cornerRadius: 8,
                                        callbacks: {
                                            label: function(context) {
                                                const label = context.label || '';
                                                const value = context.raw || 0;
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const percentage = Math.round((value / total) * 100);
                                                return `${label}: ${value} cita${value !== 1 ? 's' : ''} (${percentage}%)`;
                                            }
                                        }
                                    }
                                },
                                cutout: '50%',
                                animation: {
                                    animateScale: true,
                                    animateRotate: true
                                }
                            }
                        });
                    }

                    // Actualizar resumen numérico
                    updateComplianceSummary(data.summary);

                    // Tabla de detalles
                    const details = data.details || [];
                    if (complianceTable) complianceTable.destroy();
                    complianceTable = $('#complianceTable').DataTable({
                        data: details,
                        columns: [
                            { 
                                data: 'fecha',
                                render: function(data) {
                                    const date = new Date(data);
                                    return `
                                        <div class="text-center">
                                            <div class="fw-bold">${date.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                                            <div>${date.toLocaleDateString('es-ES')}</div>
                                        </div>
                                    `;
                                }
                            },
                            { 
                                data: 'paciente',
                                render: function(data) {
                                    return `<strong class="text-dark">${data}</strong>`;
                                }
                            },
                            { 
                                data: 'medico',
                                render: function(data) {
                                    return `<span class="text-primary">${data}</span>`;
                                }
                            },
                            { 
                                data: 'estado',
                                render: function(data, type, row) {
                                    const statusConfig = {
                                        'Completada': { class: 'badge-estado status-completada', icon: 'fa-check-circle' },
                                        'Cancelada': { class: 'badge-estado status-cancelada', icon: 'fa-times-circle' },
                                        'Ausente': { class: 'badge-estado status-ausente', icon: 'fa-user-slash' },
                                        'Programada': { class: 'badge-estado status-programada', icon: 'fa-calendar' },
                                        'Confirmada': { class: 'badge-estado status-confirmada', icon: 'fa-calendar-check' },
                                        'Pendiente': { class: 'badge-estado status-pendiente', icon: 'fa-clock' }
                                    };
                                    
                                    const config = statusConfig[data] || { class: 'badge-estado bg-light text-dark', icon: 'fa-question-circle' };
                                    
                                    return `
                                        <span class="${config.class} position-relative overflow-hidden">
                                            <i class="fas ${config.icon} me-1"></i>
                                            ${data}
                                        </span>
                                    `;
                                }
                            }
                        ],
                        language: getDataTableSpanishConfig(),
                        dom: 'Bfrtip',
                        buttons: getExportButtons('Reporte_Cumplimiento'),
                        responsive: true,
                        order: [[0, 'desc']],
                        pageLength: 10,
                        createdRow: function(row, data, dataIndex) {
                            $(row).addClass('transition-all');
                        }
                    });

                    resolve();
                })
                .catch(error => {
                    console.error('Error en reporte de cumplimiento:', error);
                    $('#complianceTable tbody').html(`<tr><td colspan="4" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i>Error al cargar el reporte: ${error.message}</td></tr>`);
                    showChartError('complianceChart', 'Error al cargar datos');
                    reject(error);
                });
        });
    }

    function generateOccupancyReport(startDate, endDate) {
        return new Promise((resolve, reject) => {
            $('#heatmap-body').html('<tr><td colspan="8" class="text-center"><div class="spinner-border spinner-border-sm"></div> Cargando...</td></tr>');

            // Destruir gráfico anterior
            destroyChart(doctorRankingChart);

            fetch(`/api/reports/doctor-occupancy?start_date=${startDate}&end_date=${endDate}`)
                .then(response => {
                    if (response.status === 401) {
                        window.location.href = '/login';
                        throw new Error('Sesión expirada. Redirigiendo al login...');
                    }
                    if (!response.ok) throw new Error(`Error del servidor: ${response.statusText}`);
                    return response.json();
                })
                .then(data => {
                    if (!data || !data.heatmap || !data.ranking) {
                        throw new Error("Datos de reporte de ocupación incompletos.");
                    }

                    // 1. Renderizar Heatmap
                    renderHeatmap(data.heatmap);

                    // 2. Gráfico de Ranking de Médicos
                    const rankingCtx = document.getElementById('doctorRankingChart');
                    if (rankingCtx && data.ranking.labels.length > 0) {
                        doctorRankingChart = new Chart(rankingCtx, {
                            type: 'bar',
                            data: {
                                labels: data.ranking.labels,
                                datasets: [{
                                    label: 'Total de Citas',
                                    data: data.ranking.data,
                                    backgroundColor: 'rgba(26, 147, 111, 0.8)',
                                    borderColor: 'rgba(26, 147, 111, 1)',
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                indexAxis: 'y',
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    title: {
                                        display: true,
                                        text: 'Top 10 Médicos con Mayor Carga',
                                        font: { size: 14, weight: 'bold' }
                                    },
                                    legend: {
                                        display: false
                                    }
                                },
                                scales: {
                                    x: {
                                        beginAtZero: true,
                                        title: {
                                            display: true,
                                            text: 'Número de Citas'
                                        }
                                    }
                                }
                            }
                        });
                    } else if (rankingCtx) {
                        showChartError('doctorRankingChart', 'No hay datos para mostrar');
                    }

                    // 3. Tabla de Ranking para exportación
                    updateDoctorRankingTable(data.ranking);

                    resolve();
                })
                .catch(error => {
                    console.error('Error en reporte de ocupación:', error);
                    $('#heatmap-body').html(`<tr><td colspan="8" class="text-center text-danger">Error al cargar el mapa de calor.</td></tr>`);
                    showChartError('doctorRankingChart', 'Error al cargar datos');
                    reject(error);
                });
        });
    }

    // --- FUNCIONES AUXILIARES MEJORADAS ---

    function destroyChart(chartInstance) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        return null;
    }

    function renderHeatmap(heatmapData) {
        const heatmapGrid = {};
        const dateFirst = 1; // 1 for Monday, 7 for Sunday

        heatmapData.forEach(item => {
            let dayIndex = (item.day - dateFirst + 7) % 7; // 0=Lunes, 6=Domingo
            if (!heatmapGrid[item.hour]) heatmapGrid[item.hour] = Array(7).fill(0);
            heatmapGrid[item.hour][dayIndex] = item.count;
        });

        const heatmapBody = $('#heatmap-body');
        heatmapBody.empty();
        
        for (let hour = 7; hour <= 20; hour++) {
            let rowHtml = `<tr><th class="bg-light">${hour}:00</th>`;
            for (let day = 0; day < 7; day++) {
                const count = heatmapGrid[hour]?.[day] || 0;
                const color = getHeatmapColor(count);
                const textColor = count > 0 ? '#fff' : '#000';
                rowHtml += `<td style="background-color: ${color}; color: ${textColor}; font-weight: bold;" title="${getDayName(day)} ${hour}:00 - ${count} citas">${count > 0 ? count : ''}</td>`;
            }
            rowHtml += '</tr>';
            heatmapBody.append(rowHtml);
        }
    }

    function getDayName(dayIndex) {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return days[dayIndex] || 'Día';
    }

    function getHeatmapColor(value) {
        if (value === 0) return '#f8f9fa';
        if (value <= 2) return '#cce5ff';
        if (value <= 5) return '#99ccff';
        if (value <= 10) return '#66b3ff';
        if (value <= 15) return '#3399ff';
        if (value <= 20) return '#007bff';
        return '#0056b3';
    }

    function updatePatientsSummary(data) {
        const summaryContainer = $('#patientsSummary');
        const totalPacientes = data.total_pacientes || data.details?.length || 0;
        const genderData = data.gender_summary || {};
        
        summaryContainer.html(`
            <div class="col-md-3">
                <div class="card text-center border-primary">
                    <div class="card-body">
                        <h3 class="text-primary">${totalPacientes}</h3>
                        <p class="text-muted mb-0">Total Pacientes</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center border-info">
                    <div class="card-body">
                        <h3 class="text-info">${genderData.Masculino || 0}</h3>
                        <p class="text-muted mb-0">Masculino</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center border-danger">
                    <div class="card-body">
                        <h3 class="text-danger">${genderData.Femenino || 0}</h3>
                        <p class="text-muted mb-0">Femenino</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center border-secondary">
                    <div class="card-body">
                        <h3 class="text-secondary">${genderData['No especificado'] || 0}</h3>
                        <p class="text-muted mb-0">No Especificado</p>
                    </div>
                </div>
            </div>
        `);
    }

    function updateComplianceSummary(summaryData) {
        const summaryContainer = $('#complianceSummary');
        summaryContainer.empty();
        
        // Ordenar por cantidad (opcional)
        const sortedEntries = Object.entries(summaryData).sort((a, b) => b[1] - a[1]);
        
        sortedEntries.forEach(([status, count]) => {
            const colorClass = {
                'Completada': 'text-success',
                'Cancelada': 'text-danger',
                'Ausente': 'text-secondary',
                'Programada': 'text-primary',
                'Confirmada': 'text-warning'
            }[status] || 'text-dark';
            
            const iconClass = {
                'Completada': 'fa-check-circle',
                'Cancelada': 'fa-times-circle',
                'Ausente': 'fa-user-slash',
                'Programada': 'fa-calendar',
                'Confirmada': 'fa-calendar-check'
            }[status] || 'fa-question-circle';
            
            summaryContainer.append(`
                <div class="col-md-3 col-6 mb-3">
                    <div class="card gradient-border h-100">
                        <div class="card-body text-center py-4">
                            <i class="fas ${iconClass} ${colorClass} fa-2x mb-3"></i>
                            <h3 class="${colorClass} mb-2 contador-animado">${count}</h3>
                            <small class="text-muted fw-bold text-uppercase">${status}</small>
                        </div>
                    </div>
                </div>
            `);
        });
    }

    function updateDoctorRankingTable(rankingData) {
        const rankingDetails = rankingData.labels.map((label, index) => ({
            medico: label,
            citas: rankingData.data[index]
        }));

        if (doctorRankingTable) doctorRankingTable.destroy();
        doctorRankingTable = $('#doctorRankingTable').DataTable({
            data: rankingDetails,
            columns: [
                { data: 'medico' },
                { data: 'citas' }
            ],
            dom: 'B',
            buttons: getExportButtons('Ranking_Medicos'),
            ordering: false,
            searching: false,
            paging: false,
            info: false
        });
    }

    function showChartError(canvasId, message) {
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#6c757d';
            ctx.font = '14px Arial';
            ctx.fillText(message, canvas.width / 2, canvas.height / 2);
        }
    }

    function showAlert(message, type = 'info') {
        // Crear alerta Bootstrap
        const alertClass = {
            'success': 'alert-success',
            'warning': 'alert-warning',
            'error': 'alert-danger',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        // Insertar al inicio del contenido principal
        $('.main-content .container-fluid').prepend(alertHtml);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            $(`.alert`).alert('close');
        }, 5000);
    }

    function clearAlerts() {
        $('.alert').alert('close');
    }

    function getDataTableSpanishConfig() {
        return {
            "decimal": ",",
            "thousands": ".",
            "lengthMenu": "Mostrar _MENU_ registros por página",
            "zeroRecords": "No se encontraron resultados",
            "info": "Mostrando _START_ a _END_ de _TOTAL_ registros",
            "infoEmpty": "Mostrando 0 a 0 de 0 registros",
            "infoFiltered": "(filtrado de _MAX_ registros totales)",
            "search": "Buscar:",
            "paginate": {
                "first": "Primero",
                "last": "Último",
                "next": "Siguiente",
                "previous": "Anterior"
            }
        };
    }

    function getExportButtons(fileName) {
        const today = new Date().toISOString().slice(0, 10);
        return [
            {
                extend: 'excelHtml5',
                title: `${fileName}_${today}`,
                text: '<i class="fas fa-file-excel me-1"></i> Excel',
                className: 'btn btn-sm btn-success me-1'
            },
            {
                extend: 'pdfHtml5',
                title: `${fileName} - ${today}`,
                text: '<i class="fas fa-file-pdf me-1"></i> PDF',
                orientation: 'landscape',
                className: 'btn btn-sm btn-danger'
            }
        ];
    }

    // Inicializar la aplicación
    initialize();
});