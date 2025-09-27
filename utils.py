from datetime import datetime, time, timedelta
import pyodbc
import logging
from database import get_db_connection

def validate_schedule_input(doctor_id: int, day_of_week: int, start_time: str, end_time: str) -> bool:
    """Valida los parámetros de entrada para horarios"""
    try:
        # Validar día de la semana
        if not 1 <= day_of_week <= 7:
            return False
        
        # Validar formato y lógica de tiempo
        start = datetime.strptime(start_time, '%H:%M').time()
        end = datetime.strptime(end_time, '%H:%M').time()
        
        if start >= end:
            return False
        
        # Validar horarios laborales razonables (6 AM a 10 PM)
        if start < time(6, 0) or end > time(22, 0):
            return False
        
        return True
        
    except ValueError:
        return False

def check_schedule_conflict(doctor_id, dia_semana, hora_inicio, hora_fin, exclude_id=None):
    """Check if a schedule conflicts with existing schedules"""
    conn = get_db_connection()
    if not conn:
        return True  # Assume conflict if we can't check
    
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT COUNT(*) 
                FROM horarios_disponibles
                WHERE id_medico = ? 
                AND dia_semana = ? 
                AND (
                    (? < hora_fin AND ? > hora_inicio)
                )
            """
            params = [doctor_id, int(dia_semana), hora_inicio, hora_fin]
            
            if exclude_id:
                query += " AND id_horario != ?"
                params.append(exclude_id)
            
            cursor.execute(query, params)
            count = cursor.fetchone()[0]
            return count > 0
            
    except pyodbc.Error as e:
        logging.error(f"Error verificando conflictos: {str(e)}")
        return True  # Assume conflict if error occurs
    finally:
        conn.close()