import pyodbc
import logging
from database import get_db_connection

def init_database():
    """Inicializa la base de datos con todas las tablas necesarias y consistentes."""
    conn = get_db_connection()
    if not conn:
        logging.error("No se pudo conectar a la base de datos")
        return False
    
    try:
        with conn.cursor() as cursor:
            logging.info("Creando tablas si no existen...")

            # 1. Tabla de Roles
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Roles' AND xtype='U')
                BEGIN
                    CREATE TABLE Roles(
                        id_rol INT IDENTITY(1,1) PRIMARY KEY,
                        nombre_rol NVARCHAR(50) NOT NULL UNIQUE,
                        descripcion NVARCHAR(255) NULL,
                        permisos NVARCHAR(MAX) NULL
                    )
                END
            """)
            
            # 2. Tabla de Usuarios
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Usuarios' AND xtype='U')
                BEGIN
                    CREATE TABLE Usuarios(
                        id_usuario INT IDENTITY(1,1) PRIMARY KEY,
                        nombre_completo NVARCHAR(100) NOT NULL,
                        usuario_login NVARCHAR(50) NOT NULL UNIQUE,
                        contraseña NVARCHAR(255) NOT NULL,
                        id_rol INT NOT NULL,
                        cedula NVARCHAR(20) NULL UNIQUE,
                        telefono NVARCHAR(20) NULL,
                        gmail NVARCHAR(100) NULL UNIQUE,
                        tipo_usuario NVARCHAR(20) NULL CHECK (tipo_usuario IN ('admin', 'medico', 'recepcion', 'paciente')),
                        activo BIT DEFAULT 1,
                        fecha_creacion DATETIME DEFAULT GETDATE(),
                        fecha_actualizacion DATETIME NULL,
                        foto_perfil NVARCHAR(255) NULL
                    )
                END
            """)
            
            # 3. Tabla de Especialidades
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Especialidades' AND xtype='U')
                BEGIN
                    CREATE TABLE Especialidades(
                        id_especialidad INT IDENTITY(1,1) PRIMARY KEY,
                        nombre_especialidad NVARCHAR(100) NOT NULL UNIQUE,
                        tipo_especialidad NVARCHAR(50) NULL
                    )
                END
            """)
            
            # 4. Tabla de Médicos
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Medicos' AND xtype='U')
                BEGIN
                    CREATE TABLE Medicos(
                        id_medico INT IDENTITY(1,1) PRIMARY KEY,
                        id_usuario INT NOT NULL UNIQUE,
                        especialidad NVARCHAR(100) NULL,
                        numero_colegiado NVARCHAR(50) NULL UNIQUE,
                        años_experiencia INT NULL,
                        estado NVARCHAR(1) DEFAULT 'A' CHECK (estado IN ('I', 'A')),
                        fecha_creacion DATETIME DEFAULT GETDATE(),
                        fecha_actualizacion DATETIME NULL
                    )
                END
            """)
            
            # 5. Tabla de Pacientes
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Pacientes' AND xtype='U')
                BEGIN
                    CREATE TABLE Pacientes(
                        id_paciente INT IDENTITY(1,1) PRIMARY KEY,
                        id_usuario INT NOT NULL UNIQUE,
                        fecha_nacimiento DATE NULL,
                        genero NVARCHAR(10) NULL,
                        tipo_sangre NVARCHAR(5) NULL,
                        alergias NVARCHAR(500) NULL,
                        enfermedades_cronicas NVARCHAR(500) NULL,
                        contacto_emergencia NVARCHAR(100) NULL,
                        telefono_emergencia NVARCHAR(20) NULL,
                        estado NVARCHAR(1) DEFAULT 'A' CHECK (estado IN ('I', 'A')),
                        fecha_creacion DATETIME DEFAULT GETDATE(),
                        fecha_actualizacion DATETIME NULL
                    )
                END
            """)
            
            # 6. Tabla de Citas
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Citas' AND xtype='U')
                BEGIN
                    CREATE TABLE Citas(
                        id_cita INT IDENTITY(1,1) PRIMARY KEY,
                        id_medico INT NOT NULL,
                        id_paciente INT NOT NULL,
                        fecha_cita DATE NOT NULL,
                        hora_cita TIME(7) NOT NULL,
                        motivo_consulta VARCHAR(255) NULL,
                        fecha_creacion DATETIME DEFAULT GETDATE(),
                        fecha_actualizacion DATETIME NULL,
                        estado VARCHAR(20) DEFAULT 'pendiente' NULL,
                        notas TEXT NULL
                    )
                END
            """)

            # 7. Tabla de Horarios Disponibles
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Horarios_disponibles' AND xtype='U')
                BEGIN
                    CREATE TABLE Horarios_disponibles(
                        id_horario INT IDENTITY(1,1) PRIMARY KEY,
                        id_medico INT NOT NULL,
                        dia_semana NVARCHAR(20) NOT NULL,
                        hora_inicio TIME(7) NOT NULL,
                        hora_fin TIME(7) NOT NULL
                    )
                END
            """)

            # 8. Tabla de Password Reset Tokens
            cursor.execute("""
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Password_reset_tokens' AND xtype='U')
                BEGIN
                    CREATE TABLE Password_reset_tokens(
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        id_usuario INT NOT NULL,
                        token NVARCHAR(100) NOT NULL,
                        expiration DATETIME NOT NULL,
                        used BIT DEFAULT 0,
                        created_at DATETIME DEFAULT GETDATE()
                    )
                END
            """)

            # 9. Crear relaciones FOREIGN KEY
            foreign_keys = [
                "ALTER TABLE Medicos ADD CONSTRAINT FK_Medicos_Usuarios FOREIGN KEY(id_usuario) REFERENCES Usuarios(id_usuario)",
                "ALTER TABLE Pacientes ADD CONSTRAINT FK_Pacientes_Usuarios FOREIGN KEY(id_usuario) REFERENCES Usuarios(id_usuario)",
                "ALTER TABLE Usuarios ADD CONSTRAINT FK_Usuarios_Roles FOREIGN KEY(id_rol) REFERENCES Roles(id_rol)",
                "ALTER TABLE Citas ADD CONSTRAINT FK_Citas_Medicos FOREIGN KEY(id_medico) REFERENCES Medicos(id_medico)",
                "ALTER TABLE Citas ADD CONSTRAINT FK_Citas_Pacientes FOREIGN KEY(id_paciente) REFERENCES Pacientes(id_paciente)",
                "ALTER TABLE Horarios_disponibles ADD CONSTRAINT FK_Horarios_Medicos FOREIGN KEY(id_medico) REFERENCES Medicos(id_medico)",
                "ALTER TABLE Password_reset_tokens ADD CONSTRAINT FK_Tokens_Usuarios FOREIGN KEY(id_usuario) REFERENCES Usuarios(id_usuario)"
            ]
            
            for fk_sql in foreign_keys:
                fk_name = fk_sql.split(" ")[5]
                check_sql = f"IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = '{fk_name}') BEGIN {fk_sql} END"
                cursor.execute(check_sql)

            # Insertar datos básicos
            logging.info("Insertando datos básicos (roles, admin)...")
            cursor.execute("""
                IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Administrador')
                    INSERT INTO Roles (nombre_rol, descripcion) VALUES ('Administrador', 'Acceso completo al sistema');
                IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Médico')
                    INSERT INTO Roles (nombre_rol, descripcion) VALUES ('Médico', 'Personal médico');
                IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Recepcionista')
                    INSERT INTO Roles (nombre_rol, descripcion) VALUES ('Recepcionista', 'Personal de recepción');
                IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Paciente')
                    INSERT INTO Roles (nombre_rol, descripcion) VALUES ('Paciente', 'Paciente del sistema');
            """)

            cursor.execute("""
                IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE usuario_login = 'admin')
                BEGIN
                    DECLARE @admin_rol_id INT = (SELECT id_rol FROM Roles WHERE nombre_rol = 'Administrador');
                    INSERT INTO Usuarios (nombre_completo, usuario_login, contraseña, id_rol, tipo_usuario, activo)
                    VALUES ('Administrador Principal', 'admin', 'pbkdf2:sha256:600000$zY8vEw2aJq3nB4cR$c9a396e214c4bb3e3f3c8c3feb2f75c44583f5f8a4051151978182e5f034b631', @admin_rol_id, 'admin', 1);
                END
            """)
            
            logging.info("Insertando especialidades médicas si no existen...")
            specialties = [
                # 1. Especialidades Clínicas (Principales)
                ("Medicina Familiar y Comunitaria", "Especialidades Clínicas"),
                ("Medicina Interna", "Especialidades Clínicas"),
                ("Pediatría", "Especialidades Clínicas"),
                ("Ginecología y Obstetricia", "Especialidades Clínicas"),
                ("Psiquiatría", "Especialidades Clínicas"),
                ("Dermatología", "Especialidades Clínicas"),
                # 2. Especialidades Quirúrgicas
                ("Cirugía General y del Aparato Digestivo", "Especialidades Quirúrgicas"),
                ("Cirugía Ortopédica y Traumatología", "Especialidades Quirúrgicas"),
                ("Neurocirugía", "Especialidades Quirúrgicas"),
                ("Cirugía Plástica, Estética y Reparadora", "Especialidades Quirúrgicas"),
                ("Cirugía Torácica", "Especialidades Quirúrgicas"),
                ("Cirugía Cardiovascular", "Especialidades Quirúrgicas"),
                ("Cirugía Pediátrica", "Especialidades Quirúrgicas"),
                ("Cirugía Maxilofacial", "Especialidades Quirúrgicas"),
                # 3. Especialidades por Sistemas y Órganos
                ("Cardiología", "Especialidades por Sistemas y Órganos"),
                ("Neumología", "Especialidades por Sistemas y Órganos"),
                ("Gastroenterología", "Especialidades por Sistemas y Órganos"),
                ("Nefrología", "Especialidades por Sistemas y Órganos"),
                ("Neurología", "Especialidades por Sistemas y Órganos"),
                ("Endocrinología y Nutrición", "Especialidades por Sistemas y Órganos"),
                ("Urología", "Especialidades por Sistemas y Órganos"),
                ("Oftalmología", "Especialidades por Sistemas y Órganos"),
                ("Otorrinolaringología (ORL)", "Especialidades por Sistemas y Órganos"),
                # 4. Especialidades Diagnósticas y de Apoyo
                ("Anatomía Patológica", "Especialidades Diagnósticas y de Apoyo"),
                ("Radiología y Medicina Física", "Especialidades Diagnósticas y de Apoyo"),
                ("Medicina Nuclear", "Especialidades Diagnósticas y de Apoyo"),
                ("Análisis Clínicos / Bioquímica Clínica", "Especialidades Diagnósticas y de Apoyo"),
                ("Farmacología Clínica", "Especialidades Diagnósticas y de Apoyo"),
                ("Inmunología", "Especialidades Diagnósticas y de Apoyo"),
                # 5. Otras Especialidades Importantes
                ("Oncología Médica", "Otras Especialidades Importantes"),
                ("Oncología Radioterápica", "Otras Especialidades Importantes"),
                ("Medicina Intensiva", "Otras Especialidades Importantes"),
                ("Medicina Preventiva y Salud Pública", "Otras Especialidades Importantes"),
                ("Medicina del Trabajo", "Otras Especialidades Importantes"),
                ("Medicina de Urgencias", "Otras Especialidades Importantes"),
                ("Medicina Física y Rehabilitación (Fisiatría)", "Otras Especialidades Importantes"),
                ("Alergología", "Otras Especialidades Importantes"),
                ("Genética Médica", "Otras Especialidades Importantes"),
                ("Medicina del Deporte", "Otras Especialidades Importantes"),
                ("Paliativos", "Otras Especialidades Importantes"),
                # 6. Subespecialidades (Fellowships)
                ("Hepatología", "Subespecialidades"),
                ("Cardiología Intervencionista", "Subespecialidades"),
                ("Electrofisiología", "Subespecialidades"),
                ("Reumatología", "Subespecialidades"),
                ("Infectología", "Subespecialidades"),
                ("Hemato-Oncología", "Subespecialidades"),
                ("Neonatología", "Subespecialidades"),
                ("Cirugía de Mano", "Subespecialidades"),
            ]
            for name, specialty_type in specialties:
                cursor.execute("IF NOT EXISTS (SELECT 1 FROM Especialidades WHERE nombre_especialidad = ?) INSERT INTO Especialidades (nombre_especialidad, tipo_especialidad) VALUES (?, ?)", (name, name, specialty_type))

            conn.commit()
            logging.info("Base de datos inicializada y/o verificada correctamente.")
            return True
            
    except pyodbc.Error as e:
        conn.rollback()
        logging.error(f"Error inicializando base de datos: {str(e)}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    init_database()