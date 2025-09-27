from flask import Blueprint, request, jsonify, send_file
import pyodbc
import logging
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from auth_middleware import login_required
from database import get_db_connection
from auth_middleware import role_required
import io

schedules_bp = Blueprint('schedules', __name__)

def check_schedule_conflict(cursor, id_medico, dia_semana, hora_inicio, hora_fin, exclude_id=None):
    """Verifica si hay conflictos de horario para el médico"""
    query = """
                SELECT id_horario
                FROM Horarios_disponibles
                WHERE id_medico = ?
                AND dia_semana = ?
                AND (
                    (hora_inicio < ? AND hora_fin > ?)
                    OR (hora_inicio >= ? AND hora_inicio < ?)
                    OR (hora_fin > ? AND hora_fin <= ?)
                )
            """
    params = [id_medico, dia_semana, hora_fin, hora_inicio,
                hora_inicio, hora_fin, hora_inicio, hora_fin]

    if exclude_id:
        query += " AND id_horario != ?"
        params.append(exclude_id)

    cursor.execute(query, params)
    return cursor.fetchone() is not None

def validate_schedule_input(id_medico, dia_semana, hora_inicio, hora_fin):
    """Valida los datos de entrada para un horario."""
    try:
        if not (isinstance(id_medico, int) and id_medico > 0): return False
        if not (isinstance(dia_semana, int) and 1 <= dia_semana <= 7): return False

        # Manejar de forma robusta los formatos HH:MM y HH:MM:SS
        time_format_start = '%H:%M:%S' if str(hora_inicio).count(':') == 2 else '%H:%M'
        start = datetime.strptime(str(hora_inicio), time_format_start).time()

        time_format_end = '%H:%M:%S' if str(hora_fin).count(':') == 2 else '%H:%M'
        end = datetime.strptime(str(hora_fin), time_format_end).time()

        return start < end
    except (ValueError, TypeError):
        return False

DAY_NAMES = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
}

def validate_day_of_week(day):
    """Validate that day is an integer between 1-7"""
    if not isinstance(day, int):
        try:
            day = int(day)
        except (ValueError, TypeError):
            return False
    return 1 <= day <= 7

# Endpoint para obtener todos los horarios de un médico
@schedules_bp.route('/api/horarios/<int:id_medico>', methods=['GET'])
@login_required
def get_horarios_medico(current_user, id_medico):
    """Obtiene todos los horarios de un médico específico"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id_horario, id_medico, dia_semana, hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_medico = ?
                ORDER BY CASE dia_semana 
                    WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 
                    WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 
                    WHEN 'Domingo' THEN 7 END, hora_inicio
            """, (id_medico,))

            schedules = []
            day_name_to_num = {v: k for k, v in DAY_NAMES.items()}
            for row in cursor.fetchall():
                schedules.append({
                    'id_horario': row[0],
                    'id_medico': row[1],
                    'dia_semana_num': day_name_to_num.get(row[2]),
                    'dia_semana': row[2],
                    'hora_inicio': str(row[3])[:5],
                    'hora_fin': str(row[4])[:5]
                })
            
            schedules.sort(key=lambda x: x['dia_semana_num'])
            return jsonify(schedules)

    except pyodbc.Error as e:
        logging.error(f"Error al obtener horarios: {str(e)}")
        return jsonify({'error': 'Error al obtener horarios'}), 500
    finally:
        conn.close()

# Endpoint para crear un nuevo horario
@schedules_bp.route('/api/horarios', methods=['POST'])
@login_required
@role_required(1, 3) # Admin y Recepción
def create_horario(current_user):
    """Crea un nuevo horario para un médico"""
    data = request.json
    required_fields = ['id_medico', 'dia_semana', 'hora_inicio', 'hora_fin']

    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    # Ensure dia_semana is an integer
    try:
        dia_semana = int(data['dia_semana'])
    except (ValueError, TypeError):
        return jsonify({
            'error': 'Día de la semana inválido',
            'detalle': 'Debe ser un número entre 1 (Lunes) y 7 (Domingo).',
            'valor_recibido': data['dia_semana']
        }), 400

    if not validate_day_of_week(dia_semana):
        return jsonify({
            'error': 'Día de la semana inválido',
            'detalle': 'Debe ser un número entre 1 (Lunes) y 7 (Domingo).',
            'valor_recibido': dia_semana
        }), 400

    dia_semana_str = DAY_NAMES.get(dia_semana)
    if not dia_semana_str:
        return jsonify({'error': 'Número de día de la semana inválido.'}), 400

    # Validar el resto de los datos
    if not validate_schedule_input(data['id_medico'], dia_semana,
                                 data['hora_inicio'], data['hora_fin']):
        return jsonify({'error': 'Datos de horario inválidos'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Verificar conflictos
            if check_schedule_conflict(cursor, data['id_medico'], dia_semana_str, data['hora_inicio'], data['hora_fin']):
                return jsonify({'error': 'Conflicto de horarios detectado'}), 400

            cursor.execute("""
                INSERT INTO Horarios_disponibles 
                (id_medico, dia_semana, hora_inicio, hora_fin)
                OUTPUT INSERTED.id_horario
                VALUES (?, ?, ?, ?)
            """, (data['id_medico'], dia_semana_str, data['hora_inicio'], data['hora_fin']))

            schedule_id = cursor.fetchone()[0]
            conn.commit()

            return jsonify({
                'id_horario': schedule_id,
                'message': 'Horario creado exitosamente',
                'dia_semana_num': dia_semana,
                'dia_semana': dia_semana_str
            }), 201

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al crear horario: {str(e)}. Datos enviados: {data}")
        return jsonify({'error': 'Error al crear horario en la base de datos', 'detalle': str(e)}), 500
    finally:
        conn.close()

# Endpoint para actualizar un horario
@schedules_bp.route('/api/horarios/<int:id_horario>', methods=['PUT'])
@login_required
@role_required(1, 3) # Admin y Recepción
def update_horario(current_user, id_horario):
    """Actualiza un horario existente"""
    if not request.is_json:
        return jsonify({'error': 'Se esperaba contenido tipo JSON'}), 400

    data = request.get_json()
    required_fields = ['dia_semana', 'hora_inicio', 'hora_fin']

    # Campos requeridos para actualización
    update_fields = ['dia_semana', 'hora_inicio', 'hora_fin']
    if not any(field in data for field in update_fields):
        return jsonify({
            'error': 'Se requiere al menos un campo para actualizar',
            'campos_posibles': update_fields
        }), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Obtener el horario actual
            cursor.execute("""
                SELECT id_medico, dia_semana, hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_horario = ?
            """, (id_horario,))
            
            current = cursor.fetchone()
            if not current:
                return jsonify({'error': 'Horario no encontrado'}), 404

            current_doctor_id = current[0]
            # Convert day name back to number for internal logic if needed
            day_name_to_num = {v: k for k, v in DAY_NAMES.items()}
            current_day_num = day_name_to_num.get(current[1], 0)

            current_values = {
                'dia_semana': current_day_num,
                'hora_inicio': str(current[2]),
                'hora_fin': str(current[3])
            }

            # Preparar valores actualizados
            updated_values = current_values.copy()
            
            try:
                # Actualizar día si se proporcionó
                if 'dia_semana' in data:
                    dia_semana = data['dia_semana']
                    if isinstance(dia_semana, (str, int)) and str(dia_semana).isdigit():
                        updated_values['dia_semana'] = int(dia_semana)
                    else:
                        raise ValueError("El día debe ser un número entre 1-7")
                
                dia_semana_str = DAY_NAMES.get(updated_values['dia_semana'])

                # Actualizar horas si se proporcionaron
                if 'hora_inicio' in data:
                    updated_values['hora_inicio'] = str(data['hora_inicio'])
                
                if 'hora_fin' in data:
                    updated_values['hora_fin'] = str(data['hora_fin'])

                # Validar día de la semana
                if not validate_day_of_week(updated_values['dia_semana']):
                    raise ValueError("Día de la semana debe ser un número entre 1 (Lunes) y 7 (Domingo)")

                # Validar formato de horas
                if not all(':' in t for t in [updated_values['hora_inicio'], updated_values['hora_fin']]):
                    raise ValueError("Las horas deben tener formato HH:MM o HH:MM:SS")

            except ValueError as e:
                return jsonify({
                    'error': 'Datos inválidos',
                    'detalle': str(e),
                    'valores_recibidos': {
                        'dia_semana': data.get('dia_semana'),
                        'hora_inicio': data.get('hora_inicio'),
                        'hora_fin': data.get('hora_fin')
                    },
                    'valores_actuales': current_values
                }), 400

            # Validar lógica de horario
            if not validate_schedule_input(
                current_doctor_id,
                updated_values['dia_semana'],
                updated_values['hora_inicio'],
                updated_values['hora_fin']
            ):
                return jsonify({
                    'error': 'Horario inválido',
                    'detalle': 'La hora de inicio debe ser anterior a la hora de fin'
                }), 400

            # Verificar conflictos
            if check_schedule_conflict(cursor,
                current_doctor_id,
                dia_semana_str,
                updated_values['hora_inicio'],
                updated_values['hora_fin'],
                id_horario
            ):
                return jsonify({
                    'error': 'Conflicto de horario',
                    'detalle': 'El horario se superpone con otro horario existente'
                }), 400

            # Actualizar en la base de datos
            cursor.execute("""
                UPDATE Horarios_disponibles
                SET dia_semana = ?, hora_inicio = ?, hora_fin = ?
                WHERE id_horario = ?
            """, (
                dia_semana_str,
                updated_values['hora_inicio'],
                updated_values['hora_fin'],
                id_horario
            ))

            conn.commit()

            if cursor.rowcount > 0:
                return jsonify({
                    'message': 'Horario actualizado correctamente',
                    'horario': {
                        'id_horario': id_horario,
                        'dia_semana': dia_semana_str,
                        'hora_inicio': updated_values['hora_inicio'],
                        'hora_fin': updated_values['hora_fin']
                    }
                })
            return jsonify({'error': 'No se realizaron cambios en el horario'}), 404

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al actualizar horario {id_horario}: {str(e)}")
        return jsonify({
            'error': 'Error de base de datos',
            'detalle': str(e)
        }), 500
    finally:
        conn.close()


# Endpoint para eliminar un horario
@schedules_bp.route('/api/horarios/<int:id_horario>', methods=['DELETE'])
@login_required
@role_required(1, 3) # Admin y Recepción
def delete_horario(current_user, id_horario):
    """Elimina un horario"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                DELETE FROM Horarios_disponibles
                WHERE id_horario = ?
            """, (id_horario,))

            conn.commit()

            if cursor.rowcount > 0:
                return jsonify({'message': 'Horario eliminado correctamente'})
            else:
                return jsonify({'error': 'Horario no encontrado'}), 404

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al eliminar horario: {str(e)}")
        return jsonify({'error': 'Error al eliminar horario'}), 500
    finally:
        conn.close()

# Endpoint para obtener la vista semanal de horarios
@schedules_bp.route('/api/horarios/<int:id_medico>/semanal', methods=['GET'])
@login_required
def get_horarios_semanal(current_user, id_medico):
    """Obtiene el horario semanal organizado por día"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id_horario, dia_semana, hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_medico = ?
                ORDER BY hora_inicio
            """, (id_medico,))

            schedules = cursor.fetchall()
            weekly_schedule = {i: [] for i in range(1, 8)}  # Días 1-7
            day_name_to_num = {v: k for k, v in DAY_NAMES.items()}

            for schedule in schedules:
                day_str = schedule[1]
                day_num = day_name_to_num.get(day_str)
                if day_num and 1 <= day_num <= 7:
                    weekly_schedule[day_num].append({
                        'id_horario': schedule[0],
                        'hora_inicio': str(schedule[2])[:8],
                        'hora_fin': str(schedule[3])[:8]
                    })

            return jsonify(weekly_schedule)

    except pyodbc.Error as e:
        logging.error(f"Error al obtener horario semanal: {str(e)}")
        return jsonify({'error': 'Error al obtener horario semanal'}), 500
    except ValueError as e:
        logging.error(f"Error de valor en horario semanal: {str(e)}")
        return jsonify({'error': 'Error de datos en horario semanal'}), 500
    finally:
        conn.close()

# Endpoint para verificar slots disponibles
@schedules_bp.route('/api/horarios/<int:id_medico>/slots', methods=['GET'])
@login_required
def get_available_slots(current_user, id_medico):
    """Obtiene slots de tiempo disponibles para un médico en un día específico"""
    dia_semana = request.args.get('dia_semana', type=int)
    duracion_str = request.args.get('duracion', '30') # Duración en minutos

    if not dia_semana or not 1 <= dia_semana <= 7:
        return jsonify({'error': 'Día de la semana inválido'}), 400
    
    day_name = DAY_NAMES.get(dia_semana)
    if not day_name:
        return jsonify({'error': 'Día de la semana inválido'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_medico = ? AND dia_semana = ?
                ORDER BY hora_inicio
            """, (id_medico, day_name))

            schedules = cursor.fetchall()
            available_slots = []

            for schedule in schedules:
                start_time = schedule[0]
                end_time = schedule[1]

                current_time = datetime.combine(datetime.today(), start_time)
                end_datetime = datetime.combine(datetime.today(), end_time)

                while current_time + timedelta(minutes=int(duracion_str)) <= end_datetime:
                    available_slots.append(current_time.strftime('%H:%M'))
                    current_time += timedelta(minutes=int(duracion_str))

            return jsonify(sorted(available_slots))

    except pyodbc.Error as e:
        logging.error(f"Error al obtener slots disponibles: {str(e)}")
        return jsonify({'error': 'Error al obtener slots disponibles'}), 500
    finally:
        conn.close()

# Endpoint para copiar horarios de un médico a otro
@schedules_bp.route('/api/horarios/copy', methods=['POST'])
@login_required
@role_required(1) # Solo Admins pueden copiar horarios
def copy_schedules(current_user):
    """Copia todos los horarios de un médico a otro."""
    data = request.json
    source_doctor_id = data.get('source_doctor_id')
    target_doctor_id = data.get('target_doctor_id')
    overwrite = data.get('overwrite', False)

    if not source_doctor_id or not target_doctor_id:
        return jsonify({'error': 'Se requieren los IDs de los médicos de origen y destino.'}), 400

    if source_doctor_id == target_doctor_id:
        return jsonify({'error': 'El médico de origen y destino no pueden ser el mismo.'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Obtener los horarios del médico de origen
            cursor.execute(
                "SELECT dia_semana, hora_inicio, hora_fin FROM Horarios_disponibles WHERE id_medico = ?",
                (source_doctor_id,)
            )
            source_schedules = cursor.fetchall()

            if not source_schedules:
                return jsonify({'error': 'El médico de origen no tiene horarios para copiar.'}), 404

            # 2. Si se debe sobrescribir, eliminar los horarios del médico de destino
            if overwrite:
                cursor.execute("DELETE FROM Horarios_disponibles WHERE id_medico = ?", (target_doctor_id,))

            # 3. Insertar los nuevos horarios
            copied_count = 0
            for schedule in source_schedules:
                # Si no se sobrescribe, se debe verificar si hay conflicto.
                if not overwrite:
                    if check_schedule_conflict(cursor, target_doctor_id, schedule.dia_semana, str(schedule.hora_inicio), str(schedule.hora_fin)):
                        continue # Saltar este horario si hay conflicto

                cursor.execute(
                    "INSERT INTO Horarios_disponibles (id_medico, dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)",
                    (target_doctor_id, schedule.dia_semana, schedule.hora_inicio, schedule.hora_fin)
                )
                copied_count += 1

            conn.commit()
            return jsonify({'message': f'Se copiaron {copied_count} de {len(source_schedules)} horarios exitosamente.'}), 200

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al copiar horarios: {str(e)}")
        return jsonify({'error': 'Error en la base de datos al copiar horarios', 'detalle': str(e)}), 500
    finally:
        conn.close()

# Endpoint para eliminar TODOS los horarios de un médico
@schedules_bp.route('/api/horarios/medico/<int:id_medico>', methods=['DELETE'])
@login_required
@role_required(1) # Solo Admins
def delete_all_horarios_medico(current_user, id_medico):
    """Elimina todos los horarios de un médico específico."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Contamos cuántos horarios se van a eliminar para el mensaje de respuesta
            cursor.execute("SELECT COUNT(*) FROM Horarios_disponibles WHERE id_medico = ?", (id_medico,))
            count = cursor.fetchone()[0]

            if count == 0:
                return jsonify({'message': 'El médico seleccionado no tiene horarios para eliminar.'}), 200

            # Eliminar los horarios
            cursor.execute("DELETE FROM Horarios_disponibles WHERE id_medico = ?", (id_medico,))
            conn.commit()

            return jsonify({'message': f'Se eliminaron {count} horarios del médico exitosamente.'}), 200

    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error al eliminar todos los horarios del médico {id_medico}: {str(e)}")
        return jsonify({'error': 'Error en la base de datos al eliminar los horarios', 'detalle': str(e)}), 500
    finally:
        conn.close()

# Endpoint para exportar horarios a PDF
@schedules_bp.route('/api/horarios/<int:id_medico>/export/pdf', methods=['GET'])
@login_required
def export_schedules_pdf(current_user, id_medico):
    """Genera un PDF con los horarios de un médico."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()

        with conn.cursor() as cursor:
            cursor.execute("SELECT u.nombre_completo FROM Usuarios u JOIN Medicos m ON u.id_usuario = m.id_usuario WHERE m.id_medico = ?", (id_medico,))
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return jsonify({'error': 'Médico no encontrado'}), 404
            doctor_name = doctor_row[0]

            cursor.execute("SELECT dia_semana, hora_inicio, hora_fin FROM Horarios_disponibles WHERE id_medico = ? ORDER BY CASE dia_semana WHEN 'Lunes' THEN 1 WHEN 'Martes' THEN 2 WHEN 'Miércoles' THEN 3 WHEN 'Jueves' THEN 4 WHEN 'Viernes' THEN 5 WHEN 'Sábado' THEN 6 ELSE 7 END, hora_inicio", (id_medico,))
            schedules = cursor.fetchall()

            if not schedules:
                return jsonify({'error': 'El médico no tiene horarios para exportar.'}), 404

            elements.append(Paragraph(f"Horarios para: {doctor_name}", styles['h2']))
            elements.append(Paragraph(f"Generado el: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
            elements.append(Spacer(1, 12))

            table_data = [['Día', 'Hora de Inicio', 'Hora de Fin']]
            for row in schedules:
                table_data.append([row.dia_semana, str(row.hora_inicio)[:5], str(row.hora_fin)[:5]])

            table = Table(table_data)
            style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ])
            table.setStyle(style)
            elements.append(table)

            doc.build(elements)
            buffer.seek(0)

            return send_file(
                buffer,
                as_attachment=True,
                download_name=f'horarios_{doctor_name.replace(" ", "_")}.pdf',
                mimetype='application/pdf'
            )

    except Exception as e:
        logging.error(f"Error al exportar PDF: {str(e)}")
        return jsonify({'error': 'Error interno al generar el PDF'}), 500
    finally:
        conn.close()

@schedules_bp.route('/api/doctor/my-schedule', methods=['GET'])
@login_required
@role_required(2) # Solo para médicos
def get_my_schedule(current_user):
    """Obtiene el horario semanal del médico que ha iniciado sesión."""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT id_medico FROM Medicos WHERE id_usuario = ?
            """, (current_user.get('id_usuario'),))
            doctor_row = cursor.fetchone()
            if not doctor_row:
                return jsonify({'error': 'Perfil de médico no encontrado para este usuario.'}), 404
            doctor_id = doctor_row.id_medico
            cursor.execute("""
                SELECT id_horario, dia_semana, hora_inicio, hora_fin
                FROM Horarios_disponibles
                WHERE id_medico = ?
                ORDER BY dia_semana, hora_inicio
            """, (doctor_id,))

            schedules = cursor.fetchall()
            
            weekly_schedule = {day_name: [] for day_name in DAY_NAMES.values()}

            for schedule in schedules:
                day_str = schedule[1]
                if day_str in weekly_schedule:
                    weekly_schedule[day_str].append({
                        'id_horario': schedule[0],
                        'hora_inicio': str(schedule[2]),
                        'hora_fin': str(schedule[3])
                    })

            return jsonify(weekly_schedule)

    except pyodbc.Error as e:
        logging.error(f"Error al obtener mi horario semanal: {str(e)}")
        return jsonify({'error': 'Error al obtener el horario semanal'}), 500
    finally:
        conn.close()
