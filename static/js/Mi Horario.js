// Mi Horario.js - VERSIÓN COMPLETAMENTE ACTUALIZADA
// Inicialización cuando el documento está listo
document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let currentWeek = new Date();
    let mySchedule = {};
    let appointments = [];
    let debugMode = false;

    initializeWeek();
    loadMySchedule();
    setupEventListeners();

    // Navegación de semanas
    document.getElementById('prevWeekBtn').addEventListener('click', function() {
        currentWeek.setDate(currentWeek.getDate() - 7);
        initializeWeek();
        loadMySchedule();
    });

    document.getElementById('nextWeekBtn').addEventListener('click', function() {
        currentWeek.setDate(currentWeek.getDate() + 7);
        initializeWeek();
        loadMySchedule();
    });

    document.getElementById('currentWeekBtn').addEventListener('click', function() {
        currentWeek = new Date();
        initializeWeek();
        loadMySchedule();
    });

    // Imprimir horario
    document.getElementById('printScheduleBtn').addEventListener('click', function() {
        window.print();
    });

    // Botón de debug
    document.getElementById('debugBtn').addEventListener('click', function() {
        debugMode = !debugMode;
        document.getElementById('debugInfo').style.display = debugMode ? 'block' : 'none';
        updateDebugInfo();
        this.classList.toggle('btn-warning', debugMode);
        this.classList.toggle('btn-outline-info', !debugMode);
    });

    // Cerrar modal con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleDetailModal'));
            if (modal) modal.hide();
        }
    });

    // --- FUNCIONES PRINCIPALES ---

    // Inicializar la semana actual
    function initializeWeek() {
        const startOfWeek = getStartOfWeek(currentWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        // Actualizar el rango de fechas
        const weekRangeText = `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
        const weekRangeElement = document.getElementById('weekRange');
        weekRangeElement.textContent = weekRangeText;

        // Actualizar también el header de impresión
        const printWeekRangeElement = document.getElementById('printWeekRange');
        if (printWeekRangeElement) {
            printWeekRangeElement.textContent = weekRangeText;
        }

        // Actualizar fecha de impresión
        document.getElementById('printDate').textContent = new Date().toLocaleDateString('es-ES');

        // Actualizar número de semana
        const weekNumber = getWeekNumber(startOfWeek);
        document.getElementById('weekNumber').textContent = `Semana ${weekNumber}`;

        // Actualizar fechas de los días
        updateDayDates(startOfWeek);

        // Generar la tabla de horarios
        generateScheduleTable();
        
        // Diagnóstico
        diagnoseSchedule();
    }

    // Obtener el inicio de la semana (lunes)
    function getStartOfWeek(date) {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
        const startOfWeek = new Date(date);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        return startOfWeek;
    }

    // Obtener el número de semana
    function getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    // Formatear fecha a DD/MM/YYYY
    function formatDate(date) {
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Actualizar las fechas de los días en la tabla
    function updateDayDates(startOfWeek) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        days.forEach((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            
            const dateElement = document.getElementById(`${day}Date`);
            if (dateElement) {
                dateElement.textContent = dayDate.getDate();
                
                // Resaltar el día actual
                const today = new Date();
                if (dayDate.toDateString() === today.toDateString()) {
                    dateElement.classList.add('badge', 'bg-primary');
                } else {
                    dateElement.classList.remove('badge', 'bg-primary');
                }
            }
        });
    }

    // Generar la tabla de horarios - FUNCIÓN COMPLETAMENTE CORREGIDA
    function generateScheduleTable() {
        const scheduleBody = document.getElementById('scheduleBody');
        if (!scheduleBody) {
            console.error('❌ No se encontró el elemento scheduleBody');
            return;
        }
        
        scheduleBody.innerHTML = '';
        const startOfWeek = getStartOfWeek(currentWeek);

        console.log('=== GENERANDO TABLA ===');
        console.log('Semana:', startOfWeek.toDateString());
        console.log('Total de citas:', appointments.length);
        console.log('Horarios cargados:', mySchedule);

        // Generar filas para cada 30 minutos (de 7:00 a 21:00)
        for (let hour = 7; hour <= 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const row = document.createElement('tr');
                const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

                // Celda de hora
                const timeCell = document.createElement('td');
                timeCell.className = 'time-column';
                timeCell.textContent = timeSlot;
                row.appendChild(timeCell);

                // Celdas para cada día de la semana
                for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                    const dayCell = document.createElement('td');
                    const dayName = getDayName(dayIndex + 1);
                    const dayDate = new Date(startOfWeek);
                    dayDate.setDate(startOfWeek.getDate() + dayIndex);

                    const appointment = findAppointment(dayDate, timeSlot);

                    if (appointment) {
                        // --- IMPLEMENTACIÓN DE LA LÓGICA SOLICITADA ---
                        // Si se encuentra una cita, se aplica el estilo y se muestra el nombre del paciente.
                        dayCell.classList.add('slot-appointment');
                        dayCell.innerHTML = `
                            <div class="d-flex flex-column align-items-center text-center">
                                <i class="fas fa-user-injured mb-1"></i>
                                <span class="fw-bold" style="font-size: 0.8rem;">${appointment.paciente_nombre}</span>
                            </div>
                        `;
                        // Se añade el data-attribute para poder abrir el modal con detalles
                        dayCell.dataset.appointmentId = appointment.id_cita;
                        // Se mantiene la funcionalidad de click para ver detalles
                        dayCell.onclick = () => showScheduleDetails(dayIndex + 1, timeSlot, 'appointment', appointment);
                        dayCell.title = `${appointment.paciente_nombre} - ${appointment.motivo_consulta}`;

                    } else if (isTimeInSchedule(mySchedule[dayName], timeSlot)) {
                        dayCell.className = 'slot-available';
                        dayCell.innerHTML = '<div class="text-center">Disponible</div>';
                        dayCell.onclick = () => showScheduleDetails(dayIndex + 1, timeSlot, 'available');
                    } else {
                        dayCell.className = 'slot-unavailable';
                        dayCell.innerHTML = '-';
                        dayCell.onclick = null;
                    }
                    row.appendChild(dayCell);
                }
                scheduleBody.appendChild(row);
            }
        }
        
        updateDebugInfo();
        console.log('=== TABLA GENERADA ===');
    }

    // Obtener nombre del día a partir del número - FUNCIÓN CORREGIDA
    function getDayName(dayNumber) {
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        return days[dayNumber - 1]; // -1 porque los arrays empiezan en 0
    }

    // Verificar si una hora está dentro de un horario
    function isTimeInSchedule(daySchedule, time) {
        if (!daySchedule || daySchedule.length === 0) return false;
        
        for (const schedule of daySchedule) {
            const startTime = schedule.hora_inicio.substring(0, 5);
            const endTime = schedule.hora_fin.substring(0, 5);
            
            if (time >= startTime && time < endTime) {
                return true;
            }
        }
        return false;
    }

    // Buscar citas programadas - FUNCIÓN COMPLETAMENTE CORREGIDA
    function findAppointment(date, time) {
        const dateStr = formatDateForAPI(date);
        
        if (debugMode) {
            console.log(`🔍 Buscando cita para: ${dateStr} a las ${time}`);
        }
        
        // Asegurarse de que el formato de tiempo sea consistente (HH:MM)
        const normalizedTime = time.length === 4 ? `0${time}` : time;
        
        const foundAppointment = appointments.find(appt => {
            // Comparar fechas y horas normalizadas
            const apptDate = appt.fecha_cita;
            const apptTime = appt.hora_cita.length === 4 ? `0${appt.hora_cita}` : appt.hora_cita;
            
            const matchesDate = apptDate === dateStr;
            const matchesTime = apptTime === normalizedTime;
            
            if (matchesDate && matchesTime) {
                console.log('✅ Cita ENCONTRADA:', appt);
                return true;
            }
            
            if (debugMode && matchesDate) {
                console.log('❌ Hora no coincide:', appt.hora_cita, 'vs', time);
            }
            
            return false;
        });
        
        if (!foundAppointment && debugMode) {
            console.log('❌ No se encontró cita para', dateStr, normalizedTime);
        }
        
        return foundAppointment;
    }

    // Función auxiliar para clases CSS de estado
    function getStatusBadgeClass(status) {
        const statusClasses = {
            'confirmada': 'bg-success',
            'programada': 'bg-info',
            'completada': 'bg-secondary',
            'cancelada': 'bg-danger'
        };
        return statusClasses[status] || 'bg-warning';
    }

    // Mostrar detalles del horario en el modal
    function showScheduleDetails(day, timeSlot, type, appointment = null) {
        const dayName = getDayName(day);
        const startOfWeek = getStartOfWeek(currentWeek);
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + (day - 1));
        
        // Actualizar el modal
        document.getElementById('modalDay').textContent = `${dayName}, ${formatDate(dayDate)}`;
        document.getElementById('modalTime').textContent = timeSlot;
        
        if (type === 'appointment' && appointment) {
            document.getElementById('modalStatus').textContent = 'Cita Programada';
            document.getElementById('modalStatus').className = `badge ${getStatusBadgeClass(appointment.estado)}`;
            
            document.getElementById('modalPatient').textContent = appointment.paciente_nombre || 'Paciente';
            document.getElementById('modalReason').textContent = appointment.motivo_consulta || 'Consulta médica';
            document.getElementById('modalAppointmentStatus').textContent = appointment.estado || 'Programada';
            document.getElementById('modalAppointmentStatus').className = `badge ${getStatusBadgeClass(appointment.estado)}`;
            
            document.getElementById('appointmentDetails').style.display = 'block';
        } else {
            document.getElementById('modalStatus').textContent = 'Disponible';
            document.getElementById('modalStatus').className = 'badge bg-success';
            document.getElementById('appointmentDetails').style.display = 'none';
        }
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('scheduleDetailModal'));
        modal.show();
    }

    // Cargar el horario del médico desde la API - FUNCIÓN MEJORADA
    function loadMySchedule() {
        showLoadingState(true);
        
        console.log('🔄 Cargando horario del médico...');
        
        fetch('/api/doctor/my-schedule', {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Datos recibidos de la API:', data);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Validar que los datos existen
            mySchedule = data.schedule || {};
            appointments = data.appointments || [];
            
            console.log('📅 Horarios cargados:', Object.keys(mySchedule).length, 'días');
            console.log('📋 Citas cargadas:', appointments.length);
            
            // Verificar si hay datos
            if (Object.keys(mySchedule).length === 0) {
                console.warn('⚠️ No se cargaron horarios del médico');
                showWarning('No se encontraron horarios configurados para este médico.');
            }
            
            if (appointments.length === 0) {
                console.warn('⚠️ No se cargaron citas del médico');
            }
            
            generateScheduleTable();
            updateStatistics();
            loadNextShifts();
            showLoadingState(false);
            
        }) 
        .catch(error => {
            console.error('❌ Error cargando horario:', error);
            showError('No se pudo cargar el horario: ' + error.message);
            showLoadingState(false);
            
            // Inicializar con datos vacíos para evitar errores
            mySchedule = {};
            appointments = [];
            generateScheduleTable();
        });
    }

    // Formatear fecha para la API (YYYY-MM-DD)
    function formatDateForAPI(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Actualizar estadísticas
    function updateStatistics() {
        let totalHours = 0;
        let workingDays = 0;
        
        Object.values(mySchedule).forEach(daySchedules => {
            if (daySchedules && daySchedules.length > 0) {
                workingDays++;
                
                daySchedules.forEach(schedule => {
                    const start = new Date(`2000-01-01T${schedule.hora_inicio}`);
                    const end = new Date(`2000-01-01T${schedule.hora_fin}`);
                    const duration = (end - start) / (1000 * 60 * 60); // Horas
                    totalHours += duration;
                });
            }
        });
        
        document.getElementById('totalHours').textContent = Math.round(totalHours * 10) / 10;
        document.getElementById('workingDays').textContent = workingDays;
        document.getElementById('dailyAverage').textContent = workingDays > 0 ? 
            `${Math.round((totalHours / workingDays) * 10) / 10}h` : '0h';
    }

    // Cargar próximos turnos
    function loadNextShifts() {
        const nextShiftsElement = document.getElementById('nextShifts');
        if (!nextShiftsElement) return;
        
        nextShiftsElement.innerHTML = '';

        const today = new Date();
        const daysOrder = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const upcomingShifts = [];

        // Buscar turnos en los próximos 7 días
        for (let i = 0; i < 7; i++) {
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + i);
            const dayName = daysOrder[futureDate.getDay()];

            if (mySchedule[dayName] && mySchedule[dayName].length > 0) {
                mySchedule[dayName].forEach(schedule => {
                    // Para el día de hoy, solo mostrar turnos que no han terminado
                    if (i === 0) {
                        const now = new Date();
                        const endTimeParts = schedule.hora_fin.split(':');
                        const shiftEndTime = new Date();
                        shiftEndTime.setHours(parseInt(endTimeParts[0]), parseInt(endTimeParts[1]), 0);
                        if (now > shiftEndTime) {
                            return; // Saltar turnos pasados
                        }
                    }
                    upcomingShifts.push({
                        date: new Date(futureDate),
                        startTime: schedule.hora_inicio.substring(0, 5),
                        endTime: schedule.hora_fin.substring(0, 5)
                    });
                });
            }
        }

        // Mostrar los próximos 3 turnos
        const shiftsToShow = upcomingShifts.slice(0, 3);

        if (shiftsToShow.length === 0) {
            nextShiftsElement.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="fas fa-calendar-check fa-2x mb-2"></i>
                    <p class="mb-0 small">No hay próximos turnos programados.</p>
                </div>
            `;
            return;
        }

        shiftsToShow.forEach(shift => {
            const formattedDate = shift.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            const shiftElement = `
                <div class="d-flex align-items-start mb-3">
                    <i class="fas fa-calendar-day fa-fw text-primary mt-1 me-3"></i>
                    <div><h6 class="mb-0 text-capitalize">${formattedDate}</h6><small class="text-muted">${shift.startTime} - ${shift.endTime}</small></div>
                </div>`;
            nextShiftsElement.innerHTML += shiftElement;
        });
    }

    // Mostrar estado de carga
    function showLoadingState(show) {
        const table = document.getElementById('weeklySchedule');
        const buttons = document.querySelectorAll('button');
        
        if (show) {
            table.classList.add('loading');
            buttons.forEach(btn => btn.disabled = true);
        } else {
            table.classList.remove('loading');
            buttons.forEach(btn => btn.disabled = false);
        }
    }

    // Mostrar mensaje de error
    function showError(message) {
        showNotification(message, 'danger');
    }

    // Mostrar mensaje de advertencia
    function showWarning(message) {
        showNotification(message, 'warning');
    }

    // Mostrar notificación
    function showNotification(message, type = 'info') {
        // Crear una alerta temporal
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.style.minWidth = '300px';
        alert.innerHTML = `
            <strong>${type === 'danger' ? 'Error:' : type === 'warning' ? 'Advertencia:' : 'Info:'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    // Actualizar información de debug
    function updateDebugInfo() {
        if (!debugMode) return;
        
        const debugInfo = document.getElementById('debugInfo');
        if (!debugInfo) return;
        
        const startOfWeek = getStartOfWeek(currentWeek);
        
        let debugHTML = `
            <strong>Información de Depuración:</strong><br>
            Semana: ${formatDate(startOfWeek)}<br>
            Horarios: ${Object.keys(mySchedule).length} días<br>
            Citas: ${appointments.length} total<br>
            Citas confirmadas: ${appointments.filter(a => a.estado === 'confirmada').length}<br>
        `;
        
        // Mostrar citas de la semana actual
        const currentWeekAppointments = appointments.filter(appt => {
            const apptDate = new Date(appt.fecha_cita);
            return apptDate >= startOfWeek && apptDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
        });
        
        if (currentWeekAppointments.length > 0) {
            debugHTML += `<br><strong>Citas esta semana:</strong><br>`;
            currentWeekAppointments.forEach(appt => {
                debugHTML += `${appt.fecha_cita} ${appt.hora_cita} - ${appt.paciente_nombre} (${appt.estado})<br>`;
            });
        }
        
        debugInfo.innerHTML = debugHTML;
    }

    // Función de diagnóstico
    function diagnoseSchedule() {
        console.log('=== DIAGNÓSTICO DEL HORARIO ===');
        console.log('Current Week:', currentWeek);
        console.log('My Schedule:', mySchedule);
        console.log('Appointments:', appointments);
        console.log('Schedule Body exists:', !!document.getElementById('scheduleBody'));
        
        // Verificar días de la semana
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        days.forEach(day => {
            console.log(`${day} schedules:`, mySchedule[day] || 'No hay horarios');
        });
        
        // Verificar elementos críticos
        const criticalElements = [
            'scheduleBody', 'weekRange', 'totalHours', 'workingDays', 'dailyAverage', 'nextShifts'
        ];
        
        criticalElements.forEach(id => {
            const element = document.getElementById(id);
            console.log(`Elemento ${id}:`, element ? 'EXISTE' : 'NO EXISTE');
        });
    }

    // Configurar event listeners
    function setupEventListeners() {
        // Ya configurados arriba en el DOMContentLoaded
        console.log('✅ Event listeners configurados');
    }

    // Manejo de errores global
    window.addEventListener('error', function(e) {
        console.error('Error global:', e.error);
        showError('Ha ocurrido un error inesperado. Por favor, recargue la página.');
    });

    // Exponer funciones globales para debugging
    window.debugSchedule = {
        getMySchedule: loadMySchedule,
        getCurrentData: () => ({ mySchedule, appointments, currentWeek }),
        diagnose: diagnoseSchedule,
        toggleDebug: () => {
            debugMode = !debugMode;
            document.getElementById('debugInfo').style.display = debugMode ? 'block' : 'none';
            updateDebugInfo();
        }
    };

    console.log('✅ Mi Horario.js cargado correctamente');
});