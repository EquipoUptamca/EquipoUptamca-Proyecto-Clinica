from flask import Blueprint, request, jsonify
from auth_middleware import login_required
from database import get_db_connection
from datetime import date
import logging

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports/activity', methods=['GET'])
@login_required
def get_activity_report(current_user):
    """
    Genera un reporte de actividad de citas (programadas, completadas, canceladas).
    Filtros: start_date, end_date.
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Se requieren fechas de inicio y fin'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # Consulta para la tabla detallada
            query = """
                SELECT 
                    c.fecha_cita, c.hora_cita, p.nombre_completo AS paciente_nombre, 
                    m.nombre_completo AS medico_nombre, e.nombre_especialidad, c.estado
                FROM Citas c
                LEFT JOIN Pacientes pac ON c.id_paciente = pac.id_paciente
                LEFT JOIN Usuarios p ON pac.id_usuario = p.id_usuario
                LEFT JOIN Medicos med ON c.id_medico = med.id_medico
                LEFT JOIN Usuarios m ON med.id_usuario = m.id_usuario
                LEFT JOIN Especialidades e ON med.especialidad = e.nombre_especialidad
                WHERE c.fecha_cita BETWEEN ? AND ?
                ORDER BY c.fecha_cita, c.hora_cita
            """
            cursor.execute(query, (start_date, end_date))
            
            detailed_data = [{
                'fecha': row.fecha_cita.strftime('%Y-%m-%d'),
                'hora': row.hora_cita.strftime('%H:%M'),
                'paciente': row.paciente_nombre or 'N/A',
                'medico': row.medico_nombre or 'N/A',
                'especialidad': row.nombre_especialidad or 'N/A',
                'estado': row.estado or 'pendiente'
            } for row in cursor.fetchall()]

            # Consulta para el gráfico resumen por estado
            summary_query = """
                SELECT estado, COUNT(*) as total
                FROM Citas
                WHERE fecha_cita BETWEEN ? AND ?
                GROUP BY estado
            """
            cursor.execute(summary_query, (start_date, end_date))
            
            summary_data = {row.estado or 'pendiente': row.total for row in cursor.fetchall()}

            # Consulta para el gráfico de serie temporal
            time_series_query = """
                SELECT fecha_cita, COUNT(*) as total
                FROM Citas
                WHERE fecha_cita BETWEEN ? AND ?
                GROUP BY fecha_cita
                ORDER BY fecha_cita
            """
            cursor.execute(time_series_query, (start_date, end_date))
            time_series_rows = cursor.fetchall()
            time_series_data = {
                'labels': [row.fecha_cita.strftime('%d/%m') for row in time_series_rows],
                'data': [row.total for row in time_series_rows]
            }

            return jsonify({
                'summary': summary_data,
                'time_series': time_series_data,
                'details': detailed_data
            })

    except Exception as e:
        logging.error(f"Error en reporte de actividad: {e}")
        return jsonify({'error': 'Error al generar el reporte de actividad'}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/appointment-compliance', methods=['GET'])
@login_required
def get_compliance_report(current_user):
    """
    Genera un reporte de cumplimiento de citas (asistencia vs. ausencias).
    Filtros: start_date, end_date.
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Se requieren fechas de inicio y fin'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            today_str = date.today().strftime('%Y-%m-%d')
            query = """
                SELECT 
                    c.fecha_cita, p.nombre_completo AS paciente_nombre, 
                    m.nombre_completo AS medico_nombre, c.estado
                FROM Citas c
                LEFT JOIN Pacientes pac ON c.id_paciente = pac.id_paciente
                LEFT JOIN Usuarios p ON pac.id_usuario = p.id_usuario
                LEFT JOIN Medicos med ON c.id_medico = med.id_medico
                LEFT JOIN Usuarios m ON med.id_usuario = m.id_usuario
                WHERE c.fecha_cita BETWEEN ? AND ?
            """
            cursor.execute(query, (start_date, end_date))
            
            rows = cursor.fetchall()
            
            summary = {'Completada': 0, 'Cancelada': 0, 'Ausente': 0, 'Programada': 0, 'Confirmada': 0}
            details = []

            for row in rows:
                final_status = row.estado
                if row.estado in ('programada', 'confirmada') and row.fecha_cita.strftime('%Y-%m-%d') < today_str:
                    final_status = 'Ausente'
                
                if final_status in summary:
                    summary[final_status] += 1
                else:
                    summary[final_status] = 1

                details.append({
                    'fecha': row.fecha_cita.strftime('%Y-%m-%d'),
                    'paciente': row.paciente_nombre or 'N/A',
                    'medico': row.medico_nombre or 'N/A',
                    'estado': final_status
                })

            return jsonify({'summary': summary, 'details': details})

    except Exception as e:
        logging.error(f"Error en reporte de cumplimiento: {e}")
        return jsonify({'error': 'Error al generar el reporte de cumplimiento'}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/new-patients', methods=['GET'])
@login_required
def get_new_patients_report(current_user):
    """
    Genera un reporte de nuevos pacientes registrados.
    Filtros: start_date, end_date.
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Se requieren fechas de inicio y fin'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            query = """
                SELECT 
                    u.nombre_completo, u.cedula, u.telefono, u.gmail, 
                    u.fecha_creacion, p.genero
                FROM Usuarios u
                JOIN Pacientes p ON u.id_usuario = p.id_usuario
                WHERE u.tipo_usuario = 'paciente' 
                AND CAST(u.fecha_creacion AS DATE) BETWEEN ? AND ?
                ORDER BY u.fecha_creacion DESC
            """
            cursor.execute(query, (start_date, end_date))
            rows = cursor.fetchall()

            patients_data = [{
                'nombre_completo': row.nombre_completo,
                'cedula': row.cedula,
                'telefono': row.telefono,
                'email': row.gmail,
                'fecha_registro': row.fecha_creacion.strftime('%Y-%m-%d %H:%M'),
                'genero': row.genero or 'No especificado'
            } for row in rows]

            # Consulta para el gráfico de tendencia
            time_series_query = """
                SELECT CAST(fecha_creacion AS DATE) as fecha, COUNT(*) as total
                FROM Usuarios 
                WHERE tipo_usuario = 'paciente' 
                AND CAST(fecha_creacion AS DATE) BETWEEN ? AND ?
                GROUP BY CAST(fecha_creacion AS DATE) 
                ORDER BY fecha
            """
            cursor.execute(time_series_query, (start_date, end_date))
            time_series_rows = cursor.fetchall()
            time_series_data = {
                'labels': [row.fecha.strftime('%d/%m') for row in time_series_rows],
                'data': [row.total for row in time_series_rows]
            }

            # Resumen por género - consulta separada para asegurar datos
            gender_query = """
                SELECT 
                    COALESCE(p.genero, 'No especificado') as genero,
                    COUNT(*) as total
                FROM Usuarios u
                JOIN Pacientes p ON u.id_usuario = p.id_usuario
                WHERE u.tipo_usuario = 'paciente' 
                AND CAST(u.fecha_creacion AS DATE) BETWEEN ? AND ?
                GROUP BY COALESCE(p.genero, 'No especificado')
            """
            cursor.execute(gender_query, (start_date, end_date))
            gender_rows = cursor.fetchall()
            
            # Inicializar con todos los géneros posibles
            gender_summary = {'Masculino': 0, 'Femenino': 0, 'No especificado': 0}
            
            # Actualizar con datos reales
            for row in gender_rows:
                genero = row.genero
                if genero in ['M', 'Masculino', 'masculino']:
                    gender_summary['Masculino'] = row.total
                elif genero in ['F', 'Femenino', 'femenino']:
                    gender_summary['Femenino'] = row.total
                else:
                    gender_summary['No especificado'] += row.total

            return jsonify({
                'details': patients_data, 
                'time_series': time_series_data, 
                'gender_summary': gender_summary,
                'total_pacientes': len(patients_data)
            })

    except Exception as e:
        logging.error(f"Error en reporte de nuevos pacientes: {e}")
        return jsonify({'error': 'Error al generar el reporte de nuevos pacientes'}), 500
    finally:
        if conn:
            conn.close()

@reports_bp.route('/api/reports/doctor-occupancy', methods=['GET'])
@login_required
def get_doctor_occupancy_report(current_user):
    """
    Genera un reporte de ocupación de horarios y carga de médicos.
    Filtros: start_date, end_date.
    """
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({'error': 'Se requieren fechas de inicio y fin'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Error de conexión a la base de datos'}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Datos para el Heatmap de horarios
            heatmap_query = """
                SELECT 
                    DATEPART(weekday, fecha_cita) as dia_semana_num,
                    DATEPART(hour, hora_cita) as hora,
                    COUNT(*) as total_citas
                FROM Citas
                WHERE fecha_cita BETWEEN ? AND ? AND estado != 'cancelada'
                GROUP BY DATEPART(weekday, fecha_cita), DATEPART(hour, hora_cita)
            """
            cursor.execute(heatmap_query, (start_date, end_date))
            heatmap_data = cursor.fetchall()

            # 2. Datos para el ranking de médicos
            ranking_query = """
                SELECT TOP 10
                    m.nombre_completo,
                    COUNT(c.id_cita) as total_citas
                FROM Citas c
                JOIN Medicos med ON c.id_medico = med.id_medico
                JOIN Usuarios m ON med.id_usuario = m.id_usuario
                WHERE c.fecha_cita BETWEEN ? AND ? AND c.estado != 'cancelada'
                GROUP BY m.nombre_completo
                ORDER BY total_citas DESC
            """
            cursor.execute(ranking_query, (start_date, end_date))
            ranking_rows = cursor.fetchall()
            
            ranking_data = {
                'labels': [row.nombre_completo for row in ranking_rows],
                'data': [row.total_citas for row in ranking_rows]
            }

            return jsonify({
                'heatmap': [{'day': row.dia_semana_num, 'hour': row.hora, 'count': row.total_citas} for row in heatmap_data],
                'ranking': ranking_data
            })

    except Exception as e:
        logging.error(f"Error en reporte de ocupación: {e}")
        return jsonify({'error': 'Error al generar el reporte de ocupación'}), 500
    finally:
        if conn:
            conn.close()