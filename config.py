import os

# Database configuration
SERVER = os.getenv('DB_SERVER', r'localhost\SQLEXPRESS')
DATABASE = os.getenv('DB_DATABASE', 'MedAsistencia')
USE_WINDOWS_AUTH = os.getenv('USE_WINDOWS_AUTH', 'True').lower() == 'true'

# Only use these if Windows Auth is False
USERNAME = os.getenv('DB_USERNAME', r'RAFA2004\YepBuddy2')  # Raw string
PASSWORD = os.getenv('DB_PASSWORD', 'your_secure_password')  # Never leave empty

# Diccionario de nombres de días
DAY_NAMES = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
}

# Configuración de email para recuperación de contraseña
EMAIL_CONFIG = {
    'sender_email': os.getenv('EMAIL_SENDER', 'equipo.uptamca.clinica@gmail.com'),
    'smtp_server': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
    'smtp_port': int(os.getenv('SMTP_PORT', 587)),
    'email_password': os.getenv('EMAIL_PASSWORD', '')
}