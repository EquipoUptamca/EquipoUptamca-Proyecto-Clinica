document.addEventListener('DOMContentLoaded', function() {
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
    };

    let allCitas = [];
    let citaToConfirmId = null;

    const fetchCitas = async () => {
        showLoading(true);
        try {
            const response = await fetch('/api/citas/detalladas');
            if (!response.ok) {
                throw new Error('Error al cargar las citas.');
            }
            allCitas = await response.json();
            filterAndRenderCitas();
            updateStats();
        } catch (error) {
            console.error(error);
            elements.citasList.innerHTML = `<div class="no-citas"><i class="fas fa-exclamation-triangle"></i><h3>Error</h3><p>${error.message}</p></div>`;
        } finally {
            showLoading(false);
        }
    };

    const filterAndRenderCitas = () => {
        const dateFilter = elements.filterDate.value;
        const statusFilter = elements.filterStatus.value;

        const filteredCitas = allCitas.filter(cita => {
            const matchDate = !dateFilter || cita.fecha_cita === dateFilter;
            const matchStatus = statusFilter === 'all' || cita.estado === statusFilter;
            return matchDate && matchStatus;
        });

        renderCitas(filteredCitas);
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

    const showLoading = (isLoading) => {
        elements.loading.style.display = isLoading ? 'block' : 'none';
        elements.citasList.style.display = isLoading ? 'none' : 'block';
        if (isLoading) elements.noCitas.classList.add('hidden');
    };

    const handleAction = async (citaId, action) => {
        let url, method, successMessage;

        switch (action) {
            case 'confirm':
                url = `/api/citas/${citaId}/confirm`;
                method = 'PATCH';
                successMessage = 'Cita confirmada exitosamente.';
                break;
            case 'complete':
                url = `/api/citas/${citaId}/complete`;
                method = 'PATCH';
                successMessage = 'Cita completada exitosamente.';
                break;
            case 'cancel':
                if (!confirm('¿Está seguro de que desea cancelar esta cita?')) return;
                url = `/api/citas/${citaId}/cancel`;
                method = 'PATCH';
                successMessage = 'Cita cancelada exitosamente.';
                break;
            default:
                return;
        }

        try {
            const response = await fetch(url, { method });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error.');
            }

            alert(successMessage); // Simple alert for feedback
            fetchCitas(); // Refresh the list

        } catch (error) {
            console.error(`Error en la acción ${action}:`, error);
            alert(`Error: ${error.message}`);
        }
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

    const closeConfirmModal = () => {
        elements.confirmModal.classList.add('hidden');
        citaToConfirmId = null;
    };

    // Event Listeners
    elements.citasList.addEventListener('click', (e) => {
        const target = e.target.closest('button.btn-action');
        if (!target) return;

        const citaId = parseInt(target.dataset.id, 10);

        if (target.classList.contains('btn-confirm')) {
            openConfirmModal(citaId);
        } else if (target.classList.contains('btn-complete')) {
            handleAction(citaId, 'complete');
        } else if (target.classList.contains('btn-cancel')) {
            handleAction(citaId, 'cancel');
        }
    });

    elements.filterDate.addEventListener('change', filterAndRenderCitas);
    elements.filterStatus.addEventListener('change', filterAndRenderCitas);

    elements.clearFiltersBtn.addEventListener('click', () => {
        elements.filterDate.value = '';
        elements.filterStatus.value = 'all';
        filterAndRenderCitas();
    });

    elements.refreshBtn.addEventListener('click', fetchCitas);

    // Modal listeners
    elements.closeModalBtn.addEventListener('click', closeConfirmModal);
    elements.cancelConfirmBtn.addEventListener('click', closeConfirmModal);
    elements.confirmCitaBtn.addEventListener('click', () => {
        if (citaToConfirmId) {
            handleAction(citaToConfirmId, 'confirm');
            closeConfirmModal();
        }
    });

    window.addEventListener('click', (e) => {
        if (e.target === elements.confirmModal) {
            closeConfirmModal();
        }
    });

    // Initial Load
    fetchCitas();
});