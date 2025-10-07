from app import create_app
from init_database import init_database
from flask import session, request, jsonify

app = create_app()

@app.before_request
def check_session_hijacking():
    """
    SessionHijackingProtector & IntegrityValidator
    Verifica en cada solicitud que la IP y el User-Agent coincidan con los
    almacenados en la sesión al momento del login.
    """
    # Excluir endpoints que no requieren sesión (ej. login, register, static)
    if 'id_usuario' in session and not request.endpoint.startswith('static'):
        
        # Comprobar si la IP o el User-Agent han cambiado
        ip_mismatch = session.get('ip_address') != request.remote_addr
        user_agent_mismatch = session.get('user_agent') != request.user_agent.string
        
        if ip_mismatch or user_agent_mismatch:
            # Si hay una discrepancia, se invalida la sesión por seguridad.
            session.clear()
            # En una API, podrías devolver un error 401.
            # return jsonify({'error': 'Sesión inválida detectada.'}), 401

if __name__ == '__main__':
    # Inicializar la base de datos solo cuando se ejecuta el script directamente
    # y no en el proceso del recargador
    import os
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        init_database()

    # El logging se configura dentro de create_app(), por lo que usamos el logger de la app
    app.logger.info("Iniciando aplicación Flask...")
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=True)