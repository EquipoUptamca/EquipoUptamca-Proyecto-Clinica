# Contribuir a MedAsistencia

¡Gracias por tu interés en contribuir a MedAsistencia! Estamos emocionados de recibir ayuda de la comunidad. Toda contribución, desde la corrección de un error tipográfico hasta la implementación de una nueva funcionalidad, es bienvenida.

## Código de Conducta

Este proyecto y todos los que participan en él se rigen por nuestro [Código de Conducta](CODE_OF_CONDUCT.md). Al participar, se espera que respetes este código. Por favor, reporta cualquier comportamiento inaceptable.

## ¿Cómo puedo contribuir?

### Reportando Bugs

Si encuentras un bug, por favor, asegúrate de que no haya sido reportado previamente abriendo una nueva "Issue" en GitHub. Al reportar un bug, incluye:

-   **Descripción clara y concisa** de cuál es el bug.
-   **Pasos para reproducir** el comportamiento.
-   **Comportamiento esperado** vs. **comportamiento actual**.
-   **Capturas de pantalla** si es posible.
-   **Información del entorno** (navegador, sistema operativo).

### Sugiriendo Mejoras

Si tienes una idea para una nueva funcionalidad o una mejora para una existente:

1.  Abre una "Issue" en GitHub.
2.  Describe la mejora en detalle, explicando por qué sería útil para los usuarios del sistema.
3.  Si es posible, proporciona ejemplos o mockups de cómo se vería.

### Pull Requests

Las contribuciones de código son la mejor manera de ayudar. A continuación, se detalla el proceso para enviar un Pull Request (PR).

## Configuración del Entorno de Desarrollo

1.  **Fork y Clona el Repositorio**
    -   Haz un "Fork" del repositorio a tu propia cuenta de GitHub.
    -   Clona tu fork localmente: `git clone https://github.com/TU_USUARIO/MedAsistencia.git`

2.  **Crea un Entorno Virtual**
    -   Navega al directorio del proyecto: `cd MedAsistencia`
    -   Crea un entorno virtual: `python -m venv venv`
    -   Actívalo:
        -   Windows: `venv\Scripts\activate`
        -   macOS/Linux: `source venv/bin/activate`

3.  **Instala las Dependencias**
    -   Instala todos los paquetes necesarios: `pip install -r requirements.txt`

4.  **Configura la Base de Datos**
    -   Asegúrate de tener una instancia de SQL Server en ejecución.
    -   Copia el archivo `config.py` y renómbralo si necesitas configuraciones locales.
    -   Ejecuta el script de inicialización para crear las tablas y datos iniciales: `python init_database.py`

5.  **Ejecuta la Aplicación**
    -   Inicia el servidor de desarrollo de Flask: `python main.py`
    -   La aplicación estará disponible en `http://127.0.0.1:5000`.

## Proceso de Pull Request

1.  **Crea una Rama:** Crea una nueva rama para tu funcionalidad o corrección de bug.
    ```bash
    git checkout -b feat/nombre-de-la-funcionalidad
    ```
    o
    ```bash
    git checkout -b fix/descripcion-del-bug
    ```

2.  **Realiza tus Cambios:** Escribe tu código siguiendo las guías de estilo.

3.  **Haz Commit de tus Cambios:** Usa mensajes de commit claros y descriptivos. Recomendamos seguir el estándar de Conventional Commits.
    ```bash
    git commit -m "feat: Añade la funcionalidad de exportar reportes a PDF"
    ```

4.  **Sube tus Cambios:** Sube tu rama a tu fork en GitHub.
    ```bash
    git push origin feat/nombre-de-la-funcionalidad
    ```

5.  **Abre un Pull Request:** Ve a la página del repositorio original en GitHub y abre un nuevo Pull Request.
    -   Asegúrate de que el PR esté dirigido a la rama `main` del repositorio original.
    -   Proporciona una descripción clara de los cambios y enlaza la "Issue" correspondiente si existe.

## Guías de Estilo

### Código Python
-   Sigue el estilo de código **PEP 8**.
-   Añade comentarios claros a tu código, especialmente en las partes complejas.
-   Documenta las nuevas funciones con docstrings.

### Código JavaScript
-   Usa JavaScript moderno (ES6+).
-   Mantén un estilo consistente y legible.
-   Comenta la lógica compleja.

### Mensajes de Commit
-   **feat:** Para nuevas funcionalidades.
-   **fix:** Para correcciones de bugs.
-   **docs:** Para cambios en la documentación.
-   **style:** Para cambios de formato que no afectan la lógica.
-   **refactor:** Para refactorizaciones de código.
-   **test:** Para añadir o corregir tests.

¡Gracias por ayudar a hacer de MedAsistencia una mejor plataforma!