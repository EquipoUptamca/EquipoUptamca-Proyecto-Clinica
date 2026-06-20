from flask import Blueprint, request, jsonify, render_template, session, redirect, url_for
import pyodbc
import logging
from database import get_db_connection

consultas_bp = Blueprint('consultas', __name__)

# Página de login para consultas (solo cédula)
@consultas_bp.route('/consultas/login', methods=['GET'])
def consultas_login_page():
    return render_template('consultas_login.html')

# Procesar login por cédula
@consultas_bp.route('/consultas/login', methods=['POST'])
def consultas_login():
    data = request.json
    cedula = data.get('cedula', '').strip()

    if not cedula:
        return jsonify({'error': 'Se requiere la cédula'}), 400

    # Limpiar la cédula para buscar solo los números si es necesario
    cedula_numerica = ''.join(filter(str.isdigit, cedula))

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Búsqueda flexible: por cédula exacta o por la parte numérica
            cursor.execute("""
                SELECT u.id_usuario, u.nombre_completo, u.id_rol, u.cedula, m.id_medico
                FROM Usuarios u
                LEFT JOIN Medicos m ON u.id_usuario = m.id_usuario
                WHERE (u.cedula = ? OR REPLACE(REPLACE(REPLACE(u.cedula, 'V-', ''), 'E-', ''), 'J-', '') = ?) 
                AND u.activo = 1
            """, (cedula, cedula_numerica))

            user = cursor.fetchone()
            if user:
                # Asegurarse de que el usuario tenga un perfil de médico
                if user[4] is None:
                    return jsonify({'error': 'Acceso denegado. El usuario no tiene un perfil de médico activo.'}), 403
                id_medico = user[4]
                # Verificar que el usuario tenga el rol de Médico (id_rol = 2)
                user_rol = user[2]
                if user_rol != 2:
                    return jsonify({'error': 'Acceso denegado. Esta función es solo para médicos.'}), 403

                # Guardar en sesión
                # La sesión utilizará la configuración global de la aplicación,
                # incluyendo el tiempo de vida (PERMANENT_SESSION_LIFETIME) y
                # la actualización en cada solicitud (SESSION_REFRESH_EACH_REQUEST).
                
                session['user_id'] = user[0]
                session['user_name'] = user[1]
                session['user_rol'] = user_rol
                session['user_cedula'] = user[3] # Guardar la cédula correcta de la BD
                session['id_medico'] = id_medico # Guardar el id_medico

                return jsonify({
                    'message': 'Inicio de sesión exitoso',
                    'redirect': url_for('consultas.consultas_pacientes_page')
                }), 200
            else:
                return jsonify({'error': 'Cédula no encontrada o usuario inactivo'}), 401
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
    finally:
        conn.close()

# Página de pacientes asignados
@consultas_bp.route('/consultas/pacientes', methods=['GET'])
def consultas_pacientes_page():
    if 'user_id' not in session:
        return redirect(url_for('consultas.consultas_login_page'))

    return render_template('consultas_pacientes.html')

# API para obtener pacientes asignados al usuario (por ahora todos los pacientes)
@consultas_bp.route('/api/consultas/pacientes', methods=['GET'])
def get_pacientes_asignados():
    if 'user_id' not in session:
        return jsonify({'error': 'Sesión no válida'}), 401

    id_medico = session.get('id_medico')

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Obtener solo los pacientes que tienen o han tenido una cita con el médico logueado
            cursor.execute("""
                SELECT
                    DISTINCT p.id_paciente,
                    u.nombre_completo,
                    p.fecha_nacimiento,
                    u.telefono,
                    u.gmail,
                    u.cedula,
                    p.genero,
                    p.tipo_sangre
                FROM Pacientes p
                JOIN Usuarios u ON p.id_usuario = u.id_usuario
                JOIN Citas c ON p.id_paciente = c.id_paciente
                WHERE c.id_medico = ? AND p.estado = 'A'
                ORDER BY u.nombre_completo
            """, (id_medico,))

            pacientes = []
            for row in cursor.fetchall():
                # Calcular edad si hay fecha de nacimiento
                edad = None
                if row.fecha_nacimiento:
                    from datetime import datetime
                    today = datetime.today()
                    birth_date = row.fecha_nacimiento
                    edad = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

                paciente = {
                    'id_paciente': row.id_paciente,
                    'nombre_completo': row.nombre_completo,
                    'edad': edad,
                    'telefono': row.telefono,
                    'correo': row.gmail,
                    'cedula': row.cedula,
                    'genero': row.genero,
                    'tipo_sangre': row.tipo_sangre
                }
                pacientes.append(paciente)

            return jsonify(pacientes)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener pacientes'}), 500
    finally:
        conn.close()

# API para obtener historial médico de un paciente
@consultas_bp.route('/api/consultas/pacientes/<int:id_paciente>/historial', methods=['GET'])
def get_historial_paciente(id_paciente):
    if 'user_id' not in session:
        return jsonify({'error': 'Sesión no válida'}), 401

    # Obtener todas las citas del paciente (sin filtrar por médico específico)
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Obtener todas las citas del paciente, incluyendo diagnóstico cuando exista
            cursor.execute("""
                SELECT
                    c.id_cita,
                    c.fecha_cita,
                    c.hora_cita,
                    c.motivo_consulta,
                    c.estado,
                    med_user.nombre_completo as nombre_medico,
                    (SELECT TOP 1 d.enfermedad_causa FROM Diagnostico d WHERE d.id_cita = c.id_cita ORDER BY d.id_diagnostico DESC) AS enfermedad_causa,
                    (SELECT TOP 1 d.descripcion_sintomas FROM Diagnostico d WHERE d.id_cita = c.id_cita ORDER BY d.id_diagnostico DESC) AS descripcion_sintomas,
                    (SELECT TOP 1 FORMAT(d.fecha_diagnostico, 'yyyy-MM-dd') FROM Diagnostico d WHERE d.id_cita = c.id_cita ORDER BY d.id_diagnostico DESC) AS fecha_diagnostico
                FROM Citas c
                JOIN Medicos med ON c.id_medico = med.id_medico
                JOIN Usuarios med_user ON med.id_usuario = med_user.id_usuario
                WHERE c.id_paciente = ?
                ORDER BY c.fecha_cita DESC, c.hora_cita DESC
            """, (id_paciente,))

            historial = []
            for row in cursor.fetchall():
                cita = {
                    'id_cita': row[0],
                    'fecha_cita': row[1].strftime('%Y-%m-%d') if row[1] else None,
                    'hora_cita': str(row[2]) if row[2] else None,
                    'motivo_consulta': row[3],
                    'estado': row[4],
                    'nombre_medico': row[5] or 'Sin asignar',
                    'enfermedad_causa': row[6],
                    'descripcion_sintomas': row[7],
                    'fecha_diagnostico': row[8]
                }
                historial.append(cita)

            # Obtener las perfusiones/prescripciones del paciente
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
                perfusion = {
                    'id_asignacion': row[0],
                    'id_perfusion': row[1],
                    'nombre_farmaco': row[2],
                    'dosis_recomendada': row[3],
                    'dosis_especifica': row[4],
                    'frecuencia': row[5],
                    'indicaciones': row[6],
                    'fecha_asignacion': row[7].strftime('%Y-%m-%d %H:%M') if row[7] else None,
                    'activo': bool(row[8]) if row[8] is not None else None,
                    'nombre_medico': row[9] or 'Sin asignar'
                }
                perfusiones.append(perfusion)

            return jsonify({'historial': historial, 'perfusiones': perfusiones})
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener historial médico'}), 500
    finally:
        conn.close()

# API para obtener información del usuario actual
@consultas_bp.route('/api/consultas/user-info', methods=['GET'])
def get_user_info():
    if 'user_id' not in session:
        return jsonify({'error': 'Sesión no válida'}), 401

    user_info = {
        'id_usuario': session['user_id'],
        'nombre_completo': session['user_name'],
        'rol': session['user_rol'],
        'cedula': session['user_cedula']
    }

    return jsonify(user_info)

# Cerrar sesión
@consultas_bp.route('/consultas/logout', methods=['POST'])
def consultas_logout():
    session.clear()
    return jsonify({'message': 'Sesión cerrada exitosamente'})
