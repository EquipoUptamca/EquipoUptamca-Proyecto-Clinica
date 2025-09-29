// server.js
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');

const app = express();
app.use(bodyParser.json());

// Configuración de la base de datos
const dbConfig = {
    user: 'RAFA2004\\YepBuddy2',
    password: '',
    server: 'RAFA2004\\SQLEXPRESS',
    database: 'asistencia_medica_clinica',
    options: {
        encrypt: true, // Si usas Azure
        trustServerCertificate: true // Para desarrollo local
    }
};

// Ruta de registro
app.post('/api/usuarios/registro', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        
        // Verificar si el usuario ya existe
        const userCheck = await pool.request()
            .input('usuario_login', sql.VarChar, req.body.usuario_login)
            .query('SELECT * FROM usuarios WHERE usuario_login = @usuario_login');
            
        if (userCheck.recordset.length > 0) {
            return res.status(400).json({ message: 'El nombre de usuario ya existe' });
        }
        
        // Insertar nuevo usuario
        const result = await pool.request()
            .input('nombre_completo', sql.VarChar, req.body.nombre_completo)
            .input('usuario_login', sql.VarChar, req.body.usuario_login)
            .input('contraseña', sql.VarChar, req.body.contraseña) // En producción, hashear la contraseña
            .input('id_rol', sql.Int, req.body.id_rol)
            .query('INSERT INTO usuarios (nombre_completo, usuario_login, contraseña, id_rol) VALUES (@nombre_completo, @usuario_login, @contraseña, @id_rol)');
            
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ message: 'Error en el servidor al registrar usuario' });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});