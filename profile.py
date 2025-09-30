from flask import Blueprint, render_template, jsonify
from auth_middleware import login_required
from database import get_db_connection
import logging

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
            """, (current_user.id_usuario,))
            
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