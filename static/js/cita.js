document.addEventListener('DOMContentLoaded', function() {
            const form = document.getElementById('citaForm');
            const medicoSelect = document.getElementById('id_medico');
            const pacienteSelect = document.getElementById('id_paciente');
            const fechaInput = document.getElementById('fecha_cita');
            const fechaError = document.getElementById('fechaError');
            const timeSlotsContainer = document.getElementById('timeSlotsContainer');
            const timeSlotError = document.getElementById('timeSlotError');
            const horaInput = document.getElementById('hora_cita');
            const motivoInput = document.getElementById('motivo_consulta');
            const formMessages = document.getElementById('formMessages');
            const submitBtn = document.getElementById('submitBtn');
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
            
            // Configurar datepicker con días no laborables
            const datepicker = flatpickr(fechaInput, {
                locale: 'es',
                minDate: 'today',
                dateFormat: 'Y-m-d',
                disable: [
                    function(date) {
                        return (date.getDay() === 0 || date.getDay() === 6); // Deshabilitar fines de semana
                    }
                ]
            });
            
            // Cargar médicos disponibles
            function cargarMedicos() {
                fetch('/api/medicos/disponibles')
                    .then(response => {
                        if (!response.ok) throw new Error('Error al cargar médicos');
                        return response.json();
                    })
                    .then(data => {
                        medicoSelect.innerHTML = '<option value="">Seleccionar médico...</option>';
                        data.forEach(medico => {
                            medicoSelect.innerHTML += `
                                <option value="${medico.id_medico}" 
                                    data-dias="${medico.dias_laborales || '1,2,3,4,5'}" 
                                    data-horario="${medico.horario_laboral || '09:00-17:00'}">
                                    ${medico.nombre_completo} - ${medico.especialidad}
                                </option>
                            `;
                        });
                    })
                    .catch(error => {
                        mostrarMensaje('Error al cargar la lista de médicos', 'danger');
                        console.error('Error:', error);
                    });
            }
            
            // Cargar pacientes
            function cargarPacientes() {
                fetch('/api/pacientes')
                    .then(response => {
                        if (!response.ok) throw new Error('Error al cargar pacientes');
                        return response.json();
                    })
                    .then(data => {
                        pacienteSelect.innerHTML = '<option value="">Seleccionar paciente...</option>';
                        data.forEach(paciente => {
                            pacienteSelect.innerHTML += `
                                <option value="${paciente.id_paciente}">${paciente.nombre_completo}</option>
                            `;
                        });

                        // Pre-seleccionar paciente si viene en la URL
                        const urlParams = new URLSearchParams(window.location.search);
                        const pacienteId = urlParams.get('paciente_id');
                        if (pacienteId) {
                            pacienteSelect.value = pacienteId;
                        }
                    })
                    .catch(error => {
                        mostrarMensaje('Error al cargar la lista de pacientes', 'danger');
                        console.error('Error:', error);
                    });
            }
            
            // Cargar horarios disponibles para el médico y fecha seleccionados
            function cargarHorariosDisponibles(medicoId, fecha) {
                timeSlotError.textContent = '';
                horaInput.value = '';
                submitBtn.disabled = true;
                
                // Mostrar loading
                timeSlotsContainer.innerHTML = `
                    <div class="d-flex justify-content-center align-items-center py-3">
                        <div class="loading-spinner me-2"></div>
                        <span>Cargando horarios disponibles...</span>
                    </div>
                `;
                
                fetch(`/api/medicos/${medicoId}/horarios?fecha=${fecha}`)
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => { throw err; });
                        }
                        return response.json();
                    })
                    .then(horarios => {
                        timeSlotsContainer.innerHTML = '';
                        
                        if (!horarios || horarios.length === 0) {
                            timeSlotsContainer.innerHTML = `
                                <div class="alert alert-warning">
                                    <i class="fas fa-calendar-times me-2"></i>
                                    No hay horarios disponibles para esta fecha
                                </div>
                            `;
                            return;
                        }
                        
                        // Crear bloques de tiempo
                        horarios.forEach(horario => {
                            const timeBlock = document.createElement('div');
                            timeBlock.className = 'time-range';
                            
                            const label = document.createElement('div');
                            label.className = 'time-range-label';
                            label.textContent = horario;
                            
                            const bar = document.createElement('div');
                            bar.className = 'time-range-bar';
                            bar.dataset.time = horario;
                            bar.textContent = horario;
                            
                            bar.addEventListener('click', function() {
                                if (this.classList.contains('unavailable')) return;
                                
                                document.querySelectorAll('.time-range-bar').forEach(b => {
                                    b.classList.remove('selected');
                                });
                                this.classList.add('selected');
                                horaInput.value = this.dataset.time;
                                submitBtn.disabled = false;
                            });
                            
                            timeBlock.appendChild(label);
                            timeBlock.appendChild(bar);
                            timeSlotsContainer.appendChild(timeBlock);
                        });
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        timeSlotsContainer.innerHTML = `
                            <div class="alert alert-danger">
                                <i class="fas fa-exclamation-triangle me-2"></i>
                                ${error.error || 'El médico no trabaja este día o no hay horarios disponibles'}
                            </div>
                        `;
                    });
            }
            
            // Mostrar mensajes en el formulario
            function mostrarMensaje(mensaje, tipo = 'success') {
                formMessages.innerHTML = `
                    <div class="alert alert-${tipo} alert-dismissible fade show">
                        ${mensaje}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                `;
            }
            
            // Validar fecha seleccionada
            function validarFechaSeleccionada(medicoId, fecha) {
                if (!medicoId || !fecha) return false;
                
                const medico = medicoSelect.options[medicoSelect.selectedIndex];
                const diasLaborales = medico.dataset.dias.split(',').map(Number);
                const fechaSeleccionada = new Date(fecha);
                const diaSemana = fechaSeleccionada.getDay(); // 0=Domingo, 1=Lunes, etc.
                
                return diasLaborales.includes(diaSemana);
            }
            
            // Event listeners
            medicoSelect.addEventListener('change', function() {
                if (fechaInput.value && this.value) {
                    const fechaValida = validarFechaSeleccionada(this.value, fechaInput.value);
                    
                    if (!fechaValida) {
                        fechaError.textContent = 'El médico no trabaja este día';
                        timeSlotsContainer.innerHTML = `
                            <div class="alert alert-warning">
                                <i class="fas fa-calendar-times me-2"></i>
                                Seleccione otra fecha
                            </div>
                        `;
                        return;
                    }
                    
                    cargarHorariosDisponibles(this.value, fechaInput.value);
                }
            });
            
            fechaInput.addEventListener('change', function() {
                fechaError.textContent = '';
                
                if (!medicoSelect.value) {
                    timeSlotsContainer.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Seleccione un médico primero
                        </div>
                    `;
                    return;
                }
                
                const fechaValida = validarFechaSeleccionada(medicoSelect.value, this.value);
                
                if (!fechaValida) {
                    fechaError.textContent = 'El médico no trabaja este día';
                    timeSlotsContainer.innerHTML = `
                        <div class="alert alert-warning">
                            <i class="fas fa-calendar-times me-2"></i>
                            Seleccione otra fecha
                        </div>
                    `;
                    return;
                }
                
                cargarHorariosDisponibles(medicoSelect.value, this.value);
            });
            
            // Envío del formulario
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                submitBtn.disabled = true;
                
                if (!horaInput.value) {
                    timeSlotError.textContent = 'Por favor seleccione un horario para la cita';
                    submitBtn.disabled = false;
                    return;
                }
                
                const formData = {
                    id_medico: medicoSelect.value,
                    id_paciente: pacienteSelect.value,
                    fecha_cita: fechaInput.value,
                    hora_cita: horaInput.value,
                    motivo_consulta: motivoInput.value
                };
                
                fetch('/api/citas', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => { throw err; });
                    }
                    return response.json();
                })
                .then(data => {
                    const medicoNombre = medicoSelect.options[medicoSelect.selectedIndex].text.split(' - ')[0];
                    const pacienteNombre = pacienteSelect.options[pacienteSelect.selectedIndex].text;
                    
                    document.getElementById('confirmationMessage').innerHTML = `
                        <strong>Cita programada exitosamente</strong><br>
                        ID de cita: ${data.cita_id}
                    `;
                    
                    document.getElementById('citaDetails').innerHTML = `
                        <strong>Detalles:</strong><br>
                        Fecha: ${formData.fecha_cita}<br>
                        Hora: ${formData.hora_cita}<br>
                        Médico: ${medicoNombre}<br>
                        Paciente: ${pacienteNombre}<br>
                        Motivo: ${formData.motivo_consulta}
                    `;
                    
                    confirmModal.show();
                    
                    // Configurar botón de impresión
                    document.getElementById('printCitaBtn').onclick = function() {
                        window.print();
                    };
                    
                    // Resetear formulario después de cerrar el modal
                    confirmModal._element.addEventListener('hidden.bs.modal', function() {
                        form.reset();
                        timeSlotsContainer.innerHTML = `
                            <div class="info-message">
                                Seleccione un médico y una fecha para ver los horarios disponibles
                            </div>
                        `;
                        horaInput.value = '';
                        timeSlotError.textContent = '';
                        submitBtn.disabled = false;
                        cargarMedicos();
                        cargarPacientes();
                    }, { once: true });
                })
                .catch(error => {
                    console.error('Error:', error);
                    mostrarMensaje(error.error || 'Error al programar la cita', 'danger');
                    submitBtn.disabled = false;
                });
            });
            
            // Inicializar
            cargarMedicos();
            cargarPacientes();
        });