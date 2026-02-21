import pyodbc
import os

# Database configuration
SERVER = os.getenv('DB_SERVER', r'LAPTOP-60QJC8VI\SQLEXPRESS')
DATABASE = os.getenv('DB_DATABASE', 'MedAsistencia')
USE_WINDOWS_AUTH = os.getenv('USE_WINDOWS_AUTH', 'True').lower() == 'true'

# Only use these if Windows Auth is False
USERNAME = os.getenv('DB_USERNAME', r'LAPTOP-60QJC8VI\Karlos')
PASSWORD = os.getenv('DB_PASSWORD', 'your_secure_password')

try:
    if USE_WINDOWS_AUTH:
        connection_string = (
            f'DRIVER={{ODBC Driver 17 for SQL Server}};'
            f'SERVER={SERVER};DATABASE={DATABASE};'
            'Trusted_Connection=yes;'
        )
    else:
        if not USERNAME or not PASSWORD:
            print("Credenciales de base de datos no configuradas")
            exit(1)

        connection_string = (
            f'DRIVER={{ODBC Driver 17 for SQL Server}};'
            f'SERVER={SERVER};DATABASE={DATABASE};'
            f'UID={USERNAME};PWD={PASSWORD}'
        )

    print(f"Intentando conectar con: {connection_string}")
    conn = pyodbc.connect(connection_string)
    print("Conexión exitosa")

    cursor = conn.cursor()
    cursor.execute("SELECT TOP 1 * FROM Usuarios")
    row = cursor.fetchone()
    print(f"Consulta exitosa, primer usuario: {row}")

    conn.close()
except pyodbc.Error as e:
    print(f"Error de conexión: {str(e)}")
except Exception as e:
    print(f"Error general: {str(e)}")
