from flask import Blueprint, request, jsonify, g
import pyodbc
import logging
from database import get_db_connection
from auth_middleware import login_required, role_required
from datetime import datetime

soporte_bp = Blueprint('soporte', __name__)
logger = logging.getLogger(__name__)

# Endpoint para crear un nuevo ticket de soporte
@soporte_bp.route('/api/soporte', methods=['POST'])
@login_required
def crear_ticket(current_user):
    """Permite a cualquier usuario autenticado reportar una falla o duda."""
    data = request.json
    required_fields = ['tipo_reporte', 'asunto', 'descripcion']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos: tipo_reporte, asunto y descripcion'}), 400
        
    if data['tipo_reporte'] not in ['Falla', 'Duda']:
        return jsonify({'error': 'Tipo de reporte inválido. Debe ser "Falla" o "Duda"'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO soporte (id_usuario_reporta, tipo_reporte, asunto, descripcion, prioridad)
                OUTPUT INSERTED.id_soporte
                VALUES (?, ?, ?, ?, ?)
            """, (
                current_user['id_usuario'],
                data['tipo_reporte'],
                data['asunto'],
                data['descripcion'],
                data.get('prioridad', 'Media')
            ))
            id_soporte = cursor.fetchone()[0]
            conn.commit()
            
            return jsonify({'message': 'Ticket de soporte creado exitosamente', 'id_soporte': id_soporte}), 201
    except pyodbc.Error as e:
        logger.error(f"Error al crear ticket de soporte: {str(e)}")
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
    finally:
        conn.close()

# Endpoint para obtener la lista de tickets
@soporte_bp.route('/api/soporte', methods=['GET'])
@login_required
def obtener_tickets(current_user):
    """
    Obtiene los tickets. 
    Admin y Soporte ven todos; otros usuarios solo ven los que ellos reportaron.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            base_query = """
                SELECT s.id_soporte, s.id_usuario_reporta, ur.nombre_completo as usuario_reporta,
                       s.id_usuario_tecnico, ut.nombre_completo as tecnico,
                       s.tipo_reporte, s.asunto, s.descripcion, s.estado, s.prioridad, s.fecha_creacion
                FROM soporte s
                JOIN Usuarios ur ON s.id_usuario_reporta = ur.id_usuario
                LEFT JOIN Usuarios ut ON s.id_usuario_tecnico = ut.id_usuario
            """
            
            if current_user['id_rol'] in [1, 5]: # Admin o Soporte
                cursor.execute(base_query + " ORDER BY s.fecha_creacion DESC")
            else:
                cursor.execute(base_query + " WHERE s.id_usuario_reporta = ? ORDER BY s.fecha_creacion DESC", (current_user['id_usuario'],))

            tickets = [{
                'id_soporte': row[0],
                'id_usuario_reporta': row[1],
                'usuario_reporta': row[2],
                'id_usuario_tecnico': row[3],
                'tecnico': row[4],
                'tipo_reporte': row[5],
                'asunto': row[6],
                'descripcion': row[7],
                'estado': row[8],
                'prioridad': row[9],
                'fecha_creacion': row[10].strftime('%Y-%m-%d %H:%M:%S')
            } for row in cursor.fetchall()]
            
            return jsonify(tickets)
    except pyodbc.Error as e:
        logger.error(f"Error al obtener tickets: {str(e)}")
        return jsonify({'error': 'Error al obtener los tickets'}), 500
    finally:
        conn.close()

# Endpoint para actualizar estado o asignar técnico
@soporte_bp.route('/api/soporte/<int:id_soporte>', methods=['PATCH'])
@login_required
@role_required(1, 5) # Solo Admin o Soporte
def gestionar_ticket(current_user, id_soporte):
    data = request.json
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # Asignar automáticamente al usuario de soporte que hace la acción si no se envía técnico
            id_tecnico = data.get('id_usuario_tecnico', current_user['id_usuario'])
            estado = data.get('estado', 'En Progreso')
            
            cursor.execute("""
                UPDATE soporte 
                SET id_usuario_tecnico = ?, estado = ?, fecha_actualizacion = GETDATE()
                WHERE id_soporte = ?
            """, (id_tecnico, estado, id_soporte))
            conn.commit()
            return jsonify({'message': 'Ticket actualizado correctamente'})
    finally:
        conn.close()

# Endpoint para estadísticas del dashboard de soporte
@soporte_bp.route('/api/soporte/stats', methods=['GET'])
@login_required
@role_required(1, 5)
def stats_soporte(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión'}), 500
    try:
        with conn.cursor() as cursor:
            stats = {}
            # Total de tickets
            cursor.execute("SELECT COUNT(*) FROM soporte")
            stats['total'] = cursor.fetchone()[0]
            
            # Tickets pendientes
            cursor.execute("SELECT COUNT(*) FROM soporte WHERE estado = 'Pendiente'")
            stats['pendientes'] = cursor.fetchone()[0]
            
            # Tickets en progreso
            cursor.execute("SELECT COUNT(*) FROM soporte WHERE estado = 'En Progreso'")
            stats['en_progreso'] = cursor.fetchone()[0]
            
            # Tickets resueltos
            cursor.execute("SELECT COUNT(*) FROM soporte WHERE estado IN ('Resuelto', 'Cerrado')")
            stats['finalizados'] = cursor.fetchone()[0]
            
            # Tickets críticos (Alta prioridad y no cerrados)
            cursor.execute("SELECT COUNT(*) FROM soporte WHERE prioridad = 'Alta' AND estado != 'Cerrado'")
            stats['criticos'] = cursor.fetchone()[0]
            
            return jsonify(stats)
    except pyodbc.Error as e:
        logger.error(f"Error al obtener estadísticas de soporte: {str(e)}")
        return jsonify({'error': 'Error al obtener estadísticas'}), 500
    finally:
        conn.close()