from flask import Blueprint, jsonify, session, request
import pyodbc
import logging
from database import get_db_connection
from datetime import datetime, timedelta
from auth_middleware import login_required, role_required

dashboard_bp = Blueprint('dashboard', __name__)

# API para obtener datos del dashboard de administrador
@dashboard_bp.route('/api/admin/stats', methods=['GET'])
@login_required
@role_required(1) # Solo Admin
def admin_stats(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        stats = {}
        
        # Obtener conteo de médicos activos
        cursor.execute("SELECT COUNT(*) FROM Medicos WHERE estado = 'A'")
        stats['doctors'] = cursor.fetchone()[0]
        
        # Obtener conteo de pacientes activos
        cursor.execute("SELECT COUNT(*) FROM Pacientes WHERE estado = 'A'")
        stats['patients'] = cursor.fetchone()[0]
        
        # Obtener citas para hoy
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE CONVERT(date, fecha_cita) = CONVERT(date, GETDATE())
            AND estado != 'Cancelada'
        """)
        stats['appointments'] = cursor.fetchone()[0]
        
        # Obtener conteo de usuarios activos
        cursor.execute("SELECT COUNT(*) FROM Usuarios WHERE activo = 1")
        stats['users'] = cursor.fetchone()[0]
        
        # Obtener conteo de citas pendientes
        cursor.execute("SELECT COUNT(*) FROM Citas WHERE estado = 'pendiente'")
        stats['pending_appointments'] = cursor.fetchone()[0]
        
        # Obtener conteo de citas completadas esta semana
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE estado = 'completada' 
            AND fecha_cita >= DATEADD(day, -7, GETDATE())
        """)
        stats['weekly_completed'] = cursor.fetchone()[0]
        
        return jsonify(stats)
    except pyodbc.Error as e:
        logging.error(f"Database error in admin_stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch stats'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener datos del gráfico de citas
@dashboard_bp.route('/api/admin/appointments-chart', methods=['GET'])
@login_required
@role_required(1) # Solo Admin
def appointments_chart_data(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')

        # Default to last 7 days if no dates are provided
        if not start_date_str or not end_date_str:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=6)
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'}), 400

        # Build the query
        query = """
            SELECT 
                CAST(fecha_cita AS DATE) as dia, 
                COUNT(id_cita) as total
            FROM Citas
            WHERE fecha_cita >= ? AND fecha_cita <= ?
            GROUP BY CAST(fecha_cita AS DATE)
            ORDER BY dia;
        """
        params = (start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
        
        cursor.execute(query, params)
        data = cursor.fetchall()
        
        # Prepare the data for the chart, ensuring all days in the range are present
        delta = end_date - start_date
        labels = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(delta.days + 1)]
        counts = {label: 0 for label in labels}
        
        for row in data:
            day_str = row.dia.strftime('%Y-%m-%d')
            if day_str in counts:
                counts[day_str] = row.total
        
        return jsonify({'labels': list(counts.keys()), 'data': list(counts.values())})
        
    except pyodbc.Error as e:
        logging.error(f"Database error in appointments_chart_data: {str(e)}")
        return jsonify({'error': 'Failed to fetch chart data'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener datos del gráfico de estado de citas
@dashboard_bp.route('/api/admin/appointments-status-chart', methods=['GET'])
@login_required
@role_required(1) # Solo Admin
def appointments_status_chart_data(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                estado, 
                COUNT(id_cita) as total
            FROM Citas
            WHERE estado IS NOT NULL
            GROUP BY estado;
        """)
        
        data = cursor.fetchall()
        
        labels = [row.estado.capitalize() for row in data]
        counts = [row.total for row in data]
        
        return jsonify({'labels': labels, 'data': counts})
        
    except pyodbc.Error as e:
        logging.error(f"Database error in appointments_status_chart_data: {str(e)}")
        return jsonify({'error': 'Failed to fetch chart data'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener registros recientes
@dashboard_bp.route('/api/admin/recent-activity', methods=['GET'])
@login_required
@role_required(1) # Solo Admin
def recent_activity(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Obtener últimos 5 médicos registrados
        cursor.execute("""
            SELECT TOP 5 m.id_medico, u.nombre_completo, m.especialidad, 
                   CONVERT(varchar, m.fecha_creacion, 120) as fecha
            FROM Medicos m
            JOIN Usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.estado = 'A'
            ORDER BY m.fecha_creacion DESC
        """)
        doctors = [{
            'id': row[0],
            'name': row[1],
            'type': 'Médico',
            'specialty': row[2] or 'No Asignada',
            'date': row[3]
        } for row in cursor.fetchall()]
        
        # Obtener últimos 5 pacientes registrados
        cursor.execute("""
            SELECT TOP 5 p.id_paciente, u.nombre_completo, 
                   CONVERT(varchar, p.fecha_creacion, 120) as fecha
            FROM Pacientes p
            JOIN Usuarios u ON p.id_usuario = u.id_usuario
            WHERE p.estado = 'A'
            ORDER BY p.fecha_creacion DESC
        """)
        patients = [{
            'id': row[0],
            'name': row[1],
            'type': 'Paciente',
            'date': row[2]
        } for row in cursor.fetchall()]
        
        # Obtener últimas 5 citas programadas
        cursor.execute("""
            SELECT TOP 5 c.id_cita, up.nombre_completo, um.nombre_completo,
                   CONVERT(varchar, c.fecha_cita, 120) + ' ' + CONVERT(varchar, c.hora_cita, 108) as fecha,
                   c.estado
            FROM Citas c
            JOIN Pacientes p ON c.id_paciente = p.id_paciente
            JOIN Usuarios up ON p.id_usuario = up.id_usuario
            JOIN Medicos m ON c.id_medico = m.id_medico
            JOIN Usuarios um ON m.id_usuario = um.id_usuario
            ORDER BY c.fecha_creacion DESC
        """)
        appointments = [{
            'id': row[0],
            'name': f"Cita {row[0]}",
            'type': 'Cita',
            'details': f"Paciente: {row[1]}, Médico: {row[2]}",
            'status': row[4],
            'date': row[3]
        } for row in cursor.fetchall()]
        
        # Combinar todos los resultados y ordenar por fecha
        recent_activity = doctors + patients + appointments
        recent_activity.sort(key=lambda x: x['date'], reverse=True)
        
        return jsonify(recent_activity[:10])  # Devolver solo los 10 más recientes
    except pyodbc.Error as e:
        logging.error(f"Database error in recent_activity: {str(e)}")
        return jsonify({'error': 'Failed to fetch recent activity'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener datos del dashboard de médico
@dashboard_bp.route('/api/doctor/stats', methods=['GET'])
@login_required
@role_required(2) # Solo Médico
def doctor_stats(current_user):
    doctor_id = current_user.get('id_medico')
    if not doctor_id:
        # Este usuario es de tipo 'medico' pero no tiene un perfil de médico asociado en la tabla Medicos.
        return jsonify({'error': 'Perfil de médico no encontrado para este usuario.'}), 404
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        stats = {}
        
        # Obtener citas de hoy para este médico
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE id_medico = ? 
            AND CONVERT(date, fecha_cita) = CONVERT(date, GETDATE())
            AND estado != 'cancelada'
        """, (doctor_id,))
        stats['today_appointments'] = cursor.fetchone()[0]
        
        # Obtener citas pendientes para este médico
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE id_medico = ? 
            AND estado = 'pendiente'
        """, (doctor_id,))
        stats['pending_appointments'] = cursor.fetchone()[0]
        
        # Obtener citas completadas esta semana
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE id_medico = ? 
            AND estado = 'completada' 
            AND fecha_cita >= DATEADD(day, -7, GETDATE())
        """, (doctor_id,))
        stats['weekly_completed'] = cursor.fetchone()[0]
        
        # Obtener próximo turno
        cursor.execute("""
            SELECT TOP 1 tipo_turno, fecha, hora_inicio, hora_fin
            FROM Turnos 
            WHERE id_medico = ? 
            AND fecha >= CONVERT(date, GETDATE())
            ORDER BY fecha, hora_inicio
        """, (doctor_id,))
        next_shift = cursor.fetchone()
        if next_shift:
            stats['next_shift'] = {
                'type': next_shift[0],
                'date': str(next_shift[1]),
                'start_time': str(next_shift[2]),
                'end_time': str(next_shift[3])
            }
        
        return jsonify(stats)
    except pyodbc.Error as e:
        logging.error(f"Database error in doctor_stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch doctor stats'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener datos del dashboard de recepción
@dashboard_bp.route('/api/reception/stats', methods=['GET'])
@login_required
@role_required(1, 3) # Admin y Recepcionista
def reception_stats(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        stats = {}
        
        # Obtener citas para hoy
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Citas 
            WHERE CONVERT(date, fecha_cita) = CONVERT(date, GETDATE())
            AND estado != 'cancelada'
        """)
        stats['today_appointments'] = cursor.fetchone()[0]
        
        # Obtener citas pendientes
        cursor.execute("SELECT COUNT(*) FROM Citas WHERE estado = 'pendiente'")
        stats['pending_appointments'] = cursor.fetchone()[0]
        
        # Obtener nuevos pacientes esta semana
        cursor.execute("""
            SELECT COUNT(*) 
            FROM Pacientes 
            WHERE fecha_creacion >= DATEADD(day, -7, GETDATE())
            AND estado = 'A'
        """)
        stats['weekly_new_patients'] = cursor.fetchone()[0]
        
        # Obtener citas por confirmar
        cursor.execute("""
            SELECT COUNT(*)
            FROM Citas 
            WHERE estado = 'pendiente' 
            AND fecha_cita = CONVERT(date, GETDATE())
        """)
        stats['to_confirm'] = cursor.fetchone()[0]
        
        return jsonify(stats)
    except pyodbc.Error as e:
        logging.error(f"Database error in reception_stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch reception stats'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener próximas citas
@dashboard_bp.route('/api/upcoming-appointments', methods=['GET'])
@login_required
def upcoming_appointments(current_user):
    user_type = current_user.get('tipo_usuario')
    user_id = current_user.get('id_usuario')
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        if user_type == 'medico':
            # Para médicos: obtener sus próximas citas
            cursor.execute("""
                SELECT TOP 10 c.id_cita, c.fecha_cita, c.hora_cita, c.estado,
                       u.nombre_completo as paciente_nombre, c.motivo_consulta
                FROM Citas c
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios u ON p.id_usuario = u.id_usuario
                JOIN Medicos m ON c.id_medico = m.id_medico
                WHERE m.id_usuario = ?
                AND c.estado IN ('pendiente', 'confirmada') 
                AND c.fecha_cita >= CONVERT(date, GETDATE())
                ORDER BY c.fecha_cita, c.hora_cita
            """, (user_id,))
            
        elif user_type == 'paciente':
            # Para pacientes: obtener sus próximas citas
            cursor.execute("""
                SELECT TOP 5 c.id_cita, c.fecha_cita, c.hora_cita, c.estado,
                       u.nombre_completo as medico_nombre, c.motivo_consulta
                FROM Citas c
                JOIN Medicos m ON c.id_medico = m.id_medico
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                WHERE p.id_usuario = ?
                AND c.fecha_cita >= CONVERT(date, GETDATE())
                ORDER BY c.fecha_cita, c.hora_cita
            """, (user_id,))
            
        else:
            # Para admin/recepción: obtener todas las próximas citas
            cursor.execute("""
                SELECT TOP 10 c.id_cita, c.fecha_cita, c.hora_cita, c.estado,
                       up.nombre_completo as paciente_nombre,
                       um.nombre_completo as medico_nombre,
                       c.motivo_consulta
                FROM Citas c
                JOIN Pacientes p ON c.id_paciente = p.id_paciente
                JOIN Usuarios up ON p.id_usuario = up.id_usuario
                JOIN Medicos m ON c.id_medico = m.id_medico
                JOIN Usuarios um ON m.id_usuario = um.id_usuario
                WHERE c.fecha_cita >= CONVERT(date, GETDATE())
                ORDER BY c.fecha_cita, c.hora_cita
            """)
        
        appointments = []
        for row in cursor.fetchall():
            appointment = {
                'id': row[0],
                'date': str(row[1]),
                'time': str(row[2]),
                'status': row[3],
                'reason': row[4] if len(row) > 4 else ''
            }
            
            if user_type == 'medico':
                appointment['patient_name'] = row[4]
                appointment['reason'] = row[5] if len(row) > 5 else ''
            elif user_type == 'paciente':
                appointment['doctor_name'] = row[4]
                appointment['reason'] = row[5] if len(row) > 5 else ''
            else:
                appointment['patient_name'] = row[4]
                appointment['doctor_name'] = row[5]
                appointment['reason'] = row[6] if len(row) > 6 else ''
                
            appointments.append(appointment)
        
        return jsonify(appointments)
    except pyodbc.Error as e:
        logging.error(f"Database error in upcoming_appointments: {str(e)}")
        return jsonify({'error': 'Failed to fetch upcoming appointments'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para obtener datos del usuario actual
@dashboard_bp.route('/api/user-data', methods=['GET'])
@login_required
def user_data(current_user):
    user_id = current_user.get('id_usuario')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        # La mayoría de los datos ya están en 'current_user'.
        # Solo necesitamos obtener los datos de contacto que no están en el objeto.
        cursor.execute("SELECT cedula, gmail, telefono FROM Usuarios WHERE id_usuario = ?", (user_id,))
        contact_info = cursor.fetchone()

        if not contact_info:
            return jsonify({'error': 'User not found in database'}), 404

        user_profile = {
            'nombre': current_user.get('nombre_completo'),
            'rol': current_user.get('nombre_rol'),
            'tipo_usuario': current_user.get('tipo_usuario'),
            'cedula': contact_info[0],
            'email': contact_info[1],
            'telefono': contact_info[2]
        }

        # Si es médico, agregar información específica del médico
        if user_profile['tipo_usuario'] == 'medico' and current_user.get('id_medico'):
            cursor.execute("SELECT especialidad, numero_colegiado, años_experiencia FROM Medicos WHERE id_medico = ?", (current_user['id_medico'],))
            medico_info = cursor.fetchone()
            if medico_info:
                user_profile.update({
                    'especialidad': medico_info[0],
                    'numero_colegiado': medico_info[1],
                    'años_experiencia': medico_info[2]
                })
        
        return jsonify(user_profile)
            
    except pyodbc.Error as e:
        logging.error(f"Database error in user_data: {str(e)}")
        return jsonify({'error': 'Failed to fetch user data'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()