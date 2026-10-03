# AmirCorp-ERP-Web (pantalla)

Frontend del ERP de H&P Pizarro Accesorios. Va siempre junto con la API, `AmirCorp-ERP`. Las reglas generales (la pantalla no tiene lógica de negocio, cómo trabaja el usuario, comandos) están en el `CLAUDE.md` de la carpeta que contiene los dos repositorios.

## Regla de diseño: estilo Apple

Todas las pantallas usan el mismo estilo Apple del inicio de sesión aprobado; las reglas concretas están en `docs/diseno.md` (sección "Regla: estilo Apple"). El rediseño va pantalla por pantalla: primero la maqueta en el lienzo de diseño (Claude Design), el usuario la aprueba y recién después se programa. Los valores van a tokens de `src/styles.css`. No mezclar el estilo nuevo con el anterior en una misma pantalla.

## Documentación: se actualiza en cada cambio

Actualizar la documentación de **los dos repositorios** en el mismo commit que el cambio. Si una decisión cambia, agregar una entrada nueva en vez de borrar la anterior.

- `AmirCorp-ERP/docs/decisiones.md`: toda decisión o cambio de comportamiento, con su motivo.
- `AmirCorp-ERP/docs/arquitectura.md`: capas, patrones, dónde va cada validación, concurrencia.
- `AmirCorp-ERP/docs/configuracion.md`: claves de configuración y migraciones.
- `AmirCorp-ERP/docs/hoja-de-ruta.md`: lo hecho y lo pendiente.
- `AmirCorp-ERP/README.md`: ejemplos que citen mensajes o endpoints.
- `AmirCorp-ERP-Web/docs/decisiones.md`: lo que cambió en la pantalla (puede remitir a la decisión de la API).
- `AmirCorp-ERP-Web/docs/arquitectura.md`: flujo de datos, sesión, llamadas a la API, cómo agregar una pantalla.
- `AmirCorp-ERP-Web/docs/diseno.md`: colores (con su contraste medido), tamaños, reglas visuales y componentes base.

Antes de dar el trabajo por terminado, buscar en esos archivos lo que el cambio dejó desactualizado (nombres de componentes, archivos, mensajes citados).
