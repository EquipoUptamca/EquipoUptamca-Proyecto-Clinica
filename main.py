from app import create_app
from init_database import init_database # Asegúrate de que este archivo exista y funcione
from flask import session, request

app = create_app()

@app.before_request
def check_session_hijacking():
    """
    Protector contra Secuestro de Sesión e Integridad.
    Verifica que la IP y el User-Agent coincidan con los de la sesión.
    """
    if 'id_usuario' in session and not request.endpoint.startswith('static'):
        ip_mismatch = session.get('ip_address') != request.remote_addr
        user_agent_mismatch = session.get('user_agent') != request.user_agent.string
        
        if ip_mismatch or user_agent_mismatch:
            session.clear()
            # Podrías redirigir al login o devolver un error.
            # Para una API, sería: return jsonify({'error': 'Sesión inválida detectada.'}), 401

if __name__ == '__main__':
    import os
    # Evita que la inicialización de la BD se ejecute dos veces con el reloader de Flask.
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        init_database()

    app.logger.info("Iniciando aplicación Flask...")
    # Ejecuta la aplicación en modo debug, accesible desde la red local.
    app.run(debug=True, host='0.0.0.0', port=5000)