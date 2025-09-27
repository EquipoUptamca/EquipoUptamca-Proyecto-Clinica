from flask import Blueprint, request, jsonify
from auth_middleware import login_required
import pyodbc
import logging
from datetime import datetime, timedelta
from database import get_db_connection

appointments_bp = Blueprint('appointments', __name__)

DIA_SEMANA_MAP = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo"
}

# Endpoint para obtener horarios disponibles de un médico
@appointments_bp.route('/api/medicos/<int:id_medico>/horarios', methods=['GET'])
@login_required
def get_horarios_disponibles(current_user, id_medico):
    fecha_str = request.args.get('fecha')
    if not fecha_str:
        return jsonify({'error': 'Fecha no proporcionada'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        dia_semana_num = fecha_obj.isoweekday()  # Lunes=1, Domingo=7
        dia_semana_str = DIA_SEMANA_MAP.get(dia_semana_num)

        if not dia_semana_str:
            return jsonify({'error': 'Día de la semana inválido'}), 400

        with conn.cursor() as cursor:
            # Obtener horario laboral del médico
            cursor.execute("""
                SELECT hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_medico = ? AND dia_semana = ?
            """, (id_medico, dia_semana_str))
            
            horario = cursor.fetchone()
            if not horario:
                return jsonify({'horarios': [], 'message': 'El médico no tiene un horario configurado para este día.'})
                
            hora_inicio = horario[0]
            hora_fin = horario[1]
            
            # Obtener citas existentes para ese médico y fecha
            cursor.execute("""
                SELECT hora_cita
                FROM Citas
                WHERE id_medico = ? AND fecha_cita = ?
                ORDER BY hora_cita
            """, (id_medico, fecha_str))
            
            citas_existentes = [row[0] for row in cursor.fetchall()]
            
            # Generar franjas horarias disponibles (cada 30 minutos)
            horarios_disponibles = []
            hora_actual_dt = datetime.combine(fecha_obj, hora_inicio)
            hora_fin_dt = datetime.combine(fecha_obj, hora_fin)

            while hora_actual_dt < hora_fin_dt:
                if hora_actual_dt.time() not in citas_existentes:
                    horarios_disponibles.append(hora_actual_dt.strftime('%H:%M'))
                hora_actual_dt += timedelta(minutes=30)
            
            return jsonify(horarios_disponibles)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener horarios'}), 500
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400
    finally:
        conn.close()

# Endpoint para crear nueva cita
@appointments_bp.route('/api/citas', methods=['POST'])
@login_required
def crear_cita(current_user):
    data = request.json
    required_fields = ['id_medico', 'id_paciente', 'fecha_cita', 'hora_cita', 'motivo_consulta']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
        
    try:
        # Validar que la fecha no sea en el pasado
        fecha_cita = datetime.strptime(data['fecha_cita'], '%Y-%m-%d').date()
        if fecha_cita < datetime.today().date():
            return jsonify({'error': 'No se pueden programar citas en fechas pasadas'}), 400
            
        # Validar formato de hora
        datetime.strptime(data['hora_cita'], '%H:%M')
    except ValueError as e:
        return jsonify({'error': 'Formato de fecha u hora inválido'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            # Verificar disponibilidad del médico
            cursor.execute("""
                SELECT 1
                FROM Citas
                WHERE id_medico = ? AND fecha_cita = ? AND hora_cita = ?
            """, (data['id_medico'], data['fecha_cita'], data['hora_cita']))
            
            if cursor.fetchone():
                return jsonify({'error': 'El médico ya tiene una cita programada en ese horario'}), 400
                
            # Insertar nueva cita
            cursor.execute("""
                INSERT INTO Citas (
                    id_medico, 
                    id_paciente, 
                    fecha_cita, 
                    hora_cita, 
                    motivo_consulta,
                    fecha_creacion
                ) VALUES (?, ?, ?, ?, ?, GETDATE())
            """, (
                data['id_medico'],
                data['id_paciente'],
                data['fecha_cita'],
                data['hora_cita'],
                data['motivo_consulta']
            ))
            
            conn.commit()
            
            # Obtener ID de la nueva cita
            cursor.execute("SELECT SCOPE_IDENTITY()")
            cita_id = cursor.fetchone()[0]
            
            return jsonify({
                'message': 'Cita programada exitosamente',
                'cita_id': cita_id
            }), 201
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al programar la cita'}), 500
    finally:
        conn.close()

@appointments_bp.route('/api/citas/calendar', methods=['GET'])
@login_required
def get_citas_for_calendar(current_user):
    """Obtiene las citas en un formato compatible con FullCalendar."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    try:
        id_medico = request.args.get('id_medico', type=int)
        id_paciente = request.args.get('id_paciente', type=int)

        with conn.cursor() as cursor:
            query = """
                SELECT 
                    c.id_cita,
                    p_user.nombre_completo AS paciente_nombre,
                    c.fecha_cita,
                    c.hora_cita,
                    c.estado
                FROM Citas c
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios p_user ON p.id_usuario = p_user.id_usuario
            """
            
            params = []
            where_clauses = []

            if id_medico:
                where_clauses.append("c.id_medico = ?")
                params.append(id_medico)
            
            if id_paciente:
                where_clauses.append("c.id_paciente = ?")
                params.append(id_paciente)

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            cursor.execute(query, params)
            
            events = []
            for row in cursor.fetchall():
                start_datetime = datetime.combine(row.fecha_cita, row.hora_cita)
                end_datetime = start_datetime + timedelta(minutes=30) # Asumiendo citas de 30 min

                color_map = {
                    'pendiente': {'bg': '#ffc107', 'text': '#000'},
                    'completada': {'bg': '#198754', 'text': '#fff'},
                    'cancelada': {'bg': '#dc3545', 'text': '#fff'}
                }
                color = color_map.get(row.estado, {'bg': '#6c757d', 'text': '#fff'})

                events.append({
                    'id': row.id_cita,
                    'title': row.paciente_nombre,
                    'start': start_datetime.isoformat(),
                    'end': end_datetime.isoformat(),
                    'backgroundColor': color['bg'],
                    'borderColor': color['bg'],
                    'textColor': color['text']
                })
            return jsonify(events)
    except Exception as e:
        logging.error(f"Error al obtener citas para calendario: {str(e)}")
        return jsonify({'error': 'Error al obtener la lista de citas'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>', methods=['GET'])
@login_required
def get_cita(current_user, id_cita):
    """Obtiene los detalles de una cita específica."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id_cita, c.id_medico, m_user.nombre_completo as medico_nombre,
                    c.id_paciente, p_user.nombre_completo as paciente_nombre,
                    c.fecha_cita, c.hora_cita, c.motivo_consulta, c.estado
                FROM Citas c
                JOIN Medicos m ON c.id_medico = m.id_medico
                JOIN Usuarios m_user ON m.id_usuario = m_user.id_usuario
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios p_user ON p.id_usuario = p_user.id_usuario
                WHERE c.id_cita = ?
            """, (id_cita,))
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Cita no encontrada'}), 404
            
            cita = {
                'id_cita': row.id_cita,
                'id_medico': row.id_medico,
                'medico_nombre': row.medico_nombre,
                'id_paciente': row.id_paciente,
                'paciente_nombre': row.paciente_nombre,
                'fecha_cita': row.fecha_cita.strftime('%Y-%m-%d'),
                'hora_cita': row.hora_cita.strftime('%H:%M'),
                'motivo_consulta': row.motivo_consulta,
                'estado': row.estado
            }
            return jsonify(cita)
    except Exception as e:
        logging.error(f"Error al obtener cita: {str(e)}")
        return jsonify({'error': 'Error al obtener la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>', methods=['PUT'])
@login_required
def update_cita(current_user, id_cita):
    """Actualiza una cita existente (reagendar)."""
    data = request.json
    required_fields = ['id_medico', 'id_paciente', 'fecha_cita', 'hora_cita', 'motivo_consulta']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM Citas WHERE id_cita = ?", (id_cita,))
            if not cursor.fetchone():
                return jsonify({'error': 'Cita no encontrada'}), 404

            cursor.execute("""
                SELECT 1 FROM Citas
                WHERE id_medico = ? AND fecha_cita = ? AND hora_cita = ? AND id_cita != ?
            """, (data['id_medico'], data['fecha_cita'], data['hora_cita'], id_cita))
            if cursor.fetchone():
                return jsonify({'error': 'El médico ya tiene otra cita programada en ese horario'}), 400

            cursor.execute("""
                UPDATE Citas SET
                    id_medico = ?, id_paciente = ?, fecha_cita = ?, hora_cita = ?,
                    motivo_consulta = ?, estado = 'pendiente', fecha_actualizacion = GETDATE()
                WHERE id_cita = ?
            """, (
                data['id_medico'], data['id_paciente'], data['fecha_cita'],
                data['hora_cita'], data['motivo_consulta'], id_cita
            ))
            conn.commit()
            return jsonify({'message': 'Cita reagendada exitosamente'})
    except Exception as e:
        conn.rollback()
        logging.error(f"Error al actualizar cita: {str(e)}")
        return jsonify({'error': 'Error al reagendar la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>/cancel', methods=['PATCH'])
@login_required
def cancel_cita(current_user, id_cita):
    """Cancela una cita específica."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE Citas SET estado = 'cancelada', fecha_actualizacion = GETDATE() WHERE id_cita = ?", (id_cita,))
            if cursor.rowcount == 0:
                return jsonify({'error': 'Cita no encontrada'}), 404
            conn.commit()
            return jsonify({'message': 'Cita cancelada exitosamente'})
    except Exception as e:
        conn.rollback()
        logging.error(f"Error al cancelar cita: {str(e)}")
        return jsonify({'error': 'Error al cancelar la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>/confirm', methods=['PATCH'])
@login_required
def confirm_cita(current_user, id_cita):
    """Confirma una cita específica."""
    # Solo médicos pueden confirmar sus propias citas
    if current_user.get('tipo_usuario') != 'medico':
        return jsonify({'error': 'Acción no autorizada'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT c.estado FROM Citas c
                JOIN Medicos m ON c.id_medico = m.id_medico
                WHERE c.id_cita = ? AND m.id_usuario = ?
            """, (id_cita, current_user.get('id_usuario')))
            
            cita = cursor.fetchone()
            if not cita:
                return jsonify({'error': 'Cita no encontrada o no pertenece a este médico'}), 404
            if cita.estado != 'pendiente':
                return jsonify({'error': f'Solo se pueden confirmar citas pendientes. Estado actual: {cita.estado}'}), 400

            cursor.execute("UPDATE Citas SET estado = 'confirmada', fecha_actualizacion = GETDATE() WHERE id_cita = ?", (id_cita,))
            conn.commit()
            return jsonify({'message': 'Cita confirmada exitosamente'})
    except Exception as e:
        conn.rollback()
        logging.error(f"Error al confirmar cita: {str(e)}")
        return jsonify({'error': 'Error al confirmar la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>/reschedule', methods=['PATCH'])
@login_required
def reschedule_cita(current_user, id_cita):
    """Reagenda una cita mediante drag-and-drop, con validaciones."""
    data = request.json
    new_fecha_str = data.get('fecha_cita')
    new_hora_str = data.get('hora_cita')

    if not new_fecha_str or not new_hora_str:
        return jsonify({'error': 'Faltan la nueva fecha y/o hora'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Obtener datos de la cita original, incluyendo el id_medico
            cursor.execute("SELECT id_medico, estado FROM Citas WHERE id_cita = ?", (id_cita,))
            cita_row = cursor.fetchone()
            if not cita_row:
                return jsonify({'error': 'Cita no encontrada'}), 404
            
            id_medico = cita_row.id_medico
            if cita_row.estado != 'pendiente':
                return jsonify({'error': 'Solo se pueden reagendar citas pendientes'}), 400

            # 2. Validar que el nuevo horario no esté ocupado
            cursor.execute("""
                SELECT 1 FROM Citas
                WHERE id_medico = ? AND fecha_cita = ? AND hora_cita = ? AND id_cita != ?
            """, (id_medico, new_fecha_str, new_hora_str, id_cita))
            if cursor.fetchone():
                return jsonify({'error': 'El médico ya tiene otra cita en este horario'}), 400

            # 3. Validar que el nuevo horario esté dentro del horario laboral del médico
            fecha_obj = datetime.strptime(new_fecha_str, '%Y-%m-%d').date()
            dia_semana_num = fecha_obj.isoweekday()
            dia_semana_str = DIA_SEMANA_MAP.get(dia_semana_num)
            
            cursor.execute("SELECT hora_inicio, hora_fin FROM Horarios_disponibles WHERE id_medico = ? AND dia_semana = ?", (id_medico, dia_semana_str))
            horario_laboral = cursor.fetchone()
            new_hora_obj = datetime.strptime(new_hora_str, '%H:%M').time()

            if not horario_laboral or not (horario_laboral.hora_inicio <= new_hora_obj < horario_laboral.hora_fin):
                 return jsonify({'error': 'El nuevo horario está fuera del horario laboral del médico'}), 400

            # 4. Actualizar la cita
            cursor.execute("UPDATE Citas SET fecha_cita = ?, hora_cita = ?, fecha_actualizacion = GETDATE() WHERE id_cita = ?", (new_fecha_str, new_hora_str, id_cita))
            
            conn.commit()
            return jsonify({'message': 'Cita reagendada exitosamente'})
    except Exception as e:
        conn.rollback()
        logging.error(f"Error al reagendar cita: {str(e)}")
        return jsonify({'error': 'Error interno al reagendar la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/stats', methods=['GET'])
@login_required
def get_citas_stats(current_user):
    """Obtiene estadísticas de citas."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Citas pendientes
            cursor.execute("SELECT COUNT(*) FROM Citas WHERE estado = 'pendiente'")
            pending = cursor.fetchone()[0]
            
            # Citas para hoy
            cursor.execute("SELECT COUNT(*) FROM Citas WHERE fecha_cita = CAST(GETDATE() AS DATE) AND estado = 'pendiente'")
            today = cursor.fetchone()[0]
            
            # Citas completadas
            cursor.execute("SELECT COUNT(*) FROM Citas WHERE estado = 'completada'")
            completed = cursor.fetchone()[0]
            
            return jsonify({
                'pending': pending,
                'today': today,
                'completed': completed
            })
    except Exception as e:
        logging.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener estadísticas de citas'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/agenda-hoy', methods=['GET'])
@login_required
def get_agenda_hoy(current_user):
    """Obtiene las citas programadas para el día actual."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    c.id_cita, c.hora_cita, p_user.nombre_completo as paciente_nombre,
                    m_user.nombre_completo as medico_nombre, m.especialidad, c.estado
                FROM Citas c
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios p_user ON p.id_usuario = p_user.id_usuario
                JOIN Medicos m ON c.id_medico = m.id_medico
                JOIN Usuarios m_user ON m.id_usuario = m_user.id_usuario
                WHERE c.fecha_cita = CAST(GETDATE() AS DATE)
                ORDER BY c.hora_cita
            """)
            citas = [{
                'id_cita': row.id_cita,
                'hora': row.hora_cita.strftime('%H:%M'),
                'paciente': row.paciente_nombre,
                'medico': row.medico_nombre,
                'especialidad': row.especialidad,
                'estado': row.estado
            } for row in cursor.fetchall()]
            return jsonify(citas)
    except Exception as e:
        logging.error(f"Error al obtener agenda de hoy: {str(e)}")
        return jsonify({'error': 'Error al obtener la agenda'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/<int:id_cita>/complete', methods=['PATCH'])
@login_required
def complete_cita(current_user, id_cita):
    """Marca una cita como completada."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE Citas SET estado = 'completada', fecha_actualizacion = GETDATE() WHERE id_cita = ? AND estado IN ('pendiente', 'confirmada')", (id_cita,))
            if cursor.rowcount == 0:
                return jsonify({'error': 'Cita no encontrada o no se puede marcar como completada'}), 404
            conn.commit()
            return jsonify({'message': 'Cita marcada como completada'})
    except Exception as e:
        conn.rollback()
        logging.error(f"Error al completar cita: {str(e)}")
        return jsonify({'error': 'Error al completar la cita'}), 500
    finally:
        if conn:
            conn.close()

@appointments_bp.route('/api/citas/detalladas', methods=['GET'])
@login_required
def get_citas_detalladas(current_user):
    """Obtiene una lista detallada de todas las citas, filtrada por médico si aplica."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT 
                    c.id_cita,
                    p_user.nombre_completo AS paciente_nombre,
                    m_user.nombre_completo AS medico_nombre,
                    m.especialidad,
                    c.fecha_cita,
                    c.hora_cita,
                    c.motivo_consulta,
                    c.estado
                FROM Citas c
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios p_user ON p.id_usuario = p_user.id_usuario
                JOIN Medicos m ON c.id_medico = m.id_medico
                JOIN Usuarios m_user ON m.id_usuario = m_user.id_usuario
            """
            params = []

            # Si el usuario es un médico, filtrar por sus citas.
            # Otros roles (admin, recepcion) pueden ver todas.
            if current_user.get('tipo_usuario') == 'medico':
                query += " WHERE m.id_usuario = ?"
                params.append(current_user.get('id_usuario'))

            query += " ORDER BY c.fecha_cita DESC, c.hora_cita DESC"
            
            cursor.execute(query, params)
            
            citas = [{
                'id_cita': row.id_cita,
                'paciente_nombre': row.paciente_nombre,
                'medico_nombre': row.medico_nombre,
                'especialidad': row.especialidad,
                'fecha_cita': row.fecha_cita.strftime('%Y-%m-%d'),
                'hora_cita': row.hora_cita.strftime('%H:%M'),
                'motivo_consulta': row.motivo_consulta,
                'estado': row.estado or 'pendiente'
            } for row in cursor.fetchall()]
            return jsonify(citas)
    except Exception as e:
        logging.error(f"Error al obtener citas detalladas: {str(e)}")
        return jsonify({'error': 'Error al obtener la lista de citas'}), 500
    finally:
        if conn:
            conn.close()