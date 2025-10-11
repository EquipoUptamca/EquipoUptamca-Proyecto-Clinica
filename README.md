# MedAsistencia - Manual de Usuario Completo

Bienvenido a MedAsistencia, la plataforma integral de gestión para el Centro Médico Docente El Paso. Este manual le guiará a través de todas las funcionalidades del sistema, asegurando que pueda utilizar las herramientas a su disposición de manera eficiente y profesional.

---

## 1. Introducción

MedAsistencia es un sistema de gestión médica diseñado para optimizar las operaciones de la clínica, mejorar la atención al paciente y proporcionar herramientas eficientes para el personal administrativo y médico. La plataforma centraliza la gestión de usuarios, médicos, pacientes, horarios y citas en una interfaz moderna, profesional y segura, con un diseño visual renovado para una mejor experiencia de usuario.

### Características Principales
-   **Gestión por Roles:** Acceso seguro y diferenciado para Administradores, Médicos, Recepcionistas y Pacientes.
-   **Dashboards Interactivos:** Paneles de control personalizados para cada rol con estadísticas y accesos directos.
-   **Gestión Integral:** Administración completa de usuarios, perfiles de médicos, expedientes de pacientes y horarios.
-   **Sistema de Citas Avanzado:** Programación, confirmación, cancelación y seguimiento del estado de las citas.
-   **Gestión de Asistencia:** Registro y seguimiento de la asistencia del personal médico.
-   **Reportes y Análisis:** Módulo para generar reportes de actividad, ocupación, nuevos pacientes y más.
-   **Historial Clínico:** Gestión de consultas y seguimiento del historial médico de los pacientes.
-   **Seguridad Robusta:** Autenticación segura, recuperación de contraseña y protección de roles privilegiados.
-   **Asistente Virtual (Chatbot):** Ayuda contextual y accesos directos para roles administrativos y médicos.
-   **Demo Interactiva:** Una página de demostración pública que muestra las características clave del sistema.

---

## 2. Primeros Pasos

### Iniciar Sesión
1.  Acceda a la página principal y haga clic en **"Iniciar Sesión"**.
2.  Ingrese su **identificador** (nombre de usuario, cédula o email) y su **contraseña**.
3.  Será redirigido al panel de control (Dashboard) correspondiente a su rol.

### Registrarse
El registro está abierto para pacientes. El personal interno (Administradores, Médicos, Recepcionistas) requiere un código de seguridad.

1.  En la página principal, haga clic en **"Registrarse"**.
2.  Complete el formulario con su información:
    -   Nombre Completo, Nombre de Usuario, Cédula, Teléfono y Correo Electrónico.
    -   Cree una contraseña segura (mínimo 8 caracteres) y confírmela.
3.  Seleccione el **Tipo de Usuario**:
    -   **Paciente:** Registro estándar.
    -   **Administrador, Médico o Recepción:** Al seleccionar uno de estos roles, se desplegará un campo adicional.
4.  **Código de Seguridad:** Si se registra con un rol privilegiado, deberá ingresar el código de seguridad `privacidad_medasistencia` para poder continuar.
5.  Haga clic en **"Registrarse"** para crear su cuenta.

### Recuperar Contraseña
Si olvidó su contraseña, puede recuperarla de forma segura.

1.  En la página de inicio de sesión, haga clic en el enlace para recuperar contraseña.
2.  Ingrese su **identificador** (nombre de usuario o correo electrónico).
3.  Recibirá un correo electrónico con un **código de 6 dígitos** válido por 15 minutos.
4.  En la página de restablecimiento, ingrese el código, su identificador y su nueva contraseña.

---

## 3. Guía por Rol de Usuario

### 👤 Administrador
El Administrador tiene control total sobre el sistema.

#### **Dashboard del Administrador**
-   **Estadísticas Clave:** Visualice en tiempo real el número de médicos, pacientes, citas del día y usuarios activos.
-   **Gráficos Interactivos:** Analice tendencias de citas y distribución de estados.
-   **Actividad Reciente:** Monitoree los últimos registros en el sistema.

#### **Gestión de Usuarios (`/users`)**
-   **Crear, Editar y Desactivar:** Administre todas las cuentas del sistema.
-   **Buscar y Filtrar:** Utilice la barra de búsqueda y los filtros por rol y estado para encontrar usuarios rápidamente.
-   **Cambio de Rol:** Modifique el rol de un usuario (ej. de Paciente a Recepción), lo que ajustará sus permisos automáticamente.

#### **Gestión de Asistencias (`/asistencias`)**
-   Registre la entrada y salida de los médicos.
-   Filtre y visualice el historial de asistencias por fecha o por médico.

#### **Reportes Avanzados**
-   Acceda a reportes detallados sobre la actividad de citas, cumplimiento, nuevos pacientes y ocupación de médicos.

#### **Gestión de Médicos y Pacientes (`/medicos`, `/pacientes`)**
-   Promueva usuarios existentes a perfiles de Médico o Paciente.
-   Edite perfiles profesionales, especialidades y datos de contacto.
-   Consulte y actualice expedientes de pacientes.

#### **Asistente Virtual (Chatbot de Admin)**
Use el chatbot para agilizar tareas. Pruebe comandos como:
-   `"buscar usuario"`: Para encontrar un usuario específico.
-   `"gestionar médicos"`: Acceso directo a la gestión de médicos.
-   `"ver horarios"`: Para ir a la página de gestión de horarios.

### 👨‍⚕️ Médico
El rol de Médico está enfocado en la gestión de su agenda y pacientes.

#### **Dashboard del Médico**
-   **Resumen Diario:** Vea de un vistazo sus citas para hoy, citas pendientes y las completadas recientemente.
-   **Estadísticas Personales:** Monitoree su rendimiento, como el total de citas en el mes.

#### **Mis Consultas (`/mis_consultas`)**
-   **Visualización Completa:** Acceda a un listado detallado de todas sus citas y consultas pasadas.
-   **Filtrar y Gestionar:** Busque por fecha o estado (Programada, Completada, Cancelada) y gestione el estado de sus citas.
-   **Historial Clínico:** Registre y consulte el historial de consultas de sus pacientes.

#### **Mi Horario (`/horarios`)**
-   **Vista Semanal:** Visualice su horario de trabajo, con bloques de tiempo disponibles y citas programadas.
-   **Navegación:** Avance o retroceda entre semanas para planificar a futuro.
-   **Impresión:** Genere una versión imprimible de su horario semanal.

#### **Asistente Virtual (Chatbot del Médico)**
Su asistente personal para consultas rápidas. Pruebe a preguntar:
-   `"¿Cuál es mi horario?"`
-   `"¿Cuántas citas tengo hoy?"`
-   `"Ver mis citas pendientes"`
-   `"Mis estadísticas"`

### 📋 Recepción
Rol clave para la gestión diaria de la clínica.

#### **Dashboard de Recepción**
-   **Vista del Día:** Conozca el número de citas para hoy y cuántas están pendientes de confirmación.
-   **Nuevos Pacientes:** Monitoree los pacientes registrados en la semana.

#### **Funcionalidades Principales**
-   **Gestión de Citas (`/citas_recep`):** Agende, reagende o cancele citas para cualquier médico.
-   **Gestión de Pacientes (`/pacientes_recep`):** Registre nuevos pacientes y actualice su información.
-   **Horarios Médicos (`/horarios_recep`):** Consulte la disponibilidad de todos los médicos para una mejor planificación.
-   **Directorio Médico (`/directorio_medico_recep`):** Acceda a la información de contacto de los especialistas.
-   **Registro de Asistencia (`/asistencias`):** Marque la entrada y salida de los médicos.

#### **Asistente Virtual (Chatbot de Recepción)**
Resuelve dudas operativas. Pruebe comandos como:
-   `"registrar nuevo paciente"`
-   `"agendar una cita"`
-   `"consultar horario de un médico"`
-   `"ver directorio médico"`

### ❤️ Paciente
Acceso simplificado para gestionar su salud.

#### **Dashboard del Paciente**
-   **Próximas Citas:** Vea una lista de sus citas futuras, con fecha, hora y médico.
-   **Mis Citas (`/mis_citas_paciente`):** Consulte el historial completo de sus citas pasadas y futuras.
-   **Mi Perfil (`/mi_perfil`):** Acceda y actualice su información de contacto y contraseña.

---

## 4. Funcionalidades Comunes

Todos los usuarios que han iniciado sesión pueden gestionar su propia información.

### Mi Perfil (`/mi_perfil`)
-   Cualquier usuario puede actualizar su **nombre completo, email y teléfono** desde la configuración de su perfil.

### Cambiar Contraseña
-   Dentro de la configuración de su perfil, puede cambiar su contraseña actual por una nueva, siempre que proporcione la contraseña actual correctamente.

---

## 5. Preguntas Frecuentes (FAQ)

Para resolver dudas comunes sobre el uso de la plataforma, visite la sección de **Preguntas Frecuentes (FAQ)**. Las preguntas están organizadas en un formato de acordeón desplegable para una navegación más sencilla. Encontrará respuestas visuales y textuales a temas como:
-   Proceso de registro.
-   Tipos de usuario.
-   Programación de citas.
-   Seguridad de la información.

---

## 6. Soporte y Contacto

**Horario de Atención:**
-   Lunes a Viernes: 8:00 - 18:00
-   Sábados: 9:00 - 13:00

**Información de Contacto:**
-   **Teléfono:** 58+424 263 7306
-   **Email:** equipo.docente@hospitalelpaso.com
-   **Dirección:** Av. Principal, El Paso

---

*Este manual se actualizará a medida que se añadan nuevas funcionalidades al sistema MedAsistencia. Versión 2.1.*