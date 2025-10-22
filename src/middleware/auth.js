import dotenv from 'dotenv';

dotenv.config();

export const authMiddleware = (req, res, next) => {
  const token = req.headers['x-api-token'];
    
  if (!process.env.X_TOKEN_API) {
    return res.status(503).json({
      success: false,
      error: 'Servicio no configurado. Use POST /setup primero.'
    });
  }
  
  if (!token || token !== process.env.X_TOKEN_API) {
   //console.log(req.headers)
    return res.status(401).json({
      success: false,
      error: 'Token de autenticación inválido o faltante'
    });
  }
  
  next();
};
