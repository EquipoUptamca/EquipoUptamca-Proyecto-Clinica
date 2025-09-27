from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
from middleware import token_required # Assuming you have this middleware
import pyodbc
import logging
from datetime import datetime
from database import get_db_connection

patients_bp = Blueprint('patients', __name__)
logger = logging.getLogger(__name__)

# Endpoint para obtener pacientes
@patients_bp.route('/api/pacientes', methods=['GET'])
def get_pacientes():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT p.id_paciente, u.nombre_completo
                FROM Pacientes p
                JOIN Usuarios u ON p.id_usuario = u.id_usuario
                WHERE p.estado = 'A'
                ORDER BY u.nombre_completo
            """)
            pacientes = [{
                'id_paciente': row[0],
                'nombre_completo': row[1]
            } for row in cursor.fetchall()]
            
            return jsonify(pacientes)
    except Exception as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener pacientes'}), 500
    finally:
        conn.close()

# Cambia el nombre de la segunda función get_pacientes a get_pacientes_detallados
@patients_bp.route('/api/pacientes/detallados', methods=['GET'])
def get_pacientes_detallados():
    """Obtiene todos los pacientes con opciones de filtrado"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        # Obtener parámetros de filtrado
        estado = request.args.get('estado')
        search = request.args.get('search')
        fecha_desde = request.args.get('fecha_desde')
        fecha_hasta = request.args.get('fecha_hasta')

        with conn.cursor() as cursor:
            # Construir consulta base
            query = """
                SELECT
                    p.id_paciente, u.nombre_completo, u.telefono, u.gmail, u.cedula,
                    p.estado, p.fecha_nacimiento, p.genero, p.tipo_sangre,
                    p.alergias, p.enfermedades_cronicas, p.contacto_emergencia,
                    p.telefono_emergencia, p.fecha_creacion, p.id_usuario
                FROM Pacientes p
                JOIN Usuarios u ON p.id_usuario = u.id_usuario
                WHERE 1=1
            """
            params = []

            # Aplicar filtros
            if estado:
                query += " AND p.estado = ?"
                params.append(estado)
            
            if search:
                query += """
                    AND (u.nombre_completo LIKE ? OR
                         u.telefono LIKE ? OR
                         u.cedula LIKE ? OR
                         u.gmail LIKE ?)
                """
                search_term = f"%{search}%"
                params.extend([search_term, search_term, search_term, search_term])
            
            if fecha_desde:
                query += " AND CONVERT(date, p.fecha_creacion) >= ?"
                params.append(fecha_desde)
            
            if fecha_hasta:
                query += " AND CONVERT(date, p.fecha_creacion) <= ?"
                params.append(fecha_hasta)

            query += " ORDER BY u.nombre_completo"

            cursor.execute(query, params)
            
            pacientes = [{
                'id_paciente': row[0],
                'nombre_completo': row[1],
                'telefono': row[2],
                'gmail': row[3],
                'cedula': row[4],
                'estado': row[5],
                'fecha_nacimiento': row[6].strftime('%Y-%m-%d') if row[6] else None,
                'genero': row[7],
                'tipo_sangre': row[8],
                'alergias': row[9],
                'enfermedades_cronicas': row[10],
                'contacto_emergencia': row[11],
                'telefono_emergencia': row[12],
                'fecha_creacion': row[13].strftime('%Y-%m-%d %H:%M:%S') if row[13] else None,
                'id_usuario': row[14]
            } for row in cursor.fetchall()]
            
            return jsonify(pacientes)
    except Exception as e:
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener pacientes'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes/stats', methods=['GET'])
def get_pacientes_stats():
    """Obtiene estadísticas de pacientes"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Total pacientes activos
            cursor.execute("SELECT COUNT(*) FROM Pacientes WHERE estado = 'A'")
            active = cursor.fetchone()[0]
            
            # Total pacientes
            cursor.execute("SELECT COUNT(*) FROM Pacientes")
            total = cursor.fetchone()[0]
            
            # Nuevos este mes
            cursor.execute("""
                SELECT COUNT(*) FROM Pacientes 
                WHERE fecha_creacion >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
            """)
            new_this_month = cursor.fetchone()[0]
            
            return jsonify({
                'active': active,
                'total': total,
                'new_this_month': new_this_month
            })
    except Exception as e:
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener estadísticas'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/usuarios-para-paciente', methods=['GET'])
def get_usuarios_para_paciente():
    """Obtiene usuarios que pueden ser promovidos a pacientes."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    try:
        with conn.cursor() as cursor:
            # Seleccionar usuarios activos que no tienen un perfil de paciente asociado
            cursor.execute("""
                SELECT u.id_usuario, u.nombre_completo, u.cedula, u.telefono, u.gmail
                FROM Usuarios u
                LEFT JOIN Pacientes p ON u.id_usuario = p.id_usuario
                WHERE p.id_paciente IS NULL AND u.activo = 1
                ORDER BY u.nombre_completo
            """)
            users = [{
                'id_usuario': row[0],
                'nombre_completo': row[1],
                'cedula': row[2],
                'telefono': row[3],
                'gmail': row[4]
            } for row in cursor.fetchall()]
            return jsonify(users)
    except Exception as e:
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener usuarios para rol de paciente'}), 500
    finally:
        if conn:
            conn.close()

@patients_bp.route('/api/pacientes/check-cedula', methods=['GET'])
def check_cedula():
    """Verifica si una cédula ya está registrada"""
    cedula = request.args.get('cedula')
    exclude = request.args.get('exclude')
    
    if not cedula:
        return jsonify({'error': 'Se requiere el parámetro cedula'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            query = "SELECT 1 FROM Usuarios WHERE cedula = ?"
            params = [cedula]
            
            if exclude:
                # Exclude by id_paciente, we need to find the corresponding id_usuario
                cursor.execute("SELECT id_usuario FROM Pacientes WHERE id_paciente = ?", (exclude,))
                user_to_exclude = cursor.fetchone()
                if user_to_exclude:
                    query += " AND id_usuario != ?"
                    params.append(user_to_exclude[0])

            cursor.execute(query, params)
            exists = cursor.fetchone() is not None
            return jsonify({'exists': exists})
    except Exception as e:
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al verificar cédula'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes', methods=['POST'])
def create_paciente():
    """Crea un nuevo perfil de paciente para un usuario existente"""
    data = request.json
    if not data.get('id_usuario'):
        return jsonify({'error': 'Se requiere el id_usuario'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            id_usuario = data['id_usuario']
            
            # 1. Verificar que el usuario existe y no es ya un paciente
            cursor.execute("SELECT 1 FROM Usuarios WHERE id_usuario = ?", (id_usuario,))
            if not cursor.fetchone():
                return jsonify({'error': 'El usuario especificado no existe'}), 404
            
            cursor.execute("SELECT 1 FROM Pacientes WHERE id_usuario = ?", (id_usuario,))
            if cursor.fetchone():
                return jsonify({'error': 'Este usuario ya tiene un perfil de paciente asociado'}), 400

            # 2. Crear el registro de Paciente
            cursor.execute("""
                INSERT INTO Pacientes (
                    id_usuario, fecha_nacimiento, genero, tipo_sangre,
                    alergias, enfermedades_cronicas, contacto_emergencia,
                    telefono_emergencia, estado
                ) OUTPUT INSERTED.id_paciente
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                id_usuario, data.get('fecha_nacimiento'), data.get('genero'), data.get('tipo_sangre'),
                data.get('alergias'), data.get('enfermedades_cronicas'), data.get('contacto_emergencia'),
                data.get('telefono_emergencia'), 'A'
            ))
            paciente_id = cursor.fetchone()[0]

            # 3. Actualizar el rol del usuario a 'paciente' (id_rol = 4)
            cursor.execute("UPDATE Usuarios SET id_rol = 4, tipo_usuario = 'paciente' WHERE id_usuario = ?", (id_usuario,))

            conn.commit()
            return jsonify({
                'message': 'Paciente creado exitosamente',
                'id_paciente': paciente_id
            }), 201
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al crear perfil de paciente'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes/<int:id_paciente>', methods=['GET'])
def get_paciente(id_paciente):
    """Obtiene un paciente específico por ID"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    p.id_paciente, u.nombre_completo, p.fecha_nacimiento, u.telefono,
                    u.gmail, u.cedula, p.estado, p.genero, p.tipo_sangre,
                    p.alergias, p.enfermedades_cronicas, p.contacto_emergencia,
                    p.telefono_emergencia, p.fecha_creacion, p.fecha_actualizacion, p.id_usuario
                FROM Pacientes p
                JOIN Usuarios u ON p.id_usuario = u.id_usuario
                WHERE id_paciente = ?
            """, (id_paciente,))
            
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Paciente no encontrado'}), 404
                
            paciente = {
                'id_paciente': row[0],
                'nombre_completo': row[1],
                'fecha_nacimiento': row[2].strftime('%Y-%m-%d') if row[2] else None,
                'telefono': row[3],
                'gmail': row[4],
                'cedula': row[5],
                'estado': row[6],
                'genero': row[7],
                'tipo_sangre': row[8],
                'alergias': row[9],
                'enfermedades_cronicas': row[10],
                'contacto_emergencia': row[11],
                'telefono_emergencia': row[12],
                'fecha_creacion': row[13].strftime('%Y-%m-%d %H:%M:%S') if row[13] else None,
                'fecha_actualizacion': row[14].strftime('%Y-%m-%d %H:%M:%S') if row[14] else None,
                'id_usuario': row[15]
            }
            
            return jsonify(paciente)
    except Exception as e:
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener paciente'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes/<int:id_paciente>', methods=['PUT'])
def update_paciente(id_paciente):
    """Actualiza un paciente existente"""
    data = request.json
    # Se elimina la validación de campos requeridos para permitir actualizaciones parciales.
    # if not all(field in data and data.get(field) for field in required_fields):
    #     return jsonify({'error': 'Faltan campos requeridos'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Obtener id_usuario del paciente
            cursor.execute("SELECT id_usuario FROM Pacientes WHERE id_paciente = ?", (id_paciente,))
            user_row = cursor.fetchone()
            if not user_row:
                return jsonify({'error': 'Paciente no encontrado'}), 404
            id_usuario = user_row[0]

            # Verificar unicidad de email
            if data.get('gmail'):
                cursor.execute("SELECT 1 FROM Usuarios WHERE gmail = ? AND id_usuario != ?", (data['gmail'], id_usuario))
                if cursor.fetchone(): return jsonify({'error': 'El email ya está registrado para otro usuario'}), 400

            # Actualizar tabla Usuarios
            cursor.execute("""
                UPDATE Usuarios SET
                    nombre_completo = ?,
                    telefono = ?,
                    gmail = ?,
                    fecha_actualizacion = GETDATE()
                WHERE id_usuario = ?
            """, (
                data['nombre_completo'], data.get('telefono'),
                data.get('gmail'), id_usuario
            ))

            # Actualizar tabla Pacientes
            cursor.execute("""
                UPDATE Pacientes SET
                    fecha_nacimiento = ?,
                    genero = ?,
                    tipo_sangre = ?,
                    alergias = ?,
                    enfermedades_cronicas = ?,
                    contacto_emergencia = ?,
                    telefono_emergencia = ?,
                    fecha_actualizacion = GETDATE()
                WHERE id_paciente = ?
            """, (
                data.get('fecha_nacimiento'),
                data.get('genero'), data.get('tipo_sangre'), data.get('alergias'),
                data.get('enfermedades_cronicas'), data.get('contacto_emergencia'),
                data.get('telefono_emergencia'), id_paciente
            ))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Paciente no encontrado'}), 404
                
            conn.commit()
            return jsonify({'message': 'Paciente actualizado exitosamente'})
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al actualizar paciente'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes/<int:id_paciente>/status', methods=['PATCH'])
def update_paciente_status(id_paciente):
    """Actualiza solo el estado de un paciente"""
    data = request.json
    if 'estado' not in data:
        return jsonify({'error': 'Se requiere el campo estado'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Si se está inactivando, verificar citas futuras
            if data['estado'] == 'I':
                cursor.execute("""
                    SELECT 1 FROM Citas 
                    WHERE id_paciente = ? AND fecha_cita >= CAST(GETDATE() AS DATE)
                """, (id_paciente,))
                
                if cursor.fetchone():
                    return jsonify({
                        'error': 'No se puede inactivar, el paciente tiene citas programadas.'
                    }), 400

            cursor.execute("""
                UPDATE Pacientes SET
                    estado = ?,
                    fecha_actualizacion = GETDATE()
                WHERE id_paciente = ?
            """, (data['estado'], id_paciente))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Paciente no encontrado'}), 404
                
            conn.commit()
            return jsonify({
                'message': f"Paciente marcado como {'activo' if data['estado'] == 'A' else 'inactivo'} exitosamente"
            })
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al actualizar estado del paciente'}), 500
    finally:
        conn.close()

@patients_bp.route('/api/pacientes/<int:id_paciente>', methods=['DELETE'])
def delete_paciente(id_paciente):
    """Marca un paciente como inactivo (eliminación lógica)"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Verificar citas futuras antes de inactivar
            cursor.execute("""
                SELECT 1 FROM Citas 
                WHERE id_paciente = ? AND fecha_cita >= CAST(GETDATE() AS DATE)
            """, (id_paciente,))
            
            if cursor.fetchone():
                return jsonify({
                    'error': 'No se puede inactivar, el paciente tiene citas programadas.'
                }), 400

            cursor.execute("""
                UPDATE Pacientes SET
                    estado = 'I',
                    fecha_actualizacion = GETDATE()
                WHERE id_paciente = ?
            """, (id_paciente,))
            
            if cursor.rowcount == 0:
                return jsonify({'error': 'Paciente no encontrado'}), 404
                
            conn.commit()
            return jsonify({'message': 'Paciente marcado como inactivo exitosamente'})
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en la base de datos: {str(e)}")
        return jsonify({'error': 'Error al inactivar paciente'}), 500
    finally:
        conn.close()