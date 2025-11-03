document.addEventListener('DOMContentLoaded', function () {
    const asistenciaModalElement = document.getElementById('asistenciaModal');
    if (!asistenciaModalElement) return;

    const asistenciaModal = new bootstrap.Modal(asistenciaModalElement);
    const modalBody = document.getElementById('asistenciaModalBody');
    const modalFooter = document.getElementById('asistenciaModalFooter');
    const openAsistenciaBtn = document.getElementById('openAsistenciaBtn');

    let asistenciaState = null;

    const checkAsistenciaStatus = async () => {
        try {
            const response = await fetch('/api/asistencia/hoy');
            if (!response.ok) {
                if (response.status !== 404) { // 404 es esperado si no hay registro
                    throw new Error('Error al verificar asistencia');
                }
                asistenciaState = null; // No hay registro hoy
            } else {
                asistenciaState = await response.json();
            }
            
            // Si no hay registro, mostrar modal automáticamente
            if (!asistenciaState) {
                asistenciaModal.show();
            }
            updateModalUI();

        } catch (error) {
            console.error(error);
            modalBody.innerHTML = `<p class="text-danger">No se pudo verificar el estado de la asistencia. Intente de nuevo.</p>`;
        }
    };

    const updateModalUI = () => {
        modalBody.innerHTML = '';
        modalFooter.innerHTML = '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>';

        if (!asistenciaState) {
            // No ha marcado entrada
            modalBody.innerHTML = `<p>No has registrado tu asistencia para hoy, <strong>${new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}</strong>.</p>`;
            const btnEntrada = document.createElement('button');
            btnEntrada.className = 'btn btn-success';
            btnEntrada.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Registrar Entrada';
            btnEntrada.onclick = registrarEntrada;
            modalFooter.appendChild(btnEntrada);
        } else if (asistenciaState && !asistenciaState.hora_salida) {
            // Marcó entrada, pero no salida
            modalBody.innerHTML = `<p>✅ Entrada registrada a las: <strong>${asistenciaState.hora_entrada}</strong>.</p>
                                   <p>Tu turno de hoy finaliza a las: <strong>${asistenciaState.horario_fin_hoy || 'N/A'}</strong>.</p>`;
            const btnSalida = document.createElement('button');
            btnSalida.id = 'btnRegistrarSalida';
            btnSalida.className = 'btn btn-primary';
            btnSalida.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i>Registrar Salida';
            btnSalida.onclick = registrarSalida;

            // Habilitar botón de salida solo si la hora actual es posterior a la hora de fin de turno
            const ahora = new Date();
            const horaFinTurno = new Date();
            if (asistenciaState.horario_fin_hoy) {
                const [h, m, s] = asistenciaState.horario_fin_hoy.split(':');
                horaFinTurno.setHours(h, m, s);
                if (ahora < horaFinTurno) {
                    btnSalida.disabled = true;
                    btnSalida.title = `Podrás marcar tu salida después de las ${asistenciaState.horario_fin_hoy}.`;
                }
            }
            
            modalFooter.appendChild(btnSalida);
        } else {
            // Ya marcó entrada y salida
            modalBody.innerHTML = `<p>🎉 ¡Jornada completada por hoy!</p>
                                   <p><strong>Entrada:</strong> ${asistenciaState.hora_entrada}</p>
                                   <p><strong>Salida:</strong> ${asistenciaState.hora_salida}</p>`;
        }
    };

    const registrarEntrada = async () => {
        const hora_entrada = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
        try {
            const response = await fetch('/api/asistencia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: new Date().toISOString().split('T')[0],
                    hora_entrada: hora_entrada,
                    estado_asistencia: 'Presente'
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar entrada');
            
            asistenciaModal.hide();
            alert('Entrada registrada con éxito.');
            checkAsistenciaStatus(); // Recargar estado
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    const registrarSalida = async () => {
        const hora_salida = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM
        try {
            const response = await fetch(`/api/asistencia/${asistenciaState.id_asistencia}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hora_salida: hora_salida })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Error al registrar salida');

            asistenciaModal.hide();
            alert('Salida registrada con éxito.');
            checkAsistenciaStatus(); // Recargar estado
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };

    // Evento para abrir el modal manualmente
    if (openAsistenciaBtn) {
        openAsistenciaBtn.addEventListener('click', () => {
            updateModalUI(); // Asegurarse de que el UI esté actualizado
            asistenciaModal.show();
        });
    }

    // Al cerrar el modal, recargar el estado por si acaso
    asistenciaModalElement.addEventListener('hidden.bs.modal', () => {
        checkAsistenciaStatus();
    });

    // Carga inicial
    checkAsistenciaStatus();
});