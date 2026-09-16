# P.O.D.D.E.R — Landing Page

Landing page de conversión para el programa **P.O.D.D.E.R**, de **The Management Lab®**.
Programa presencial en Bogotá para gerentes: aprender a navegar el poder, fortalecer la
posición y hacer avanzar la carrera.

## Estructura

Es un sitio estático de un solo archivo. No requiere build ni dependencias.

```
podder-landing/
├── index.html          # La landing completa (HTML + CSS embebido)
├── pulso/
│   └── index.html      # Pulso de Navegación Organizacional (subpágina /pulso, misma identidad)
└── assets/
    ├── og-image.png    # Imagen para compartir en redes (Open Graph)
    └── tml-logo-white-transparent.png
```

## Cómo verlo en local

Abre `index.html` directamente en el navegador (doble clic), o sirve la carpeta:

```bash
# Python
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## Secciones

1. Hero (promesa + video)
2. Credenciales (trayectoria de Felipe Méndez + respaldo de The Management Lab)
3. Dolor
4. Costo de no actuar
5. Antes / Después
5b. Pulso de Navegación Organizacional (CTA secundario → `/pulso/`, diagnóstico gratuito de 15 min; el resultado cierra en "Asegura tu cupo")
6. Mecanismo PODDER (seis habilidades, un método)
7. Cómo funciona (currículo, logística, detalles operativos)
8. Comunidad de pares
9. Resultados
10. Testimonios (video)
11. Oferta + pago (Wompi)
12. ¿Es para ti? (perfil sí / no)
13. FAQ
14. CTA final

## Pendientes antes de publicar

- [ ] Reemplazar los IDs de **Meta Pixel** (`PIXEL_ID_AQUI`) y **Google Analytics 4** (`G-XXXXXXXXXX`) en el `<head>`.
- [ ] Confirmar el **link de pago de Wompi** (usos múltiples, monto y fecha de expiración correctos).
- [ ] Convertir la `og:image` y las URLs de Política de privacidad / Términos a direcciones absolutas del dominio final.
- [ ] Publicar las páginas de **Política de privacidad** y **Términos y condiciones**.

## Marca

- Azul de marca: `#033F85` · Azul de acento: `#62BBF3` · Fondo: `#07121C`
- Tipografía: Inter / Inter Tight

---

© 2026 The Management Lab®. Todos los derechos reservados.
