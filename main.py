from app import create_app
from init_database import init_database

app = create_app()

if __name__ == '__main__':
    # Inicializar la base de datos solo cuando se ejecuta el script directamente
    # y no en el proceso del recargador
    import os
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        init_database()

    # El logging se configura dentro de create_app(), por lo que usamos el logger de la app
    app.logger.info("Iniciando aplicación Flask...")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=True)