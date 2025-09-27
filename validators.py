from datetime import datetime, time
import logging
from database import get_db_connection
import pyodbc

logger = logging.getLogger(__name__)

def validate_schedule_input(id_medico, dia_semana, hora_inicio, hora_fin):
    """Valida los datos de entrada para un horario"""
    try:
        # Validar día de la semana (1-7)
        if not isinstance(dia_semana, int) or dia_semana < 1 or dia_semana > 7:
            logger.error(f"Día de la semana inválido: {dia_semana}")
            return False
            
        # Validar formato de horas (puedes expandir esta validación)
        datetime.strptime(hora_inicio, '%H:%M')
        datetime.strptime(hora_fin, '%H:%M')
        
        # Validar que hora_inicio sea menor que hora_fin
        if hora_inicio >= hora_fin:
            logger.error(f"Hora de inicio {hora_inicio} no puede ser mayor o igual que hora fin {hora_fin}")
            return False
            
        return True
        
    except (ValueError, TypeError) as e:
        logger.error(f"Error de validación: {str(e)}")
        return False

def check_schedule_conflict(id_medico, dia_semana, hora_inicio, hora_fin, exclude_id=None):
    """Verifica si hay conflictos de horario para el médico"""
    conn = get_db_connection()
    if not conn:
        return True  # Asumir conflicto si no podemos verificar
        
    try:
        with conn.cursor() as cursor:
            query = """
                SELECT id_horario 
                FROM horarios_disponibles
                WHERE id_medico = ? AND dia_semana = ?
                AND (
                    (? < hora_fin AND ? > hora_inicio)
                )
            """
            params = [id_medico, dia_semana, hora_inicio, hora_fin]
            
            if exclude_id:
                query += " AND id_horario != ?"
                params.append(exclude_id)
                
            cursor.execute(query, params)
            return cursor.fetchone() is not None
            
    except pyodbc.Error as e:
        logger.error(f"Error al verificar conflicto de horario: {str(e)}")
        return True
    finally:
        conn.close()