from flask import Blueprint, request, jsonify
import pyodbc
import logging
from datetime import datetime
from database import get_db_connection
from auth_middleware import login_required, role_required

asistencias_bp = Blueprint('asistencia', __name__)
logger = logging.getLogger(__name__)

# Endpoint para registrar una nueva asistencia (marcar entrada)
@asistencias_bp.route('/api/asistencia', methods=['POST'])
@login_required
@role_required(1, 3) # Admin y Recepcionista
def registrar_asistencia(current_user):
    """Registra la entrada de un médico para una fecha específica."""
    data = request.json
    required_fields = ['id_medico', 'fecha', 'hora_entrada', 'estado_asistencia']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos: id_medico, fecha, hora_entrada, estado_asistencia'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Verificar si ya existe un registro para ese médico en esa fecha
            cursor.execute("SELECT 1 FROM Asistencias WHERE id_medico = ? AND fecha = ?", (data['id_medico'], data['fecha']))
            if cursor.fetchone():
                return jsonify({'error': 'Ya existe un registro de asistencia para este médico en la fecha especificada'}), 409

            # Insertar el nuevo registro de asistencia
            cursor.execute("""
                INSERT INTO Asistencias (id_medico, fecha, hora_entrada, estado_asistencia)
                OUTPUT INSERTED.id_asistencia
                VALUES (?, ?, ?, ?)
            """, (
                data['id_medico'],
                data['fecha'],
                data['hora_entrada'],
                data['estado_asistencia']
            ))
            asistencia_id = cursor.fetchone()[0]
            conn.commit()

            return jsonify({
                'message': 'Asistencia registrada exitosamente',
                'id_asistencia': asistencia_id
            }), 201

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al registrar asistencia: {str(e)}")
        return jsonify({'error': 'Error al registrar la asistencia'}), 500
    finally:
        if conn:
            conn.close()

# Endpoint para obtener registros de asistencia (con filtros)
@asistencias_bp.route('/api/asistencia', methods=['GET'])
@login_required
@role_required(1, 3) # Admin y Recepcionista
def get_asistencias(current_user):
    """Obtiene una lista de asistencias, con filtros opcionales."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Parámetros de filtro
            id_medico = request.args.get('id_medico')
            fecha_inicio = request.args.get('fecha_inicio')
            fecha_fin = request.args.get('fecha_fin')

            query = """
                SELECT a.id_asistencia, a.id_medico, u.nombre_completo, a.fecha,
                       a.hora_entrada, a.hora_salida, a.estado_asistencia
                FROM Asistencias a
                JOIN Medicos m ON a.id_medico = m.id_medico
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                WHERE 1=1
            """
            params = []

            if id_medico:
                query += " AND a.id_medico = ?"
                params.append(id_medico)
            if fecha_inicio:
                query += " AND a.fecha >= ?"
                params.append(fecha_inicio)
            if fecha_fin:
                query += " AND a.fecha <= ?"
                params.append(fecha_fin)

            query += " ORDER BY a.fecha DESC, u.nombre_completo"

            cursor.execute(query, params)

            asistencias = [{
                'id_asistencia': row[0],
                'id_medico': row[1],
                'nombre_medico': row[2],
                'fecha': row[3].strftime('%Y-%m-%d'),
                'hora_entrada': row[4].strftime('%H:%M:%S') if row[4] else None,
                'hora_salida': row[5].strftime('%H:%M:%S') if row[5] else None,
                'estado_asistencia': row[6]
            } for row in cursor.fetchall()]

            return jsonify(asistencias)

    except pyodbc.Error as e:
        logger.error(f"Error en base de datos al obtener asistencias: {str(e)}")
        return jsonify({'error': 'Error al obtener los registros de asistencia'}), 500
    finally:
        if conn:
            conn.close()

# Endpoint para actualizar un registro de asistencia (marcar salida)
@asistencias_bp.route('/api/asistencia/<int:id_asistencia>', methods=['PUT'])
@login_required
@role_required(1, 3) # Admin y Recepcionista
def actualizar_asistencia(current_user, id_asistencia):
    """Actualiza un registro de asistencia, útil para marcar la hora de salida."""
    data = request.json
    if not data or 'hora_salida' not in data:
        return jsonify({'error': 'Se requiere el campo hora_salida'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("UPDATE Asistencias SET hora_salida = ? WHERE id_asistencia = ?", (data['hora_salida'], id_asistencia))
            if cursor.rowcount == 0:
                return jsonify({'error': 'Registro de asistencia no encontrado'}), 404
            conn.commit()
            return jsonify({'message': 'Hora de salida registrada exitosamente'})

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al actualizar asistencia: {str(e)}")
        return jsonify({'error': 'Error al actualizar la asistencia'}), 500
    finally:
        if conn:
            conn.close()

# Endpoint para eliminar un registro de asistencia
@asistencias_bp.route('/api/asistencia/<int:id_asistencia>', methods=['DELETE'])
@login_required
@role_required(1) # Solo Admin
def eliminar_asistencia(current_user, id_asistencia):
    """Elimina un registro de asistencia."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Asistencias WHERE id_asistencia = ?", (id_asistencia,))
            if cursor.rowcount == 0:
                return jsonify({'error': 'Registro de asistencia no encontrado'}), 404
            conn.commit()
            return jsonify({'message': 'Registro de asistencia eliminado exitosamente'})

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al eliminar asistencia: {str(e)}")
        return jsonify({'error': 'Error al eliminar la asistencia'}), 500
    finally:
        if conn:
            conn.close()