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
    let citaToCancelId = null;

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
            const response = await fetch(url, { method });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Ocurrió un error.');
            }

            // Mostrar notificación mejorada
            showNotification(notificationTitle, successMessage, notificationType);
            fetchCitas(); // Refresh the list

        } catch (error) {
            console.error(`Error en la acción ${action}:`, error);
            showNotification('Error', `Error: ${error.message}`, 'error');
        }
    };

    // Función mejorada para mostrar notificaciones
    const showNotification = (title, message, type = 'info') => {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Determinar icono según el tipo
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
        
        // Añadir al DOM
        document.body.appendChild(notification);
        
        // Mostrar con animación
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Configurar cierre automático después de 5 segundos
        const autoClose = setTimeout(() => {
            closeNotification(notification);
        }, 5000);
        
        // Configurar cierre manual
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoClose);
            closeNotification(notification);
        });
        
        // Pausar el progreso al hacer hover
        notification.addEventListener('mouseenter', () => {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        });
        
        notification.addEventListener('mouseleave', () => {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
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
        
        // Crear o actualizar el modal de cancelación
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

            // Event listeners para el modal de cancelación
            cancelModal.querySelector('.close-btn').addEventListener('click', closeCancelModal);
            cancelModal.querySelector('#cancel-modal-cancel').addEventListener('click', closeCancelModal);
            cancelModal.querySelector('#cancel-modal-confirm').addEventListener('click', () => {
                if (citaToCancelId) {
                    handleAction(citaToCancelId, 'cancel');
                    closeCancelModal();
                }
            });

            // Cerrar al hacer click fuera del modal
            cancelModal.addEventListener('click', (e) => {
                if (e.target === cancelModal) {
                    closeCancelModal();
                }
            });
        }

        // Actualizar la información de la cita en el modal
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
            openCancelModal(citaId);
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