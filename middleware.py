# middleware.py
from flask import request, jsonify
import jwt
from functools import wraps

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token es requerido'}), 401
            
        try:
            # Remover 'Bearer ' del token
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decodificar el token
            data = jwt.decode(token, 'tu_secreto_jwt', algorithms=['HS256'])
            request.current_user = data
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expirado'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
            
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        # Verificar si el usuario tiene rol de administrador (id_rol = 1)
        if not hasattr(request, 'current_user') or request.current_user.get('id_rol') != 1:
            return jsonify({'error': 'Se requieren permisos de administrador'}), 403
        return f(*args, **kwargs)
    return decorated

def medico_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        # Verificar si el usuario tiene rol de médico (id_rol = 2) o es admin (id_rol = 1)
        if not hasattr(request, 'current_user') or request.current_user.get('id_rol') not in [1, 2]:
            return jsonify({'error': 'Se requieren permisos de médico'}), 403
        return f(*args, **kwargs)
    return decorated

def recepcion_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        # Verificar si el usuario tiene rol de recepción (id_rol = 3) o es admin (id_rol = 1)
        if not hasattr(request, 'current_user') or request.current_user.get('id_rol') not in [1, 3]:
            return jsonify({'error': 'Se requieren permisos de recepción'}), 403
        return f(*args, **kwargs)
    return decorated