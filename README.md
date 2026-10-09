# El lado B de una varilla · Reloj Solar Casero 3D

Simulación interactiva y responsiva en 3D (Three.js + React) de un reloj solar casero horizontal con varilla de madera (gnómon), base de plastilina, papel afiche y control dinámico de la posición del Sol.

Proyecto educativo para Córdoba, Argentina: [Más información](https://innovafuturo.cba.gov.ar/el-lado-b-de-una-varilla/)

---

## 🚀 Publicación automática en GitHub Pages

Este repositorio ya incluye el workflow oficial de **GitHub Actions** en `.github/workflows/deploy.yml`.

### Pasos para activar GitHub Pages en tu repositorio:

1. Ve a tu repositorio en GitHub y haz clic en la pestaña **Settings** (Configuración).
2. En el menú lateral izquierdo, haz clic en **Pages**.
3. En la sección **Build and deployment**:
   - En **Source** (Origen), selecciona: **GitHub Actions**.
4. ¡Listo! Cada vez que hagas un `git push` a la rama `main` (o `master`), GitHub Actions compilará automáticamente el proyecto y lo publicará en tu enlace de GitHub Pages:
   ```
   https://<tu-usuario>.github.io/<tu-repositorio>/
   ```

---

## 🛠️ Ejecución y desarrollo local

### Requisitos
- Node.js 18+ o 20+
- npm o bun

### Instalación
```bash
npm install --legacy-peer-deps
```

### Iniciar servidor de desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Compilar para producción
```bash
npm run build
```
Los archivos estáticos generados se guardarán en la carpeta `dist/`.
