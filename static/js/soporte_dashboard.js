// Variables globales
let ticketsChart = null;
let priorityChart = null;

// Toast de notificación
function mostrarToast(mensaje, tipo = 'success') {
    const alertDiv = document.getElementById('notificationAlert');
    const textSpan = document.getElementById('notificationText');
    if (alertDiv && textSpan) {
        textSpan.innerText = mensaje;
        alertDiv.style.display = 'block';
        alertDiv.className = `alert alert-${tipo === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 4000);
    }
}

// Obtener estadísticas
async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/soporte/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-total').innerText = stats.total || 0;
            document.getElementById('stat-pendientes').innerText = stats.pendientes || 0;
            document.getElementById('stat-progreso').innerText = stats.en_progreso || 0;
            document.getElementById('stat-criticos').innerText = stats.criticos || 0;
        }
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Obtener tickets
async function cargarTickets() {
    try {
        const response = await fetch('/api/soporte');
        if (response.ok) {
            const tickets = await response.json();
            renderizarTabla(tickets);
            actualizarGraficos(tickets);
        } else {
            const error = await response.json();
            mostrarToast(error.error || 'Error al cargar tickets', 'error');
        }
    } catch (error) {
        console.error('Error al cargar tickets:', error);
        mostrarToast('Error de conexión con el servidor', 'error');
    }
}

// Renderizar tabla
function renderizarTabla(tickets) {
    const tbody = document.getElementById('ticketsBody');
    if (!tbody) return;
    
    if (tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay tickets registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    tickets.forEach(ticket => {
        const row = tbody.insertRow();
        
        row.insertCell(0).innerHTML = `<span class="fw-bold">#${ticket.id_soporte}</span>`;
        row.insertCell(1).innerHTML = `<i class="fas fa-user-circle me-2 text-success"></i>${ticket.usuario_reporta || 'N/A'}`;
        row.insertCell(2).innerHTML = `<span class="badge bg-light text-dark">${ticket.tipo_reporte}</span>`;
        row.insertCell(3).innerHTML = `<span title="${ticket.descripcion || ''}">${ticket.asunto ? (ticket.asunto.length > 30 ? ticket.asunto.substring(0, 30) + '...' : ticket.asunto) : 'N/A'}</span>`;
        
        // Prioridad
        let prioridadClass = '';
        if (ticket.prioridad === 'Alta') prioridadClass = 'badge-alta';
        else if (ticket.prioridad === 'Media') prioridadClass = 'badge-media';
        else prioridadClass = 'badge-baja';
        row.insertCell(4).innerHTML = `<div class="badge-prioridad ${prioridadClass}"><i class="fas fa-flag me-1"></i>${ticket.prioridad}</div>`;
        
        // Estado
        let estadoClass = '';
        let estadoIcon = '';
        switch (ticket.estado) {
            case 'Pendiente': estadoClass = 'estado-pendiente'; estadoIcon = 'fa-hourglass-half'; break;
            case 'En Progreso': estadoClass = 'estado-progreso'; estadoIcon = 'fa-spinner'; break;
            case 'Resuelto': estadoClass = 'estado-resuelto'; estadoIcon = 'fa-check-circle'; break;
            case 'Cerrado': estadoClass = 'estado-cerrado'; estadoIcon = 'fa-check-double'; break;
            default: estadoClass = 'estado-pendiente'; estadoIcon = 'fa-question';
        }
        row.insertCell(5).innerHTML = `<div class="badge-estado ${estadoClass}"><i class="fas ${estadoIcon} me-1"></i>${ticket.estado}</div>`;
        
        row.insertCell(6).innerHTML = ticket.tecnico ? `<i class="fas fa-user-md me-1"></i>${ticket.tecnico}` : '<span class="text-muted">No asignado</span>';
        row.insertCell(7).innerHTML = ticket.fecha_creacion ? new Date(ticket.fecha_creacion).toLocaleDateString() : 'N/A';
        
        // Acciones
        const accionesCell = row.insertCell(8);
        const verBtn = document.createElement('button');
        verBtn.className = 'action-btn';
        verBtn.innerHTML = '<i class="fas fa-eye"></i>';
        verBtn.title = 'Ver detalles';
        verBtn.onclick = () => mostrarDetalleTicket(ticket);
        accionesCell.appendChild(verBtn);
        
        const editarBtn = document.createElement('button');
        editarBtn.className = 'action-btn';
        editarBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editarBtn.title = 'Gestionar ticket';
        editarBtn.onclick = () => abrirModalEdicion(ticket);
        accionesCell.appendChild(editarBtn);
    });
}

// Actualizar gráficos
function actualizarGraficos(tickets) {
    // Gráfico de estados
    const estadosCount = {
        'Pendiente': tickets.filter(t => t.estado === 'Pendiente').length,
        'En Progreso': tickets.filter(t => t.estado === 'En Progreso').length,
        'Resuelto': tickets.filter(t => t.estado === 'Resuelto').length,
        'Cerrado': tickets.filter(t => t.estado === 'Cerrado').length
    };
    
    const ctxBar = document.getElementById('ticketsChart')?.getContext('2d');
    if (ctxBar) {
        if (ticketsChart) ticketsChart.destroy();
        ticketsChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['Pendientes', 'En Progreso', 'Resueltos', 'Cerrados'],
                datasets: [{
                    label: 'Cantidad',
                    data: [estadosCount.Pendiente, estadosCount['En Progreso'], estadosCount.Resuelto, estadosCount.Cerrado],
                    backgroundColor: ['#f0ad4e', '#5bc0de', '#5cb85c', '#6c757d'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }
    
    // Gráfico de prioridades
    const prioridadCount = {
        'Alta': tickets.filter(t => t.prioridad === 'Alta').length,
        'Media': tickets.filter(t => t.prioridad === 'Media').length,
        'Baja': tickets.filter(t => t.prioridad === 'Baja').length
    };
    
    const ctxPie = document.getElementById('priorityChart')?.getContext('2d');
    if (ctxPie) {
        if (priorityChart) priorityChart.destroy();
        priorityChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Alta', 'Media', 'Baja'],
                datasets: [{
                    data: [prioridadCount.Alta, prioridadCount.Media, prioridadCount.Baja],
                    backgroundColor: ['#d9534f', '#f0ad4e', '#5cb85c'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// Mostrar detalles
function mostrarDetalleTicket(ticket) {
    const modalBody = document.getElementById('detailTicketBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="mb-2"><strong><i class="fas fa-hashtag me-2 text-success"></i>ID Ticket:</strong> ${ticket.id_soporte}</div>
            <div class="mb-2"><strong><i class="fas fa-user me-2 text-success"></i>Reporta:</strong> ${ticket.usuario_reporta || 'N/A'}</div>
            <div class="mb-2"><strong><i class="fas fa-tag me-2 text-success"></i>Tipo:</strong> ${ticket.tipo_reporte || 'N/A'}</div>
            <div class="mb-2"><strong><i class="fas fa-heading me-2 text-success"></i>Asunto:</strong> ${ticket.asunto || 'N/A'}</div>
            <div class="mb-2"><strong><i class="fas fa-align-left me-2 text-success"></i>Descripción:</strong> ${ticket.descripcion || 'Sin descripción'}</div>
            <div class="mb-2"><strong><i class="fas fa-flag me-2 text-success"></i>Prioridad:</strong> ${ticket.prioridad || 'N/A'}</div>
            <div class="mb-2"><strong><i class="fas fa-spinner me-2 text-success"></i>Estado:</strong> ${ticket.estado || 'N/A'}</div>
            <div class="mb-2"><strong><i class="fas fa-user-cog me-2 text-success"></i>Técnico:</strong> ${ticket.tecnico || 'No asignado'}</div>
            <div class="mb-2"><strong><i class="fas fa-calendar me-2 text-success"></i>Fecha creación:</strong> ${ticket.fecha_creacion || 'N/A'}</div>
        `;
    }
    const modal = new bootstrap.Modal(document.getElementById('detailTicketModal'));
    modal.show();
}

// Abrir modal de edición
function abrirModalEdicion(ticket) {
    document.getElementById('editTicketId').value = ticket.id_soporte;
    document.getElementById('editEstado').value = ticket.estado;
    document.getElementById('editTecnico').value = ticket.id_usuario_tecnico || '';
    const modal = new bootstrap.Modal(document.getElementById('editTicketModal'));
    modal.show();
}

// Guardar cambios
async function guardarCambiosTicket() {
    const idTicket = document.getElementById('editTicketId').value;
    const estado = document.getElementById('editEstado').value;
    const idTecnico = document.getElementById('editTecnico').value;
    
    const data = {};
    if (estado) data.estado = estado;
    if (idTecnico) data.id_usuario_tecnico = parseInt(idTecnico);
    
    try {
        const response = await fetch(`/api/soporte/${idTicket}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            mostrarToast('Ticket actualizado correctamente', 'success');
            bootstrap.Modal.getInstance(document.getElementById('editTicketModal'))?.hide();
            cargarTickets();
            cargarEstadisticas();
        } else {
            const error = await response.json();
            mostrarToast(error.error || 'Error al actualizar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error de conexión', 'error');
    }
}

// Exportar reporte
function exportarReporte() {
    mostrarToast('Funcionalidad de exportación en desarrollo', 'info');
}

// Eventos e inicialización
document.addEventListener('DOMContentLoaded', () => {
    cargarEstadisticas();
    cargarTickets();
    
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            cargarTickets();
            cargarEstadisticas();
            mostrarToast('Datos actualizados', 'success');
        });
    }
    
    const refreshTicketsBtn = document.getElementById('refreshTicketsBtn');
    if (refreshTicketsBtn) {
        refreshTicketsBtn.addEventListener('click', () => {
            cargarTickets();
            mostrarToast('Tickets actualizados', 'success');
        });
    }
    
    const saveBtn = document.getElementById('saveTicketBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', guardarCambiosTicket);
    }
    
    const exportBtn = document.getElementById('exportReportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            exportarReporte();
        });
    }
});