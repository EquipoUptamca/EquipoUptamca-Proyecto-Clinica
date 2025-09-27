from flask import Blueprint, request, jsonify
import pyodbc
import logging
import re
from database import get_db_connection
from collections import defaultdict
from auth_middleware import login_required, role_required

doctors_bp = Blueprint('doctors', __name__)

# Función para validar email
def is_valid_email(email):
    if not email:
        return True  # Email opcional
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# Función para validar teléfono
def is_valid_phone(phone):
    if not phone:
        return True  # Teléfono opcional
    # Permite números con o sin guiones, paréntesis, etc.
    cleaned_phone = re.sub(r'[^\d]', '', phone)
    return len(cleaned_phone) >= 10 and len(cleaned_phone) <= 15

# Endpoint para obtener todos los médicos
@doctors_bp.route('/api/medicos', methods=['GET'])
@login_required
def get_medicos(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT m.id_medico, u.nombre_completo, m.especialidad,
                       m.numero_colegiado, m.años_experiencia,
                       u.telefono, u.gmail, m.estado, m.id_usuario
                FROM Medicos m
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                ORDER BY u.nombre_completo
            """)
            medicos = [{
                'id_medico': row[0],
                'nombre_completo': row[1],
                'especialidad': row[2] or 'No Asignada',
                'numero_colegiado': row[3],
                'años_experiencia': row[4],
                'telefono': row[5],
                'correo': row[6],
                'estado': row[7],
                'id_usuario': row[8]
            } for row in cursor.fetchall()]
            
            return jsonify(medicos)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener médicos'}), 500
    finally:
        conn.close()

# Endpoint para obtener especialidades únicas
@doctors_bp.route('/api/medicos/especialidades', methods=['GET'])
def get_especialidades():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id_especialidad, nombre_especialidad, tipo_especialidad
                FROM Especialidades
                ORDER BY tipo_especialidad, nombre_especialidad
            """)
            
            # Agrupar especialidades por tipo para facilitar su uso en el frontend
            grouped_specialties = defaultdict(list)
            for row in cursor.fetchall():
                category = row.tipo_especialidad or 'General'
                grouped_specialties[category].append({
                    'id': row.id_especialidad,
                    'nombre': row.nombre_especialidad
                })
            
            return jsonify(grouped_specialties)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener especialidades'}), 500
    finally:
        conn.close()

# Endpoint para obtener un médico específico
@doctors_bp.route('/api/medicos/<int:id_medico>', methods=['GET'])
@login_required
def get_medico(current_user, id_medico):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT m.id_medico, u.nombre_completo, m.especialidad,
                       m.numero_colegiado, m.años_experiencia,
                       u.telefono, u.gmail, m.estado, m.id_usuario
                FROM Medicos m
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                WHERE m.id_medico = ?
            """, (id_medico,))
            
            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Médico no encontrado'}), 404
                
            medico = {
                'id_medico': row[0],
                'nombre_completo': row[1],
                'especialidad': row[2] or 'No Asignada',
                'numero_colegiado': row[3],
                'años_experiencia': row[4],
                'telefono': row[5],
                'correo': row[6],
                'estado': row[7],
                'id_usuario': row[8]
            }
            
            # Find the id_especialidad based on the name for the form
            if medico['especialidad'] != 'No Asignada':
                cursor.execute("SELECT id_especialidad FROM Especialidades WHERE nombre_especialidad = ?", (medico['especialidad'],))
                especialidad_id_row = cursor.fetchone()
                if especialidad_id_row:
                    medico['id_especialidad'] = especialidad_id_row[0]

            return jsonify(medico)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener médico'}), 500
    finally:
        conn.close()

# Endpoint para obtener médicos disponibles para citas
@doctors_bp.route('/api/medicos/disponibles', methods=['GET'])
@login_required
def get_medicos_disponibles(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT m.id_medico, u.nombre_completo, m.especialidad
                FROM Medicos m
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                WHERE m.estado = 'A'
                ORDER BY u.nombre_completo
            """)
            medicos = [{
                'id_medico': row[0],
                'nombre_completo': row[1],
                'especialidad': row[2]
            } for row in cursor.fetchall()]
            
            return jsonify(medicos)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener médicos disponibles'}), 500
    finally:
        conn.close()

# Endpoint para crear un nuevo médico
@doctors_bp.route('/api/medicos', methods=['POST'])
@login_required
@role_required(1)  # 1 = Admin
def create_medico(current_user):
    data = request.json
    
    # Validar campos requeridos
    required_fields = ['id_usuario', 'id_especialidad', 'numero_colegiado']
    if not all(field in data for field in required_fields):
        missing = [field for field in required_fields if field not in data]
        return jsonify({'error': 'Faltan campos requeridos', 'campos_faltantes': missing}), 400
    
    # Validar email
    if data.get('correo') and not is_valid_email(data['correo']):
        return jsonify({'error': 'El formato del correo electrónico no es válido'}), 400
    
    # Validar teléfono
    if data.get('telefono') and not is_valid_phone(data['telefono']):
        return jsonify({'error': 'El formato del teléfono no es válido'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            # 1. Verificar que el usuario existe y no es ya un médico
            cursor.execute("SELECT 1 FROM Usuarios WHERE id_usuario = ?", (data['id_usuario'],))
            if not cursor.fetchone():
                return jsonify({'error': 'El usuario especificado no existe'}), 404
            
            cursor.execute("SELECT 1 FROM Medicos WHERE id_usuario = ?", (data['id_usuario'],))
            if cursor.fetchone():
                return jsonify({'error': 'Este usuario ya tiene un perfil de médico asociado'}), 400

            # 2. Verificar que el número de colegiado no esté en uso
            cursor.execute("SELECT 1 FROM Medicos WHERE numero_colegiado = ?", (data['numero_colegiado'],))
            if cursor.fetchone():
                return jsonify({'error': 'El número de colegiado ya está en uso'}), 400

            # 3. Obtener el nombre de la especialidad
            cursor.execute("SELECT nombre_especialidad FROM Especialidades WHERE id_especialidad = ?", (data['id_especialidad'],))
            especialidad_row = cursor.fetchone()
            if not especialidad_row:
                return jsonify({'error': 'La especialidad seleccionada no es válida'}), 400
            especialidad_nombre = especialidad_row[0]

            # 4. Crear el registro de médico
            cursor.execute("""
                INSERT INTO Medicos (
                    id_usuario, especialidad, numero_colegiado, años_experiencia, estado
                ) OUTPUT INSERTED.id_medico
                VALUES (?, ?, ?, ?, ?)
            """, (
                data['id_usuario'],
                especialidad_nombre,
                data['numero_colegiado'],
                int(data.get('años_experiencia') or 0),
                data.get('estado', 'A')
            ))
            
            medico_id = cursor.fetchone()[0]

            # 5. Actualizar el registro de usuario para reflejar el rol de médico
            cursor.execute("UPDATE Usuarios SET id_rol = 2, tipo_usuario = 'medico' WHERE id_usuario = ?", (data['id_usuario'],))
            
            conn.commit()
            
            return jsonify({
                'message': 'Perfil de médico creado y asociado al usuario exitosamente',
                'id_medico': medico_id
            }), 201
            
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error en base de datos: {str(e)}")
        if 'UNIQUE KEY' in str(e):
            return jsonify({'error': 'El número de colegiado o el usuario ya están en uso.'}), 400
        return jsonify({'error': 'Error al crear médico', 'detalles': str(e)}), 500
    finally:
        conn.close()

# Endpoint para actualizar médico
@doctors_bp.route('/api/medicos/<int:id_medico>', methods=['PUT'])
@role_required(1)  # 1 = Admin
def update_medico(current_user, id_medico):
    data = request.json
    
    if not data:
        return jsonify({'error': 'Datos no proporcionados'}), 400
    
    # Validar email
    if data.get('correo') and not is_valid_email(data['correo']):
        return jsonify({'error': 'El formato del correo electrónico no es válido'}), 400
    
    # Validar teléfono
    if data.get('telefono') and not is_valid_phone(data['telefono']):
        return jsonify({'error': 'El formato del teléfono no es válido'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            # Verificar si el médico existe y obtener ID de usuario
            cursor.execute("SELECT id_usuario FROM Medicos WHERE id_medico = ?", (id_medico,))
            result = cursor.fetchone()
            if not result:
                return jsonify({'error': 'Médico no encontrado'}), 404
                
            usuario_id = result[0]
            
            # Verificar unicidad de número de colegiado si se está cambiando
            if 'numero_colegiado' in data:
                cursor.execute("""
                    SELECT 1 FROM Medicos 
                    WHERE numero_colegiado = ? AND id_medico != ?
                """, (data['numero_colegiado'], id_medico))
                if cursor.fetchone():
                    return jsonify({'error': 'El número de colegiado ya está en uso por otro médico'}), 400
            
            # Actualizar datos del médico
            update_fields = []
            update_values = []
            
            if 'id_especialidad' in data:
                cursor.execute("SELECT nombre_especialidad FROM Especialidades WHERE id_especialidad = ?", (data['id_especialidad'],))
                especialidad_row = cursor.fetchone()
                if not especialidad_row:
                    return jsonify({'error': 'Especialidad no válida'}), 400
                
                update_fields.append("especialidad = ?")
                update_values.append(especialidad_row[0])
                
            if 'numero_colegiado' in data:
                update_fields.append("numero_colegiado = ?")
                update_values.append(data['numero_colegiado'])

            if 'años_experiencia' in data:
                update_fields.append("años_experiencia = ?")
                update_values.append(int(data.get('años_experiencia') or 0))
                
            if 'estado' in data:
                update_fields.append("estado = ?")
                update_values.append(data['estado'])
                
            if update_fields:
                update_values.append(id_medico)
                cursor.execute(f"""
                    UPDATE Medicos SET
                        {', '.join(update_fields)},
                        fecha_actualizacion = GETDATE()
                    WHERE id_medico = ?
                """, update_values)
            
            # Actualizar nombre del usuario si es necesario
            user_update_fields = []
            user_update_values = []

            if 'telefono' in data:
                user_update_fields.append("telefono = ?")
                user_update_values.append(data.get('telefono'))
            if 'correo' in data:
                user_update_fields.append("gmail = ?")
                user_update_values.append(data.get('correo'))
            if 'nombre_completo' in data:
                user_update_fields.append("nombre_completo = ?")
                user_update_values.append(data['nombre_completo'])

            if user_update_fields:
                user_update_values.append(usuario_id)
                cursor.execute(f"""
                    UPDATE Usuarios SET
                        {', '.join(user_update_fields)},
                        fecha_actualizacion = GETDATE()
                    WHERE id_usuario = ?
                """, user_update_values)
                
            conn.commit()
            
            return jsonify({'message': 'Médico actualizado exitosamente'})
            
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error en base de datos: {str(e)}")
        if 'UNIQUE KEY' in str(e):
            return jsonify({'error': 'El número de colegiado ya está en uso.'}), 400
        return jsonify({'error': 'Error al actualizar médico', 'detalles': str(e)}), 500
    finally:
        conn.close()

# Endpoint para cambiar estado del médico
@doctors_bp.route('/api/medicos/<int:id_medico>', methods=['DELETE'])
@role_required(1)  # 1 = Admin
def toggle_medico_status(current_user, id_medico):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Obtener el estado actual del médico
            cursor.execute("SELECT estado FROM Medicos WHERE id_medico = ?", (id_medico,))

            row = cursor.fetchone()
            if not row:
                return jsonify({'error': 'Médico no encontrado'}), 404

            current_status = row[0]
            new_status = 'I' if current_status == 'A' else 'A'
            action_text = 'desactivado' if new_status == 'I' else 'activado'

            cursor.execute("""
                UPDATE Medicos SET
                    estado = ?,
                    fecha_actualizacion = GETDATE()
                WHERE id_medico = ?
            """, (new_status, id_medico))

            conn.commit()

            return jsonify({
                'message': f'Médico {action_text} exitosamente',
                'new_status': new_status
            })
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al cambiar estado del médico', 'detalles': str(e)}), 500
    finally:
        conn.close()

# Endpoint para obtener usuarios que pueden ser promovidos a médicos
@doctors_bp.route('/api/usuarios-para-medico', methods=['GET'])
@login_required
@role_required(1) # Admin
def get_usuarios_para_medico(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
    try:
        with conn.cursor() as cursor:
            # Seleccionar usuarios activos con rol de médico que no tienen un perfil de médico asociado
            cursor.execute("""
                SELECT u.id_usuario, u.nombre_completo, u.cedula, r.nombre_rol, u.telefono, u.gmail
                FROM Usuarios u
                LEFT JOIN Medicos m ON u.id_usuario = m.id_usuario
                JOIN Roles r ON u.id_rol = r.id_rol
                WHERE m.id_medico IS NULL AND u.activo = 1 AND u.id_rol = 2
                ORDER BY u.nombre_completo
            """)
            users = [{
                'id_usuario': row[0],
                'nombre_completo': row[1],
                'cedula': row[2],
                'telefono': row[4],
                'gmail': row[5]
            } for row in cursor.fetchall()]
            return jsonify(users)
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos: {str(e)}")
        return jsonify({'error': 'Error al obtener usuarios para rol de médico'}), 500
    finally:
        conn.close()

# Endpoint para el Directorio Médico por Especialidad (para Recepción)
@doctors_bp.route('/api/medicos/directorio', methods=['GET'])
@login_required
@role_required(1, 3) # Admin y Recepción
def get_medicos_directorio(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT u.nombre_completo, m.especialidad, u.telefono, u.gmail
                FROM Medicos m
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                WHERE m.estado = 'A' AND m.especialidad IS NOT NULL
                ORDER BY m.especialidad, u.nombre_completo
            """)
            
            directorio = defaultdict(list)
            for row in cursor.fetchall():
                directorio[row.especialidad].append({
                    'nombre_completo': row.nombre_completo,
                    'telefono': row.telefono or 'No disponible',
                    'correo': row.gmail or 'No disponible'
                })
            
            return jsonify(dict(directorio))
    except pyodbc.Error as e:
        logging.error(f"Error en base de datos al crear directorio: {str(e)}")
        return jsonify({'error': 'Error al crear el directorio de médicos'}), 500
    finally:
        conn.close()