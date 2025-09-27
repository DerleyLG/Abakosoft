const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        console.warn('[verifyToken] Authorization header missing');
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        console.warn('[verifyToken] Authorization header malformed:', authHeader);
        return res.status(401).json({ error: 'Token mal formado' });
    }
    const token = parts[1];
    
 
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          
            console.warn('[verifyToken] jwt.verify error:', err && err.message);
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

      
        req.user = decoded; 
      
        next();
    });
};