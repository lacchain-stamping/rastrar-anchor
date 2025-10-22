# Crear directorio para los certificados
mkdir -p /root/ssl-rastrar

# Extraer la clave privada
openssl pkey -in /var/cpanel/ssl/apache_tls/rastrar.com/combined -out /root/ssl-rastrar/private.key

# Extraer el certificado
openssl x509 -in /var/cpanel/ssl/apache_tls/rastrar.com/combined -out /root/ssl-rastrar/certificate.crt

# Dar permisos seguros
chmod 600 /root/ssl-rastrar/private.key
chmod 644 /root/ssl-rastrar/certificate.crt

# Verificar que se crearon correctamente
ls -la /root/ssl-rastrar/
