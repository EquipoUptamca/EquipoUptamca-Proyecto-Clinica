# MedAsistencia - Manual de Usuario Exhaustivo

Bienvenido a MedAsistencia, la plataforma integral de gestión para el Centro Médico Docente El Paso. Este manual le guiará a través de cada una de las funcionalidades del sistema, asegurando que pueda utilizar todas las herramientas a su disposición de manera eficiente y profesional.

---

## 1. Introducción a MedAsistencia

MedAsistencia es un sistema de gestión médica diseñado para optimizar las operaciones de la clínica, mejorar la atención al paciente y proporcionar herramientas eficientes para el personal administrativo y médico. La plataforma centraliza la gestión de usuarios, médicos, pacientes, horarios y citas en una interfaz moderna, profesional y segura.

### 1.1. Características Clave
-   **Gestión por Roles:** Acceso seguro y diferenciado para Administradores, Médicos, Recepcionistas y Pacientes.
-   **Dashboards Interactivos:** Paneles de control personalizados para cada rol con estadísticas y accesos directos.
-   **Gestión Integral:** Administración completa de usuarios, perfiles de médicos, expedientes de pacientes y horarios.
-   **Sistema de Citas Avanzado:** Programación, confirmación, cancelación y seguimiento del estado de las citas.
-   **Centro de Soporte Técnico:** Sistema de tickets para reportar fallas y dudas del sistema.
-   **Gestión de Asistencia:** Registro y seguimiento de la asistencia del personal médico.
-   **Reportes y Análisis:** Módulo para generar reportes de actividad, ocupación, nuevos pacientes y más.
-   **Historial Clínico:** Gestión de consultas y seguimiento del historial médico de los pacientes.
-   **Seguridad Robusta:** Autenticación segura, recuperación de contraseña y protección de roles privilegiados.
-   **Asistente Virtual (MediBot 🤖):** Ayuda contextual y accesos directos para todos los roles.
-   **Demo Interactiva:** Una página de demostración pública que muestra las características clave del sistema.

---

## 2. Acceso y Registro

### 2.1. Iniciar Sesión
1.  Acceda a la página principal y haga clic en **"Iniciar Sesión"**.
2.  Ingrese su **identificador** (puede ser su nombre de usuario, cédula o correo electrónico) y su **contraseña**.
3.  Será redirigido al panel de control (Dashboard) correspondiente a su rol.

### 2.2. Registrarse
El registro está abierto para pacientes. El personal interno (Administradores, Médicos, Recepcionistas) requiere un código de seguridad proporcionado por la administración.

1.  En la página principal, haga clic en **"Registrarse"**.
2.  Complete el formulario con su información:
    -   Nombre Completo, Nombre de Usuario, Cédula, Teléfono y Correo Electrónico.
    -   Cree una contraseña segura (mínimo 8 caracteres, con mayúsculas, minúsculas y números).
3.  Seleccione el **Tipo de Usuario**:
    -   **Paciente:** Registro estándar (requiere activación posterior).
    -   **Administrador, Médico, Recepción o Soporte:** Al seleccionar uno de estos roles, se desplegará un campo para el código de seguridad.
4.  **Código de Seguridad:** Si se registra con un rol privilegiado, deberá ingresar el código correspondiente:
    -   **Administrador:** `privacidad_medasistencia`
    -   **Médico:** `medicos_medasistencia`
    -   **Recepcionista:** `recep_medasistencia`
    -   **Soporte:** `soporte_medasistencia`
5.  Haga clic en **"Registrarse"** para crear su cuenta.

### 2.3. Recuperar Contraseña
Si olvidó su contraseña, puede recuperarla de forma segura.
1.  En la página de inicio de sesión, haga clic en el enlace **"¿Olvidaste tu contraseña?"**.
2.  Ingrese su **identificador** (nombre de usuario o correo electrónico).
3.  Recibirá un correo electrónico con un **código de 6 dígitos** válido por 15 minutos.
4.  En la página de restablecimiento, ingrese el código, su identificador y su nueva contraseña.

---

## 3. Guía Detallada por Rol de Usuario

### 👤 Administrador
El Administrador tiene control total sobre el sistema. Su panel está diseñado para la supervisión y gestión global.

#### **Dashboard del Administrador**
-   **Estadísticas Clave:** Visualice en tiempo real el número de médicos, pacientes, citas del día y usuarios activos.
-   **Gráficos Interactivos:** Analice tendencias de citas por día y la distribución de citas por estado (completada, pendiente, etc.).
-   **Actividad Reciente:** Monitoree los últimos registros en el sistema (nuevos médicos, pacientes, citas).

#### **Gestión de Usuarios (`/users`)**
-   **Crear, Editar y Desactivar:** Administre todas las cuentas del sistema.
-   **Buscar y Filtrar:** Utilice la barra de búsqueda y los filtros por rol y estado para encontrar usuarios rápidamente.
-   **Cambio de Rol:** Modifique el rol de un usuario (ej. de Paciente a Recepción), lo que ajustará sus permisos automáticamente.

#### **Gestión de Médicos (`/medicos`)**
-   **Promover a Médico:** Convierta un usuario existente en un perfil de médico.
-   **Editar Perfil Profesional:** Administre especialidades, número de colegiado, años de experiencia y datos de contacto.
-   **Estado:** Active o inactive perfiles de médicos según su estatus en la clínica.

#### **Gestión de Pacientes (`/pacientes`)**
-   **Promover a Paciente:** Asocie un usuario a un perfil de paciente.
-   **Gestión de Expedientes:** Acceda y actualice la información clínica completa de los pacientes, incluyendo datos demográficos, alergias y enfermedades crónicas.

#### **Gestión de Horarios (`/horarios`)**
-   **Asignación Visual:** Seleccione un médico y asigne sus bloques de trabajo para cada día de la semana.
-   **Modificación y Eliminación:** Edite o elimine horarios existentes de forma sencilla.
-   **Copia de Horarios:** Copie la plantilla de horarios de un médico a otro para agilizar la configuración.

#### **Gestión de Citas (`/citas`)**
-   **Calendario Centralizado:** Visualice todas las citas de la clínica. Filtre por médico o paciente.
-   **Agendamiento Completo:** Cree nuevas citas para cualquier médico, seleccione horarios disponibles y registre el motivo.
-   **Reagendamiento y Cancelación:** Modifique o cancele citas existentes directamente desde el calendario o la vista de detalles.

#### **Gestión de Asistencias (`/asistencias`)**
-   Registre la entrada y salida de los médicos para llevar un control de su jornada laboral.
-   Filtre y visualice el historial de asistencias por fecha o por médico.

#### **Reportes Avanzados (`/reportes`)**
-   Acceda a reportes detallados sobre la actividad de citas, cumplimiento de pacientes, nuevos registros y ocupación de médicos. Exporte los datos a PDF o Excel.

#### **Asistente Virtual (MediBot 🤖)**
Use el chatbot para agilizar tareas. Pruebe comandos como:
-   `"buscar usuario"`: Para encontrar un usuario específico.
-   `"gestionar médicos"`: Acceso directo a la gestión de médicos.
-   `"ver horarios"`: Para ir a la página de gestión de horarios.

---

### 👨‍⚕️ Médico
El rol de Médico está enfocado en la gestión de su agenda y la atención a sus pacientes.

#### **Dashboard del Médico**
-   **Resumen Diario:** Vea de un vistazo sus citas para hoy, citas pendientes y las completadas recientemente.
-   **Estadísticas Personales:** Monitoree su rendimiento, como el total de citas en el mes.
-   **Próximos Turnos:** Un listado de sus próximos bloques de trabajo programados.

#### **Mis Consultas (`/mis_consultas`)**
-   **Visualización Completa:** Acceda a un listado detallado de todas sus citas (pasadas, presentes y futuras).
-   **Filtrar y Gestionar:** Busque por fecha o estado (Programada, Completada, Cancelada) y gestione el estado de sus citas.
-   **Historial Clínico:** Al completar una cita, puede registrar el diagnóstico, tratamiento y notas. Esta información se guarda en el historial del paciente.

#### **Mi Horario (`/mi-horario`)**
-   **Vista Semanal:** Visualice su horario de trabajo, con bloques de tiempo disponibles y citas ya programadas.
-   **Navegación:** Avance o retroceda entre semanas para planificar a futuro.
-   **Impresión:** Genere una versión imprimible de su horario semanal.

#### **Mis Pacientes (`/mis-pacientes`)**
-   Acceda a una lista de todos los pacientes que ha atendido, con acceso rápido a sus historiales.

#### **Asistente Virtual (MediBot 🤖)**
Su asistente personal para consultas rápidas. Pruebe a preguntar:
-   `"¿Cuál es mi horario?"`
-   `"¿Cuántas citas tengo hoy?"`
-   `"Ver mis citas pendientes"`
-   `"Mis estadísticas"`

---

### 📋 Recepción
Rol clave para la gestión operativa diaria de la clínica.

#### **Dashboard de Recepción**
-   **Vista del Día:** Conozca el número de citas para hoy y cuántas están pendientes de confirmación.
-   **Nuevos Pacientes:** Monitoree los pacientes registrados en la semana.

#### **Funcionalidades Principales**
-   **Gestión de Citas (`/citas_recep`):** Agende, reagende o cancele citas para cualquier médico. Es el módulo central de este rol.
-   **Gestión de Pacientes (`/pacientes_recep`):** Registre nuevos pacientes y actualice su información personal y de contacto.
-   **Horarios Médicos (`/horarios_recep`):** Consulte la disponibilidad de todos los médicos para una mejor planificación de citas.
-   **Directorio Médico (`/directorio_medico_recep`):** Acceda a la información de contacto de los especialistas para facilitar la comunicación.
-   **Registro de Asistencia (`/asistencias`):** Marque la entrada y salida de los médicos.

#### **Asistente Virtual (MediBot 🤖)**
Resuelve dudas operativas. Pruebe comandos como:
-   `"registrar nuevo paciente"`
-   `"agendar una cita"`
-   `"consultar horario de un médico"`
-   `"ver directorio médico"`

---

### 🛠️ Soporte
El personal de Soporte Técnico se encarga de velar por el correcto funcionamiento de la plataforma.

#### **Dashboard de Soporte (`/soporte_dashboard`)**
-   **Métricas de Incidencias:** Visualización del total de tickets, casos pendientes, en progreso y críticos.
-   **Gráficos de Gestión:** Análisis visual de la distribución de tickets por estado y prioridad.
-   **Gestión de Tickets:** Tabla interactiva para listar todos los reportes enviados por los usuarios.
-   **Acciones Técnicas:**
    -   **Atender:** Cambia el estado del ticket a "En Progreso" y lo asigna al técnico actual.
    -   **Resolver:** Marca la incidencia como "Resuelta" una vez finalizada la tarea.

#### **Funcionalidades Compartidas**
-   Acceso a estadísticas de administración y visualización de registros de asistencia para diagnóstico del sistema.

---

### ❤️ Paciente
Acceso simplificado para que los pacientes gestionen su información de salud.

#### **Dashboard del Paciente**
-   **Próximas Citas:** Vea una lista clara de sus citas futuras, con fecha, hora y médico asignado.
-   **Información de Perfil:** Consulte sus datos de contacto registrados en la clínica.

#### **Mis Citas (`/mis_citas_paciente`)**
-   Consulte el historial completo de sus citas pasadas y futuras, incluyendo el estado de cada una.

#### **Mi Perfil (`/mi_perfil`)**
-   Acceda y actualice su información de contacto (teléfono, email) y cambie su contraseña.

---

## 4. Módulos Comunes

### 4.1. Mi Perfil (`/mi_perfil`)
Todos los usuarios que han iniciado sesión pueden gestionar su propia información.
-   **Actualizar Datos:** Cualquier usuario puede actualizar su **nombre completo, email y teléfono**.
-   **Cambiar Contraseña:** Dentro de la configuración de su perfil, puede cambiar su contraseña actual por una nueva, siempre que proporcione la contraseña actual correctamente.

### 4.2. Asistente Virtual (MediBot 🤖)
MediBot es un chatbot inteligente disponible en todas las áreas del sistema para ayudar a los usuarios.
-   **Página Principal:** Ayuda a los nuevos visitantes a entender qué es MedAsistencia y cómo registrarse.
-   **Paneles Internos:** Ofrece ayuda contextual y accesos directos según el rol del usuario. Por ejemplo, un médico puede preguntar por su agenda, mientras que un administrador puede pedir buscar un usuario.

---

## 5. Páginas Públicas e Informativas

### 5.1. Demo Interactiva (`/demo`)
Una página de demostración que permite a los visitantes explorar las funcionalidades clave del sistema para cada rol (Dashboard, Gestión de Pacientes, Citas, etc.) sin necesidad de registrarse.

### 5.2. Preguntas Frecuentes (`/faq`)
Resuelve dudas comunes sobre el uso de la plataforma. Las preguntas están organizadas en un formato de acordeón desplegable para una navegación sencilla. Encontrará respuestas visuales y textuales a temas como el proceso de registro, tipos de usuario, programación de citas y seguridad.

### 5.3. Términos y Política de Privacidad (`/terms`, `/privacy`)
Documentos legales que detallan las condiciones de uso del servicio y cómo se gestiona y protege la información de los usuarios y pacientes, en cumplimiento con las normativas de protección de datos.

---

## 6. Arquitectura Técnica

Esta sección describe los componentes técnicos y la estructura del proyecto MedAsistencia.

### 6.1. Backend (Python + Flask)
-   **Framework:** El backend está construido con [Flask](https://flask.palletsprojects.com/), un microframework de Python ligero y extensible.
-   **Estructura Modular:** El proyecto utiliza **Blueprints** de Flask para organizar el código en módulos cohesivos y reutilizables (ej. `auth.py`, `patients.py`, `appointments.py`). Esto mejora la mantenibilidad y escalabilidad.
-   **Seguridad:** La autenticación se gestiona mediante sesiones seguras y un middleware (`auth_middleware.py`) que protege las rutas mediante roles (ID 1: Admin, 2: Médico, 3: Recepción, 4: Paciente, 5: Soporte).
-   **Manejo de Base de Datos:** La interacción con la base de datos se realiza a través de la biblioteca `pyodbc`, con un sistema de pool de conexiones por thread para garantizar un manejo eficiente y seguro de las conexiones.

### 6.2. Frontend (HTML, CSS, JavaScript)
-   **Tecnologías:** El frontend está construido con HTML5, CSS3 y JavaScript puro (Vanilla JS), sin depender de frameworks pesados de frontend.
-   **Renderizado del Lado del Servidor:** Las plantillas se renderizan en el servidor utilizando el motor de plantillas **Jinja2**, integrado en Flask.
-   **Interactividad:** La interactividad del lado del cliente, como los dashboards dinámicos y los chatbots, se maneja con JavaScript, realizando llamadas asíncronas (Fetch API) a los endpoints de la API del backend.
-   **Diseño Responsivo:** La interfaz está diseñada para ser completamente responsiva y adaptable a diferentes tamaños de pantalla, desde ordenadores de escritorio hasta dispositivos móviles.

### 6.3. Base de Datos
-   **Motor:** El sistema utiliza una base de datos relacional para garantizar la integridad y consistencia de los datos. La estructura es compatible con sistemas como SQL Server, MySQL o PostgreSQL.
-   **Esquema:** El esquema de la base de datos está diseñado para reflejar las relaciones entre usuarios, médicos, pacientes, citas, horarios y otros componentes clave del sistema.

### 6.4. Estructura del Proyecto
El proyecto sigue una organización clara para separar las responsabilidades:
-   `/templates`: Contiene todas las plantillas HTML que se renderizan para el usuario.
-   `/static`: Almacena los archivos estáticos como CSS, JavaScript e imágenes.
-   `app.py` / `main.py`: Punto de entrada que inicializa la aplicación Flask y registra los Blueprints.
-   **Blueprints (`*.py`):** Archivos como `users.py`, `doctors.py`, etc., que contienen la lógica de negocio y las rutas para cada módulo principal.
-   **Utilidades y Configuración:** Archivos como `database.py`, `config.py`, `soporte.py` y `validators.py` que centralizan la configuración y las funciones de ayuda.

---

## 7. Soporte y Contacto

**Horario de Atención:**
-   Lunes a Viernes: 8:00 - 18:00
-   Sábados: 9:00 - 13:00

**Información de Contacto:**
-   **Teléfono:** 58+424 263 7306
-   **Email:** equipo.docente@hospitalelpaso.com
-   **Dirección:** Av. Principal, El Paso

---

*Este manual se actualizará a medida que se añadan nuevas funcionalidades al sistema MedAsistencia. Versión 2.2.*