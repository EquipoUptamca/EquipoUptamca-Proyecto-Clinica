import logging

# La configuración del logging (basicConfig) se realiza una sola vez en app.py.
# Los otros módulos, como 'patients.py', ya obtienen su logger correctamente
# con `logging.getLogger(__name__)`, por lo que este archivo es redundante.
# Lo dejamos vacío para evitar problemas, pero podría ser eliminado si no se importa en ningún otro lugar.
