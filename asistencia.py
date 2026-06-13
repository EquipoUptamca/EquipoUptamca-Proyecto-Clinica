from flask import Blueprint, request, jsonify
import pyodbc
import logging
from datetime import datetime, date, time, timedelta
from database import get_db_connection
from auth_middleware import login_required, role_required

asistencias_bp = Blueprint('asistencia', __name__)
logger = logging.getLogger(__name__)

# Mapeo de días de la semana
DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

def obtener_horario_medico_hoy(id_medico):
    """Obtiene el horario del médico para el día actual"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor() as cursor:
            hoy = date.today()
            dia_actual_str = DIAS_SEMANA[hoy.weekday()]
            
            cursor.execute("""
                SELECT hora_inicio, hora_fin 
                FROM Horarios_disponibles 
                WHERE id_medico = ? AND dia_semana = ?
            """, (id_medico, dia_actual_str))
            
            horario = cursor.fetchone()
            return horario if horario else None
            
    except Exception as e:
        logger.error(f"Error al obtener horario del médico {id_medico}: {str(e)}")
        return None
    finally:
        if conn:
            conn.close()

def marcar_ausentes_automatico():
    """Función para marcar automáticamente como ausentes a médicos que no registraron asistencia"""
    conn = get_db_connection()
    if not conn:
        return False
    
    try:
        with conn.cursor() as cursor:
            hoy = date.today().strftime('%Y-%m-%d')
            dia_actual_str = DIAS_SEMANA[date.today().weekday()]
            ahora = datetime.now().time()
            
            # Obtener todos los médicos con horario para hoy
            cursor.execute("""
                SELECT DISTINCT m.id_medico, u.nombre_completo, h.hora_fin
                FROM Medicos m
                JOIN Usuarios u ON m.id_usuario = u.id_usuario
                JOIN Horarios_disponibles h ON m.id_medico = h.id_medico
                WHERE h.dia_semana = ?
            """, (dia_actual_str,))
            
            medicos_con_horario = cursor.fetchall()
            ausentes_marcados = 0
            
            for medico in medicos_con_horario:
                id_medico, nombre_medico, hora_fin_turno = medico
                
                # Verificar si ya tiene registro de asistencia hoy
                cursor.execute("""
                    SELECT id_asistencia, estado_asistencia 
                    FROM Asistencias 
                    WHERE id_medico = ? AND fecha = ?
                """, (id_medico, hoy))
                
                asistencia_existente = cursor.fetchone()
                
                # Si no tiene asistencia y ya pasó su horario, marcar como ausente
                if not asistencia_existente and hora_fin_turno and ahora > hora_fin_turno:
                    cursor.execute("""
                        INSERT INTO Asistencias (id_medico, fecha, estado_asistencia)
                        VALUES (?, ?, ?)
                    """, (id_medico, hoy, 'Ausente'))
                    ausentes_marcados += 1
                    logger.info(f"Médico {nombre_medico} (ID: {id_medico}) marcado automáticamente como Ausente")
                
                # Si tiene asistencia pero está como 'Asistió' o 'Tarde' y no marcó salida, verificar si debe cambiar a 'Ausente'
                elif asistencia_existente and asistencia_existente[1] in ['Asistió', 'Tarde']:
                    # Verificar si no marcó salida y ya pasó mucho tiempo después de su horario
                    cursor.execute("""
                        SELECT hora_salida FROM Asistencias WHERE id_asistencia = ?
                    """, (asistencia_existente[0],))
                    
                    hora_salida = cursor.fetchone()[0]
                    if not hora_salida and hora_fin_turno:
                        # Si pasó más de 2 horas después de su horario sin marcar salida, marcar como ausente
                        hora_limite_salida = datetime.combine(date.today(), hora_fin_turno) + timedelta(hours=2)
                        if datetime.now() > hora_limite_salida:
                            cursor.execute("""
                                UPDATE Asistencias 
                                SET estado_asistencia = 'Ausente' 
                                WHERE id_asistencia = ?
                            """, (asistencia_existente[0],))
                            logger.info(f"Médico {nombre_medico} (ID: {id_medico}) actualizado a Ausente por no registrar salida")
            
            conn.commit()
            logger.info(f"Proceso automático de ausentes completado. {ausentes_marcados} médicos marcados como ausentes.")
            return True
            
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en marcado automático de ausentes: {str(e)}")
        return False
    finally:
        if conn:
            conn.close()

# Endpoint para registrar una nueva asistencia (marcar entrada)
@asistencias_bp.route('/api/asistencia', methods=['POST'])
@login_required
def registrar_asistencia(current_user):
    """Registra la entrada de un médico para una fecha específica."""
    data = request.json
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            id_medico = None
            # Si es admin, recepcionista o soporte, el id_medico viene en el request
            if current_user['id_rol'] in [1, 3, 5]:
                id_medico = data.get('id_medico')
                if not id_medico:
                    return jsonify({'error': 'El campo id_medico es requerido para este rol'}), 400
            # Si es médico, se usa su propio id
            elif current_user['id_rol'] == 2:
                cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user['id_usuario'],))
                medico_row = cursor.fetchone()
                if not medico_row:
                    return jsonify({'error': 'Perfil de médico no encontrado'}), 404
                id_medico = medico_row[0]
            
            if not id_medico:
                 return jsonify({'error': 'No se pudo determinar el médico para registrar la asistencia'}), 400

            fecha = data.get('fecha', date.today().strftime('%Y-%m-%d'))
            hora_entrada = data.get('hora_entrada')
            
            # CORRECCIÓN: Usar valores válidos según la CHECK constraint
            estado_asistencia = data.get('estado_asistencia', 'Asistió')  # Valor por defecto válido

            # Lógica para determinar automáticamente "Tarde" vs "Asistió"
            if hora_entrada and estado_asistencia == 'Asistió':
                try:
                    hora_entrada_dt = datetime.strptime(hora_entrada, '%H:%M:%S').time()
                    
                    # Obtener horario del médico para hoy
                    horario_hoy = obtener_horario_medico_hoy(id_medico)
                    if horario_hoy and horario_hoy[0]:  # hora_inicio
                        hora_inicio_turno = horario_hoy[0]
                        # Si llegó después de su hora de inicio + 15 minutos, es "Tarde"
                        margen_tardanza = datetime.combine(date.today(), hora_inicio_turno) + timedelta(minutes=15)
                        if datetime.now().time() > margen_tardanza.time():
                            estado_asistencia = 'Tarde'
                except ValueError:
                    # Si hay error en el formato de hora, mantener 'Asistió'
                    pass

            if not all([hora_entrada]):
                return jsonify({'error': 'Faltan campos requeridos: hora_entrada'}), 400

            # Verificar si ya existe un registro para ese médico en esa fecha
            cursor.execute("SELECT id_asistencia FROM Asistencias WHERE id_medico = ? AND fecha = ?", (id_medico, fecha))
            existing_asistencia = cursor.fetchone()
            
            if existing_asistencia:
                # Actualizar registro existente
                cursor.execute("""
                    UPDATE Asistencias 
                    SET hora_entrada = ?, estado_asistencia = ?
                    WHERE id_asistencia = ?
                """, (hora_entrada, estado_asistencia, existing_asistencia[0]))
                asistencia_id = existing_asistencia[0]
            else:
                # Insertar nuevo registro
                cursor.execute("""
                    INSERT INTO Asistencias (id_medico, fecha, hora_entrada, estado_asistencia)
                    OUTPUT INSERTED.id_asistencia
                    VALUES (?, ?, ?, ?)
                """, (id_medico, fecha, hora_entrada, estado_asistencia))
                asistencia_id = cursor.fetchone()[0]
            
            conn.commit()

            return jsonify({
                'message': 'Asistencia registrada exitosamente',
                'id_asistencia': asistencia_id,
                'estado_asistencia': estado_asistencia
            }), 201

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al registrar asistencia: {str(e)}")
        return jsonify({'error': 'Error al registrar la asistencia'}), 500
    finally:
        if conn:
            conn.close()

# Endpoint para que un médico obtenga su asistencia del día
@asistencias_bp.route('/api/asistencia/hoy', methods=['GET'])
@login_required
@role_required(2) # Solo para médicos
def get_asistencia_hoy(current_user):
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user['id_usuario'],))
            medico_row = cursor.fetchone()
            if not medico_row:
                return jsonify({'error': 'Perfil de médico no encontrado'}), 404
            id_medico = medico_row[0]

            today = date.today().strftime('%Y-%m-%d')
            dia_actual_str = DIAS_SEMANA[date.today().weekday()]

            cursor.execute("""
                SELECT a.id_asistencia, a.hora_entrada, a.hora_salida, a.estado_asistencia, h.hora_fin
                FROM Asistencias a
                LEFT JOIN Horarios_disponibles h ON a.id_medico = h.id_medico AND h.dia_semana = ?
                WHERE a.id_medico = ? AND a.fecha = ?
            """, (dia_actual_str, id_medico, today))
            
            asistencia = cursor.fetchone()

            if asistencia:
                return jsonify({
                    'id_asistencia': asistencia[0],
                    'hora_entrada': asistencia[1].strftime('%H:%M:%S') if asistencia[1] else None,
                    'hora_salida': asistencia[2].strftime('%H:%M:%S') if asistencia[2] else None,
                    'estado_asistencia': asistencia[3],
                    'horario_fin_hoy': asistencia[4].strftime('%H:%M:%S') if asistencia[4] else None
                })
            return jsonify(None) # No hay registro de asistencia para hoy
    finally:
        conn.close()

# Endpoint para obtener registros de asistencia (con filtros)
@asistencias_bp.route('/api/asistencia', methods=['GET'])
@login_required
@role_required(1, 3, 5) # Admin, Recepcionista y Soporte
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
def actualizar_asistencia(current_user, id_asistencia):
    """Actualiza un registro de asistencia, útil para marcar la hora de salida."""
    data = request.json
    if not data or 'hora_salida' not in data:
        return jsonify({'error': 'Se requiere el campo hora_salida'}), 400

    hora_salida_str = data['hora_salida']

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Si es médico, validar que la hora de salida sea posterior a su horario
            if current_user['id_rol'] == 2:
                cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user['id_usuario'],))
                medico_row = cursor.fetchone()
                if not medico_row:
                    return jsonify({'error': 'Perfil de médico no encontrado'}), 404
                id_medico = medico_row[0]

                dia_actual_str = DIAS_SEMANA[date.today().weekday()]

                cursor.execute("SELECT hora_fin FROM Horarios_disponibles WHERE id_medico = ? AND dia_semana = ?", (id_medico, dia_actual_str))
                horario_fin_row = cursor.fetchone()

                if horario_fin_row and horario_fin_row[0]:
                    hora_fin_turno = horario_fin_row[0]
                    hora_salida_dt = datetime.strptime(hora_salida_str, '%H:%M').time()
                    
                    # Comparamos solo si la hora de salida es anterior a la hora de fin de turno
                    if hora_salida_dt < hora_fin_turno:
                        return jsonify({
                            'error': f'No puede marcar la salida antes de que finalice su turno a las {hora_fin_turno.strftime("%H:%M")}.'
                        }), 403 # Forbidden

            # Proceder con la actualización
            cursor.execute("UPDATE Asistencias SET hora_salida = ? WHERE id_asistencia = ?", (hora_salida_str, id_asistencia))
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

# Endpoint para marcar automáticamente ausentes (ejecución manual por admin)
@asistencias_bp.route('/api/asistencia/marcar-ausentes', methods=['POST'])
@login_required
@role_required(1) # Solo Admin
def marcar_ausentes_automatico_endpoint(current_user):
    """Endpoint para ejecutar manualmente el marcado automático de ausentes"""
    try:
        resultado = marcar_ausentes_automatico()
        if resultado:
            return jsonify({'message': 'Proceso de marcado automático de ausentes ejecutado exitosamente'}), 200
        else:
            return jsonify({'error': 'Error al ejecutar el proceso automático de ausentes'}), 500
    except Exception as e:
        logger.error(f"Error en endpoint de marcado automático: {str(e)}")
        return jsonify({'error': 'Error interno del servidor'}), 500

# Endpoint para verificar y marcar ausentes (para uso del frontend)
@asistencias_bp.route('/api/asistencia/verificar-ausentes', methods=['GET'])
@login_required
def verificar_y_marcar_ausentes(current_user):
    """Verifica y marca ausentes para el médico actual"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            today = date.today().strftime('%Y-%m-%d')
            dia_actual_str = DIAS_SEMANA[date.today().weekday()]
            ahora = datetime.now().time()
            
            # Para médicos: verificar su propio estado
            if current_user['id_rol'] == 2:
                cursor.execute("SELECT id_medico FROM Medicos WHERE id_usuario = ?", (current_user['id_usuario'],))
                medico_row = cursor.fetchone()
                if not medico_row:
                    return jsonify({'error': 'Perfil de médico no encontrado'}), 404
                
                id_medico = medico_row[0]
                
                # Verificar horario de fin
                cursor.execute("SELECT hora_fin FROM Horarios_disponibles WHERE id_medico = ? AND dia_semana = ?", 
                             (id_medico, dia_actual_str))
                horario_fin_row = cursor.fetchone()
                
                if horario_fin_row and horario_fin_row[0]:
                    hora_fin_turno = horario_fin_row[0]
                    
                    # Verificar si ya tiene asistencia
                    cursor.execute("SELECT estado_asistencia FROM Asistencias WHERE id_medico = ? AND fecha = ?", 
                                 (id_medico, today))
                    asistencia_row = cursor.fetchone()
                    
                    # Si no tiene asistencia y ya pasó su horario, marcar como ausente
                    if not asistencia_row and ahora > hora_fin_turno:
                        cursor.execute("""
                            INSERT INTO Asistencias (id_medico, fecha, estado_asistencia)
                            VALUES (?, ?, ?)
                        """, (id_medico, today, 'Ausente'))
                        conn.commit()
                        return jsonify({
                            'estado': 'ausente_automatico',
                            'message': 'Has sido marcado automáticamente como ausente por no registrar tu asistencia.'
                        })
                    
                    elif asistencia_row:
                        return jsonify({
                            'estado': asistencia_row[0],
                            'message': f'Tu estado de asistencia hoy es: {asistencia_row[0]}'
                        })
            
            return jsonify({'estado': 'pendiente', 'message': 'Aún tienes tiempo para registrar tu asistencia.'})

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al verificar ausentes: {str(e)}")
        return jsonify({'error': 'Error al verificar estado de asistencia'}), 500
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
            return jsonify({'message': 'Registro de asistencia eliminado exitosamente'}), 200

    except pyodbc.Error as e:
        conn.rollback()
        logger.error(f"Error en base de datos al eliminar asistencia: {str(e)}")
        return jsonify({'error': 'Error al eliminar la asistencia'}), 500
    finally:
        if conn:
            conn.close()