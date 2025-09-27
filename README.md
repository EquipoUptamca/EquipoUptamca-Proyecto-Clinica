# MedAsistencia - Manual de Usuario

Bienvenido a MedAsistencia, la plataforma integral para la gestión del Centro Médico Docente El Paso. Este manual le guiará a través de las funcionalidades clave del sistema, asegurando que pueda utilizar todas las herramientas a su disposición de manera eficiente.

---

## 1. Introducción

MedAsistencia es un sistema de gestión médica diseñado para optimizar las operaciones de la clínica, mejorar la atención al paciente y proporcionar herramientas eficientes para el personal administrativo y médico. La plataforma centraliza la gestión de usuarios, médicos, pacientes, horarios y citas en una interfaz moderna, profesional y segura.

## 2. Características Principales

-   **Gestión por Roles:** Acceso seguro y diferenciado para Administradores, Médicos, Recepcionistas y Pacientes.
-   **Dashboard Interactivo:** Paneles de control personalizados para cada rol con estadísticas y accesos directos relevantes.
-   **Gestión de Usuarios:** Creación, edición y desactivación de todas las cuentas del sistema.
-   **Gestión de Médicos y Pacientes:** Administración completa de perfiles profesionales y expedientes de pacientes.
-   **Sistema de Citas:** Programación, confirmación, cancelación y seguimiento del estado de las citas.
-   **Gestión de Horarios:** Visualización y administración de los horarios de trabajo de los médicos.
-   **Notificaciones Modernas:** Alertas flotantes para confirmar acciones y notificar errores de forma intuitiva.
-   **Seguridad:** Autenticación robusta y sistema de recuperación de contraseña.
-   **Asistente Virtual (Chatbot):** Ayuda contextual y accesos directos para Administradores, Médicos y Recepcionistas.

---

## 3. Primeros Pasos

### Iniciar Sesión
1.  Acceda a la página principal y haga clic en el botón **"Iniciar Sesión"**.
2.  Ingrese su nombre de usuario y contraseña.
3.  Será redirigido al panel de control (Dashboard) correspondiente a su rol.

### Registrarse
1.  En la página principal, haga clic en **"Registrarse"**.
2.  Complete el formulario con su información personal y profesional (si aplica).
3.  Seleccione el tipo de usuario que corresponde a su función.
4.  Una vez enviado el formulario, su cuenta será creada.

### Recuperar Contraseña
1.  En la página de inicio de sesión, haga clic en el enlace para recuperar contraseña.
2.  Ingrese su nombre de usuario o correo electrónico registrado.
3.  Recibirá un correo con un enlace para restablecer su contraseña.

---

## 4. Guía por Rol de Usuario

### 👤 Administrador

El Administrador tiene acceso completo a todas las funcionalidades del sistema para una gestión total.

#### **Dashboard del Administrador**
-   **Estadísticas Clave:** Visualice en tiempo real el número de médicos, pacientes, citas del día y usuarios activos.
-   **Gráficos Interactivos:** Analice la tendencia de citas por período y la distribución de estados de citas (pendientes, completadas, etc.).
-   **Actividad Reciente:** Monitoree los últimos registros de médicos, pacientes y citas.
-   **Asistente de Admin:** Un chatbot para guiar en tareas administrativas. Puede buscar usuarios de forma interactiva o dar enlaces directos a las secciones de gestión.

#### **Gestión de Usuarios (`/users`)**
-   **Crear Usuario:** Haga clic en **"Nuevo Usuario"**, complete el formulario en el modal y guarde.
-   **Editar Usuario:** En la tabla, haga clic en el icono de lápiz (<i class="fas fa-edit"></i>) de un usuario para modificar sus datos.
-   **Buscar y Filtrar:** Utilice los campos de búsqueda y los filtros por rol y estado para encontrar usuarios rápidamente.
-   **Desactivar/Activar:** Use el botón de encendido/apagado (<i class="fas fa-power-off"></i>) para cambiar el estado de un usuario.

#### **Gestión de Médicos (`/medicos`)**
-   **Crear Médico:** Promueva un usuario existente a médico, asignándole una especialidad y número de colegiado.
-   **Editar Perfil Profesional:** Modifique la especialidad, experiencia y datos de contacto de un médico.
-   **Exportar Datos:** Exporte la lista de médicos a formatos como Excel o PDF.

#### **Gestión de Asistencias (`/asistencias`)**
-   **Registrar Asistencia:** Marque la hora de entrada y salida de los médicos.
-   **Filtrar Registros:** Busque el historial de asistencias por médico o por rango de fechas.

### 👨‍⚕️ Médico

El rol de Médico está enfocado en la gestión de su agenda y el acceso rápido a la información de sus pacientes.

#### **Dashboard del Médico**
-   **Resumen Diario:** Vea de un vistazo las citas programadas para hoy, las citas pendientes y las completadas en la última semana.
-   **Asistente Personal:** Un chatbot integrado que responde preguntas sobre su agenda. Pruebe a preguntar:
    -   *"¿Cuál es mi horario?"*
    -   *"¿Cuántas citas tengo hoy?"*
    -   *"Ver mis citas pendientes"*

#### **Mis Citas (`/Mi Citas.html`)**
-   **Visualización Completa:** Acceda a un listado detallado de todas sus citas (pasadas, presentes y futuras).
-   **Filtrar Citas:** Busque citas por fecha o estado (Pendiente, Confirmada, Completada, Cancelada).
-   **Gestionar Citas:**
    -   **Confirmar:** Haga clic en el botón **"Confirmar"** para validar una cita pendiente.
    -   **Completar:** Tras atender al paciente, marque la cita como **"Completada"** con el botón correspondiente.
    -   **Cancelar:** Cancele una cita si es necesario.

#### **Mi Horario (`/Mi Horario.html`)**
-   **Vista Semanal:** Visualice su horario de trabajo de toda la semana, con bloques de tiempo disponibles y citas ya programadas.
-   **Navegación:** Avance o retroceda entre semanas para planificar a futuro.
-   **Detalles del Bloque:** Haga clic en cualquier bloque horario para ver detalles, como la información del paciente en caso de una cita.
-   **Imprimir:** Imprima una versión limpia de su horario semanal.

#### **Consultas (`/consultas_login`)**
-   **Historial Clínico:** Acceda al historial de consultas de sus pacientes para un seguimiento detallado.

### 📋 Recepción

El personal de recepción es clave en la gestión diaria de citas y pacientes.

#### **Dashboard de Recepción**
-   **Vista del Día:** Conozca el número total de citas para el día actual y cuántas están pendientes de confirmación.
-   **Nuevos Pacientes:** Monitoree el número de pacientes nuevos registrados en la semana.
-   **Asistente Virtual:** Un chatbot disponible para resolver dudas rápidas sobre cómo registrar pacientes, agendar citas, consultar horarios o buscar en el directorio médico.

#### **Funcionalidades Principales**
-   **Gestión de Citas (`/citas_recep`):** Agende, reagende o cancele citas para cualquier médico usando un calendario interactivo.
-   **Gestión de Pacientes (`/paciente_recep`):** Registre nuevos pacientes y actualice su información de contacto.
-   **Horarios Médicos (`/horarios_recep`):** Consulte la disponibilidad de todos los médicos para una mejor planificación.
-   **Directorio Médico (`/directorio_medico_recep`):** Acceda rápidamente a la información de contacto de los especialistas.
-   **Registro de Asistencia (`/asistencias`):** Lleve un control de la llegada y salida de los médicos.

### ❤️ Paciente

Los pacientes tienen un acceso simplificado para gestionar su información y sus citas.

#### **Dashboard del Paciente**
-   **Próximas Citas:** Vea una lista de sus citas futuras, incluyendo fecha, hora y médico asignado.
-   **Perfil Personal:** Acceda a su información personal y de contacto para mantenerla actualizada.

---

*Este manual se actualizará a medida que se añadan nuevas funcionalidades al sistema MedAsistencia.*