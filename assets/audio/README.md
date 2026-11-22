# Audios locales

Coloca aquí los archivos `.mp3`, `.ogg`, `.wav`, `.m4a` o `.aac` que quieras publicar sin usar Vercel Blob.

Después, en el administrador pega en **Archivo o URL** una ruta como:

`/assets/audio/presentacion-frecuencia-abierta.mp3`

La ruta empieza con `/assets/`, no con `C:\` ni con una ruta de tu computador. Al desplegar el sitio, Vercel publicará estos archivos como recursos estáticos.

Para pruebas locales, ejecuta `py -m http.server 8080` desde la raíz del proyecto y abre `http://localhost:8080/`.
