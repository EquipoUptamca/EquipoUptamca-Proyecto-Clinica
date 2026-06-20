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

def perfusion_exists(cursor, id_perfusion):
    """Verifica si la perfusión/médicamento existe en la base de datos."""
    cursor.execute("SELECT 1 FROM Perfusiones WHERE id_perfusion = ?", (id_perfusion,))
    return cursor.fetchone() is not None


def insertar_asignacion_perfusion(cursor, id_paciente, id_medico, id_perfusion, dosis_especifica=None, frecuencia=None, indicaciones=None):
    """Inserta una asignación de perfusión para el paciente y devuelve el id generado."""
    cursor.execute(
        "INSERT INTO PacientesPerfusiones (id_paciente, id_medico, id_perfusion, dosis_especifica, frecuencia, indicaciones) VALUES (?, ?, ?, ?, ?, ?)",
        (id_paciente, id_medico, id_perfusion, dosis_especifica, frecuencia, indicaciones)
    )
    cursor.execute("SELECT CAST(SCOPE_IDENTITY() AS INT)")
    row = cursor.fetchone()
    return int(row[0]) if row and row[0] is not None else None


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
                    c.id_medico,
                    c.id_paciente,
                    p_user.nombre_completo AS paciente_nombre,
                    p_user.cedula AS paciente_cedula,
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

            # --- REFUERZO DE LÓGICA ---
            # Si el usuario es un médico, SIEMPRE se filtra por su ID de usuario.
            # Esto asegura que un médico solo pueda ver sus propias citas.
            # Otros roles (admin, recepcion) pueden ver todas.
            where_clauses = []
            if current_user.get('tipo_usuario') == 'medico':
                where_clauses.append("m.id_usuario = ?")
                params.append(current_user.get('id_usuario'))
            elif current_user.get('tipo_usuario') == 'paciente':
                where_clauses.append("p.id_usuario = ?")
                params.append(current_user.get('id_usuario'))

            # Filtrar por rango de fechas si se proporcionan
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            if start_date and end_date:
                where_clauses.append("c.fecha_cita BETWEEN ? AND ?")
                params.extend([start_date, end_date])

            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)

            query += " ORDER BY c.fecha_cita DESC, c.hora_cita DESC"
            
            cursor.execute(query, params)
            
            citas = [{
                'id_cita': row.id_cita,
                'id_medico': row.id_medico,
                'id_paciente': row.id_paciente,
                'paciente_nombre': row.paciente_nombre,
                'paciente_cedula': row.paciente_cedula,
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

@appointments_bp.route('/api/citas/<int:id_cita>/diagnostico', methods=['GET', 'POST'])
@login_required
def diagnostico_cita(current_user, id_cita):
    """Obtiene o guarda el diagnóstico asociado a una cita."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico, id_paciente FROM Citas WHERE id_cita = ?", (id_cita,))
            cita_row = cursor.fetchone()
            if not cita_row:
                return jsonify({'error': 'Cita no encontrada'}), 404

            cita_id_medico = cita_row.id_medico
            cita_id_paciente = cita_row.id_paciente

            if current_user.get('tipo_usuario') == 'medico' and current_user.get('id_medico') != cita_id_medico:
                return jsonify({'error': 'No autorizado para ver o modificar el diagnóstico de esta cita.'}), 403
            if current_user.get('tipo_usuario') == 'paciente' and current_user.get('id_paciente') != cita_id_paciente:
                return jsonify({'error': 'No autorizado para ver el diagnóstico de esta cita.'}), 403

            if request.method == 'GET':
                cursor.execute("SELECT TOP 1 enfermedad_causa, descripcion_sintomas, FORMAT(fecha_diagnostico, 'yyyy-MM-dd') AS fecha_diagnostico FROM Diagnostico WHERE id_cita = ? ORDER BY id_diagnostico DESC", (id_cita,))
                diag = cursor.fetchone()
                if not diag:
                    return jsonify({})
                return jsonify({
                    'enfermedad_causa': diag.enfermedad_causa,
                    'descripcion_sintomas': diag.descripcion_sintomas,
                    'fecha_diagnostico': diag.fecha_diagnostico
                })

            # POST: solo médicos pueden guardar el diagnóstico
            if current_user.get('tipo_usuario') != 'medico':
                return jsonify({'error': 'Solo el médico puede guardar el diagnóstico.'}), 403

            data = request.json or {}
            enfermedad_causa = (data.get('enfermedad_causa') or '').strip()
            descripcion_sintomas = (data.get('descripcion_sintomas') or '').strip()

            if not enfermedad_causa:
                return jsonify({'error': 'El campo enfermedad/causa es obligatorio.'}), 400

            # Revisar si ya existe un diagnóstico para esta cita
            cursor.execute("SELECT id_diagnostico FROM Diagnostico WHERE id_cita = ?", (id_cita,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute(
                    "UPDATE Diagnostico SET enfermedad_causa = ?, descripcion_sintomas = ?, fecha_diagnostico = GETDATE() WHERE id_diagnostico = ?",
                    (enfermedad_causa, descripcion_sintomas, existing.id_diagnostico)
                )
                conn.commit()
                return jsonify({'message': 'Diagnóstico actualizado correctamente.'})

            cursor.execute(
                "INSERT INTO Diagnostico (id_cita, id_paciente, id_medico, enfermedad_causa, descripcion_sintomas) VALUES (?, ?, ?, ?, ?)",
                (id_cita, cita_id_paciente, cita_id_medico, enfermedad_causa, descripcion_sintomas)
            )
            conn.commit()
            return jsonify({'message': 'Diagnóstico guardado correctamente.'})
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al gestionar diagnóstico: {str(e)}")
        return jsonify({'error': 'Error en la base de datos al gestionar el diagnóstico.'}), 500
    finally:
        conn.close()

@appointments_bp.route('/api/perfusiones', methods=['GET'])
@login_required
def get_perfusiones(current_user):
    search = request.args.get('search', '').strip()
    category = request.args.get('category', '').strip()

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            query = """
                SELECT id_perfusion,
                       nombre_farmaco,
                       dosis_recomendada,
                       descripcion,
                       ISNULL(NULLIF(categoria, ''), 'General') AS categoria
                FROM Perfusiones
            """
            params = []
            filters = []

            if search:
                filters.append("(nombre_farmaco LIKE ? OR descripcion LIKE ?)")
                params.extend([f'%{search}%', f'%{search}%'])

            if category:
                filters.append("ISNULL(NULLIF(categoria, ''), 'General') = ?")
                params.append(category)

            if filters:
                query += ' WHERE ' + ' AND '.join(filters)

            query += ' ORDER BY nombre_farmaco'
            cursor.execute(query, params)

            perfusiones = [{
                'id_perfusion': row.id_perfusion,
                'nombre_farmaco': row.nombre_farmaco,
                'dosis_recomendada': row.dosis_recomendada,
                'descripcion': row.descripcion,
                'categoria': row.categoria
            } for row in cursor.fetchall()]
            return jsonify(perfusiones)
    except pyodbc.Error as e:
        logging.error(f"Error al obtener perfusiones: {str(e)}")
        return jsonify({'error': 'Error al obtener la lista de medicamentos'}), 500
    finally:
        conn.close()


@appointments_bp.route('/api/perfusiones/categorias', methods=['GET'])
@login_required
def get_perfusiones_categorias(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT DISTINCT ISNULL(NULLIF(categoria, ''), 'General') AS categoria FROM Perfusiones ORDER BY categoria")
            categories = [row.categoria for row in cursor.fetchall()]
            return jsonify(categories)
    except pyodbc.Error as e:
        logging.error(f"Error al obtener categorías de perfusiones: {str(e)}")
        return jsonify({'error': 'Error al obtener categorías de medicación'}), 500
    finally:
        conn.close()

@appointments_bp.route('/api/pacientes/<int:id_paciente>/perfusiones', methods=['GET'])
@login_required
def get_perfusiones_paciente(current_user, id_paciente):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            if current_user.get('tipo_usuario') == 'medico':
                cursor.execute("""
                    SELECT
                        pf.id_asignacion,
                        pf.id_perfusion,
                        p.nombre_farmaco,
                        p.dosis_recomendada,
                        pf.dosis_especifica,
                        pf.frecuencia,
                        pf.indicaciones,
                        pf.fecha_asignacion,
                        pf.activo,
                        med_user.nombre_completo as nombre_medico
                    FROM PacientesPerfusiones pf
                    JOIN Perfusiones p ON pf.id_perfusion = p.id_perfusion
                    LEFT JOIN Medicos med ON pf.id_medico = med.id_medico
                    LEFT JOIN Usuarios med_user ON med.id_usuario = med_user.id_usuario
                    WHERE pf.id_paciente = ? AND pf.id_medico = ?
                    ORDER BY pf.fecha_asignacion DESC
                """, (id_paciente, current_user.get('id_medico')))
            elif current_user.get('tipo_usuario') == 'paciente':
                if current_user.get('id_paciente') != id_paciente:
                    return jsonify({'error': 'No está autorizado para ver las perfusiones de este paciente.'}), 403
                cursor.execute("""
                    SELECT
                        pf.id_asignacion,
                        pf.id_perfusion,
                        p.nombre_farmaco,
                        p.dosis_recomendada,
                        pf.dosis_especifica,
                        pf.frecuencia,
                        pf.indicaciones,
                        pf.fecha_asignacion,
                        pf.activo,
                        med_user.nombre_completo as nombre_medico
                    FROM PacientesPerfusiones pf
                    JOIN Perfusiones p ON pf.id_perfusion = p.id_perfusion
                    LEFT JOIN Medicos med ON pf.id_medico = med.id_medico
                    LEFT JOIN Usuarios med_user ON med.id_usuario = med_user.id_usuario
                    WHERE pf.id_paciente = ?
                    ORDER BY pf.fecha_asignacion DESC
                """, (id_paciente,))
            else:
                cursor.execute("""
                    SELECT
                        pf.id_asignacion,
                        pf.id_perfusion,
                        p.nombre_farmaco,
                        p.dosis_recomendada,
                        pf.dosis_especifica,
                        pf.frecuencia,
                        pf.indicaciones,
                        pf.fecha_asignacion,
                        pf.activo,
                        med_user.nombre_completo as nombre_medico
                    FROM PacientesPerfusiones pf
                    JOIN Perfusiones p ON pf.id_perfusion = p.id_perfusion
                    LEFT JOIN Medicos med ON pf.id_medico = med.id_medico
                    LEFT JOIN Usuarios med_user ON med.id_usuario = med_user.id_usuario
                    WHERE pf.id_paciente = ?
                    ORDER BY pf.fecha_asignacion DESC
                """, (id_paciente,))

            perfusiones = []
            for row in cursor.fetchall():
                perfusiones.append({
                    'id_asignacion': row.id_asignacion,
                    'id_perfusion': row.id_perfusion,
                    'nombre_farmaco': row.nombre_farmaco,
                    'dosis_recomendada': row.dosis_recomendada,
                    'dosis_especifica': row.dosis_especifica,
                    'frecuencia': row.frecuencia,
                    'indicaciones': row.indicaciones,
                    'fecha_asignacion': row.fecha_asignacion.strftime('%Y-%m-%d %H:%M') if row.fecha_asignacion else None,
                    'activo': bool(row.activo) if row.activo is not None else None,
                    'nombre_medico': row.nombre_medico or 'Sin asignar'
                })

            return jsonify(perfusiones)
    except pyodbc.Error as e:
        logging.error(f"Error al obtener perfusiones del paciente: {str(e)}")
        return jsonify({'error': 'Error al obtener perfusiones del paciente.'}), 500
    finally:
        conn.close()

@appointments_bp.route('/api/pacientes_perfusiones', methods=['POST'])
@login_required
def crear_asignacion_perfusions(current_user):
    data = request.json or {}

    try:
        id_cita = int(data.get('id_cita', 0))
        id_paciente = int(data.get('id_paciente', 0))
        id_medico = int(data.get('id_medico', 0))
    except (ValueError, TypeError):
        return jsonify({'error': 'Los identificadores deben ser numéricos'}), 400

    if current_user.get('tipo_usuario') == 'medico' and current_user.get('id_medico') != id_medico:
        return jsonify({'error': 'No está autorizado para asignar medicamentos a otro médico.'}), 403

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico, id_paciente FROM Citas WHERE id_cita = ?", (id_cita,))
            cita_row = cursor.fetchone()
            if not cita_row:
                return jsonify({'error': 'Cita no encontrada.'}), 404
            if cita_row[0] != id_medico or cita_row[1] != id_paciente:
                return jsonify({'error': 'Los datos de la cita no coinciden con el paciente o médico.'}), 400

            medicamentos = data.get('medicamentos')
            if medicamentos is not None:
                if not isinstance(medicamentos, list) or len(medicamentos) == 0:
                    return jsonify({'error': 'Debe enviar al menos un medicamento válido.'}), 400

                ids = []
                for medicamento in medicamentos:
                    try:
                        id_perfusion = int(medicamento.get('id_perfusion', 0))
                    except (TypeError, ValueError):
                        return jsonify({'error': 'El id de perfusión debe ser numérico.'}), 400

                    if not perfusion_exists(cursor, id_perfusion):
                        return jsonify({'error': 'La perfusión seleccionada no existe.'}), 404

                    dosis_especifica = medicamento.get('dosis_especifica') or None
                    frecuencia = medicamento.get('frecuencia') or None
                    indicaciones = medicamento.get('indicaciones') or None

                    id_asignacion = insertar_asignacion_perfusion(cursor, id_paciente, id_medico, id_perfusion,
                                                                   dosis_especifica, frecuencia, indicaciones)
                    ids.append(id_asignacion)

                conn.commit()
                return jsonify({
                    'message': 'Asignaciones de fórmula guardadas correctamente.',
                    'ids': ids
                })

            required_fields = ['id_cita', 'id_paciente', 'id_medico', 'id_perfusion']
            if not all(field in data for field in required_fields):
                return jsonify({'error': 'Faltan campos requeridos'}), 400

            try:
                id_perfusion = int(data['id_perfusion'])
            except (ValueError, TypeError):
                return jsonify({'error': 'El identificador de perfusión debe ser numérico'}), 400

            if not perfusion_exists(cursor, id_perfusion):
                return jsonify({'error': 'La perfusión seleccionada no existe.'}), 404

            dosis_especifica = data.get('dosis_especifica') or None
            frecuencia = data.get('frecuencia') or None
            indicaciones = data.get('indicaciones') or None

            id_asignacion = insertar_asignacion_perfusion(cursor, id_paciente, id_medico, id_perfusion,
                                                           dosis_especifica, frecuencia, indicaciones)
            conn.commit()
            return jsonify({
                'message': 'Asignación de fórmula guardada correctamente.',
                'id_asignacion': id_asignacion
            })
    except pyodbc.Error as e:
        logging.error(f"Error al crear asignación de perfusión: {str(e)}")
        return jsonify({'error': 'Error al guardar la asignación de fórmula.'}), 500
    finally:
        conn.close()




@appointments_bp.route('/api/pacientes_perfusiones/<int:id_asignacion>', methods=['DELETE'])
@login_required
def eliminar_asignacion_perfusions(current_user, id_asignacion):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico FROM PacientesPerfusiones WHERE id_asignacion = ?", (id_asignacion,))
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Asignación no encontrada.'}), 404

            id_medico = row.id_medico
            if current_user.get('tipo_usuario') == 'medico' and current_user.get('id_medico') != id_medico:
                return jsonify({'error': 'No está autorizado para eliminar esta fórmula.'}), 403

            cursor.execute("DELETE FROM PacientesPerfusiones WHERE id_asignacion = ?", (id_asignacion,))
            conn.commit()
            return jsonify({'message': 'Fórmula antigua eliminada correctamente.'})
    except pyodbc.Error as e:
        logging.error(f"Error al eliminar asignación de perfusión: {str(e)}")
        return jsonify({'error': 'Error al eliminar la fórmula antigua.'}), 500
    finally:
        conn.close()