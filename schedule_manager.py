import pyodbc
from datetime import datetime, time
from typing import List, Dict, Optional

DIA_SEMANA_MAP = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo"
}

class MedicalScheduleManager:
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        
    def get_connection(self):
        return pyodbc.connect(self.connection_string)
    
    def get_doctor_schedules(self, doctor_id: int) -> List[Dict]:
        query = """
        SELECT id_horario, id_medico, dia_semana, hora_inicio, hora_fin,
        FROM Horarios_disponibles
        WHERE id_medico = ?
        ORDER BY dia_semana, hora_inicio
        """
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (doctor_id,))
                
                schedules = []
                for row in cursor.fetchall():
                    schedules.append({
                        'id_horario': row.id_horario,
                        'id_medico': row.id_medico,
                        'dia_semana': row.dia_semana,
                        'hora_inicio': str(row.hora_inicio),
                        'hora_fin': str(row.hora_fin)
                    })
                
                return schedules
                
        except Exception as e:
            raise Exception(f"Error al obtener horarios: {str(e)}")
    
    def create_schedule(self, doctor_id: int, day_of_week: int, 
                       start_time: str, end_time: str) -> int:
        if not self._validate_schedule_input(doctor_id, day_of_week, start_time, end_time):
            raise Exception("Datos de horario inválidos")
        
        if self._check_schedule_conflict(doctor_id, day_of_week, start_time, end_time):
            raise Exception("Conflicto de horarios detectado")
        
        dia_semana_str = DIA_SEMANA_MAP.get(day_of_week)
        if not dia_semana_str:
            raise Exception("Día de la semana inválido")

        query = """
        INSERT INTO Horarios_disponibles
        (id_medico, dia_semana, hora_inicio, hora_fin)
        OUTPUT INSERTED.id_horario
        VALUES (?, ?, ?, ?)
        """
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (doctor_id, dia_semana_str, start_time, end_time))
                schedule_id = cursor.fetchone()[0]
                conn.commit()
                return schedule_id
                
        except Exception as e:
            raise Exception(f"Error al crear horario: {str(e)}")
    
    def update_schedule(self, schedule_id: int, day_of_week: int = None,
                       start_time: str = None, end_time: str = None) -> bool:
        current_schedule = self.get_schedule_by_id(schedule_id)
        if not current_schedule:
            raise Exception("Horario no encontrado")
        
        new_day = day_of_week if day_of_week is not None else current_schedule['dia_semana']
        new_start = start_time if start_time is not None else current_schedule['hora_inicio']
        new_end = end_time if end_time is not None else current_schedule['hora_fin']
        
        dia_semana_str = DIA_SEMANA_MAP.get(new_day)
        if not dia_semana_str:
            raise Exception("Día de la semana inválido")

        if not self._validate_schedule_input(current_schedule['id_medico'], new_day, new_start, new_end):
            raise Exception("Datos de horario inválidos")
        
        if self._check_schedule_conflict(current_schedule['id_medico'], new_day, 
                                       new_start, new_end, exclude_id=schedule_id):
            raise Exception("Conflicto de horarios detectado")
        
        query = """
        UPDATE Horarios_disponibles
        SET dia_semana = ?, hora_inicio = ?, hora_fin = ?
        WHERE id_horario = ?
        """
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (dia_semana_str, new_start, new_end, schedule_id))
                conn.commit()
                return cursor.rowcount > 0
                
        except Exception as e:
            raise Exception(f"Error al actualizar horario: {str(e)}")
    
    def delete_schedule(self, schedule_id: int) -> bool:
        query = """
        DELETE FROM Horarios_disponibles
        WHERE id_horario = ?
        """
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (schedule_id,))
                conn.commit()
                return cursor.rowcount > 0
                
        except Exception as e:
            raise Exception(f"Error al eliminar horario: {str(e)}")
    
    def get_schedule_by_id(self, schedule_id: int) -> Optional[Dict]:
        query = """
        SELECT id_horario, id_medico, dia_semana, hora_inicio, hora_fin
        FROM Horarios_disponibles
        WHERE id_horario = ?
        """
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, (schedule_id,))
                row = cursor.fetchone()
                
                if row:
                    return {
                        'id_horario': row.id_horario,
                        'id_medico': row.id_medico,
                        'dia_semana': row.dia_semana,
                        'hora_inicio': str(row.hora_inicio),
                        'hora_fin': str(row.hora_fin)
                    }
                return None
                
        except Exception as e:
            raise Exception(f"Error al obtener horario: {str(e)}")
    
    def _validate_schedule_input(self, id_medico: int, dia_semana: int,
                                hora_inicio: str, hora_fin: str) -> bool:
        try:
            if not 1 <= dia_semana <= 7:
                return False
            
            start = datetime.strptime(hora_inicio, '%H:%M').time()
            end = datetime.strptime(hora_fin, '%H:%M').time()
            
            if start >= end:
                return False
            
            if start < time(6, 0) or end > time(22, 0):
                return False
            
            return True
            
        except ValueError:
            return False
    
    def _check_schedule_conflict(self, id_medico: int, dia_semana: int,
                               hora_inicio: str, hora_fin: str, 
                               exclude_id: int = None) -> bool:
        existing_schedules = self.get_doctor_schedules(id_medico)
        
        day_schedules = [s for s in existing_schedules 
                        if s['dia_semana'] == DIA_SEMANA_MAP.get(dia_semana)
                        and (exclude_id is None or s['id_horario'] != exclude_id)]
        
        new_start = datetime.strptime(hora_inicio, '%H:%M').time()
        new_end = datetime.strptime(hora_fin, '%H:%M').time()
        
        for schedule in day_schedules:
            existing_start = datetime.strptime(schedule['hora_inicio'], '%H:%M').time()
            existing_end = datetime.strptime(schedule['hora_fin'], '%H:%M').time()
            
            if (new_start < existing_end and new_end > existing_start):
                return True
        
        return False
