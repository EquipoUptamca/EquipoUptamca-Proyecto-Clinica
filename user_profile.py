from flask import Blueprint, render_template, jsonify, request, session
from auth_middleware import login_required
from database import get_db_connection
import logging
import pyodbc
from werkzeug.security import check_password_hash, generate_password_hash

profile_bp = Blueprint('profile', __name__)
 
@profile_bp.route('/perfil')
@login_required
def perfil_page(current_user):
    """Renderiza la página de perfil del usuario."""
    return render_template('perfil.html')

@profile_bp.route('/api/profile/me', methods=['GET'])
@login_required
def get_my_profile(current_user):
    """Obtiene los datos del perfil del usuario autenticado."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT nombre_completo, gmail, telefono, usuario_login
                FROM Usuarios
                WHERE id_usuario = ?
            """, (current_user['id_usuario'],))
            
            user_data = cursor.fetchone()

            if not user_data:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            return jsonify({
                'nombre_completo': user_data.nombre_completo,
                'email': user_data.gmail,
                'telefono': user_data.telefono,
                'usuario_login': user_data.usuario_login
            })

    except Exception as e:
        logging.error(f"Error al obtener perfil: {e}")
        return jsonify({'error': 'Error interno al obtener el perfil'}), 500
    finally:
        if conn:
            conn.close()

@profile_bp.route('/api/profile/me', methods=['PUT'])
@login_required
def update_my_profile(current_user):
    """Permite a un usuario autenticado actualizar su propio perfil."""
    data = request.json
    if not data:
        return jsonify({'error': 'Datos no proporcionados'}), 400

    # Campos permitidos para la auto-actualización
    allowed_fields = ['nombre_completo', 'email', 'telefono']
    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if not update_data:
        return jsonify({'error': 'No se proporcionaron campos válidos para actualizar'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Construir la consulta de actualización dinámicamente
            set_clause = ", ".join([f"{field} = ?" for field in update_data.keys()])
            params = list(update_data.values())
            params.append(current_user['id_usuario'])

            query = f"UPDATE Usuarios SET {set_clause} WHERE id_usuario = ?"
            cursor.execute(query, params)
            conn.commit()

            # Actualizar la sesión si el nombre cambió
            if 'nombre_completo' in update_data:
                session['nombre_completo'] = update_data['nombre_completo']

            return jsonify({'message': 'Perfil actualizado exitosamente'}), 200

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error de base de datos al actualizar perfil: {e}")
        return jsonify({'error': 'Error interno al actualizar el perfil'}), 500
    finally:
        if conn:
            conn.close()

@profile_bp.route('/api/profile/change-password', methods=['PUT'])
@login_required
def change_my_password(current_user):
    """Permite a un usuario autenticado cambiar su propia contraseña."""
    data = request.json
    if not data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({'error': 'Se requiere la contraseña actual y la nueva'}), 400

    current_password = data['current_password']
    new_password = data['new_password']

    if len(new_password) < 8:
        return jsonify({'error': 'La nueva contraseña debe tener al menos 8 caracteres'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT contraseña FROM Usuarios WHERE id_usuario = ?", (current_user['id_usuario'],))
            user_row = cursor.fetchone()

            if not user_row or not user_row.contraseña or not check_password_hash(user_row.contraseña, current_password):
                return jsonify({'error': 'La contraseña actual es incorrecta'}), 403

            new_hashed_password = generate_password_hash(new_password)
            cursor.execute("UPDATE Usuarios SET contraseña = ? WHERE id_usuario = ?", (new_hashed_password, current_user['id_usuario']))
            conn.commit()

            return jsonify({'message': 'Contraseña actualizada exitosamente'}), 200

    except Exception as e:
        conn.rollback()
        logging.error(f"Error inesperado al cambiar contraseña: {e}")
        return jsonify({'error': 'Ocurrió un error inesperado'}), 500
    finally:
        if conn:
            conn.close()