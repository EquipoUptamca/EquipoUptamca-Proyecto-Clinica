from flask import Blueprint, request, jsonify, current_app, session
from auth_middleware import login_required
import pyodbc
import logging
import secrets
import smtplib
from database import get_db_connection
from werkzeug.security import generate_password_hash, check_password_hash, generate_password_hash
from werkzeug.security import generate_password_hash
import pyodbc
import re  # For email validation
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

users_bp = Blueprint('users', __name__)

# Validaciones comunes
def validate_user_data(data, is_update=False):
    # Campos requeridos
    required_fields = ['nombre_completo', 'usuario_login', 'id_rol', 'cedula']
    
    # Solo requerir contraseña para creación
    if not is_update:
        required_fields.extend(['contraseña', 'tipo_usuario'])
    
    # Verificar campos requeridos
    missing_fields = [field for field in required_fields if field not in data or not data[field]]
    if missing_fields:
        return {'error': f'Faltan campos requeridos: {", ".join(missing_fields)}'}, 400

    # Validaciones de longitud
    if len(data['usuario_login']) > 50:
        return {'error': 'El nombre de usuario no puede exceder 50 caracteres'}, 400

    if len(data['nombre_completo']) > 100:
        return {'error': 'El nombre completo no puede exceder 100 caracteres'}, 400

    if not is_update and 'contraseña' in data and len(data['contraseña']) < 8:
        return {'error': 'La contraseña debe tener al menos 8 caracteres'}, 400

    # Validar formato de email si se proporciona
    if 'gmail' in data and data['gmail']:
        if not re.match(r"[^@]+@[^@]+\.[^@]+", data['gmail']):
            return {'error': 'El formato del email no es válido'}, 400

    # Validar formato de cédula
    if len(str(data['cedula'])) > 20:
        return {'error': 'La cédula no puede exceder los 20 caracteres'}, 400

    # Validar teléfono si se proporciona
    if 'telefono' in data and data['telefono']:
        phone_str = str(data['telefono'])
        if not phone_str.isdigit() or len(phone_str) < 7 or len(phone_str) > 12:
            return {'error': 'El teléfono debe tener entre 7 y 12 dígitos'}, 400

    # Validar tipo_usuario
    valid_tipos = ['admin', 'medico', 'recepcion', 'paciente']
    if 'tipo_usuario' in data and data['tipo_usuario'] not in valid_tipos:
        return {'error': f'Tipo de usuario no válido. Debe ser uno de: {", ".join(valid_tipos)}'}, 400

    return None

def get_role_name(role_id):
    roles = {
        1: 'Administrador',
        2: 'Médico',
        3: 'Recepcionista',
        4: 'Paciente'
    }
    return roles.get(role_id, 'Usuario')

# Obtener lista de usuarios
@users_bp.route('/api/users', methods=['GET'])
def get_users():
    # Parámetros de paginación y filtrado
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    search = request.args.get('search', '')
    role_id = request.args.get('role_id', type=int)
    status = request.args.get('status', type=int)  # 1=activo, 0=inactivo

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()

        # Construir consulta base
        query = """
            SELECT id_usuario, nombre_completo, usuario_login, cedula, telefono, gmail, id_rol, activo, tipo_usuario
            FROM Usuarios
            WHERE 1=1
        """
        params = []

        # Aplicar filtros
        if search:
            query += " AND (nombre_completo LIKE ? OR usuario_login LIKE ? OR cedula LIKE ?)"
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])

        if role_id is not None:
            query += " AND id_rol = ?"
            params.append(role_id)

        if status is not None:
            query += " AND activo = ?"
            params.append(bool(status))

        # Contar total de registros
        count_query = f"SELECT COUNT(*) FROM ({query}) AS total"
        cursor.execute(count_query, params)
        total_users = cursor.fetchone()[0]

        # Aplicar paginación
        query += " ORDER BY nombre_completo OFFSET ? ROWS FETCH NEXT ? ROWS ONLY"
        params.extend([(page - 1) * per_page, per_page])

        cursor.execute(query, params)
        users = cursor.fetchall()

        # Formatear resultados
        users_list = []
        for user in users:
            users_list.append({
                'id_usuario': user[0],
                'nombre_completo': user[1],
                'usuario_login': user[2],
                'cedula': user[3],
                'telefono': user[4],
                'gmail': user[5],
                'id_rol': user[6],
                'activo': bool(user[7]),
                'tipo_usuario': user[8]
            })

        return jsonify({
            'users': users_list,
            'total': total_users,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_users + per_page - 1) // per_page
        })

    except pyodbc.Error as e:
        logging.error(f"Database error in get_users: {str(e)}")
        return jsonify({'error': 'Error al obtener usuarios', 'details': str(e)}), 500
    except Exception as e:
        logging.error(f"Unexpected error in get_users: {str(e)}")
        return jsonify({'error': 'Error inesperado al obtener usuarios'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Obtener un usuario específico
@users_bp.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id_usuario, nombre_completo, usuario_login, cedula, telefono, gmail, id_rol, activo, tipo_usuario
            FROM Usuarios
            WHERE id_usuario = ?
        """, (user_id,))
        
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'Usuario no encontrado'}), 404

        return jsonify({
            'id_usuario': user[0],
            'nombre_completo': user[1],
            'usuario_login': user[2],
            'cedula': user[3],
            'telefono': user[4],
            'gmail': user[5],
            'id_rol': user[6],
            'activo': bool(user[7]),
            'tipo_usuario': user[8]
        })

    except pyodbc.Error as e:
        logging.error(f"Database error in get_user: {str(e)}")
        return jsonify({'error': 'Error al obtener el usuario', 'details': str(e)}), 500
    except Exception as e:
        logging.error(f"Unexpected error in get_user: {str(e)}")
        return jsonify({'error': 'Error inesperado al obtener el usuario'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Crear un nuevo usuario
@users_bp.route('/api/users', methods=['POST'])
def create_user():
    # Verificar que se envió JSON
    if not request.is_json:
        return jsonify({'error': 'Se esperaba contenido tipo JSON'}), 400
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos JSON no proporcionados o inválidos'}), 400
    
    # Validar datos
    validation_error = validate_user_data(data)
    if validation_error:
        return jsonify(validation_error[0]), validation_error[1]

    # Generar hash de contraseña
    hashed_password = generate_password_hash(
        data['contraseña'],
        method='pbkdf2:sha256',
        salt_length=16
    )

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()

        # Verificar unicidad de usuario_login
        cursor.execute("SELECT 1 FROM Usuarios WHERE usuario_login = ?", (data['usuario_login'],))
        if cursor.fetchone():
            return jsonify({'error': 'El nombre de usuario ya está en uso'}), 400

        # Verificar unicidad de cédula
        cursor.execute("SELECT 1 FROM Usuarios WHERE cedula = ?", (data['cedula'],))
        if cursor.fetchone():
            return jsonify({'error': 'La cédula ya está registrada'}), 400

        # Verificar unicidad de gmail si se proporciona
        if data.get('gmail'):
            cursor.execute("SELECT 1 FROM Usuarios WHERE gmail = ?", (data['gmail'],))
            if cursor.fetchone():
                return jsonify({'error': 'El correo electrónico ya está en uso'}), 400

        # Insertar nuevo usuario
        cursor.execute("""
            INSERT INTO Usuarios (
                nombre_completo, usuario_login, contraseña, id_rol, 
                cedula, telefono, gmail, activo, tipo_usuario
            ) OUTPUT INSERTED.id_usuario
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            data['nombre_completo'],
            data['usuario_login'],
            hashed_password,
            int(data['id_rol']),  # Asegurar que es entero
            str(data['cedula']),  # Asegurar que es string
            data.get('telefono'),
            data.get('gmail'),
            bool(data.get('activo', True)),  # Por defecto activo
            data.get('tipo_usuario')
        ))

        new_user_id = cursor.fetchone()[0]

        # --- FIX: Create corresponding patient/doctor record ---
        tipo_usuario = data.get('tipo_usuario')
        if tipo_usuario == 'paciente':
            cursor.execute("INSERT INTO Pacientes (id_usuario, estado) VALUES (?, 'A')", (new_user_id,))
            logging.info(f"Created patient record for new user_id: {new_user_id}")
        elif tipo_usuario == 'medico':
            # For doctors, we create a basic record. More details can be added later.
            cursor.execute("INSERT INTO Medicos (id_usuario, estado) VALUES (?, 'A')", (new_user_id,))
            logging.info(f"Created doctor record for new user_id: {new_user_id}")
        # --- END FIX ---

        conn.commit()

        return jsonify({
            'message': 'Usuario creado exitosamente',
            'id_usuario': new_user_id
        }), 201

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Database error in create_user: {str(e)}")
        return jsonify({'error': 'Error al crear el usuario', 'details': str(e)}), 500
    except Exception as e:
        conn.rollback()
        logging.error(f"Unexpected error in create_user: {str(e)}")
        return jsonify({'error': 'Error inesperado al crear el usuario'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Actualizar un usuario existente
@users_bp.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    # Verificar que se envió JSON y obtener datos
    if not request.is_json:
        logging.error("Solicitud PUT sin contenido JSON")
        return jsonify({'error': 'Se esperaba contenido tipo JSON'}), 400
    
    try:
        data = request.get_json()
    except Exception as e:
        logging.error(f"Error al parsear JSON: {str(e)}")
        return jsonify({'error': 'Datos JSON no válidos'}), 400
    
    if not data:
        logging.error("Datos JSON vacíos")
        return jsonify({'error': 'Datos JSON no proporcionados'}), 400
    
    # Loggear datos recibidos para diagnóstico
    logging.info(f"Datos recibidos para actualización de usuario {user_id}: {data}")
    
    # Validar datos (sin requerir contraseña para actualización)
    validation_error = validate_user_data(data, is_update=True)
    if validation_error:
        logging.error(f"Error de validación: {validation_error[0]}")
        return jsonify(validation_error[0]), validation_error[1]

    conn = get_db_connection()
    if not conn:
        logging.error("Error de conexión a la base de datos")
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()

        # Verificar si el usuario existe
        cursor.execute("SELECT usuario_login, cedula, gmail, tipo_usuario FROM Usuarios WHERE id_usuario = ?", (user_id,))
        existing_user = cursor.fetchone()
        
        if not existing_user:
            logging.error(f"Usuario con ID {user_id} no encontrado")
            return jsonify({'error': 'Usuario no encontrado'}), 404

        current_username, current_cedula, current_gmail, current_tipo = existing_user

        # Verificar unicidad de usuario_login
        if 'usuario_login' in data and data['usuario_login'] != current_username:
            cursor.execute("SELECT 1 FROM Usuarios WHERE usuario_login = ? AND id_usuario != ?", (data['usuario_login'], user_id))
            if cursor.fetchone():
                return jsonify({'error': 'El nombre de usuario ya está en uso'}), 400

        # Verificar unicidad de cédula
        if 'cedula' in data and data['cedula'] and data['cedula'] != current_cedula:
            cursor.execute("SELECT 1 FROM Usuarios WHERE cedula = ? AND id_usuario != ?", (data['cedula'], user_id))
            if cursor.fetchone():
                return jsonify({'error': 'La cédula ya está registrada para otro usuario'}), 400

        # Verificar unicidad de gmail
        if 'gmail' in data and data['gmail'] and data['gmail'] != current_gmail:
            cursor.execute("SELECT 1 FROM Usuarios WHERE gmail = ? AND id_usuario != ?", (data['gmail'], user_id))
            if cursor.fetchone():
                return jsonify({'error': 'El correo electrónico ya está en uso'}), 400

        # Construir consulta de actualización
        update_fields = []
        update_params = []
        
        if 'nombre_completo' in data:
            update_fields.append("nombre_completo = ?")
            update_params.append(data['nombre_completo'])
        
        if 'usuario_login' in data:
            update_fields.append("usuario_login = ?")
            update_params.append(data['usuario_login'])
        
        if 'id_rol' in data:
            update_fields.append("id_rol = ?")
            id_rol = int(data['id_rol'])
            update_params.append(id_rol)
            
            # Derivar y actualizar tipo_usuario para mantener consistencia
            role_map = {1: 'admin', 2: 'medico', 3: 'recepcion', 4: 'paciente'}
            tipo_usuario = role_map.get(id_rol)
            if tipo_usuario:
                update_fields.append("tipo_usuario = ?")
                update_params.append(tipo_usuario)
        
        if 'cedula' in data:
            update_fields.append("cedula = ?")
            update_params.append(str(data['cedula']))
        
        if 'telefono' in data:
            update_fields.append("telefono = ?")
            update_params.append(data.get('telefono'))
        
        if 'gmail' in data:
            update_fields.append("gmail = ?")
            update_params.append(data.get('gmail'))
        
        if 'activo' in data:
            update_fields.append("activo = ?")
            update_params.append(bool(data['activo']))
        
        # Actualizar contraseña solo si se proporciona
        if 'contraseña' in data and data['contraseña']:
            hashed_password = generate_password_hash(data['contraseña'], method='pbkdf2:sha256', salt_length=16)
            update_fields.append("contraseña = ?")
            update_params.append(hashed_password)

        # Si no hay campos para actualizar
        if not update_fields:
            logging.error("No se proporcionaron campos para actualizar")
            return jsonify({'error': 'No se proporcionaron campos para actualizar'}), 400

        update_params.append(user_id)  # Para el WHERE

        update_query = f"""
            UPDATE Usuarios
            SET {', '.join(update_fields)}
            WHERE id_usuario = ?
        """

        logging.info(f"Ejecutando consulta: {update_query} con parámetros: {update_params}")
        cursor.execute(update_query, update_params)
        
        # --- FIX: Update corresponding patient/doctor record if tipo_usuario changed ---
        if 'id_rol' in data:
            new_tipo_usuario = role_map.get(int(data['id_rol']))
            if new_tipo_usuario and new_tipo_usuario != current_tipo:
                
                # Remove from old type table
                if current_tipo == 'paciente':
                    cursor.execute("DELETE FROM Pacientes WHERE id_usuario = ?", (user_id,))
                    logging.info(f"Removed from Pacientes table for user_id: {user_id}")
                elif current_tipo == 'medico':
                    cursor.execute("DELETE FROM Medicos WHERE id_usuario = ?", (user_id,))
                    logging.info(f"Removed from Medicos table for user_id: {user_id}")
                
                # Add to new type table
                if new_tipo_usuario == 'paciente':
                    cursor.execute("INSERT INTO Pacientes (id_usuario, estado) VALUES (?, 'A')", (user_id,))
                    logging.info(f"Added to Pacientes table for user_id: {user_id}")
                elif new_tipo_usuario == 'medico':
                    cursor.execute("INSERT INTO Medicos (id_usuario, estado) VALUES (?, 'A')", (user_id,))
                    logging.info(f"Added to Medicos table for user_id: {user_id}")
        # --- END FIX ---
        
        conn.commit()

        return jsonify({'message': 'Usuario actualizado exitosamente'})

    except pyodbc.Error as e:
        conn.rollback()
        error_msg = f"Database error in update_user: {str(e)}"
        logging.error(error_msg)
        return jsonify({
            'error': 'Error al actualizar el usuario',
            'details': str(e)
        }), 500
    except Exception as e:
        conn.rollback()
        error_msg = f"Unexpected error in update_user: {str(e)}"
        logging.error(error_msg)
        return jsonify({
            'error': 'Error inesperado al actualizar el usuario',
            'details': str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Eliminar un usuario (o cambiar estado)
@users_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()

        # Verificar si el usuario existe
        cursor.execute("SELECT 1 FROM Usuarios WHERE id_usuario = ?", (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Usuario no encontrado'}), 404

        # Cambiar estado a inactivo
        cursor.execute("""
            UPDATE Usuarios
            SET activo = 0
            WHERE id_usuario = ?
        """, (user_id,))

        conn.commit()

        return jsonify({'message': 'Usuario desactivado exitosamente'})

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Database error in delete_user: {str(e)}")
        return jsonify({
            'error': 'Error al desactivar el usuario',
            'details': str(e)
        }), 500
    except Exception as e:
        conn.rollback()
        logging.error(f"Unexpected error in delete_user: {str(e)}")
        return jsonify({
            'error': 'Error inesperado al desactivar el usuario',
            'details': str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@users_bp.route('/api/password-recovery', methods=['POST'])
def request_password_recovery():
    if not request.is_json:
        return jsonify({'error': 'Se esperaba contenido tipo JSON'}), 400
    
    data = request.get_json()
    if not data or 'identificador' not in data:
        return jsonify({'error': 'Se requiere un identificador (usuario o email)'}), 400
    
    identificador = data['identificador'].strip()
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()
        
        # Buscar usuario por nombre de usuario o email
        cursor.execute("""
            SELECT id_usuario, usuario_login, gmail 
            FROM Usuarios 
            WHERE (usuario_login = ? OR gmail = ?) AND activo = 1
        """, (identificador, identificador))
        
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'No se encontró usuario activo con ese identificador'}), 404
        
        user_id, username, email = user
        
        if not email:
            return jsonify({'error': 'El usuario no tiene email registrado para recuperación'}), 400
        
        # Generar código de recuperación de 6 dígitos (válido por 15 minutos)
        code = str(secrets.randbelow(900000) + 100000)
        expiration = datetime.now() + timedelta(minutes=15)
        
        # Eliminar tokens previos para este usuario
        cursor.execute("DELETE FROM Password_reset_tokens WHERE id_usuario = ?", (user_id,))
        
        # Guardar token en la base de datos
        cursor.execute("""
            INSERT INTO Password_reset_tokens (id_usuario, token, expiration)
            VALUES (?, ?, ?)
        """, (user_id, code, expiration))
        
        conn.commit()
        
        # Enviar email con el enlace de recuperación
        email_sent = send_recovery_email(email, username, code)
        
        if not email_sent:
            return jsonify({'error': 'Error al enviar el email de recuperación'}), 500
        
        return jsonify({
            'message': 'Se han enviado instrucciones para recuperar la contraseña a tu email',
            'email_sent': True
        })
        
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Database error in password recovery: {str(e)}")
        return jsonify({'error': 'Error al procesar la solicitud'}), 500
    except Exception as e:
        conn.rollback()
        logging.error(f"Unexpected error in password recovery: {str(e)}")
        return jsonify({'error': 'Error inesperado al procesar la solicitud'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@users_bp.route('/api/reset-password', methods=['POST'])
def reset_password():
    if not request.is_json:
        logging.error("Reset password request without JSON")
        return jsonify({'error': 'Se esperaba contenido tipo JSON'}), 400
    
    data = request.get_json()
    if not data:
        logging.error("Empty JSON data in reset password")
        return jsonify({'error': 'Datos JSON no proporcionados'}), 400
    
    # Validar campos requeridos
    if 'code' not in data:
        logging.error("Code missing in reset password request")
        return jsonify({'error': 'El código es requerido'}), 400
        
    if 'identificador' not in data:
        logging.error("Identifier missing in reset password request")
        return jsonify({'error': 'El identificador es requerido'}), 400
        
    if 'nueva_contraseña' not in data:
        logging.error("New password missing in reset password request")
        return jsonify({'error': 'Nueva contraseña es requerida'}), 400
    
    code = data['code']
    identificador = data['identificador']
    new_password = data['nueva_contraseña']
    
    # Validar longitud de contraseña
    if len(new_password) < 8:
        logging.error("Password too short in reset request")
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400
    
    conn = get_db_connection()
    if not conn:
        logging.error("Database connection failed in reset password")
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()
        
        # Verificar código válido y no expirado para el usuario correcto
        cursor.execute("""
            SELECT prt.id_usuario, prt.expiration 
            FROM Password_reset_tokens prt
            JOIN Usuarios u ON prt.id_usuario = u.id_usuario
            WHERE prt.token = ? 
              AND (u.usuario_login = ? OR u.gmail = ?)
              AND prt.used = 0 
              AND prt.expiration > ?
        """, (code, identificador, identificador, datetime.now()))
        
        token_data = cursor.fetchone()
        if not token_data:
            logging.error(f"Invalid or expired code: {code} for identifier: {identificador}")
            return jsonify({
                'error': 'Código inválido o expirado. Por favor, solicite uno nuevo.',
            }), 400
        
        user_id, expiration = token_data
        
        # Actualizar contraseña del usuario
        hashed_password = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=16)
        
        cursor.execute("""
            UPDATE Usuarios 
            SET contraseña = ? 
            WHERE id_usuario = ?
        """, (hashed_password, user_id))
        
        # Marcar token como usado
        cursor.execute("""
            UPDATE Password_reset_tokens 
            SET used = 1 
            WHERE token = ? AND id_usuario = ?
        """, (code, user_id))
        
        conn.commit()
        
        return jsonify({'message': 'Contraseña restablecida exitosamente'})
        
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Database error in reset_password: {str(e)}")
        return jsonify({'error': 'Error al restablecer la contraseña', 'details': str(e)}), 500
    except Exception as e:
        conn.rollback()
        logging.error(f"Unexpected error in reset_password: {str(e)}")
        return jsonify({'error': 'Error inesperado al restablecer la contraseña'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def send_recovery_email(to_email, username, code):
    """Envía email de recuperación de contraseña"""
    try:
        # Configuración desde variables de entorno o configuración de la app
        smtp_server = current_app.config.get('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = current_app.config.get('SMTP_PORT', 587)
        sender_email = current_app.config.get('SMTP_USERNAME', 'equipo.uptamca.clinica@gmail.com')
        sender_password = current_app.config.get('SMTP_PASSWORD', 'tu-contraseña-de-aplicacion') # Reemplazar con contraseña de aplicación
        
        # Cuerpo del email
        body = f"""
        <html>
        <body>
            <h2>Recuperación de Contraseña - MedAsistencia</h2>
            <p>Hola {username},</p>
            <p>Hemos recibido una solicitud para restablecer tu contraseña. Utiliza el siguiente código para continuar. Este código es válido por 15 minutos.</p>
            <h3 style="text-align:center; letter-spacing: 5px; font-size: 24px; padding: 10px; background-color: #f2f2f2; border-radius: 5px;">{code}</h3>
            <p>Si no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.</p>
            <br>
            <p>Atentamente,</p>
            <p>El equipo de Sistema Clínico</p>
        </body>
        </html>
        """
        
        # Configura el mensaje
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = to_email
        msg['Subject'] = "Recuperación de contraseña - Sistema Clínico"
        msg.attach(MIMEText(body, 'html', 'utf-8'))
        
        # Envía el email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.send_message(msg)
            
        logging.info(f"Recovery email sent to {to_email}")
        return True
        
    except Exception as e:
        logging.error(f"Error sending recovery email: {str(e)}")
        return False

# --- FIX: Endpoint to get all patients for reception/admin views ---
@users_bp.route('/api/pacientes/all', methods=['GET'])
def get_all_pacientes():
    """
    Obtiene una lista completa de todos los usuarios que son pacientes,
    sin paginación, para las vistas de gestión.
    """
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    cursor = None
    try:
        cursor = conn.cursor()

        # La consulta une Usuarios con Pacientes para asegurar que solo traemos
        # usuarios que tienen un registro de paciente correspondiente.
        query = """
            SELECT 
                u.id_usuario, u.nombre_completo, u.cedula, u.telefono, u.gmail, u.activo, u.id_rol,
                p.id_paciente, p.estado as estado_paciente
            FROM Usuarios u
            JOIN Pacientes p ON u.id_usuario = p.id_usuario
            WHERE u.tipo_usuario = 'paciente'
            ORDER BY u.nombre_completo;
        """
        
        cursor.execute(query)
        pacientes = cursor.fetchall()

        pacientes_list = []
        for row in pacientes:
            pacientes_list.append({
                'id_usuario': row.id_usuario,
                'nombre_completo': row.nombre_completo,
                'cedula': row.cedula,
                'telefono': row.telefono,
                'gmail': row.gmail,
                'activo': bool(row.activo), # El estado del usuario en el sistema
                'id_rol': row.id_rol,
                'id_paciente': row.id_paciente,
                'estado_paciente': row.estado_paciente
            })

        return jsonify(pacientes_list)

    except pyodbc.Error as e:
        logging.error(f"Database error in get_all_pacientes: {str(e)}")
        return jsonify({'error': 'Error al obtener la lista de pacientes'}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()