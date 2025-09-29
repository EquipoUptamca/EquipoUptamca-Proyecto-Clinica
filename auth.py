from flask import Blueprint, request, jsonify, url_for, session
from middleware import token_required
import pyodbc
import logging
from database import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash
import re

auth_bp = Blueprint('auth', __name__)

# API to get roles
@auth_bp.route('/api/roles', methods=['GET'])
def get_roles():
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id_rol, nombre_rol FROM Roles ORDER BY id_rol")
        roles = cursor.fetchall()
        
        # Devolver un objeto en lugar de una lista para un acceso más fácil por ID en el frontend
        roles_dict = {r[0]: r[1] for r in roles}
        
        return jsonify(roles_dict)
    except pyodbc.Error as e:
        logging.error(f"Database error in get_roles: {str(e)}")
        return jsonify({'error': 'Failed to fetch roles'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# API para verificar disponibilidad de username
@auth_bp.route('/api/check-username', methods=['GET'])
def check_username():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username parameter required'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM Usuarios WHERE usuario_login = ?", (username,))
            exists = cursor.fetchone() is not None
            return jsonify({'exists': exists})
    except pyodbc.Error as e:
        logging.error(f"Database error in check_username: {str(e)}")
        return jsonify({'error': 'Error checking username'}), 500
    finally:
        conn.close()

# API para verificar disponibilidad de cédula
@auth_bp.route('/api/check-cedula', methods=['GET'])
def check_cedula():
    cedula = request.args.get('cedula')
    if not cedula:
        return jsonify({'error': 'Cedula parameter required'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM Usuarios WHERE cedula = ?", (cedula,))
            exists = cursor.fetchone() is not None
            return jsonify({'exists': exists})
    except pyodbc.Error as e:
        logging.error(f"Database error in check_cedula: {str(e)}")
        return jsonify({'error': 'Error checking cedula'}), 500
    finally:
        conn.close()

# API para verificar disponibilidad de email
@auth_bp.route('/api/check-email', methods=['GET'])
def check_email():
    email = request.args.get('email')
    if not email:
        return jsonify({'error': 'Email parameter required'}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500
        
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 FROM Usuarios WHERE gmail = ?", (email,))
            exists = cursor.fetchone() is not None
            return jsonify({'exists': exists})
    except pyodbc.Error as e:
        logging.error(f"Database error in check_email: {str(e)}")
        return jsonify({'error': 'Error checking email'}), 500
    finally:
        conn.close()

# API for registration - VERSIÓN ACTUALIZADA
@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.json
    
    # Campos requeridos actualizados
    required_fields = ['nombre_completo', 'usuario_login', 'contraseña', 'cedula', 'gmail']
    
    # Validación de campos requeridos
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return jsonify({
            'error': 'Faltan campos requeridos',
            'campos_faltantes': missing_fields
        }), 400

    # Validación de longitud de inputs
    if len(data['usuario_login']) > 50:
        return jsonify({'error': 'El nombre de usuario no puede exceder 50 caracteres'}), 400
        
    if len(data['nombre_completo']) > 100:
        return jsonify({'error': 'El nombre completo no puede exceder 100 caracteres'}), 400
        
    if len(data['contraseña']) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400

    # Validar formato de cédula (V-12345678)
    if not re.match(r'^[VEGJ]-\d{5,9}$', data['cedula'], re.IGNORECASE):
        return jsonify({'error': 'Formato de cédula inválido. Use V-12345678'}), 400

    # Validar formato de email
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', data['gmail']):
        return jsonify({'error': 'Formato de email inválido'}), 400

    # --- MODIFICACIÓN IMPORTANTE ---
    # Se determina el rol basado en la selección del formulario.
    # ADVERTENCIA DE SEGURIDAD: Permitir el registro público de usuarios con roles administrativos ('admin', 'medico')
    # es un riesgo de seguridad significativo. Cualquier persona podría registrarse como administrador.
    # La solución recomendada es tener dos flujos de registro separados:
    # 1. Un formulario público (como este) que SIEMPRE cree pacientes (rol 4).
    # 2. Un formulario interno, solo para administradores, que permita crear usuarios con otros roles y que llame a un endpoint diferente y protegido (ej: POST /api/users).
    # Esta modificación se realiza para que el formulario actual funcione como se espera, pero se debe revisar la seguridad.

    tipo_usuario = data.get('tipo_usuario', 'paciente')
    role_map = {
        'admin': 1,
        'medico': 2,
        'recepcion': 3,
        'paciente': 4
    }
    id_rol = role_map.get(tipo_usuario, 4)  # Por defecto, rol de Paciente si el tipo es inválido

    # --- Verificación de código de seguridad para roles privilegiados ---
    privileged_roles = ['admin', 'medico', 'recepcion']
    if tipo_usuario in privileged_roles:
        admin_code = data.get('admin_code')
        if not admin_code:
            return jsonify({'error': 'Se requiere un código de acceso para este rol'}), 403
        if admin_code != 'privacidad_medasistencia':
            return jsonify({'error': 'El código de acceso es incorrecto'}), 403

    # Generar hash seguro de la contraseña
    try:
        hashed_password = generate_password_hash(
            data['contraseña'],
            method='pbkdf2:sha256',
            salt_length=16
        )
    except Exception as e:
        logging.error(f"Error al generar hash: {str(e)}")
        return jsonify({'error': 'Error interno al procesar la contraseña'}), 500

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión con la base de datos'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        
        # Verificar si el usuario, cédula o email ya existen
        cursor.execute("""
            SELECT 
                CASE WHEN usuario_login = ? THEN 'usuario_login' 
                     WHEN cedula = ? THEN 'cedula' 
                     WHEN gmail = ? THEN 'gmail' 
                END as campo
            FROM Usuarios 
            WHERE usuario_login = ? OR cedula = ? OR gmail = ?
        """, (data['usuario_login'], data['cedula'], data['gmail'], 
              data['usuario_login'], data['cedula'], data['gmail']))
        
        existing = cursor.fetchone()
        if existing:
            campo = existing[0]
            return jsonify({
                'error': f'El campo {campo} ya está registrado en el sistema',
                'field': campo
            }), 400
            
        # Insertar nuevo usuario
        cursor.execute("""
            INSERT INTO Usuarios (
                nombre_completo, usuario_login, contraseña, id_rol,
                cedula, telefono, gmail, tipo_usuario, activo
            ) OUTPUT INSERTED.id_usuario
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            data['nombre_completo'], 
            data['usuario_login'], 
            hashed_password, 
            id_rol,
            data['cedula'],
            data.get('telefono'),
            data['gmail'],
            tipo_usuario
        ))
        
        user_id = cursor.fetchone()[0]
        
        # Crear registro en la tabla correspondiente según el tipo de usuario
        if tipo_usuario == 'paciente':
            cursor.execute("""
                INSERT INTO Pacientes (id_usuario, estado) VALUES (?, 'A')
            """, (user_id,))

        conn.commit()
        
        return jsonify({
            'message': 'Usuario registrado exitosamente',
            'user_id': user_id,
            'redirect': url_for('views.login_page')
        }), 201
        
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error de base de datos en registro: {str(e)}")
        return jsonify({'error': 'Error en el registro. Por favor intente nuevamente.'}), 500
            
    except Exception as e:
        conn.rollback()
        logging.error(f"Error inesperado en registro: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500
        
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()

# API for login - VERSIÓN CORREGIDA
@auth_bp.route('/api/login', methods=['POST'])
def login():
    data = request.json
    required_fields = ['identificador', 'contraseña']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión con la base de datos'}), 500
        
    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT u.id_usuario, u.nombre_completo, u.id_rol, u.contraseña,
                   u.cedula, u.tipo_usuario, u.activo,
                   m.id_medico, m.especialidad, m.numero_colegiado,
                   p.id_paciente
            FROM Usuarios u
            LEFT JOIN Medicos m ON u.id_usuario = m.id_usuario
            LEFT JOIN Pacientes p ON u.id_usuario = p.id_usuario
            WHERE u.usuario_login = ? OR u.cedula = ? OR u.gmail = ?
        """, (data['identificador'], data['identificador'], data['identificador']))
        
        user = cursor.fetchone()
        
        if user:
            # Verificar si la cuenta está activa
            if not user[6]:  # activo field
                return jsonify({'error': 'Cuenta desactivada. Contacte al administrador.'}), 403
                
            password_is_correct = False
            try:
                # user[3] is the 'contraseña' field from the database.
                # A malformed hash in the DB can raise a ValueError here.
                password_is_correct = check_password_hash(user[3], data['contraseña'])
            except (ValueError, TypeError) as e:
                # This handles corrupted password hashes gracefully instead of crashing.
                # It also handles cases where the hash might be None.
                logging.error(f"Error checking password hash for user_id {user[0]}: {e}")
                password_is_correct = False

            if password_is_correct:
                # Establecer la sesión del usuario
                session.permanent = True  # Opcional: para sesiones persistentes
                session['id_usuario'] = user[0]
                session['nombre_completo'] = user[1]
                session['id_rol'] = user[2]
                session['cedula'] = user[4]
                session['tipo_usuario'] = user[5]
                session['id_medico'] = user[7]
                session['id_paciente'] = user[10]

                # Determine redirect based on role and tipo_usuario
                if user[5] == 'medico' and user[7]:  # tipo_usuario = medico and id_medico exists
                    redirect_url = url_for('views.doctor_dashboard')
                elif user[2] == 1:  # Admin role
                    redirect_url = url_for('views.admin_dashboard')
                elif user[5] == 'recepcion':
                    redirect_url = url_for('views.reception_dashboard')
                elif user[5] == 'paciente':
                    redirect_url = url_for('views.paciente_dashboard')
                else:
                    redirect_url = url_for('views.login_page') # Fallback a login si no hay rol claro
                    
                return jsonify({
                    'message': 'Inicio de sesión exitoso',
                    'id_usuario': user[0],
                    'nombre_completo': user[1],
                    'id_rol': user[2],
                    'cedula': user[4],
                    'tipo_usuario': user[5],
                    'id_medico': user[7],
                    'id_paciente': user[10],
                    'especialidad': user[8],
                    'numero_colegiado': user[9],
                    'redirect': redirect_url
                }), 200
            else:
                return jsonify({'error': 'Credenciales inválidas'}), 401
        else:
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
    except pyodbc.Error as e:
        logging.error(f"Error de base de datos en login: {str(e)}")
        return jsonify({'error': 'Error en el inicio de sesión'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()