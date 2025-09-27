# auth_middleware.py
# auth_middleware.py
from functools import wraps
from flask import session, redirect, url_for, flash, request, jsonify, g
from database import get_db_connection
import pyodbc
import logging

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'id_usuario' not in session:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({'error': 'Sesión expirada', 'redirect': url_for('views.login_page')}), 401
            flash('Por favor inicie sesión para acceder a esta página.', 'warning')
            return redirect(url_for('views.login_page'))

        # Cargar datos del usuario en el contexto global 'g' para la solicitud actual
        if 'current_user' not in g:
            conn = get_db_connection()
            if not conn:
                return jsonify({'error': 'Error de conexión a la base de datos'}), 500
            try:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT u.id_usuario, u.nombre_completo, u.id_rol, r.nombre_rol, u.tipo_usuario, m.id_medico, p.id_paciente
                        FROM Usuarios u
                        JOIN Roles r ON u.id_rol = r.id_rol
                        LEFT JOIN Medicos m ON u.id_usuario = m.id_usuario
                        LEFT JOIN Pacientes p ON u.id_usuario = p.id_usuario
                        WHERE u.id_usuario = ?
                    """, (session['id_usuario'],))
                    user_data = cursor.fetchone()
                    if not user_data:
                        session.clear()
                        return jsonify({'error': 'Usuario no encontrado, sesión cerrada.', 'redirect': url_for('views.login_page')}), 401
                    
                    g.current_user = {
                        'id_usuario': user_data[0], 'nombre_completo': user_data[1],
                        'id_rol': user_data[2], 'nombre_rol': user_data[3],
                        'tipo_usuario': user_data[4], 'id_medico': user_data[5],
                        'id_paciente': user_data[6]
                    }
            except pyodbc.Error as e:
                logging.error(f"Error al cargar datos de usuario: {e}")
                return jsonify({'error': 'Error al cargar datos de usuario'}), 500
            finally:
                conn.close()

        return f(g.current_user, *args, **kwargs)
    return decorated_function

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(current_user, *args, **kwargs):
            user_role = current_user.get('id_rol')
            if user_role not in roles:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Acceso denegado. No tiene los permisos necesarios.'}), 403
                flash('No tiene permisos para acceder a esta página.', 'danger')
                return redirect(url_for('views.dashboard'))
            return f(current_user, *args, **kwargs)
        return decorated_function
    return decorator