// Variables globales
let currentWeek = new Date();
let mySchedule = {};
let appointments = [];

// Inicialización cuando el documento está listo
document.addEventListener('DOMContentLoaded', function() {
    initializeWeek();
    loadMySchedule();
    loadUserDataForPrint();
    setupEventListeners();
});

// Configurar los event listeners
function setupEventListeners() {
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

    // Cerrar modal con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleDetailModal'));
            if (modal) modal.hide();
        }
    });
}

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

    // Actualizar número de semana
    const weekNumber = getWeekNumber(startOfWeek);
    document.getElementById('weekNumber').textContent = `Semana ${weekNumber}`;

    // Actualizar fechas de los días
    updateDayDates(startOfWeek);

    // Generar la tabla de horarios
    generateScheduleTable();
}

// Obtener el inicio de la semana (lunes)
function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    return new Date(date.setDate(diff));
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

// Generar la tabla de horarios
function generateScheduleTable() {
    const scheduleBody = document.getElementById('scheduleBody');
    scheduleBody.innerHTML = '';

    // Generar filas para cada hora del día (de 7:00 a 21:00)
    for (let hour = 7; hour <= 21; hour++) {
        const row = document.createElement('tr');
        
        // Celda de hora
        const timeCell = document.createElement('td');
        timeCell.className = 'time-column';
        timeCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        row.appendChild(timeCell);

        // Celdas para cada día de la semana
        for (let day = 1; day <= 7; day++) {
            const dayCell = document.createElement('td');
            dayCell.dataset.day = day;
            dayCell.dataset.hour = hour;
            
            const dayName = getDayName(day);
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            
            // Crear el contenedor del slot
            const slotContainer = document.createElement('div');
            slotContainer.className = 'schedule-slot-container';
            dayCell.appendChild(slotContainer);

            // Verificar si hay citas programadas para esta hora
            const appointmentsInHour = findAppointmentsInHour(day, hour);

            if (appointmentsInHour.length > 0) {
                appointmentsInHour.forEach(appointment => {
                    const slotDiv = document.createElement('div');
                    slotDiv.className = 'schedule-slot slot-appointment';
                    slotDiv.dataset.citaId = appointment.id_cita;
                    
                    const appointmentTime = new Date(`${appointment.fecha_cita}T${appointment.hora_cita}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    slotDiv.innerHTML = `
                        <span class="fw-bold">${appointment.paciente_nombre.split(' ')[0]}</span>
                        <small class="d-block">a las ${appointmentTime}</small>
                    `;
                    slotDiv.onclick = () => showScheduleDetails(day, hour, 'appointment', appointment);
                    slotContainer.appendChild(slotDiv);
                });
            } else if (mySchedule[dayName] && isTimeInSchedule(mySchedule[dayName], timeSlot)) {
                // Si no hay citas, verificar si está disponible
                slotContainer.innerHTML = '<div class="schedule-slot slot-available">Horas a laborar</div>';
                dayCell.addEventListener('click', () => showScheduleDetails(day, hour, 'available'));
            } else {
                slotContainer.innerHTML = '<div class="schedule-slot slot-unavailable"></div>';
                dayCell.style.opacity = '0.6';
            }
            
            row.appendChild(dayCell);
        }

        scheduleBody.appendChild(row);
    }
}

// Obtener nombre del día a partir del número
function getDayName(dayNumber) {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[dayNumber - 1];
}

// Verificar si una hora está dentro de un horario
function isTimeInSchedule(daySchedule, time) {
    for (const schedule of daySchedule) {
        const startTime = schedule.hora_inicio.substring(0, 5);
        const endTime = schedule.hora_fin.substring(0, 5);
        
        if (time >= startTime && time < endTime) {
            return true;
        }
    }
    return false;
}

// Buscar citas programadas
function findAppointmentsInHour(day, hour) {
    const startHour = hour.toString().padStart(2, '0');
    const endHour = (hour + 1).toString().padStart(2, '0');
    const startTime = `${startHour}:00`;
    const endTime = `${endHour}:00`;

    return appointments.filter(appt => {
        const apptDate = new Date(appt.fecha_cita);
        const apptDay = apptDate.getDay() === 0 ? 7 : apptDate.getDay(); // Domingo = 7
        const apptTime = appt.hora_cita.substring(0, 5); // "HH:MM"
        return apptDay === day && apptTime >= startTime && apptTime < endTime;
    });
}

// Mostrar detalles del horario en el modal
function showScheduleDetails(day, hour, type, appointment = null) {
    const dayName = getDayName(day);
    const startOfWeek = getStartOfWeek(currentWeek);
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + (day - 1));
    
    // Actualizar el modal
    document.getElementById('modalDay').textContent = `${dayName}, ${formatDate(dayDate)}`;
    document.getElementById('modalTime').textContent = `${hour.toString().padStart(2, '0')}:00`;
    
    if (type === 'appointment' && appointment) {
        document.getElementById('modalStatus').textContent = 'Ocupado';
        document.getElementById('modalStatus').className = 'badge bg-warning';
        
        document.getElementById('modalPatient').textContent = appointment.paciente_nombre || 'Paciente';
        document.getElementById('modalReason').textContent = appointment.motivo_consulta || 'Consulta médica';
        document.getElementById('modalAppointmentStatus').textContent = appointment.estado || 'Programada';
        
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

// Cargar el horario del médico desde la API
function loadMySchedule() {
    showLoadingState(true);
    
    fetch('/api/doctor/my-schedule', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar el horario');
        }
        return response.json();
    })
    .then(data => {
        mySchedule = data;
        loadAppointments();
        updateStatistics();
    })
    .catch(error => {
        console.error('Error:', error);
        showError('No se pudo cargar el horario. Intente nuevamente.');
        showLoadingState(false);
    });
}

// Cargar datos del usuario para la impresión
function loadUserDataForPrint() {
    fetch('/api/user-data')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo obtener la información del usuario.');
            return response.json();
        })
        .then(data => {
            const printDoctorNameElement = document.getElementById('printDoctorName');
            if (printDoctorNameElement && data.nombre) {
                printDoctorNameElement.textContent = `Horario Semanal - ${data.nombre}`;
            }
        })
        .catch(error => {
            console.error('Error al cargar datos del usuario para impresión:', error);
            // No es un error crítico, el título por defecto se usará.
        });
}

// Cargar las citas programadas
function loadAppointments() {
    const startOfWeek = getStartOfWeek(currentWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    fetch(`/api/citas/detalladas?start_date=${formatDateForAPI(startOfWeek)}&end_date=${formatDateForAPI(endOfWeek)}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al cargar las citas');
        }
        return response.json();
    })
    .then(data => {
        appointments = data;
        generateScheduleTable();
        showLoadingState(false);
        loadNextShifts();
    })
    .catch(error => {
        console.error('Error:', error);
        appointments = [];
        generateScheduleTable();
        showLoadingState(false);
    });
}

// Formatear fecha para la API (YYYY-MM-DD)
function formatDateForAPI(date) {
    return date.toISOString().split('T')[0];
}

// Actualizar estadísticas
function updateStatistics() {
    let totalHours = 0;
    let workingDays = 0;
    
    Object.values(mySchedule).forEach(daySchedules => {
        if (daySchedules.length > 0) {
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
    nextShiftsElement.innerHTML = ''; // Limpiar el placeholder de carga

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
                    shiftEndTime.setHours(endTimeParts[0], endTimeParts[1], endTimeParts[2] || 0);
                    if (now > shiftEndTime) {
                        return; // Saltar turnos pasados
                    }
                }
                upcomingShifts.push({
                    date: futureDate,
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
    // Crear una alerta temporal
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.innerHTML = `
        <strong>Error:</strong> ${message}
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

// Función para exportar horario (opcional)
function exportSchedule(format) {
    // Implementar exportación a PDF o Excel según el formato
    console.log(`Exportando horario en formato: ${format}`);
    // En una implementación real, esto generaría un archivo descargable
}

// Manejo de errores global
window.addEventListener('error', function(e) {
    console.error('Error global:', e.error);
    showError('Ha ocurrido un error inesperado. Por favor, recargue la página.');
});

// Inicializar tooltips de Bootstrap
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});