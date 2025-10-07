# app.py
from flask import Flask
import logging
import os
from flask_cors import CORS
from flask_wtf.csrf import CSRFProtect
from datetime import timedelta

# Import blueprints
from views import views_bp
from auth import auth_bp
from dashboard import dashboard_bp
from users import users_bp
from doctors import doctors_bp
from patients import patients_bp
from appointments import appointments_bp
from schedules import schedules_bp
from consultas import consultas_bp
from chatbot import chatbot_bp
from reports import reports_bp
from asistencia import asistencias_bp
from user_profile import profile_bp

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    
    # --- CONFIGURACIÓN DE SEGURIDAD ---
    
    # 1. Clave secreta (SECRET_KEY)
    # Fundamental para firmar cookies de sesión y tokens CSRF.
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # 2. Configuración de Cookies Seguras (CookieSecurityManager)
    # HttpOnly: previene acceso a la cookie desde JS (mitiga XSS).
    # Secure: la cookie solo se envía sobre HTTPS en producción.
    # SameSite: previene que la cookie se envíe en peticiones cross-site (mitiga CSRF).
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = True if os.environ.get('FLASK_ENV') == 'production' else False
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    
    # 3. Configuración de Expiración de Sesión
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)
    app.config['SESSION_REFRESH_EACH_REQUEST'] = True
    
    # 4. Habilitar CORS para endpoints de API
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Configure logging
    log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app.log')
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            # Use an absolute path for the log file to avoid permission errors
            logging.FileHandler(log_file_path),
            logging.StreamHandler()
        ]
    )
    
    # Register blueprints
    app.register_blueprint(views_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(doctors_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(schedules_bp)
    app.register_blueprint(consultas_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(asistencias_bp) # No change needed here, blueprint name is the same
    app.register_blueprint(profile_bp)
    
    # 5. Inicializar protección CSRF (CSRFProtector) y eximir Blueprints de API
    csrf = CSRFProtect()
    csrf.init_app(app)
    
    # Eximimos los blueprints que funcionan como API para que no requieran token CSRF
    # en sus peticiones POST/PUT, ya que se manejan con JS y CORS.
    csrf.exempt(auth_bp)
    
    return app