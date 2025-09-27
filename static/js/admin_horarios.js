document.addEventListener('DOMContentLoaded', () => {
    const doctorSelect = document.getElementById('doctorSelect');
    const scheduleBoard = document.getElementById('schedule-board');
    const addScheduleBtn = document.getElementById('addScheduleBtn');
    const loader = document.getElementById('loader');
    const initialMessage = document.getElementById('select-doctor-message');

    const modal = document.getElementById('scheduleModal');
    const closeModalBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('#cancelBtn');
    const scheduleForm = document.getElementById('scheduleForm');
    
    const dayNames = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 7: 'Domingo' };

    // --- Cargar Médicos ---
    async function loadDoctors() {
        try {
            const response = await fetch('/api/medicos');
            if (!response.ok) throw new Error('Error al cargar médicos');
            const doctors = await response.json();
            
            doctorSelect.innerHTML = '<option value="">-- Seleccione un médico --</option>';
            doctors.forEach(doctor => {
                if (doctor.estado === 'A') { // Solo mostrar médicos activos
                    doctorSelect.innerHTML += `<option value="${doctor.id_medico}">${doctor.nombre_completo}</option>`;
                }
            });
        } catch (error) {
            console.error(error);
            doctorSelect.innerHTML = '<option value="">Error al cargar médicos</option>';
        }
    }

    // --- Cargar y Mostrar Horarios ---
    async function displaySchedules(doctorId) {
        scheduleBoard.innerHTML = '';
        loader.style.display = 'block';
        initialMessage.style.display = 'none';

        try {
            const response = await fetch(`/api/horarios/${doctorId}`);
            if (!response.ok) throw new Error('Error al cargar horarios');
            const schedules = await response.json();

            const schedulesByDay = {};
            schedules.forEach(s => {
                if (!schedulesByDay[s.dia_semana_num]) {
                    schedulesByDay[s.dia_semana_num] = [];
                }
                schedulesByDay[s.dia_semana_num].push(s);
            });

            scheduleBoard.innerHTML = ''; // Limpiar loader
            for (let i = 1; i <= 7; i++) {
                const daySchedules = schedulesByDay[i] || [];
                const dayCard = document.createElement('div');
                dayCard.className = 'day-card';
                
                let scheduleItemsHTML = '';
                if (daySchedules.length > 0) {
                    daySchedules.sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
                    scheduleItemsHTML = daySchedules.map(s => `
                        <div class="schedule-item" data-id="${s.id_horario}">
                            <span class="schedule-time">${s.hora_inicio.substring(0, 5)} - ${s.hora_fin.substring(0, 5)}</span>
                            <div class="schedule-actions">
                                <button class="edit-btn" title="Editar"><i class="fas fa-edit"></i></button>
                                <button class="delete-btn" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    `).join('');
                } else {
                    scheduleItemsHTML = '<p class="no-schedules-message">Sin horarios definidos</p>';
                }

                dayCard.innerHTML = `
                    <div class="day-card-header">${dayNames[i]}</div>
                    <div class="day-card-body">${scheduleItemsHTML}</div>
                `;
                scheduleBoard.appendChild(dayCard);
            }

        } catch (error) {
            console.error(error);
            scheduleBoard.innerHTML = '<p>Error al cargar los horarios.</p>';
        } finally {
            loader.style.display = 'none';
        }
    }

    // --- Lógica del Modal ---
    function openModal(schedule = null) {
        scheduleForm.reset();
        document.getElementById('modalTitle').textContent = schedule ? 'Editar Horario' : 'Añadir Nuevo Horario';
        document.getElementById('scheduleId').value = schedule ? schedule.id_horario : '';
        
        if (schedule) {
            document.getElementById('dia_semana').value = schedule.dia_semana_num;
            document.getElementById('hora_inicio').value = schedule.hora_inicio.substring(0, 5);
            document.getElementById('hora_fin').value = schedule.hora_fin.substring(0, 5);
        }
        
        modal.style.display = 'block';
    }

    function closeModal() {
        modal.style.display = 'none';
    }

    // --- Event Listeners ---
    doctorSelect.addEventListener('change', () => {
        const doctorId = doctorSelect.value;
        if (doctorId) {
            addScheduleBtn.disabled = false;
            displaySchedules(doctorId);
        } else {
            addScheduleBtn.disabled = true;
            scheduleBoard.innerHTML = '';
            initialMessage.style.display = 'block';
        }
    });

    addScheduleBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    scheduleBoard.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const scheduleItem = e.target.closest('.schedule-item');

        if (!scheduleItem) return;
        const scheduleId = scheduleItem.dataset.id;

        if (editBtn) {
            const doctorId = doctorSelect.value;
            const response = await fetch(`/api/horarios/${doctorId}`);
            const schedules = await response.json();
            const scheduleToEdit = schedules.find(s => s.id_horario == scheduleId);
            if (scheduleToEdit) {
                openModal(scheduleToEdit);
            }
        }

        if (deleteBtn) {
            if (confirm('¿Está seguro de que desea eliminar este horario?')) {
                try {
                    const response = await fetch(`/api/horarios/${scheduleId}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Error al eliminar');
                    displaySchedules(doctorSelect.value);
                } catch (error) {
                    console.error(error);
                    alert('No se pudo eliminar el horario.');
                }
            }
        }
    });

    scheduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(scheduleForm);
        const scheduleId = formData.get('id_horario');
        const doctorId = doctorSelect.value;

        const data = {
            id_medico: doctorId,
            dia_semana: formData.get('dia_semana'),
            hora_inicio: formData.get('hora_inicio'),
            hora_fin: formData.get('hora_fin'),
        };

        const method = scheduleId ? 'PUT' : 'POST';
        const url = scheduleId ? `/api/horarios/${scheduleId}` : '/api/horarios';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Error al guardar el horario.');
            }
            closeModal();
            displaySchedules(doctorId);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    // --- Carga Inicial ---
    loadDoctors();
});