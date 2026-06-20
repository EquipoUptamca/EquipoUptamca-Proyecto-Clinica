document.addEventListener('DOMContentLoaded', async function() {
    const elements = {
        citasList: document.getElementById('citas-list'),
        loading: document.getElementById('loading'),
        noCitas: document.getElementById('no-citas'),
        pendingCount: document.getElementById('pending-count'),
        confirmedCount: document.getElementById('confirmed-count'),
        todayCount: document.getElementById('today-count'),
        filterDate: document.getElementById('filter-date'),
        filterStatus: document.getElementById('filter-status'),
        clearFiltersBtn: document.getElementById('clear-filters'),
        refreshBtn: document.getElementById('refresh-btn'),
        confirmModal: document.getElementById('confirm-modal'),
        closeModalBtn: document.getElementById('close-modal'),
        cancelConfirmBtn: document.getElementById('cancel-confirm'),
        confirmCitaBtn: document.getElementById('confirm-cita'),
        formulaModal: document.getElementById('formula-modal'),
        closeFormulaModalBtn: document.getElementById('close-formula-modal'),
        cancelFormulaBtn: document.getElementById('cancel-formula'),
        saveFormulaBtn: document.getElementById('save-formula'),
        formulaPacienteInput: document.getElementById('formula-paciente'),
        formulaFechaInput: document.getElementById('formula-fecha'),
        formulaHoraInput: document.getElementById('formula-hora'),
        formulaPerfusionSelect: document.getElementById('formula-perfusion'),
        formulaDosisInput: document.getElementById('formula-dosis'),
        formulaFrecuenciaInput: document.getElementById('formula-frecuencia'),
        formulaIndicacionesInput: document.getElementById('formula-indicaciones'),
        formulaMessage: document.getElementById('formula-message'),
        diagnosticoModal: document.getElementById('diagnostico-modal'),
        closeDiagnosticoModalBtn: document.getElementById('close-diagnostico-modal'),
        cancelDiagnosticoBtn: document.getElementById('cancel-diagnostico'),
        saveDiagnosticoBtn: document.getElementById('save-diagnostico'),
        diagnosticoPacienteInput: document.getElementById('diagnostico-paciente'),
        diagnosticoFechaInput: document.getElementById('diagnostico-fecha'),
        diagnosticoHoraInput: document.getElementById('diagnostico-hora'),
        diagnosticoMotivoInput: document.getElementById('diagnostico-motivo'),
        diagnosticoEnfermedadInput: document.getElementById('diagnostico-enfermedad'),
        diagnosticoDescripcionInput: document.getElementById('diagnostico-descripcion'),
        diagnosticoMessage: document.getElementById('diagnostico-message'),
        addMedicamentoBtn: document.getElementById('add-medicamento-btn'),
        medicamentosContainer: document.getElementById('medicamentos-container'),
        paginationControls: document.getElementById('pagination-controls'),
    };

    let allCitas = [];
    let filteredCitas = [];
    let availablePerfusiones = [];
    let citaToConfirmId = null;
    let citaToCancelId = null;
    let currentFormulaCitaId = null;
    let currentDiagnosticoCitaId = null;
    let currentPage = 1;
    const pageSize = 8;
    let medicamentoIndex = 0;

    // Función mejorada para obtener citas
    const fetchCitas = async () => {
        showLoading(true);
        try {
            // Si tu backend requiere autenticación por sesión, añade credentials: 'include'
            const response = await fetch('/api/citas/detalladas', {
                credentials: 'include'  // Opcional: envía cookies de sesión
            });

            if (!response.ok) {
                let errorMsg = `Error HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (_) {
                    // Si no es JSON, intentamos leer texto plano
                    errorMsg = await response.text().catch(() => errorMsg);
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // Validar que sea un arreglo
            if (!Array.isArray(data)) {
                throw new Error('La respuesta del servidor no es un arreglo de citas');
            }

            allCitas = data;
            filterAndRenderCitas();
            updateStats();
        } catch (error) {
            console.error('Error al cargar citas:', error);
            elements.citasList.innerHTML = `
                <div class="no-citas">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error al cargar citas</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()" class="btn-refresh" style="margin-top:15px;">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>
            `;
            elements.noCitas.classList.add('hidden');
        } finally {
            showLoading(false);
        }
    };

    const fetchPerfusiones = async () => {
        try {
            const response = await fetch('/api/perfusiones', {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('No se pudieron cargar los medicamentos.');
            }
            availablePerfusiones = await response.json();
        } catch (error) {
            console.error('Error cargando la lista de perfusiones:', error);
            availablePerfusiones = [];
        }
    };

    const filterAndRenderCitas = () => {
        const dateFilter = elements.filterDate.value;
        const statusFilter = elements.filterStatus.value;

        currentPage = 1;
        filteredCitas = allCitas.filter(cita => {
            const matchDate = !dateFilter || cita.fecha_cita === dateFilter;
            const matchStatus = statusFilter === 'all' || cita.estado === statusFilter;
            return matchDate && matchStatus;
        });

        renderCitasPage();
    };

    const renderCitasPage = () => {
        const totalPages = Math.max(1, Math.ceil(filteredCitas.length / pageSize));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const pageCitas = filteredCitas.slice(start, start + pageSize);

        renderCitas(pageCitas);
        renderPaginationControls(totalPages);
    };

    const renderCitas = (citas) => {
        elements.citasList.innerHTML = '';
        if (citas.length === 0) {
            elements.noCitas.classList.remove('hidden');
            return;
        }
        elements.noCitas.classList.add('hidden');

        citas.forEach(cita => {
            const citaElement = document.createElement('div');
            citaElement.className = 'cita-item';
            citaElement.dataset.citaId = cita.id_cita;

            const estadoClass = `estado-${cita.estado}`;
            const isActionable = cita.estado === 'pendiente' || cita.estado === 'confirmada';
            const showPrintButton = cita.estado !== 'cancelada';

            citaElement.innerHTML = `
                <div class="cita-info">
                    <div class="cita-header">
                        <span class="cita-paciente">${cita.paciente_nombre}</span>
                        <span class="cita-estado ${estadoClass}">${cita.estado}</span>
                    </div>
                    <div class="cita-body">
                        <p><strong>Fecha:</strong> ${cita.fecha_cita} | <strong>Hora:</strong> ${cita.hora_cita}</p>
                        <p><strong>Motivo:</strong> ${cita.motivo_consulta}</p>
                    </div>
                </div>
                <div class="cita-actions">
                    <button class="btn-action btn-formula" data-id="${cita.id_cita}"><i class="fas fa-pills"></i> Fórmula</button>
                    ${showPrintButton ? `<button class="btn-action btn-print" data-id="${cita.id_cita}"><i class="fas fa-print"></i> Imprimir Receta</button>` : ''}
                    <button class="btn-action btn-diagnostico" data-id="${cita.id_cita}"><i class="fas fa-notes-medical"></i> Diagnóstico</button>
                    ${cita.estado === 'pendiente' ? `<button class="btn-action btn-confirm" data-id="${cita.id_cita}"><i class="fas fa-check"></i> Confirmar</button>` : ''}
                    ${isActionable ? `<button class="btn-action btn-complete" data-id="${cita.id_cita}"><i class="fas fa-check-double"></i> Completar Cita</button>` : ''}
                    ${isActionable ? `<button class="btn-action btn-cancel" data-id="${cita.id_cita}"><i class="fas fa-times"></i> Cancelar</button>` : ''}
                </div>
            `;
            elements.citasList.appendChild(citaElement);
        });
    };

    const updateStats = () => {
        const today = new Date().toISOString().split('T')[0];
        elements.pendingCount.textContent = allCitas.filter(c => c.estado === 'pendiente').length;
        elements.confirmedCount.textContent = allCitas.filter(c => c.estado === 'confirmada').length;
        elements.todayCount.textContent = allCitas.filter(c => c.fecha_cita === today && c.estado !== 'cancelada').length;
    };

    const renderPaginationControls = (totalPages) => {
        const pagination = elements.paginationControls;
        if (filteredCitas.length === 0 || totalPages <= 1) {
            pagination.classList.add('hidden');
            pagination.innerHTML = '';
            return;
        }

        const buttons = [];
        buttons.push(`<button class="pagination-button" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Anterior</button>`);

        for (let page = 1; page <= totalPages; page += 1) {
            buttons.push(`<button class="pagination-button ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`);
        }

        buttons.push(`<button class="pagination-button" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente <i class="fas fa-chevron-right"></i></button>`);

        pagination.innerHTML = buttons.join('');
        pagination.classList.remove('hidden');
    };

    const goToPage = (page) => {
        const totalPages = Math.max(1, Math.ceil(filteredCitas.length / pageSize));
        if (page < 1 || page > totalPages || page === currentPage) return;
        currentPage = page;
        renderCitasPage();
    };

    const showLoading = (isLoading) => {
        elements.loading.style.display = isLoading ? 'block' : 'none';
        elements.citasList.style.display = isLoading ? 'none' : 'block';
        if (isLoading) elements.noCitas.classList.add('hidden');
    };

    const handleMedicamentoControls = (event) => {
        const removeButton = event.target.closest('.remove-medication');
        if (!removeButton) return;
        const row = removeButton.closest('.medicamento-row');
        if (!row) return;

        const assignmentId = row.dataset.assignmentId;
        if (assignmentId) {
            const confirmDelete = confirm('¿Desea eliminar esta fórmula antigua del paciente?');
            if (!confirmDelete) return;
            deleteExistingMedication(assignmentId, row);
            return;
        }

        removeMedicamentoRow(row);
    };

    const handleAction = async (citaId, action) => {
        let url, method, successMessage, notificationType, notificationTitle;

        switch (action) {
            case 'confirm':
                url = `/api/citas/${citaId}/confirm`;
                method = 'PATCH';
                successMessage = 'La cita ha sido confirmada exitosamente.';
                notificationType = 'success';
                notificationTitle = '¡Cita Confirmada!';
                break;
            case 'complete':
                url = `/api/citas/${citaId}/complete`;
                method = 'PATCH';
                successMessage = 'La cita ha sido marcada como completada.';
                notificationType = 'completed';
                notificationTitle = '¡Cita Completada!';
                break;
            case 'cancel':
                url = `/api/citas/${citaId}/cancel`;
                method = 'PATCH';
                successMessage = 'La cita ha sido cancelada exitosamente.';
                notificationType = 'info';
                notificationTitle = 'Cita Cancelada';
                break;
            default:
                return;
        }

        try {
            const response = await fetch(url, { 
                method,
                credentials: 'include'
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error.');
            }
            showNotification(notificationTitle, successMessage, notificationType);
            fetchCitas();
        } catch (error) {
            console.error(`Error en la acción ${action}:`, error);
            showNotification('Error', `Error: ${error.message}`, 'error');
        }
    };

    const showNotification = (title, message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        let iconClass;
        switch(type) {
            case 'success':
                iconClass = 'fas fa-check-circle';
                break;
            case 'completed':
                iconClass = 'fas fa-check-double';
                break;
            case 'error':
                iconClass = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-triangle';
                break;
            default:
                iconClass = 'fas fa-info-circle';
        }

        notification.innerHTML = `
            <i class="${iconClass} notification-icon"></i>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">&times;</button>
            <div class="notification-progress"></div>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);

        const autoClose = setTimeout(() => closeNotification(notification), 5000);
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoClose);
            closeNotification(notification);
        });

        notification.addEventListener('mouseenter', () => {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) progressBar.style.animationPlayState = 'paused';
        });

        notification.addEventListener('mouseleave', () => {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) progressBar.style.animationPlayState = 'running';
        });
    };

    const closeNotification = (notification) => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    };

    const openConfirmModal = (citaId) => {
        const cita = allCitas.find(c => c.id_cita === citaId);
        if (!cita) return;

        citaToConfirmId = citaId;
        document.getElementById('modal-paciente').textContent = cita.paciente_nombre;
        document.getElementById('modal-fecha').textContent = cita.fecha_cita;
        document.getElementById('modal-hora').textContent = cita.hora_cita;
        document.getElementById('modal-motivo').textContent = cita.motivo_consulta;
        elements.confirmModal.classList.remove('hidden');
    };

    const openCancelModal = (citaId) => {
        const cita = allCitas.find(c => c.id_cita === citaId);
        if (!cita) return;

        citaToCancelId = citaId;
        let cancelModal = document.getElementById('cancel-modal');
        if (!cancelModal) {
            cancelModal = document.createElement('div');
            cancelModal.id = 'cancel-modal';
            cancelModal.className = 'modal modal-cancel hidden';
            cancelModal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-exclamation-triangle modal-icon"></i> Cancelar Cita</h2>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="warning-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <h3 style="color: var(--warning-color); margin-bottom: 15px; text-align: center;">¿Está seguro de que desea cancelar esta cita?</h3>
                        <div class="warning-message">
                            <p><i class="fas fa-info-circle"></i> Esta acción no se puede deshacer</p>
                        </div>
                        <div class="cita-info-cancel">
                            <p><strong>Paciente:</strong> <span id="cancel-modal-paciente"></span></p>
                            <p><strong>Fecha:</strong> <span id="cancel-modal-fecha"></span></p>
                            <p><strong>Hora:</strong> <span id="cancel-modal-hora"></span></p>
                            <p><strong>Motivo:</strong> <span id="cancel-modal-motivo"></span></p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel-secondary" id="cancel-modal-cancel">No, Conservar Cita</button>
                        <button class="btn-cancel-confirm" id="cancel-modal-confirm">Sí, Cancelar Cita</button>
                    </div>
                </div>
            `;
            document.body.appendChild(cancelModal);
            cancelModal.querySelector('.close-btn').addEventListener('click', closeCancelModal);
            cancelModal.querySelector('#cancel-modal-cancel').addEventListener('click', closeCancelModal);
            cancelModal.querySelector('#cancel-modal-confirm').addEventListener('click', () => {
                if (citaToCancelId) {
                    handleAction(citaToCancelId, 'cancel');
                    closeCancelModal();
                }
            });
            cancelModal.addEventListener('click', (e) => {
                if (e.target === cancelModal) {
                    closeCancelModal();
                }
            });
        }

        document.getElementById('cancel-modal-paciente').textContent = cita.paciente_nombre;
        document.getElementById('cancel-modal-fecha').textContent = cita.fecha_cita;
        document.getElementById('cancel-modal-hora').textContent = cita.hora_cita;
        document.getElementById('cancel-modal-motivo').textContent = cita.motivo_consulta;
        cancelModal.classList.remove('hidden');
    };

    const closeConfirmModal = () => {
        elements.confirmModal.classList.add('hidden');
        citaToConfirmId = null;
    };

    const closeCancelModal = () => {
        const cancelModal = document.getElementById('cancel-modal');
        if (cancelModal) {
            cancelModal.classList.add('hidden');
        }
        citaToCancelId = null;
    };

    const resetFormulaForm = () => {
        elements.medicamentosContainer.innerHTML = '';
        medicamentoIndex = 0;
        elements.formulaMessage.textContent = '';
    };

    const addMedicamentoRow = () => {
        const row = createMedicamentoRow();
        elements.medicamentosContainer.appendChild(row);
    };

    const removeMedicamentoRow = (rowElement) => {
        rowElement.remove();
    };

    const createMedicamentoRow = (data = null) => {
        medicamentoIndex += 1;
        const row = document.createElement('div');
        row.className = 'medicamento-row';
        row.dataset.index = medicamentoIndex;
        const isExisting = Boolean(data && data.id_asignacion);
        if (isExisting) {
            row.dataset.assignmentId = data.id_asignacion;
            row.dataset.existing = 'true';
        }

        row.innerHTML = `
            <div class="row-header">
                <h4>${isExisting ? `Fórmula anterior ${medicamentoIndex}` : `Medicamento ${medicamentoIndex}`}</h4>
                <button type="button" class="remove-medication">Eliminar</button>
            </div>
            <div class="medicamento-grid">
                <div class="form-group">
                    <label>Medicamento / Perfusión</label>
                    <select class="formula-perfusion"></select>
                </div>
                <div class="form-group">
                    <label>Dosis específica</label>
                    <input type="text" class="formula-dosis" placeholder="Ej. 500 mg, 1 ampolla, 20 ml">
                </div>
                <div class="form-group">
                    <label>Frecuencia</label>
                    <input type="text" class="formula-frecuencia" placeholder="Ej. Cada 8 horas, Infusión continua">
                </div>
                <div class="form-group full-width">
                    <label>Indicaciones / Observaciones</label>
                    <textarea class="formula-indicaciones" placeholder="Notas del médico"></textarea>
                </div>
            </div>
        `;
        const selectElement = row.querySelector('.formula-perfusion');
        populateMedicamentoSelect(selectElement);

        if (data) {
            selectElement.value = data.id_perfusion || '';
            row.querySelector('.formula-dosis').value = data.dosis_especifica || '';
            row.querySelector('.formula-frecuencia').value = data.frecuencia || '';
            row.querySelector('.formula-indicaciones').value = data.indicaciones || '';

            if (isExisting) {
                selectElement.disabled = true;
                row.querySelector('.formula-dosis').disabled = true;
                row.querySelector('.formula-frecuencia').disabled = true;
                row.querySelector('.formula-indicaciones').disabled = true;
            }
        }

        return row;
    };

    const populateMedicamentoSelect = (selectElement) => {
        selectElement.innerHTML = '';
        if (!availablePerfusiones.length) {
            selectElement.innerHTML = '<option value="">No hay medicamentos disponibles</option>';
            selectElement.disabled = true;
            return;
        }
        selectElement.disabled = false;
        selectElement.innerHTML = '<option value="">Seleccione un medicamento</option>' +
            availablePerfusiones.map(perfusion =>
                `<option value="${perfusion.id_perfusion}">${perfusion.nombre_farmaco}${perfusion.dosis_recomendada ? ` - ${perfusion.dosis_recomendada}` : ''}</option>`
            ).join('');
    };

    const loadExistingMedicamentos = async (id_paciente) => {
        try {
            const response = await fetch(`/api/pacientes/${id_paciente}/perfusiones`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error('No se pudieron cargar las fórmulas previas.');
            }

            const existing = await response.json();
            existing.reverse().forEach((med) => {
                const row = createMedicamentoRow(med);
                elements.medicamentosContainer.appendChild(row);
            });
        } catch (error) {
            console.error('Error cargando fórmulas previas:', error);
        }
    };

    const deleteExistingMedication = async (assignmentId, rowElement) => {
        try {
            const response = await fetch(`/api/pacientes_perfusiones/${assignmentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error al eliminar la fórmula antigua.');
            }
            rowElement.remove();
            showNotification('Fórmula eliminada', result.message || 'Se eliminó correctamente la fórmula antigua.', 'success');
        } catch (error) {
            console.error('Error eliminando fórmula antigua:', error);
            showNotification('Error', error.message, 'error');
        }
    };

    const openFormulaModal = async (citaId) => {
        const cita = allCitas.find(c => c.id_cita === citaId);
        if (!cita) return;

        currentFormulaCitaId = citaId;
        elements.formulaPacienteInput.value = cita.paciente_nombre;
        elements.formulaFechaInput.value = cita.fecha_cita;
        elements.formulaHoraInput.value = cita.hora_cita;
        resetFormulaForm();
        if (!availablePerfusiones.length) {
            await fetchPerfusiones();
        }
        await loadExistingMedicamentos(cita.id_paciente);
        addMedicamentoRow();
        elements.formulaModal.classList.remove('hidden');
    };

    const closeFormulaModal = () => {
        elements.formulaModal.classList.add('hidden');
        currentFormulaCitaId = null;
    };

    const openDiagnosticoModal = async (citaId) => {
        const cita = allCitas.find(c => c.id_cita === citaId);
        if (!cita) return;

        currentDiagnosticoCitaId = citaId;
        elements.diagnosticoPacienteInput.value = cita.paciente_nombre || '';
        elements.diagnosticoFechaInput.value = cita.fecha_cita || '';
        elements.diagnosticoHoraInput.value = cita.hora_cita || '';
        elements.diagnosticoMotivoInput.value = cita.motivo_consulta || '';
        elements.diagnosticoEnfermedadInput.value = '';
        elements.diagnosticoDescripcionInput.value = '';
        elements.diagnosticoMessage.textContent = '';

        try {
            const response = await fetch(`/api/citas/${citaId}/diagnostico`, {
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.enfermedad_causa) {
                    elements.diagnosticoEnfermedadInput.value = data.enfermedad_causa || '';
                    elements.diagnosticoDescripcionInput.value = data.descripcion_sintomas || '';
                }
            }
        } catch (error) {
            console.error('Error cargando diagnóstico:', error);
        }

        elements.diagnosticoModal.classList.remove('hidden');
    };

    const closeDiagnosticoModal = () => {
        elements.diagnosticoModal.classList.add('hidden');
        currentDiagnosticoCitaId = null;
        elements.diagnosticoMessage.textContent = '';
    };

    const submitDiagnostico = async () => {
        if (!currentDiagnosticoCitaId) return;

        const enfermedad = elements.diagnosticoEnfermedadInput.value.trim();
        const descripcion = elements.diagnosticoDescripcionInput.value.trim();

        if (!enfermedad) {
            elements.diagnosticoMessage.textContent = 'La enfermedad o causa es obligatoria.';
            return;
        }

        try {
            const response = await fetch(`/api/citas/${currentDiagnosticoCitaId}/diagnostico`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    enfermedad_causa: enfermedad,
                    descripcion_sintomas: descripcion
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error al guardar el diagnóstico.');
            }

            showNotification('Diagnóstico guardado', result.message || 'El diagnóstico se ha guardado correctamente.', 'success');
            closeDiagnosticoModal();
            fetchCitas();
        } catch (error) {
            console.error('Error guardando diagnóstico:', error);
            elements.diagnosticoMessage.textContent = error.message;
        }
    };

    const printReceta = async (citaId) => {
        const cita = allCitas.find(c => c.id_cita === citaId);
        if (!cita) {
            showNotification('Error', 'No se encontró la cita para imprimir.', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/pacientes/${cita.id_paciente}/perfusiones`, {
                credentials: 'include'
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'No se pudieron obtener las perfusiones del paciente.');
            }

            const perfusiones = await response.json();
            const doctorName = cita.medico_nombre || 'Dr(a).';
            const pacienteNombre = cita.paciente_nombre || '';
            const pacienteCedula = cita.paciente_cedula || '';
            const fechaCita = cita.fecha_cita || '';
            const horaCita = cita.hora_cita || '';
            const motivo = cita.motivo_consulta || '';
            const logoUrl = `${window.location.origin}/static/img/Logo.webp`;

            const recetaRows = perfusiones.length > 0 ? perfusiones.map(p => `
                <tr>
                    <td>${p.nombre_farmaco || ''}</td>
                    <td>${p.frecuencia || 'N/A'}</td>
                    <td>${p.indicaciones || 'Sin indicaciones'}</td>
                    <td>${p.dosis_especifica || (p.dosis_recomendada || 'N/A')}</td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="4" class="text-center">No hay receta médica registrada para este paciente.</td>
                </tr>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Receta Médica - ${pacienteNombre}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #1f2937; background: #fff; }
                        .page { width: 100%; max-width: 820px; margin: 0 auto; padding: 32px; box-sizing: border-box; }
                        .print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 24px; }
                        .clinic-brand { display: flex; align-items: center; gap: 16px; }
                        .clinic-logo { max-height: 80px; width: auto; }
                        .clinic-info { text-align: right; }
                        .clinic-info h1 { font-size: 22px; margin: 0; letter-spacing: 0.5px; }
                        .clinic-info p { margin: 4px 0; font-size: 13px; color: #475569; }
                        .title { margin: 0 0 18px; font-size: 20px; letter-spacing: 0.5px; color: #111827; }
                        .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 24px; }
                        .info-card { border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; padding: 14px 18px; }
                        .info-card strong { display: block; font-size: 13px; color: #475569; margin-bottom: 6px; }
                        .info-card span { font-size: 15px; color: #0f172a; }
                        .receta-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
                        .receta-table th, .receta-table td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: left; vertical-align: top; }
                        .receta-table th { background: #f1f5f9; font-weight: 600; color: #0f172a; }
                        .receta-table td { font-size: 14px; color: #1e293b; }
                        .text-center { text-align: center; }
                        .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
                        .signature-block { border-top: 1px solid #475569; padding-top: 10px; color: #475569; font-size: 13px; text-align: center; }
                        .footer-note { font-size: 13px; color: #64748b; margin-top: 18px; }
                        @media print {
                            body, .page { margin: 0; padding: 0; }
                            .page { box-shadow: none; }
                            .print-header, .info-card, .receta-table, .signature { page-break-inside: avoid; }
                        }
                    </style>
                </head>
                <body>
                    <div class="page">
                        <div class="print-header">
                            <div class="clinic-brand">
                                <img class="clinic-logo" src="${logoUrl}" alt="Logo MedAsistencia">
                                <div>
                                    <h1>MedAsistencia</h1>
                                    <p>Plataforma de gestión clínica</p>
                                </div>
                            </div>
                            <div class="clinic-info">
                                <p><strong>Receta Médica Oficial</strong></p>
                                <p>Fecha impresión: ${new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                        <h2 class="title">Datos del paciente y consulta</h2>
                        <div class="info-grid">
                            <div class="info-card">
                                <strong>Paciente</strong>
                                <span>${pacienteNombre}</span>
                            </div>
                            <div class="info-card">
                                <strong>Cédula</strong>
                                <span>${pacienteCedula}</span>
                            </div>
                            <div class="info-card">
                                <strong>Doctor</strong>
                                <span>${doctorName}</span>
                            </div>
                            <div class="info-card">
                                <strong>Fecha / Hora</strong>
                                <span>${fechaCita} ${horaCita}</span>
                            </div>
                        </div>
                        <div class="info-card" style="margin-bottom: 24px;">
                            <strong>Motivo de consulta</strong>
                            <span>${motivo}</span>
                        </div>
                        <table class="receta-table">
                            <thead>
                                <tr>
                                    <th>Medicamento</th>
                                    <th>Tiempo / Frecuencia</th>
                                    <th>Indicaciones</th>
                                    <th>Dosis</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recetaRows}
                            </tbody>
                        </table>
                        <div class="signature">
                            <div class="signature-block">Firma del doctor</div>
                            <div class="signature-block">Sello / Validación</div>
                        </div>
                        <div class="footer-note">Documento generado electrónicamente por MedAsistencia. Verifique siempre la medicación prescrita.</div>
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (error) {
            console.error('Error al imprimir receta:', error);
            showNotification('Error', error.message, 'error');
        }
    };

    const collectMedicamentosData = () => {
        const rows = [...elements.medicamentosContainer.querySelectorAll('.medicamento-row')];
        return rows
            .filter(row => !row.dataset.assignmentId)
            .map((row) => {
                const perfusionSelect = row.querySelector('.formula-perfusion');
                const dosisInput = row.querySelector('.formula-dosis');
                const frecuenciaInput = row.querySelector('.formula-frecuencia');
                const indicacionesInput = row.querySelector('.formula-indicaciones');
                return {
                    id_perfusion: parseInt(perfusionSelect.value, 10) || null,
                    dosis_especifica: dosisInput.value.trim(),
                    frecuencia: frecuenciaInput.value.trim(),
                    indicaciones: indicacionesInput.value.trim()
                };
            });
    };

    const submitFormulaAssignment = async () => {
        if (!currentFormulaCitaId) {
            showNotification('Error', 'No se ha seleccionado una cita.', 'error');
            return;
        }

        const medicamentos = collectMedicamentosData();
        if (!medicamentos.length) {
            elements.formulaMessage.textContent = 'Debe agregar al menos un medicamento.';
            return;
        }

        const invalidRow = medicamentos.find(m => !m.id_perfusion);
        if (invalidRow) {
            elements.formulaMessage.textContent = 'Cada medicamento debe tener una selección válida.';
            return;
        }

        elements.formulaMessage.textContent = '';
        const cita = allCitas.find(c => c.id_cita === currentFormulaCitaId);
        if (!cita) {
            showNotification('Error', 'No se encontró la cita seleccionada.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/pacientes_perfusiones', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    id_cita: currentFormulaCitaId,
                    id_paciente: cita.id_paciente,
                    id_medico: cita.id_medico,
                    medicamentos: medicamentos
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error al guardar la fórmula.');
            }

            showNotification('Asignación guardada', result.message || 'La fórmula se guardó correctamente.', 'success');
            closeFormulaModal();
        } catch (error) {
            console.error('Error guardando fórmula:', error);
            showNotification('Error', error.message, 'error');
        }
    };

    // Event listeners
    elements.citasList.addEventListener('click', (e) => {
        const target = e.target.closest('button.btn-action');
        if (!target) return;

        const citaId = parseInt(target.dataset.id, 10);
        if (target.classList.contains('btn-formula')) {
            openFormulaModal(citaId);
        } else if (target.classList.contains('btn-print')) {
            printReceta(citaId);
        } else if (target.classList.contains('btn-diagnostico')) {
            openDiagnosticoModal(citaId);
        } else if (target.classList.contains('btn-confirm')) {
            openConfirmModal(citaId);
        } else if (target.classList.contains('btn-complete')) {
            handleAction(citaId, 'complete');
        } else if (target.classList.contains('btn-cancel')) {
            openCancelModal(citaId);
        }
    });

    elements.formulaModal.addEventListener('click', handleMedicamentoControls);
    elements.addMedicamentoBtn.addEventListener('click', addMedicamentoRow);
    elements.saveFormulaBtn.addEventListener('click', submitFormulaAssignment);
    elements.closeFormulaModalBtn.addEventListener('click', closeFormulaModal);
    elements.cancelFormulaBtn.addEventListener('click', closeFormulaModal);
    elements.closeDiagnosticoModalBtn.addEventListener('click', closeDiagnosticoModal);
    elements.cancelDiagnosticoBtn.addEventListener('click', closeDiagnosticoModal);
    elements.saveDiagnosticoBtn.addEventListener('click', submitDiagnostico);

    elements.filterDate.addEventListener('change', filterAndRenderCitas);
    elements.filterStatus.addEventListener('change', filterAndRenderCitas);

    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.filterDate.value = '';
        elements.filterStatus.value = 'all';
        filterAndRenderCitas();
    });

    elements.refreshBtn.addEventListener('click', fetchCitas);
    elements.closeModalBtn.addEventListener('click', closeConfirmModal);
    elements.cancelConfirmBtn.addEventListener('click', closeConfirmModal);
    elements.confirmCitaBtn.addEventListener('click', () => {
        if (citaToConfirmId) {
            handleAction(citaToConfirmId, 'confirm');
            closeConfirmModal();
        }
    });

    elements.paginationControls.addEventListener('click', (e) => {
        const button = e.target.closest('.pagination-button');
        if (!button || button.disabled) return;
        const page = Number(button.dataset.page);
        if (!Number.isNaN(page)) {
            goToPage(page);
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) {
            closeConfirmModal();
        }
        if (e.target === elements.formulaModal) {
            closeFormulaModal();
        }
        if (e.target === elements.diagnosticoModal) {
            closeDiagnosticoModal();
        }
    });

    // Inicializar datos
    await Promise.all([fetchPerfusiones(), fetchCitas()]);
});