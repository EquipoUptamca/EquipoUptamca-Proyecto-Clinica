document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let currentDoctorId = null;
    const apiBaseUrl = '/api';
    
    // Elementos del DOM
    const doctorSelect = document.getElementById('doctorSelect');
    const weeklySchedule = document.getElementById('weeklySchedule');
    const scheduleList = document.getElementById('scheduleList');
    const availableSlots = document.getElementById('availableSlots');
    const addScheduleForm = document.getElementById('addScheduleForm');
    const checkSlotsBtn = document.getElementById('checkSlots');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const deleteAllSchedulesBtn = document.getElementById('deleteAllSchedulesBtn');
    const copyScheduleBtn = document.getElementById('copyScheduleBtn');
    
    // Inicializar modales y toasts de forma segura
    let copyModal = null;
    let successToast = null;
    let confirmationModal = null;
    let errorToast = null;
    
    try {
        const copyModalElement = document.getElementById('copyModal');
        if (copyModalElement) {
            copyModal = new bootstrap.Modal(copyModalElement);
        }

        const confirmationModalElement = document.getElementById('confirmationModal');
        if (confirmationModalElement) {
            confirmationModal = new bootstrap.Modal(confirmationModalElement);
        }
        
        const successToastElement = document.getElementById('successToast');
        if (successToastElement) {
            successToast = new bootstrap.Toast(successToastElement);
        }
        
        const errorToastElement = document.getElementById('errorToast');
        if (errorToastElement) {
            errorToast = new bootstrap.Toast(errorToastElement);
        }
    } catch (error) {
        console.error('Error inicializando componentes Bootstrap:', error);
    }
    
    const sourceDoctorSelect = document.getElementById('sourceDoctorSelect');
    const targetDoctorSelect = document.getElementById('targetDoctorSelect');
    const confirmCopyBtn = document.getElementById('confirmCopyBtn');
    
    // Función para obtener nombre del día
    function getDayName(dayNumber) {
        const days = {
            1: 'Lunes',
            2: 'Martes',
            3: 'Miércoles',
            4: 'Jueves',
            5: 'Viernes',
            6: 'Sábado',
            7: 'Domingo'
        };
        return days[dayNumber] || 'Desconocido';
    }
    
    // Mostrar notificación
    function showNotification(message, isSuccess = true) {
        if (isSuccess && successToast) {
            const successMessage = document.getElementById('successMessage');
            if (successMessage) {
                successMessage.textContent = message;
                successToast.show();
            }
        } else if (errorToast) {
            const errorMessage = document.getElementById('errorMessage');
            if (errorMessage) {
                errorMessage.textContent = message;
                errorToast.show();
            }
        } else {
            // Fallback: usar alert si los toasts no están disponibles
            alert(message);
        }
    }

    // Función para mostrar modal de confirmación
    function showConfirmation(message, onConfirm) {
        if (!confirmationModal) {
            // Fallback si el modal no está disponible
            if (confirm(message)) {
                onConfirm();
            }
            return;
        }

        const messageElement = document.getElementById('confirmationMessageText');
        const confirmBtn = document.getElementById('confirmActionBtn');

        messageElement.innerHTML = message; // Usar innerHTML para permitir formato
        confirmBtn.onclick = () => { confirmationModal.hide(); onConfirm(); };
        confirmationModal.show();
    }
    
    // Cargar lista de médicos
    function loadDoctors() {
        fetch(`${apiBaseUrl}/medicos`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(doctors => {
                const selectsToPopulate = [doctorSelect, sourceDoctorSelect, targetDoctorSelect];
                selectsToPopulate.forEach(select => {
                    if (select) {
                        const currentValue = select.value;
                        select.innerHTML = '<option value="">-- Seleccione un médico --</option>';
                        doctors.forEach(doctor => {
                            const option = document.createElement('option');
                            option.value = doctor.id_medico;
                            option.textContent = `${doctor.nombre_completo} (${doctor.especialidad || 'General'})`;
                            select.appendChild(option);
                        });
                        // Solo restaurar valor para doctorSelect principal
                        if (select === doctorSelect && currentValue) {
                            select.value = currentValue;
                            // Disparar evento change si hay un valor seleccionado
                            if (currentValue) {
                                select.dispatchEvent(new Event('change'));
                            }
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error al cargar médicos:', error);
                showNotification('Error al cargar la lista de médicos', false);
            });
    }
    
    // Cargar horarios del médico seleccionado
    if (doctorSelect) {
        doctorSelect.addEventListener('change', function() {
            currentDoctorId = this.value;
            if (currentDoctorId) {
                if (exportPdfBtn) exportPdfBtn.disabled = false;
                if (deleteAllSchedulesBtn) deleteAllSchedulesBtn.disabled = false;
                loadWeeklySchedule(currentDoctorId);
                loadScheduleList(currentDoctorId);
            } else {
                if (exportPdfBtn) exportPdfBtn.disabled = true;
                if (deleteAllSchedulesBtn) deleteAllSchedulesBtn.disabled = true;
                if (weeklySchedule) {
                    weeklySchedule.innerHTML = '<div class="col-12 no-schedules">Seleccione un médico para ver sus horarios</div>';
                }
                if (scheduleList) {
                    scheduleList.innerHTML = '';
                }
                if (availableSlots) {
                    availableSlots.innerHTML = '';
                }
                const noSlotsMessage = document.getElementById('noSlotsMessage');
                if (noSlotsMessage) {
                    noSlotsMessage.style.display = 'block';
                }
            }
        });
    }
    
    // Cargar vista semanal
    function loadWeeklySchedule(doctorId) {
        if (!weeklySchedule) return;
        
        const loadingElement = document.getElementById('weeklyLoading');
        
        weeklySchedule.innerHTML = '';
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        fetch(`${apiBaseUrl}/horarios/${doctorId}/semanal`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }

                const hasSchedules = data && Object.values(data).some(day => day && day.length > 0);
                if (!hasSchedules) {
                    weeklySchedule.innerHTML = '<div class="no-schedules" style="grid-column: 1 / -1;">No hay horarios registrados para este médico</div>';
                    return;
                }

                for (let day = 1; day <= 7; day++) {
                    const dayName = getDayName(day);
                    const daySchedules = data[day.toString()] || [];
                    const dayColumn = document.createElement('div');
                    dayColumn.className = 'day-column';

                    const cardHeader = document.createElement('div');
                    cardHeader.className = 'day-header';
                    cardHeader.innerHTML = `<i class="bi bi-calendar-day me-2"></i>${dayName}`;

                    const cardBody = document.createElement('div');
                    cardBody.className = 'schedule-list-body';

                    if (daySchedules.length === 0) {
                        const noSchedule = document.createElement('div');
                        noSchedule.className = 'no-schedules';
                        noSchedule.textContent = 'Sin horarios este día';
                        cardBody.appendChild(noSchedule);
                    } else {
                        daySchedules.forEach(schedule => {
                            const timeSlot = document.createElement('div');
                            timeSlot.className = 'schedule-item';

                            const timeText = document.createElement('span');
                            timeText.className = 'schedule-time';
                            const startTime = schedule.hora_inicio ? schedule.hora_inicio.substring(0, 5) : '--:--';
                            const endTime = schedule.hora_fin ? schedule.hora_fin.substring(0, 5) : '--:--';
                            timeText.innerHTML = `<i class="bi bi-clock me-1"></i>${startTime} - ${endTime}`;

                            const actions = document.createElement('div');
                            actions.className = 'schedule-actions btn-group';

                            const editBtn = document.createElement('button');
                            editBtn.className = 'btn btn-sm btn-outline-primary action-btn';
                            editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
                            editBtn.title = 'Editar';
                            const augmentedSchedule = { ...schedule, dia_semana_num: day };
                            editBtn.onclick = () => openEditModal(schedule.id_horario, augmentedSchedule);

                            const deleteBtn = document.createElement('button');
                            deleteBtn.className = 'btn btn-sm btn-outline-danger action-btn';
                            deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                            deleteBtn.title = 'Eliminar';
                            deleteBtn.onclick = () => deleteSchedule(schedule.id_horario);

                            actions.appendChild(editBtn);
                            actions.appendChild(deleteBtn);

                            timeSlot.appendChild(timeText);
                            timeSlot.appendChild(actions);

                            cardBody.appendChild(timeSlot);
                        });
                    }

                    dayColumn.appendChild(cardHeader);
                    dayColumn.appendChild(cardBody);
                    weeklySchedule.appendChild(dayColumn);
                }
            })
            .catch(error => {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                console.error('Error al cargar horario semanal:', error);
                showNotification('Error al cargar horario semanal', false);
            });
    }
    
    // Cargar lista completa de horarios
    function loadScheduleList(doctorId) {
        if (!scheduleList) return;
        
        const loadingElement = document.getElementById('listLoading');
        
        scheduleList.innerHTML = '';
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        fetch(`${apiBaseUrl}/horarios/${doctorId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Error HTTP: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                
                if (!data || data.length === 0) {
                    scheduleList.innerHTML = '<tr><td colspan="5" class="text-center no-schedules">No hay horarios registrados</td></tr>';
                    return;
                }
                
                data.forEach(schedule => {
                    const row = document.createElement('tr');
                    
                    const idCell = document.createElement('td');
                    idCell.textContent = schedule.id_horario || 'N/A';
                    idCell.className = 'fw-bold';
                    
                    const dayCell = document.createElement('td');
                    dayCell.textContent = schedule.dia_semana || getDayName(schedule.dia_semana_num) || 'Desconocido';
                    
                    const startCell = document.createElement('td');
                    startCell.innerHTML = `<i class="bi bi-clock me-1"></i>${schedule.hora_inicio || '--:--'}`;
                    
                    const endCell = document.createElement('td');
                    endCell.innerHTML = `<i class="bi bi-clock me-1"></i>${schedule.hora_fin || '--:--'}`;
                    
                    const actionsCell = document.createElement('td');
                    actionsCell.className = 'text-end';
                    
                    const btnGroup = document.createElement('div');
                    btnGroup.className = 'btn-group';
                    
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-sm btn-outline-primary me-1';
                    editBtn.innerHTML = '<i class="bi bi-pencil"></i> Editar';
                    editBtn.onclick = () => openEditModal(schedule.id_horario, schedule);
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-sm btn-outline-danger';
                    deleteBtn.innerHTML = '<i class="bi bi-trash"></i>';
                    deleteBtn.onclick = () => deleteSchedule(schedule.id_horario);
                    
                    btnGroup.appendChild(editBtn);
                    btnGroup.appendChild(deleteBtn);
                    actionsCell.appendChild(btnGroup);
                    
                    row.appendChild(idCell);
                    row.appendChild(dayCell);
                    row.appendChild(startCell);
                    row.appendChild(endCell);
                    row.appendChild(actionsCell);
                    
                    scheduleList.appendChild(row);
                });
            })
            .catch(error => {
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }
                console.error('Error al cargar lista de horarios:', error);
                showNotification('Error al cargar lista de horarios', false);
            });
    }
    
    // Ver disponibilidad
    if (checkSlotsBtn) {
        checkSlotsBtn.addEventListener('click', function() {
            if (!currentDoctorId) {
                showNotification('Por favor seleccione un médico primero', false);
                return;
            }
            
            const day = document.getElementById('slotDay')?.value;
            const duration = document.getElementById('slotDuration')?.value;
            
            if (!day || !duration) {
                showNotification('Por favor seleccione día y duración', false);
                return;
            }
            
            if (!availableSlots) return;
            
            const noSlotsMessage = document.getElementById('noSlotsMessage');
            const loadingElement = document.getElementById('slotsLoading');
            
            availableSlots.innerHTML = '';
            if (noSlotsMessage) {
                noSlotsMessage.style.display = 'none';
            }
            if (loadingElement) {
                loadingElement.style.display = 'block';
            }
            
            fetch(`${apiBaseUrl}/horarios/${currentDoctorId}/slots?dia_semana=${day}&duracion=${duration}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                    
                    if (data.error) {
                        if (noSlotsMessage) {
                            noSlotsMessage.textContent = data.error;
                            noSlotsMessage.style.display = 'block';
                        }
                        return;
                    }
                    
                    if (!Array.isArray(data) || data.length === 0) {
                        if (noSlotsMessage) {
                            noSlotsMessage.textContent = 'No hay horarios disponibles para este día';
                            noSlotsMessage.style.display = 'block';
                        }
                        return;
                    }
                    
                    data.forEach(slot => {
                        const slotBadge = document.createElement('span');
                        slotBadge.className = 'slot-badge';
                        slotBadge.innerHTML = `<i class="bi bi-clock me-1"></i>${slot}`;
                        availableSlots.appendChild(slotBadge);
                    });
                })
                .catch(error => {
                    if (loadingElement) {
                        loadingElement.style.display = 'none';
                    }
                    console.error('Error al cargar slots disponibles:', error);
                    showNotification('Error al cargar slots disponibles', false);
                });
        });
    }
    
    // Agregar nuevo horario
    if (addScheduleForm) {
        addScheduleForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!currentDoctorId) {
                showNotification('Por favor seleccione un médico primero', false);
                return;
            }
            
            const day = document.getElementById('addDay')?.value;
            const startTime = document.getElementById('startTime')?.value;
            const endTime = document.getElementById('endTime')?.value;
            
            if (!day || !startTime || !endTime) {
                showNotification('Por favor complete todos los campos', false);
                return;
            }
            
            if (startTime >= endTime) {
                showNotification('La hora de inicio debe ser anterior a la hora de fin', false);
                return;
            }
            
            const scheduleData = {
                id_medico: parseInt(currentDoctorId),
                dia_semana: parseInt(day),
                hora_inicio: startTime,
                hora_fin: endTime
            };
            
            fetch(`${apiBaseUrl}/horarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Error del servidor'); });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Horario agregado exitosamente');
                addScheduleForm.reset();
                
                // Recargar las vistas
                loadWeeklySchedule(currentDoctorId);
                loadScheduleList(currentDoctorId);
                
                // Cambiar a la pestaña de lista
                const listTab = document.getElementById('list-tab');
                if (listTab) {
                    const tabInstance = new bootstrap.Tab(listTab);
                    tabInstance.show();
                }
            })
            .catch(error => {
                console.error('Error al agregar horario:', error);
                showNotification(error.message || 'Error al agregar horario', false);
            });
        });
    }
    
    // Abrir modal de edición
    function openEditModal(scheduleId, scheduleData) {
        const editModalElement = document.getElementById('editModal');
        if (!editModalElement) return;
        
        const modal = new bootstrap.Modal(editModalElement);
        
        document.getElementById('editId').value = scheduleId;
        document.getElementById('editDay').value = scheduleData.dia_semana || scheduleData.dia_semana_num;
        document.getElementById('editStartTime').value = scheduleData.hora_inicio;
        document.getElementById('editEndTime').value = scheduleData.hora_fin;
        
        modal.show();
    }
    
    // Guardar cambios del modal
    const saveChangesBtn = document.getElementById('saveChanges');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', function() {
            const scheduleId = document.getElementById('editId')?.value;
            const day = document.getElementById('editDay')?.value;
            const startTime = document.getElementById('editStartTime')?.value;
            const endTime = document.getElementById('editEndTime')?.value;
            
            if (!scheduleId || !day || !startTime || !endTime) {
                showNotification('Por favor complete todos los campos', false);
                return;
            }
            
            if (startTime >= endTime) {
                showNotification('La hora de inicio debe ser anterior a la hora de fin', false);
                return;
            }
            
            const scheduleData = {
                dia_semana: parseInt(day),
                hora_inicio: startTime,
                hora_fin: endTime
            };
            
            fetch(`${apiBaseUrl}/horarios/${scheduleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Error del servidor'); });
                }
                return response.json();
            })
            .then(data => {
                showNotification('Horario actualizado exitosamente');
                
                // Cerrar modal
                const modalElement = document.getElementById('editModal');
                if (modalElement) {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) modal.hide();
                }
                
                // Recargar las vistas
                loadWeeklySchedule(currentDoctorId);
                loadScheduleList(currentDoctorId);
            })
            .catch(error => {
                console.error('Error al actualizar horario:', error);
                showNotification(error.message || 'Error al actualizar horario', false);
            });
        });
    }
    
    // Eliminar horario
    function deleteSchedule(scheduleId) {
        showConfirmation('¿Está seguro de que desea eliminar este horario?', () => {
            performDelete(scheduleId);
        });
    }

    function performDelete(scheduleId) {
        fetch(`${apiBaseUrl}/horarios/${scheduleId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Error del servidor'); });
            }
            return response.json();
        })
        .then(data => {
            showNotification('Horario eliminado exitosamente');
            // Recargar las vistas
            loadWeeklySchedule(currentDoctorId);
            loadScheduleList(currentDoctorId);
        })
        .catch(error => {
            console.error('Error al eliminar horario:', error);
            showNotification(error.message || 'Error al eliminar el horario', false);
        });
    }    
    
    // Exportar a PDF
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            if (!currentDoctorId) {
                showNotification('Por favor, seleccione un médico para exportar sus horarios.', false);
                return;
            }
    
            const originalHtml = exportPdfBtn.innerHTML;
            exportPdfBtn.disabled = true;
            exportPdfBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Exportando...';
    
            fetch(`${apiBaseUrl}/horarios/${currentDoctorId}/export/pdf`)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw new Error(err.error || 'Error al generar el PDF'); });
                    }
                    const disposition = response.headers.get('Content-Disposition');
                    let filename = 'horarios.pdf';
                    if (disposition && disposition.indexOf('attachment') !== -1) {
                        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                        const matches = filenameRegex.exec(disposition);
                        if (matches != null && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    }
                    return response.blob().then(blob => ({ blob, filename }));
                })
                .then(({ blob, filename }) => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    showNotification('El PDF se ha descargado exitosamente.', true);
                })
                .catch(error => {
                    showNotification(error.message, false);
                })
                .finally(() => {
                    exportPdfBtn.disabled = false;
                    exportPdfBtn.innerHTML = originalHtml;
                });
        });
    }

    // Eliminar todos los horarios de un médico
    if (deleteAllSchedulesBtn) {
        deleteAllSchedulesBtn.addEventListener('click', () => {
            if (!currentDoctorId) {
                showNotification('Debe seleccionar un médico para poder eliminar sus horarios.', false);
                return;
            }

            const doctorName = doctorSelect.options[doctorSelect.selectedIndex]?.text || 'el médico seleccionado';
            const confirmationMessage = `<strong>¿ESTÁ SEGURO?</strong><br><br>Esta acción eliminará <strong>PERMANENTEMENTE TODOS</strong> los horarios del médico: <strong>${doctorName}</strong>.<br><br>Esta acción no se puede deshacer.`;
            
            showConfirmation(confirmationMessage, () => {
                const originalHtml = deleteAllSchedulesBtn.innerHTML;
                fetch(`${apiBaseUrl}/horarios/medico/${currentDoctorId}`, {
                method: 'DELETE'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Error del servidor'); });
                }
                return response.json();
            })
            .then(data => {
                showNotification(data.message || 'Horarios eliminados exitosamente', true);
                
                // Recargar las vistas
                loadWeeklySchedule(currentDoctorId);
                loadScheduleList(currentDoctorId);
            })
            .catch(error => {
                showNotification(`Error: ${error.message}`, false);
            });
            });
        });
    }

    // Abrir modal de copia y manejar la lógica
    if (copyScheduleBtn) {
        copyScheduleBtn.addEventListener('click', () => {
            if (copyModal) {
                copyModal.show();
            }
        });
    }

    if (confirmCopyBtn) {
        confirmCopyBtn.addEventListener('click', () => {
            const sourceId = sourceDoctorSelect?.value;
            const targetId = targetDoctorSelect?.value;
            const overwriteCheckbox = document.getElementById('overwriteTargetSchedules');
            const overwrite = overwriteCheckbox ? overwriteCheckbox.checked : false;

            if (!sourceId || !targetId) {
                showNotification('Debe seleccionar un médico de origen y uno de destino.', false);
                return;
            }

            if (sourceId === targetId) {
                showNotification('El médico de origen y destino no pueden ser el mismo.', false);
                return;
            }

            const confirmationMessage = `¿Está seguro? Esta acción copiará TODOS los horarios del médico de origen al de destino. <br><br><strong>${overwrite ? 'Los horarios existentes del médico de destino SERÁN ELIMINADOS.' : 'Los horarios que causen conflicto no se copiarán.'}</strong>`;
            
            showConfirmation(confirmationMessage, () => {
                fetch(`${apiBaseUrl}/horarios/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_doctor_id: sourceId,
                    target_doctor_id: targetId,
                    overwrite: overwrite
                })
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.error || 'Error del servidor'); });
                }
                return response.json();
            })
            .then(data => {
                showNotification(data.message || 'Horarios copiados exitosamente', true);
                if (copyModal) {
                    copyModal.hide();
                }
                if (currentDoctorId && currentDoctorId === targetId) {
                    loadWeeklySchedule(currentDoctorId);
                    loadScheduleList(currentDoctorId);
                }
            })
            .catch(error => {
                showNotification(`Error al copiar horarios: ${error.message}`, false);
            });
            });
        });
    }

    // Inicializar la aplicación
    loadDoctors();
});