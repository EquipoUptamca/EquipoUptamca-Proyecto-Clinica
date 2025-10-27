from flask import Blueprint, request, jsonify
from auth_middleware import login_required
from datetime import date, datetime, timedelta
from database import get_db_connection
import logging
import threading
import atexit

chatbot_bp = Blueprint('chatbot', __name__)

# Variable para controlar el estado de la aplicación
_app_shutting_down = False
_connection_pool = {}

# Registrar función de limpieza al cerrar la aplicación
def cleanup_on_shutdown():
    global _app_shutting_down
    _app_shutting_down = True
    logging.info("Cerrando conexiones del chatbot...")
    
    # Cerrar todas las conexiones activas
    for thread_id, conn in _connection_pool.items():
        try:
            if conn:
                conn.close()
                logging.info(f"Conexión cerrada para thread {thread_id}")
        except Exception as e:
            logging.warning(f"Error al cerrar conexión: {e}")
    _connection_pool.clear()

atexit.register(cleanup_on_shutdown)

def get_thread_safe_connection():
    """Obtiene una conexión segura para el thread actual."""
    if _app_shutting_down:
        raise Exception("La aplicación se está cerrando")
    
    thread_id = threading.get_ident()
    
    # Reutilizar conexión si existe y es válida
    if thread_id in _connection_pool:
        try:
            conn = _connection_pool[thread_id]
            # Verificar si la conexión sigue activa
            conn.cursor().execute("SELECT 1")
            return conn
        except:
            # Si la conexión no es válida, removerla
            if thread_id in _connection_pool:
                try:
                    _connection_pool[thread_id].close()
                except:
                    pass
                del _connection_pool[thread_id]
    
    # Crear nueva conexión
    try:
        conn = get_db_connection()
        if conn:
            _connection_pool[thread_id] = conn
        return conn
    except Exception as e:
        logging.error(f"Error al crear conexión: {e}")
        return None

def close_thread_connection():
    """Cierra la conexión del thread actual."""
    thread_id = threading.get_ident()
    if thread_id in _connection_pool:
        try:
            _connection_pool[thread_id].close()
        except Exception as e:
            logging.warning(f"Error al cerrar conexión del thread {thread_id}: {e}")
        finally:
            del _connection_pool[thread_id]

# --- Lógica del Chatbot Público (Página Principal) ---
PUBLIC_RESPONSES = {
    ('hola', 'buenos dias', 'hey'): {
        'text': '¡Hola! 👋 Soy MediBot, tu asistente virtual en MedAsistencia. Estoy aquí para ayudarte. ¿Qué te gustaría saber?',
        'suggestions': ['¿Qué es MedAsistencia?', '¿Cómo me registro?', '¿Es seguro?']
    },
    ('qué es', 'que es', 'plataforma', 'funcionalidades'): {
        'text': 'MedAsistencia es una plataforma integral para la gestión de centros médicos. Ayudamos a optimizar la administración de pacientes, citas, historiales clínicos y mucho más. Puedes ver una <a href="/demo">demo interactiva</a> para conocerla a fondo.',
        'suggestions': ['¿Cómo me registro?', '¿Para quién es?', 'Ver precios']
    },
    ('para quién es', 'roles', 'tipos de usuario', 'quien puede usar'): {
        'text': 'MedAsistencia está diseñada para todos los miembros de un centro médico: <strong>Administradores</strong> para la gestión total, <strong>Médicos</strong> para el seguimiento de pacientes, <strong>Personal de Recepción</strong> para la organización de citas y, por supuesto, <strong>Pacientes</strong> para ver su información.',
        'suggestions': ['¿Cómo me registro como médico?', '¿Qué puede hacer un paciente?']
    },
    ('registrar', 'registro', 'crear cuenta'): {
        'text': '¡Excelente! Puedes registrarte fácilmente haciendo clic en el botón "Registrarse" en la parte superior. El proceso es rápido y te guiará paso a paso. Si eres personal médico, necesitarás un código de seguridad.',
        'suggestions': ['¿Qué es un código de seguridad?', '¿Es gratis?']
    },
    ('código de seguridad', 'codigo de seguridad', 'clave de seguridad'): {
        'text': 'El código de seguridad es una clave interna que proporcionamos a los centros médicos para asegurar que solo el personal autorizado (médicos, administradores, etc.) pueda registrarse con roles privilegiados. Los pacientes no necesitan este código.',
        'suggestions': ['¿Cómo obtengo un código?', '¿Cómo me registro?']
    },
    ('seguro', 'seguridad', 'privacidad'): {
        'text': 'La seguridad es nuestra máxima prioridad. Utilizamos encriptación de extremo a extremo y cumplimos con normativas como HIPAA para garantizar que la información de los pacientes esté siempre protegida. Lee más en nuestra <a href="/privacy">Política de Privacidad</a>.',
        'suggestions': ['¿Qué es MedAsistencia?', '¿Cómo me registro?']
    },
    ('precio', 'costo', 'gratis'): {
        'text': 'Actualmente, el registro para pacientes es completamente gratuito. Para centros médicos, ofrecemos planes personalizados. Te invitamos a <a href="#contact">contactarnos</a> para una cotización.',
        'suggestions': ['Ver funcionalidades', '¿Cómo me registro?']
    },
    ('soporte', 'contacto', 'ayuda', 'problema'): {
        'text': 'Si necesitas ayuda o tienes alguna pregunta, puedes contactarnos a través de la sección de <a href="/#contact">Contacto</a> en la parte inferior de esta página. Nuestro equipo estará encantado de atenderte.',
        'suggestions': ['Ver precios', '¿Es seguro?']
    },
    ('demo', 'demostración', 'ver como funciona'): {
        'text': '¡Claro! Tenemos una <a href="/demo">demo interactiva</a> donde puedes explorar las principales funcionalidades de la plataforma para cada tipo de rol. ¡Te invito a probarla!',
        'suggestions': ['¿Qué es MedAsistencia?', '¿Cómo me registro?']
    },
    ('gracias', 'ok', 'entiendo'): {
        'text': '¡De nada!  Si tienes alguna otra pregunta, no dudes en consultarme. Estoy aquí para ayudarte.',
        'suggestions': ['Ver funcionalidades', 'Ver precios', '¿Es seguro?']
    },
}

# --- Lógica del Chatbot de Recepción ---
RECEPTION_RESPONSES = {
    ('hola', 'buenos dias', 'buenas tardes'): {
        'text': '¡Hola! Soy MediBot, tu asistente virtual. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre pacientes, citas, horarios o el directorio médico.'
    },
    ('nuevo paciente', 'crear paciente', 'registrar paciente'): {
        'text': 'Para registrar un nuevo paciente, ve a la sección de <a href="/paciente_recep">Pacientes</a> y haz clic en "Nuevo Paciente".'
    },
    ('paciente',): {
        'text': 'Puedes buscar, ver y gestionar toda la información de los pacientes en la página de <a href="/paciente_recep">Gestión de Pacientes</a>.'
    },
    ('nueva cita', 'crear cita', 'agendar cita'): {
        'text': 'Claro, puedes agendar una nueva cita desde <a href="/nueva_cita">este enlace</a> o desde el botón "Nueva Cita" en el dashboard.'
    },
    ('ver cita', 'agenda'): {
        'text': 'Puedes ver todas las citas programadas en la <a href="/citas_recep">Agenda de Citas</a>.'
    },
    ('cita',): {
        'text': 'Puedo ayudarte a crear una <a href="/nueva_cita">nueva cita</a> o a revisar la <a href="/citas_recep">agenda de citas</a>. ¿Qué necesitas?'
    },
    ('horario',): {
        'text': 'Puedes consultar los horarios de todos los médicos en la sección de <a href="/horarios_recep">Horarios Médicos</a>. Solo tienes que seleccionar un médico de la lista.'
    },
    ('doctor', 'médico', 'directorio'): {
        'text': 'Para encontrar la información de contacto de un médico, como su teléfono o correo, consulta el <a href="/directorio_medico_recep">Directorio Médico</a>. Está organizado por especialidad.'
    },
    ('ayuda',): {
        'text': '¡Por supuesto! Estoy aquí para ayudarte. Puedes preguntarme cómo:<br>- Registrar un <b>nuevo paciente</b>.<br>- Agendar una <b>nueva cita</b>.<br>- Consultar el <b>horario de un médico</b>.<br>- Buscar en el <b>directorio médico</b>.'
    },
    ('gracias',): {
        'text': '¡De nada! Estoy para servirte. Si necesitas algo más, no dudes en preguntar.'
    }
}

def get_reception_response(lc_input):
    """Genera respuestas para el chatbot de recepción."""
    for keywords, response in RECEPTION_RESPONSES.items():
        if any(keyword in lc_input for keyword in keywords):
            return response
    return {'text': "No estoy seguro de cómo ayudarte con eso. Intenta preguntarme sobre 'pacientes', 'citas', 'horarios' o 'directorio médico'."}

# --- Lógica del Chatbot de Administrador ---
ADMIN_RESPONSES = {
    ('hola', 'buenos dias'): {'text': '¡Hola, Admin! Soy MediBot, tu asistente. ¿Qué tarea administrativa necesitas realizar?'},
    ('usuario', 'buscar usuario'): {'text': 'Claro, puedes buscar un usuario por nombre o cédula a continuación.', 'action': 'render_user_search'},
    ('médico', 'doctor'): {'text': 'Para administrar los perfiles profesionales de los médicos, incluyendo sus especialidades y datos, dirígete a <a href="/medicos">Gestión de Médicos</a>.'},
    ('paciente',): {'text': 'La lista completa de pacientes y sus perfiles se encuentra en la sección de <a href="/pacientes">Gestión de Pacientes</a>.'},
    ('horario',): {'text': 'Puedes asignar y modificar los horarios de trabajo de cada médico en la página de <a href="/horarios">Gestión de Horarios</a>.'},
    ('cita',): {'text': 'Para una vista general de todas las citas o para agendar una, puedes usar la <a href="/citas_recep">Agenda de Citas</a>.'},
    ('estadística', 'dashboard', 'reporte'): {'text': 'El <a href="/admin_dashboard">Dashboard Principal</a> te muestra las estadísticas clave y gráficos sobre la actividad del sistema.'},
    ('ayuda',): {'text': 'Puedo guiarte para:<br>- <b>Gestionar usuarios</b><br>- <b>Administrar médicos</b><br>- <b>Consultar horarios</b><br>- <b>Ver pacientes</b>'},
    ('gracias',): {'text': '¡A la orden! Si necesitas algo más, solo pregunta.'}
}

def get_admin_response(lc_input):
    """Genera respuestas para el chatbot de administrador."""
    for keywords, response in ADMIN_RESPONSES.items():
        if any(keyword in lc_input for keyword in keywords):
            return response
    return {'text': "No estoy seguro de cómo ayudarte con eso. Prueba preguntando sobre 'usuarios', 'médicos', 'pacientes' u 'horarios'."}

def get_public_response(lc_input):
    """Genera respuestas para el chatbot público."""
    for keywords, response in PUBLIC_RESPONSES.items():
        if any(keyword in lc_input for keyword in keywords):
            return response
    return {'text': "No he entendido tu pregunta. Podrías intentar preguntar '¿Qué es MedAsistencia?' o '¿Cómo me registro?'.", 'suggestions': ['¿Qué es MedAsistencia?', '¿Cómo me registro?', '¿Es seguro?']}

# --- Lógica del Chatbot del Médico ---
DOCTOR_RESPONSES = {
    # Saludos
    ('hola', 'buenos dias', 'buenas tardes', 'buenas noches'): {
        'function': 'handle_doctor_greeting'
    },
    
    # Consultas sobre horarios
    ('horario', 'mi horario', 'cuál es mi horario', 'ver horario', 'horario de trabajo'): {
        'function': 'handle_doctor_schedule'
    },
    
    # Consultas sobre citas
    ('citas pendientes', 'próximas citas', 'mis citas', 'citas de hoy', 'citas hoy', 
     'cuántas citas tengo', 'ver mis citas', 'citas programadas'): {
        'function': 'handle_doctor_appointments'
    },
    
    # Consultas específicas de cantidad
    ('cuántas citas tengo hoy', 'cuantas citas tengo hoy', 'citas para hoy', 'agenda de hoy'): {
        'function': 'handle_today_appointments'
    },
    
    # Ayuda general
    ('ayuda', 'help', 'qué puedes hacer', 'qué preguntar', 'opciones'): {
        'function': 'handle_doctor_help'
    },
    
    # Agradecimientos
    ('gracias', 'thanks', 'thank you', 'agradecido', 'agradecida'): {
        'function': 'handle_doctor_thanks'
    },
    
    # Consultas sobre pacientes
    ('pacientes', 'mis pacientes', 'lista de pacientes', 'historial pacientes'): {
        'function': 'handle_doctor_patients'
    },
    
    # Consultas sobre consultas médicas
    ('consultas', 'mis consultas', 'historial consultas', 'consultas realizadas'): {
        'function': 'handle_doctor_consultations'
    },
    
    # Estado del sistema
    ('estado', 'sistema', 'estadísticas', 'mis estadísticas', 'rendimiento'): {
        'function': 'handle_doctor_stats'
    }
}

def get_doctor_response(lc_input, current_user):
    """Genera respuestas para el chatbot del médico."""
    
    # Si la aplicación se está cerrando, responder rápido
    if _app_shutting_down:
        return {'text': '⚠️ El sistema se está cerrando. Por favor, intenta más tarde.'}
    
    # Buscar coincidencia en las respuestas predefinidas
    for keywords, response_config in DOCTOR_RESPONSES.items():
        if any(keyword in lc_input for keyword in keywords):
            function_name = response_config['function']
            
            # Llamar a la función correspondiente
            try:
                if function_name == 'handle_doctor_greeting':
                    return handle_doctor_greeting(current_user)
                elif function_name == 'handle_doctor_schedule':
                    return handle_doctor_schedule(current_user)
                elif function_name == 'handle_doctor_appointments':
                    return handle_doctor_appointments(lc_input, current_user)
                elif function_name == 'handle_today_appointments':
                    return handle_today_appointments(current_user)
                elif function_name == 'handle_doctor_help':
                    return handle_doctor_help()
                elif function_name == 'handle_doctor_thanks':
                    return handle_doctor_thanks()
                elif function_name == 'handle_doctor_patients':
                    return handle_doctor_patients(current_user)
                elif function_name == 'handle_doctor_consultations':
                    return handle_doctor_consultations(current_user)
                elif function_name == 'handle_doctor_stats':
                    return handle_doctor_stats(current_user)
            except Exception as e:
                logging.error(f"Error en función {function_name}: {e}")
                return {'text': '❌ Error temporal. Por favor, intenta de nuevo.'}
    
    # Si no encuentra coincidencia
    return handle_doctor_default_response()

def handle_doctor_greeting(current_user):
    """Maneja los saludos del médico."""
    nombre_medico = current_user.nombre_completo.split()[0] if current_user.nombre_completo else 'Doctor/a'
    return {
        'text': f'¡Hola, Dr/a. {nombre_medico}! 👋 Soy MediBot, tu asistente personal. ¿En qué puedo ayudarte hoy?'
    }

def handle_doctor_schedule(current_user):
    """Proporciona información sobre el horario del médico."""
    conn = None
    try:
        conn = get_thread_safe_connection()
        if not conn:
            return {
                'text': '📅 Puedes ver tu horario de trabajo completo en la sección <a href="/mi-horario" style="color: #1E8449; font-weight: 600;">Mi Horario</a>.'
            }
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT dia_semana, hora_inicio, hora_fin 
                FROM HorariosMedicos 
                WHERE id_medico = (
                    SELECT id_medico FROM Medicos WHERE id_usuario = ?
                ) 
                ORDER BY 
                    CASE dia_semana
                        WHEN 'Lunes' THEN 1
                        WHEN 'Martes' THEN 2
                        WHEN 'Miércoles' THEN 3
                        WHEN 'Jueves' THEN 4
                        WHEN 'Viernes' THEN 5
                        WHEN 'Sábado' THEN 6
                        WHEN 'Domingo' THEN 7
                    END
            """, (current_user.id_usuario,))
            
            horarios = cursor.fetchall()
            
            if horarios:
                schedule_text = "📅 <strong>Tu horario semanal:</strong><br><br>"
                for horario in horarios:
                    dia, inicio, fin = horario
                    schedule_text += f"• <strong>{dia}</strong>: {inicio} - {fin}<br>"
                schedule_text += "<br>Puedes gestionar tu horario en <a href='/mi-horario' style='color: #1E8449; font-weight: 600;'>Mi Horario</a>."
                return {'text': schedule_text}
            else:
                return {
                    'text': '📅 No tienes un horario configurado. Puedes establecerlo en la sección <a href="/mi-horario" style="color: #1E8449; font-weight: 600;">Mi Horario</a>.'
                }
                
    except Exception as e:
        logging.error(f"Error al obtener horario del médico: {e}")
        return {
            'text': '📅 Puedes ver y gestionar tu horario en la sección <a href="/mi-horario" style="color: #1E8449; font-weight: 600;">Mi Horario</a>.'
        }

def handle_doctor_appointments(lc_input, current_user):
    """Proporciona información sobre las citas del médico."""
    return get_doctor_appointments_info('pendientes', current_user)

def handle_today_appointments(current_user):
    """Proporciona información sobre las citas de hoy."""
    return get_doctor_appointments_info('hoy', current_user)

def get_doctor_appointments_info(tipo, current_user):
    """Obtiene información de citas del médico desde la base de datos."""
    conn = None
    try:
        conn = get_thread_safe_connection()
        if not conn:
            return {
                'text': '❌ No puedo acceder a la información de citas en este momento. Intenta más tarde.'
            }

        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user.id_usuario,))
            medico_row = cursor.fetchone()
            
            if not medico_row:
                return {
                    'text': '❌ No se encontró tu perfil médico. Contacta con administración.'
                }
            
            id_medico = medico_row[0]
            today = date.today()

            if tipo == 'hoy':
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM Citas 
                    WHERE id_medico = ? 
                    AND fecha_cita = ?
                    AND estado IN ('programada', 'confirmada')
                """, (id_medico, today))
                
                citas_hoy = cursor.fetchone()[0]
                
                if citas_hoy > 0:
                    return {'text': f'📋 <strong>Tienes {citas_hoy} citas para hoy.</strong> Puedes ver los detalles en <a href="/mis-citas" style="color: #1E8449; font-weight: 600;">Mis Citas</a>.'}
                else:
                    return {
                        'text': '✅ No tienes citas programadas para hoy. ¡Disfruta del día!'
                    }
            
            else:
                cursor.execute("""
                    SELECT COUNT(*)
                    FROM Citas
                    WHERE id_medico = ?
                    AND fecha_cita >= ?
                    AND estado IN ('programada', 'confirmada')
                """, (id_medico, today))
                
                citas_pendientes = cursor.fetchone()[0]
                
                if citas_pendientes > 0:
                    return {'text': f'📅 <strong>Tienes {citas_pendientes} citas pendientes.</strong> Ve toda tu agenda en <a href="/mis-citas" style="color: #1E8449; font-weight: 600;">Mis Citas</a>.'}
                else:
                    return {
                        'text': '✅ No tienes citas pendientes en este momento.'
                    }

    except Exception as e:
        logging.error(f"Error al obtener citas del médico: {e}")
        return {
            'text': '❌ Error al obtener la información de citas. Por favor, intenta más tarde.'
        }

def handle_doctor_help():
    """Proporciona ayuda al médico."""
    return {
        'text': '🆘 <strong>¿En qué puedo ayudarte?</strong><br><br>'
                'Puedes preguntarme sobre:<br>'
                '• "Mi horario de trabajo" 📅<br>'
                '• "Mis citas pendientes" 👥<br>'
                '• "Mis pacientes" 🏥<br>'
                '• "Mis estadísticas" 📊'
    }

def handle_doctor_thanks():
    """Maneja los agradecimientos."""
    return {
        'text': '¡De nada! 😊 Estoy aquí para ayudarte.'
    }

def handle_doctor_patients(current_user):
    """Proporciona información sobre los pacientes del médico."""
    conn = None
    try:
        conn = get_thread_safe_connection()
        if not conn:
            return {
                'text': '👥 Puedes ver tu lista de pacientes en <a href="/mis-pacientes" style="color: #1E8449; font-weight: 600;">Mis Pacientes</a>.'
            }
        
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(DISTINCT id_paciente) 
                FROM Citas 
                WHERE id_medico = (
                    SELECT id_medico FROM Medicos WHERE id_usuario = ?
                )
            """, (current_user.id_usuario,))
            
            total_pacientes = cursor.fetchone()[0]
            
            return {
                'text': f'👥 <strong>Total de pacientes:</strong> {total_pacientes}<br>'
                        f'Puedes ver el listado completo en <a href="/mis-pacientes" style="color: #1E8449; font-weight: 600;">Mis Pacientes</a>.'
            }
                
    except Exception as e:
        logging.error(f"Error al obtener pacientes del médico: {e}")
        return {
            'text': '👥 Puedes gestionar tus pacientes en <a href="/mis-pacientes" style="color: #1E8449; font-weight: 600;">Mis Pacientes</a>.'
        }

def handle_doctor_consultations(current_user):
    """Proporciona información sobre las consultas realizadas."""
    return {
        'text': '🏥 Puedes ver tu historial de consultas médicas en la sección <a href="/mis-consultas" style="color: #1E8449; font-weight: 600;">Mis Consultas</a>.'
    }

def handle_doctor_stats(current_user):
    """Proporciona estadísticas del médico."""
    conn = None
    try:
        conn = get_thread_safe_connection()
        if not conn:
            return {
                'text': '📊 Las estadísticas detalladas están disponibles en tu dashboard.'
            }
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user.id_usuario,))
            medico_row = cursor.fetchone()
            
            if not medico_row:
                return {'text': '❌ No se encontró tu perfil médico.'}
            
            id_medico = medico_row[0]
            today = date.today()
            inicio_mes = date(today.year, today.month, 1)
            
            cursor.execute("""
                SELECT COUNT(*) FROM Citas 
                WHERE id_medico = ? AND fecha_cita >= ? AND estado = 'completada'
            """, (id_medico, inicio_mes))
            citas_mes = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM Citas 
                WHERE id_medico = ? AND fecha_cita >= ? AND estado IN ('programada', 'confirmada')
            """, (id_medico, today))
            citas_pendientes = cursor.fetchone()[0]
            
            return {
                'text': f'📊 <strong>Estadísticas del mes:</strong><br>'
                        f'• Citas completadas: {citas_mes}<br>'
                        f'• Citas pendientes: {citas_pendientes}'
            }
                
    except Exception as e:
        logging.error(f"Error al obtener estadísticas del médico: {e}")
        return {
            'text': '📊 Puedes ver estadísticas detalladas en tu dashboard principal.'
        }

def handle_doctor_default_response():
    """Respuesta por defecto cuando no se entiende la pregunta."""
    return {
        'text': '🤔 No estoy seguro de entender tu pregunta. Puedes preguntarme sobre tu horario, citas, pacientes o estadísticas.'
    }

@chatbot_bp.route('/api/chatbot/response', methods=['POST'])
@login_required
def chatbot_response(current_user):
    """Endpoint principal para las respuestas del chatbot."""
    try:
        if _app_shutting_down:
            return jsonify({'text': '⚠️ El sistema se está cerrando. Por favor, intenta más tarde.'}), 503
        
        data = request.get_json()
        if not data:
            return jsonify({'text': '❌ Error: No se recibieron datos válidos.'}), 400
        
        message = data.get('message', '').lower().strip()
        chatbot_type = data.get('type', 'reception')

        if not message:
            return jsonify({'text': '📝 Por favor, escribe un mensaje.'}), 400

        # Seleccionar el tipo de chatbot
        if chatbot_type == 'admin':
            response = get_admin_response(message)
        elif chatbot_type == 'doctor':
            response = get_doctor_response(message, current_user)
        else:
            response = get_reception_response(message)
        
        return jsonify(response)
        
    except Exception as e:
        logging.error(f"Error en endpoint chatbot: {e}")
        return jsonify({
            'text': '❌ Error interno del servidor. Por favor, inténtalo de nuevo.'
        }), 500

@chatbot_bp.route('/api/public-chatbot/response', methods=['POST'])
def public_chatbot_response():
    """Endpoint público para el chatbot de la página principal."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'text': 'Error: No se recibieron datos.'}), 400
        
        message = data.get('message', '').lower().strip()
        if not message:
            return jsonify({'text': 'Por favor, escribe un mensaje.'}), 400

        response = get_public_response(message)
        return jsonify(response)

    except Exception as e:
        logging.error(f"Error en endpoint de chatbot público: {e}")
        return jsonify({'text': 'Lo siento, estoy teniendo problemas para conectarme. Inténtalo de nuevo más tarde.'}), 500