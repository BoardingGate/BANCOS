# 🏦 Control Bancario — Suite de Tesorería, Conciliación y Liquidación Fiscal

<p align="center">
  <img src="https://img.shields.io/badge/Treasury-Management-0D0F1A?style=for-the-badge&logo=cashapp&logoColor=67E8F9" alt="Treasury Management" />
  <img src="https://img.shields.io/badge/Vanilla_JS-High_Performance-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
  <img src="https://img.shields.io/badge/Cloud_Sync-Google_Drive_API-4285F4?style=for-the-badge&logo=googledrive&logoColor=white" alt="Google Drive Sync" />
  <img src="https://img.shields.io/badge/Tax_Models-303_%2F_420_%2F_390-10B981?style=for-the-badge" alt="Tax Models" />
  <img src="https://img.shields.io/badge/Zero_Install-Single_File-4CAF50?style=for-the-badge" alt="Zero Dependencies" />
</p>

<p align="center">
  <b>Control Bancario</b> es una aplicación web *Local-First* diseñada para la <b>gestión integral de tesorería multi-empresa, conciliación bancaria en tiempo real, seguimiento de facturación recurrente y autoliquidación tributaria (Modelos 303 IVA / 420 IGIC)</b> con generación automática de asientos contables.
</p>

<p align="center">
  <a href="#-módulos-principales">Módulos</a> •
  <a href="#-conciliación-y-matriz-de-saldos">Matriz de Saldos</a> •
  <a href="#-autoliquidación-fiscal-modelo-303--420">Modelos Fiscales</a> •
  <a href="#-sincronización-en-la-nube-google-drive">Google Drive</a> •
  <a href="#-despliegue-y-uso-local">Instalación</a> •
  <a href="#-seguridad-y-privacidad">Privacidad</a>
</p>

---

## 💼 Módulos Principales

La aplicación consolida en una sola pantalla todas las necesidades financieras y contables diarias de un grupo empresarial o autónomo:

├── 📊 Saldos y Movimientos (Matriz multi-empresa y multi-banco en vivo) ├── 📄
Facturas Recurrentes (Matriz anual de vencimientos a 12 meses) ├── 🏛️ Impuestos
(Resumen de liquidaciones trimestrales y pagos) ├── 📈 Modelo 303 / 420
(Simulador fiscal interactivo estilo hoja de cálculo) ├── 📝 Bloc de Notas
(Espacio de anotaciones libres con persistencia) ├── 🔐 Llavero de Credenciales
(Acceso rápido protegido con Clave Maestra) └── 💾 Copia de Seguridad (Local JSON
y sincronización cloud con Google Drive)


---

## 📊 Conciliación y Matriz de Saldos

El núcleo de la aplicación es una cuadrícula bidimensional dinámica que cruza **Entidades Bancarias (Filas)** con **Empresas o Cuentas (Columnas)**:

* **Triple Control de Saldos por Cuenta:**
  * **Saldo Actual:** Saldo real reportado por el banco en la sesión activa.
  * **Saldo Punteado:** Saldo de control con registro de fecha de última comprobación y cálculo instantáneo de la diferencia `[Punteado - Actual]`.
  * **Saldo Conciliado:** Cálculo matemático automático en vivo:  
    $$\text{Saldo Conciliado} = \text{Saldo Actual} + \sum \text{Movimientos Pendientes}$$
* **Gestor de Movimientos Pendientes:** Registro granular de cargos/abonos pendientes con indicador de estado `[C]` (Conciliado) o `[P]` (Pendiente) que impacta en tiempo real sobre el balance.
* **Plegado Inteligente de Filas y Columnas:** Permite contraer bancos o empresas manteniendo a la vista un resumen compacto con los saldos actual y conciliado.
* **Celdas Desactivables:** Posibilidad de apagar cuentas inactivas sin romper la estructura de la matriz.
* **Historial de Deshacer (Undo Multi-Nivel):** Pila de recuperación de hasta 40 pasos para revertir cambios accidentales (`Ctrl+Z` / Botón ↶).

---

## 📄 Facturas Recurrentes

Panel dedicado a la previsión y control de gastos fijos y suministros periódicos:

* **Matriz Visual a 12 Meses:** Selector con botones de colores (`E, F, M, A, M, J, J, A, S, O, N, D`) para marcar los meses exactos en que se devenga cada factura.
* **Detalle Contable Completo:** Proveedor, Cuenta/Código contable, Importe, Banco emisor, Periodicidad (Mensual, Trimestral, Semestral, Anual) y Observaciones.

---

## 🏛️ Autoliquidación Fiscal (Modelo 303 / 420)

Módulo avanzado que replica la estructura oficial de las declaraciones tributarias de **IVA (Régimen General / Modelo 303)** e **IGIC (Canarias / Modelo 420)**:

### 1. Cuaderno Trimestral Interactivo (1T, 2T, 3T, 4T + Resumen Anual 390)
* **IVA Repercutido / Emitidas:** Tipos al 4%, 10%, 21%, 0%, Operaciones con Inversión del Sujeto Pasivo, Intracomunitarias y Facturas Rectificativas.
* **IVA Soportado / Recibidas:** Operaciones interiores corrientes, bienes de inversión, adquisiciones intracomunitarias y compensaciones de ejercicios anteriores.
* **Cálculo Automático de Cuotas:** Al introducir la base imponible, la cuota correspondiente se calcula en base al porcentaje configurado.
* **Contrapunteo Automático:** Las adquisiciones intracomunitarias registradas en emitidas se replican automáticamente en la sección de recibidas.

### 2. Generador de Asientos Contables de Regularización y Pago
Con un solo clic en el botón 📤, la herramienta genera el apunte contable del trimestre listo para exportar a tu software de contabilidad:

────────────────────────── REGULARIZACIÓN TRIMESTRAL ──────────────────────────
DEBE: HABER: (477) H.P. IVA Repercutido (472) H.P. IVA Soportado (4700) H.P.
Deudora (si es a compensar) (4750) H.P. Acreedora (si es a ingresar) (4700)
Compensación periodos anteriores ─────────────────────────────── ASIENTO DE PAGO
─────────────────────────────── (4750) H.P. Acreedora por IVA a (572) Bancos e
Instituciones de Crédito


---

## 🛠️ Herramientas Flotantes Integradas

### 🧮 1. Calculadora Rápida Flotante (`floating-calc`)
* Panel lateral retráctil accesible desde cualquier pestaña.
* Evaluación de operaciones matemáticas combinadas (`+`, `-`, `*`, `/`, `%`).
* Botón **"Usar"** para inyectar el resultado numérico directamente en el campo de entrada activo.

### 🔑 2. Llavero Seguro de Credenciales (`floating-creds`)
* Espacio para 10 accesos directos (Usuario + Contraseña) para banca online y portales de la AEAT.
* **Protección mediante Clave Maestra:** Bloqueo automático por sesión y temporizador de seguridad.
* Botones de copiado instantáneo al portapapeles en un clic (📋).

---

## 🖨️ Informes y Exportación Impresa (Single-Page Layout)

Sistema de impresión adaptativo con ventana modal de selección de empresas:

* **Reporte General Consolidado:** Matriz transpuesta optimizada verticalmente (`Portrait`) para encajar en una **única hoja física o PDF**.
* **Distinción Visual en Papel:** Movimientos pendientes vs conciliados, códigos de colores de impuestos y marcas mensuales de facturas.
* **Separación de Informes:** Impresión individualizada para la matriz de saldos, cuaderno de impuestos 303/420 o bloc de notas.

---

## ☁️ Sincronización en la Nube (Google Drive)

Arquitectura *Local-First* con sincronización transparente a través de la **Google Drive API v3**:

1. **Persistencia Local:** Todos los datos se guardan instantáneamente en el `localStorage` del navegador.
2. **Sincronización Silenciosa:** Tras 5 segundos sin actividad, la aplicación guarda una copia de seguridad actualizada (`DATOSBANCARIOS_CLOUD.json`) en la raíz de tu Google Drive.
3. **Restauración Multi-Dispositivo:** Recupera todo tu entorno de trabajo en cualquier ordenador nuevo simplemente vinculando tu cuenta de Google.

---

## 🚀 Despliegue y Uso Local

**Zero-Build:** No requiere Node.js, Webpack, npm ni backend externo.

### 1. Ejecución Directa
```bash
# Clona el repositorio
git clone https://github.com/tu-usuario/control-bancario.git
cd control-bancario

# Abre el archivo en tu navegador
# (Doble clic en index.html o mediante Live Server en VS Code)

2. Configurar la API de Google Drive (Opcional)

Para habilitar la sincronización en la nube con tu propia cuenta de Google:

1.  Crea un proyecto en Google Cloud Console.
2.  Habilita la Google Drive API.
3.  Configura la pantalla de consentimiento OAuth y genera un ID de Cliente Web.
4.  Reemplaza la constante CLIENT_ID en el código:
    const CLIENT_ID = 'TU_CLIENT_ID_DE_GOOGLE_AQUI.apps.googleusercontent.com';

🔒 Privacidad y Seguridad

  - Sin Servidores Intermediarios: Ningún dato financiero viaja a servidores
    externos; todo permanece en tu navegador y en tu cuenta privada de Google
    Drive.
  - Copia de Seguridad en Archivo Local: Posibilidad de descargar y restaurar en
    cualquier momento un archivo DATOSBANCARIOS.json.
  - Clave Maestra: Cifrado de credenciales en memoria para evitar accesos
    visuales no deseados.

📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más
información.
