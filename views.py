# views.py
from flask import Blueprint, render_template

views_bp = Blueprint('views', __name__)

@views_bp.route('/')
def index():
    return render_template('index.html')

@views_bp.route('/privacy')
def privacy():
    return render_template('privacy.html')

@views_bp.route('/terms')
def terms():
    return render_template('terms.html')

@views_bp.route('/faq')
def faq():
    return render_template('faq.html')

@views_bp.route('/login')
def login_page():
    return render_template('login.html')

@views_bp.route('/forgot_contraseña')
def forgot_contraseña():
    return render_template('forgot_contraseña.html')

@views_bp.route('/reset_contraseña')
def reset_contraseña():
    return render_template('reset_contraseña.html')

@views_bp.route('/register')
def register_page():
    return render_template('register.html')

@views_bp.route('/doctor_dashboard')
def doctor_dashboard():
    return render_template('doctor_dashboard.html')

@views_bp.route('/admin_dashboard')
def admin_dashboard():
    return render_template('admin_dashboard.html')

@views_bp.route('/reception_dashboard')
def reception_dashboard():
    return render_template('reception_dashboard.html')

@views_bp.route('/nuevo_usuario')
def nuevo_usuario():
    return render_template('nuevo_usuario.html')

@views_bp.route('/citas')
def citas():
    return render_template('citas.html')

@views_bp.route('/nueva_cita')
def nueva_cita():
    return render_template('nueva_cita.html')

@views_bp.route('/pacientes')
def pacientes():
    return render_template('pacientes.html')

@views_bp.route('/paciente_recep')
def paciente_recep():
    return render_template('pacientes_recep.html')

@views_bp.route('/citas_recep')
def citas_recep():
    return render_template('citas_recep.html')

@views_bp.route('/horarios_recep')
def horarios_recep():
    return render_template('horarios_recep.html')

@views_bp.route('/directorio_medico_recep')
def directorio_medico_recep():
    return render_template('directorio_medico_recep.html')

@views_bp.route('/nuevo_paciente')
def nuevo_paciente():
    pass

@views_bp.route('/medicos')
def medicos():
    return render_template('medicos.html')

@views_bp.route('/horarios')
def horarios():
    return render_template('horarios.html')

@views_bp.route('/users')
def users():
    return render_template('users.html')

@views_bp.route('/asistencias')
def asistencias_page():
    return render_template('asistencias.html')

# Agrega estas nuevas rutas para las consultas
@views_bp.route('/consultas_login')
def consultas_login():
    return render_template('consultas_login.html')

@views_bp.route('/consultas_pacientes')
def consultas_pacientes():
    return render_template('consultas_pacientes.html')

@views_bp.route('/Mi Horario.html')
def Mi_Horario():
    return render_template('Mi Horario.html')

@views_bp.route('/Mi Citas.html')
def Mi_Citas():
    return render_template('Mi Citas.html')

@views_bp.route('/paciente_dashboard')
def paciente_dashboard():
    return render_template('paciente_dashboard.html')

@views_bp.route('/mi_perfil')
def mi_perfil():
    return render_template('mi_perfil.html')

@views_bp.route('/mis_citas_paciente')
def mis_citas_paciente():
    return render_template('mis_citas_paciente.html')

@views_bp.route('/reportes_recepcion')
def reportes_recepcion():
    return render_template('reportes_recepcion.html')

@views_bp.route('/perfil_medico')
def perfil_medico():
    return render_template('perfil_medico.html')

@views_bp.route('/reportes_medico')
def reportes_medico():
    return render_template('reportes_medico.html')

@views_bp.route('/mis_consultas')
def mis_citas_medico():
    return render_template('mis_consultas.html')