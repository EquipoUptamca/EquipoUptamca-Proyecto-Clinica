-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = N'MedAsistencia')
BEGIN
    CREATE DATABASE [MedAsistencia];
END
GO

USE [MedAsistencia]
GO

-- Eliminar tablas en el orden correcto de dependencia (primero las que tienen FKs)
IF OBJECT_ID('dbo.soporte', 'U') IS NOT NULL
    DROP TABLE [dbo].[soporte];
IF OBJECT_ID('dbo.Patologias_herramienta', 'U') IS NOT NULL
    DROP TABLE [dbo].[Patologias_herramienta];
IF OBJECT_ID('dbo.MedicosEspecialidades', 'U') IS NOT NULL
    DROP TABLE [dbo].[MedicosEspecialidades];
IF OBJECT_ID('dbo.Citas', 'U') IS NOT NULL
    DROP TABLE [dbo].[Citas];
IF OBJECT_ID('dbo.Justificativos', 'U') IS NOT NULL
    DROP TABLE [dbo].[Justificativos];
IF OBJECT_ID('dbo.Asistencias', 'U') IS NOT NULL
    DROP TABLE [dbo].[Asistencias];
IF OBJECT_ID('dbo.Horarios_disponibles', 'U') IS NOT NULL
    DROP TABLE [dbo].[Horarios_disponibles];
IF OBJECT_ID('dbo.Turnos', 'U') IS NOT NULL
    DROP TABLE [dbo].[Turnos];
IF OBJECT_ID('dbo.Perfusiones', 'U') IS NOT NULL
    DROP TABLE [dbo].[Perfusiones];
IF OBJECT_ID('dbo.Sesiones_usuario', 'U') IS NOT NULL
    DROP TABLE [dbo].[Sesiones_usuario];
IF OBJECT_ID('dbo.Password_reset_tokens', 'U') IS NOT NULL
    DROP TABLE [dbo].[Password_reset_tokens];
IF OBJECT_ID('dbo.Medicos', 'U') IS NOT NULL
    DROP TABLE [dbo].[Medicos];
IF OBJECT_ID('dbo.Pacientes', 'U') IS NOT NULL
    DROP TABLE [dbo].[Pacientes];
IF OBJECT_ID('dbo.Usuarios', 'U') IS NOT NULL
    DROP TABLE [dbo].[Usuarios];
IF OBJECT_ID('dbo.Roles', 'U') IS NOT NULL
    DROP TABLE [dbo].[Roles];
IF OBJECT_ID('dbo.Herramientas', 'U') IS NOT NULL
    DROP TABLE [dbo].[Herramientas];
IF OBJECT_ID('dbo.Patologias', 'U') IS NOT NULL
    DROP TABLE [dbo].[Patologias];
IF OBJECT_ID('dbo.Especialidades', 'U') IS NOT NULL
    DROP TABLE [dbo].[Especialidades];
GO

-- 1. Tabla de Roles
CREATE TABLE [dbo].[Roles](
    [id_rol] [int] IDENTITY(1,1) NOT NULL,
    [nombre_rol] [nvarchar](50) NOT NULL UNIQUE,
    [descripcion] [nvarchar](255) NULL,
    [permisos] [nvarchar](max) NULL,
PRIMARY KEY CLUSTERED ([id_rol] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- 2. Tabla de Usuarios (Actualizada con el tipo_usuario 'soporte')
CREATE TABLE [dbo].[Usuarios](
    [id_usuario] [int] IDENTITY(1,1) NOT NULL,
    [nombre_completo] [nvarchar](100) NOT NULL,
    [usuario_login] [nvarchar](50) NOT NULL UNIQUE,
    [contraseña] [nvarchar](255) NOT NULL,
    [id_rol] [int] NOT NULL,
    [cedula] [nvarchar](20) NULL UNIQUE,
    [telefono] [nvarchar](20) NULL,
    [gmail] [nvarchar](100) NULL UNIQUE,
    [tipo_usuario] [nvarchar](20) NULL CHECK ([tipo_usuario] IN ('admin', 'medico', 'recepcion', 'paciente', 'soporte')),
    [activo] [bit] DEFAULT 1,
    [fecha_creacion] [datetime] DEFAULT GETDATE(),
    [fecha_actualizacion] [datetime] NULL,
    [foto_perfil] [nvarchar](255) NULL,
PRIMARY KEY CLUSTERED ([id_usuario] ASC)
) ON [PRIMARY]
GO

-- 3. Tabla de Médicos
CREATE TABLE [dbo].[Medicos](
    [id_medico] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario] [int] NOT NULL UNIQUE,
    [especialidad] [nvarchar](100) NULL,
    [numero_colegiado] [nvarchar](50) NULL UNIQUE,
    [años_experiencia] [int] NULL,
    [estado] [nvarchar](1) DEFAULT 'A' CHECK ([estado] IN ('I', 'A')),
    [fecha_creacion] [datetime] DEFAULT GETDATE(),
    [fecha_actualizacion] [datetime] NULL,
PRIMARY KEY CLUSTERED ([id_medico] ASC)
) ON [PRIMARY]
GO

-- 4. Tabla de Pacientes
CREATE TABLE [dbo].[Pacientes](
    [id_paciente] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario] [int] NOT NULL UNIQUE,
    [fecha_nacimiento] [date] NULL,
    [genero] [nvarchar](10) NULL,
    [tipo_sangre] [nvarchar](5) NULL,
    [alergias] [nvarchar](500) NULL,
    [enfermedades_cronicas] [nvarchar](500) NULL,
    [contacto_emergencia] [nvarchar](100) NULL,
    [telefono_emergencia] [nvarchar](20) NULL,
    [estado] [nvarchar](1) DEFAULT 'A' CHECK ([estado] IN ('I', 'A')),
    [fecha_creacion] [datetime] DEFAULT GETDATE(),
    [fecha_actualizacion] [datetime] NULL,
PRIMARY KEY CLUSTERED ([id_paciente] ASC)
) ON [PRIMARY]
GO

-- 5. Tabla de Asistencias
CREATE TABLE [dbo].[Asistencias](
    [id_asistencia] [int] IDENTITY(1,1) NOT NULL,
    [id_medico] [int] NOT NULL,
    [fecha] [date] NOT NULL,
    [hora_entrada] [time](7) NULL,
    [hora_salida] [time](7) NULL,
    [estado_asistencia] [varchar](20) NOT NULL CHECK ([estado_asistencia] IN ('Tarde', 'Ausente', 'Asistió')),
PRIMARY KEY CLUSTERED ([id_asistencia] ASC)
) ON [PRIMARY]
GO

-- 6. Tabla de Citas
CREATE TABLE [dbo].[Citas](
    [id_cita] [int] IDENTITY(1,1) NOT NULL,
    [id_medico] [int] NOT NULL,
    [id_paciente] [int] NOT NULL,
    [fecha_cita] [date] NOT NULL,
    [hora_cita] [time](7) NOT NULL,
    [motivo_consulta] [varchar](255) NULL,
    [fecha_creacion] [datetime] DEFAULT GETDATE(),
    [estado] [varchar](20) DEFAULT 'pendiente' NULL,
    [notes] [text] NULL,
PRIMARY KEY CLUSTERED ([id_cita] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- 7. Tabla de Herramientas
CREATE TABLE [dbo].[Herramientas](
    [id_herramienta] [int] IDENTITY(1,1) NOT NULL,
    [nombre] [varchar](100) NOT NULL,
    [descripcion] [text] NOT NULL,
    [tipo] [varchar](50) NOT NULL CHECK ([tipo] IN ('Calculadora', 'Escala')),
    [formula] [text] NULL,
PRIMARY KEY CLUSTERED ([id_herramienta] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- 8. Tabla de Horarios Disponibles
CREATE TABLE [dbo].[Horarios_disponibles](
    [id_horario] [int] IDENTITY(1,1) NOT NULL,
    [id_medico] [int] NOT NULL,
    [dia_semana] [nvarchar](20) NOT NULL,
    [hora_inicio] [time](7) NOT NULL,
    [hora_fin] [time](7) NOT NULL,
PRIMARY KEY CLUSTERED ([id_horario] ASC)
) ON [PRIMARY]
GO

-- 9. Tabla de Justificativos
CREATE TABLE [dbo].[Justificativos](
    [id_justificativo] [int] IDENTITY(1,1) NOT NULL,
    [id_asistencia] [int] NOT NULL,
    [motivo] [varchar](255) NOT NULL,
    [fecha_presentacion] [date] NOT NULL,
PRIMARY KEY CLUSTERED ([id_justificativo] ASC)
) ON [PRIMARY]
GO

-- 10. Tabla de password_reset_tokens
CREATE TABLE [dbo].[Password_reset_tokens](
    [id] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario] [int] NOT NULL,
    [token] [nvarchar](100) NOT NULL,
    [expiration] [datetime] NOT NULL,
    [used] [bit] DEFAULT 0,
    [created_at] [datetime] DEFAULT GETDATE(),
PRIMARY KEY CLUSTERED ([id] ASC)
) ON [PRIMARY]
GO

-- 11. Tabla de Patologías
CREATE TABLE [dbo].[Patologias](
    [id_patologia] [int] IDENTITY(1,1) NOT NULL,
    [nombre] [varchar](100) NOT NULL,
    [descripcion] [text] NOT NULL,
    [clinica] [text] NOT NULL,
    [pruebas_diagnosticas] [text] NOT NULL,
    [tratamientos] [text] NOT NULL,
PRIMARY KEY CLUSTERED ([id_patologia] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- 12. Tabla de Patologías y Herramientas
CREATE TABLE [dbo].[Patologias_herramienta](
    [id_patologia] [int] NOT NULL,
    [id_herramienta] [int] NOT NULL,
PRIMARY KEY CLUSTERED ([id_patologia] ASC, [id_herramienta] ASC)
) ON [PRIMARY]
GO

-- 13. Tabla de Perfusiones
CREATE TABLE [dbo].[Perfusiones](
    [id_perfusion] [int] IDENTITY(1,1) NOT NULL,
    [nombre_farmaco] [varchar](100) NOT NULL,
    [dosis_recomendada] [varchar](100) NOT NULL,
    [descripcion] [text] NOT NULL,
PRIMARY KEY CLUSTERED ([id_perfusion] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

-- 14. Tabla de Sesiones de Usuario
CREATE TABLE [dbo].[Sesiones_usuario](
    [id_sesion] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario] [int] NOT NULL,
    [token_sesion] [nvarchar](255) NOT NULL,
    [fecha_inicio] [datetime] DEFAULT GETDATE(),
    [fecha_expiracion] [datetime] NOT NULL,
    [direccion_ip] [nvarchar](45) NULL,
    [user_agent] [nvarchar](500) NULL,
    [activa] [bit] DEFAULT 1,
PRIMARY KEY CLUSTERED ([id_sesion] ASC)
) ON [PRIMARY]
GO

-- 15. Tabla de Turnos
CREATE TABLE [dbo].[Turnos](
    [id_turno] [int] IDENTITY(1,1) NOT NULL,
    [id_medico] [int] NOT NULL,
    [tipo_turno] [varchar](50) NOT NULL CHECK ([tipo_turno] IN ('Cirugía', 'Guardia', 'Consulta')),
    [hora_inicio] [time](7) NOT NULL,
    [hora_fin] [time](7) NOT NULL,
    [fecha] [date] NOT NULL,
PRIMARY KEY CLUSTERED ([id_turno] ASC)
) ON [PRIMARY]
GO

-- 16. Tabla de Especialidades
CREATE TABLE [dbo].[Especialidades](
    [id_especialidad] [int] IDENTITY(1,1) NOT NULL,
    [nombre_especialidad] [nvarchar](100) NOT NULL UNIQUE,
    [tipo_especialidad] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED ([id_especialidad] ASC)
) ON [PRIMARY]
GO

-- 17. Tabla de relación Medicos-Especialidades
CREATE TABLE [dbo].[MedicosEspecialidades](
    [id_medico] [int] NOT NULL,
    [id_especialidad] [int] NOT NULL,
PRIMARY KEY CLUSTERED ([id_medico] ASC, [id_especialidad] ASC),
FOREIGN KEY ([id_medico]) REFERENCES [dbo].[Medicos] ([id_medico]),
FOREIGN KEY ([id_especialidad]) REFERENCES [dbo].[Especialidades] ([id_especialidad])
) ON [PRIMARY]
GO

-- 18. Nueva Tabla Solicitada: soporte (Relacionada con Usuarios)
CREATE TABLE [dbo].[soporte](
    [id_soporte] [int] IDENTITY(1,1) NOT NULL,
    [id_usuario_reporta] [int] NOT NULL,     -- Usuario (médico, paciente, etc.) que tiene la duda/falla
    [id_usuario_tecnico] [int] NULL,         -- Usuario con rol de soporte asignado
    [tipo_reporte] [nvarchar](20) NOT NULL CHECK ([tipo_reporte] IN ('Falla', 'Duda')),
    [asunto] [nvarchar](150) NOT NULL,
    [descripcion] [nvarchar](max) NOT NULL,
    [estado] [nvarchar](20) DEFAULT 'Pendiente' CHECK ([estado] IN ('Pendiente', 'En Progreso', 'Resuelto', 'Cerrado')),
    [prioridad] [nvarchar](10) DEFAULT 'Media' CHECK ([prioridad] IN ('Baja', 'Media', 'Alta')),
    [fecha_creacion] [datetime] DEFAULT GETDATE(),
    [fecha_actualizacion] [datetime] NULL,
PRIMARY KEY CLUSTERED ([id_soporte] ASC)
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO


-- Crear relaciones FOREIGN KEY
ALTER TABLE [dbo].[Medicos] WITH CHECK ADD FOREIGN KEY([id_usuario])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[Pacientes] WITH CHECK ADD FOREIGN KEY([id_usuario])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[Usuarios] WITH CHECK ADD FOREIGN KEY([id_rol])
REFERENCES [dbo].[Roles] ([id_rol])
GO
ALTER TABLE [dbo].[Asistencias] WITH CHECK ADD FOREIGN KEY([id_medico])
REFERENCES [dbo].[Medicos] ([id_medico])
GO
ALTER TABLE [dbo].[Citas] WITH CHECK ADD FOREIGN KEY([id_medico])
REFERENCES [dbo].[Medicos] ([id_medico])
GO
ALTER TABLE [dbo].[Citas] WITH CHECK ADD FOREIGN KEY([id_paciente])
REFERENCES [dbo].[Pacientes] ([id_paciente])
GO
ALTER TABLE [dbo].[Horarios_disponibles] WITH CHECK ADD FOREIGN KEY([id_medico])
REFERENCES [dbo].[Medicos] ([id_medico])
GO
ALTER TABLE [dbo].[Justificativos] WITH CHECK ADD FOREIGN KEY([id_asistencia])
REFERENCES [dbo].[Asistencias] ([id_asistencia])
GO
ALTER TABLE [dbo].[Password_reset_tokens] WITH CHECK ADD FOREIGN KEY([id_usuario])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[Patologias_herramienta] WITH CHECK ADD FOREIGN KEY([id_herramienta])
REFERENCES [dbo].[Herramientas] ([id_herramienta])
GO
ALTER TABLE [dbo].[Patologias_herramienta] WITH CHECK ADD FOREIGN KEY([id_patologia])
REFERENCES [dbo].[Patologias] ([id_patologia])
GO
ALTER TABLE [dbo].[Sesiones_usuario] WITH CHECK ADD FOREIGN KEY([id_usuario])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[Turnos] WITH CHECK ADD FOREIGN KEY([id_medico])
REFERENCES [dbo].[Medicos] ([id_medico])
GO

-- Relaciones para la nueva tabla 'soporte' hacia 'Usuarios'
ALTER TABLE [dbo].[soporte] WITH CHECK ADD FOREIGN KEY([id_usuario_reporta])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO
ALTER TABLE [dbo].[soporte] WITH CHECK ADD FOREIGN KEY([id_usuario_tecnico])
REFERENCES [dbo].[Usuarios] ([id_usuario])
GO


-- Script de Migración de Datos
BEGIN TRANSACTION

-- Insertar roles básicos si no existen
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Administrador')
    INSERT INTO Roles (nombre_rol, descripcion, permisos)
    VALUES ('Administrador', 'Administrador del sistema', '{"acceso_total": true}');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Médico')
    INSERT INTO Roles (nombre_rol, descripcion, permisos)
    VALUES ('Médico', 'Personal médico', '{"gestion_citas": true, "ver_pacientes": true}');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Recepcionista')
    INSERT INTO Roles (nombre_rol, descripcion, permisos)
    VALUES ('Recepcionista', 'Personal de recepción', '{"gestion_citas": true}');
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Paciente')
    INSERT INTO Roles (nombre_rol, descripcion, permisos)
    VALUES ('Paciente', 'Paciente del sistema', '{"ver_citas_propias": true}');

-- NUEVO: Insertar rol básico de Soporte Técnico si no existe
IF NOT EXISTS (SELECT 1 FROM Roles WHERE nombre_rol = 'Soporte')
    INSERT INTO Roles (nombre_rol, descripcion, permisos)
    VALUES ('Soporte', 'Soporte Técnico y TI', '{"resolver_tickets": true}');

-- Crear usuarios administradores por defecto si no existen
IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE usuario_login = 'admin')
    INSERT INTO Usuarios (nombre_completo, usuario_login, contraseña, id_rol, tipo_usuario, activo)
    VALUES ('Administrador Principal', 'admin', '$2y$10$r3xpkXnq6uG5BfNIO0s0E.XT3Yk4kSJYvWqLc6nWq1ZzJ9XrLZbW2', 1, 'admin', 1);

-- NUEVO: Crear un usuario Técnico asignado a Soporte por defecto
IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE usuario_login = 'tecnico_soporte')
    INSERT INTO Usuarios (nombre_completo, usuario_login, contraseña, id_rol, tipo_usuario, activo)
    VALUES ('Soporte Técnico Sistema', 'tecnico_soporte', '$2y$10$r3xpkXnq6uG5BfNIO0s0E.XT3Yk4kSJYvWqLc6nWq1ZzJ9XrLZbW2', (SELECT id_rol FROM Roles WHERE nombre_rol = 'Soporte'), 'soporte', 1);


-- NUEVO: Inserción de Datos de prueba para la tabla soporte
DECLARE @id_admin INT = (SELECT id_usuario FROM Usuarios WHERE usuario_login = 'admin');
DECLARE @id_tec INT = (SELECT id_usuario FROM Usuarios WHERE usuario_login = 'tecnico_soporte');

-- Inserción ejemplo: Falla
INSERT INTO [dbo].[soporte] (id_usuario_reporta, id_usuario_tecnico, tipo_reporte, asunto, descripcion, estado, prioridad)
VALUES (@id_admin, @id_tec, 'Falla', 'Error al procesar citas los fines de semana', 'El sistema genera una excepción de desbordamiento de tiempo cuando se intenta agendar una cita un día domingo.', 'En Progreso', 'Alta');

-- Inserción ejemplo: Duda
INSERT INTO [dbo].[soporte] (id_usuario_reporta, id_usuario_tecnico, tipo_reporte, asunto, descripcion, estado, prioridad)
VALUES (@id_admin, NULL, 'Duda', 'Duda sobre formatos de exportación', '¿Existe la posibilidad de que el sistema exporte los justificativos en formato PDF además de texto plano?', 'Pendiente', 'Baja');

COMMIT TRANSACTION
GO