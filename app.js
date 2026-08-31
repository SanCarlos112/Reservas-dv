// 🌐 PON AQUÍ TU ENLACE LARGO DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwhQ1e0ma32EtEx3U5Xih2wOJTJNI1hKPTZk4r4UqM0TnVmh7dtwGtKHOO3kaj8GbY5/exec";

// 🆕 NUEVAS VARIABLES PARA MEMORIA Y CARGA INTELIGENTE
let todasLasReservas = [];
let mesVisualizado = new Date();
let memoriaMeses = {}; // Formato: "YYYY-MM" -> [Array de reservas]

// ✅ FIX #2: FUNCIÓN AUXILIAR QUE NO EXISTÍA (rompía la edición al cargar campos de moneda)
function formatearMoneda(numero) {
    if (numero === null || numero === undefined || isNaN(numero)) return "";
    return parseFloat(numero).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ✅ FIX #3: LISTA ÚNICA DE CAMPOS DE MONEDA (fuente de verdad compartida)
const CAMPOS_MONEDA = ["Total_Reserva", "Anticipo", "Pago", "Pago_Limpieza", "Pago_Brazaletes", "Comision_Pagada"];

// ✅ FIX #3: LIMPIEZA COMPLETA DEL FORMULARIO
// form.reset() NO borra los atributos data-raw. Sin esta función, una reserva
// nueva podía HEREDAR los importes de la reserva anterior guardada/editada.
function limpiarFormulario() {
    const form = document.getElementById("form-reserva");
    if (form) form.reset();

    // Limpiar los data-raw que reset() no toca
    CAMPOS_MONEDA.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.setAttribute('data-raw', "");
    });

    // Limpiar el ID oculto de edición (por seguridad extra)
    const idOculto = document.getElementById("form-reserva-id");
    if (idOculto) idOculto.value = "";

    // Restaurar títulos y botones a su estado normal
    const titulo = document.getElementById("titulo-formulario");
    if (titulo) titulo.innerText = "📝 Nueva Reservación";

    const btnCancelarEdicion = document.getElementById("btn-cancelar-edicion");
    if (btnCancelarEdicion) {
        btnCancelarEdicion.classList.add("hidden");
        btnCancelarEdicion.style.display = "none";
    }

    const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
    if (btnCancelarReserva) btnCancelarReserva.classList.add("hidden");

    const btnGuardar = document.querySelector("#form-reserva button[type='submit']");
    if (btnGuardar) btnGuardar.innerText = "Guardar Reservación";
}


// 🆕 FUNCIÓN: Maneja el input en tiempo real (solo permite números y un punto decimal)
function manejarInputMoneda(input) {
    // Permitir solo números y un punto decimal
    let valor = input.value.replace(/[^0-9.]/g, '');
    
    // Evitar múltiples puntos decimales
    if (valor.split('.').length > 2) {
        valor = valor.replace(/(\..*)\./g, '$1');
    }
    
    // Actualizar el valor del input (aún sin formato visual)
    input.value = valor;
}

// 🆕 FUNCIÓN: Formatea el valor al salir del campo (onblur)
function formatearMonedaBlur(input) {
    const valorCrudo = input.value;
    if (!valorCrudo) {
        input.value = "";
        input.setAttribute('data-raw', "");
        return;
    }
    
    const numero = parseFloat(valorCrudo);
    if (isNaN(numero)) {
        input.value = "";
        input.setAttribute('data-raw', "");
        return;
    }
    
    // Formatear visualmente (✅ FIX #2: reutiliza la función auxiliar en vez de duplicar código)
    input.value = formatearMoneda(numero);
    
    // Guardar el valor limpio para el envío
    input.setAttribute('data-raw', numero);
}

// 🆕 FUNCIÓN: Obtiene el valor limpio de un campo de moneda
function obtenerValorMoneda(idCampo) {
    const input = document.getElementById(idCampo);
    if (!input) return 0;
    
    // Priorizar data-raw, si no existe, limpiar el valor visual
    const valorRaw = input.getAttribute('data-raw');
    if (valorRaw !== null && valorRaw !== "") {
        return parseFloat(valorRaw);
    }
    
    // Si no hay data-raw, limpiar el valor visual (por si acaso)
    const valorVisual = input.value;
    const numero = parseFloat(valorVisual.replace(/,/g, ''));
    return isNaN(numero) ? 0 : numero;
}


// 🔄 CONFIGURACIÓN AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => { 
    // 1. Mostramos la pantalla del dashboard inmediatamente
    cambiarVista('dashboard'); 
    
    // 2. Forzamos la primera carga de datos al instante
    obtenerReservas();
    
    // 3. Autorefresco inteligente en segundo plano cada 50 segundos
    setInterval(() => {
        // 🛡️ REGLA DE ORO: Si el usuario está usando la pantalla de 'lista' (Reservas) buscando o auditando,
        // NO disparamos la actualización para no interrumpir su trabajo ni vaciar la pantalla.
        const vistaActiva = obtenerVistaActual();
        
        if (vistaActiva !== 'lista') {
            console.log("🔄 Sincronizando reservas en segundo plano...");
            obtenerReservas();
        } else {
            console.log("🛑 Sincronización en pausa temporal: Usuario auditando o buscando reservas.");
        }
    }, 50000); 
});

// 🔑 FUNCIÓN AUXILIAR: Detecta qué pestaña está viendo el usuario en su pantalla
function obtenerVistaActual() {
    const vistas = ['dashboard', 'calendario', 'lista', 'formulario'];
    let vistaActiva = 'dashboard';
    
    vistas.forEach(vista => {
        const elemento = document.getElementById(`vista-${vista}`);
        if (elemento && !elemento.classList.contains('hidden')) {
            vistaActiva = vista;
        }
    });
    
    return vistaActiva;
}

// 🆕 FUNCIÓN COMPLETA: cambiarVista (Con carga automática de calendario)
function cambiarVista(vista) {
    console.log("🔄 [Navegación] Cambiando a la vista:", vista);

    // 1. CONTROL DE CONTENEDORES (IDs reales)
    const divDashboard = document.getElementById('vista-dashboard') || document.getElementById('dashboard');
    const divCalendario = document.getElementById('vista-calendario') || document.getElementById('calendario');
    const divLista = document.getElementById('vista-lista') || document.getElementById('lista');
    const divFormulario = document.getElementById('vista-formulario') || document.getElementById('formulario');

    if (divDashboard) {
        if (vista === 'dashboard') divDashboard.classList.remove('hidden');
        else divDashboard.classList.add('hidden');
    }
    
    if (divCalendario) {
        if (vista === 'calendario') divCalendario.classList.remove('hidden');
        else divCalendario.classList.add('hidden');
    }
    
    if (divLista) {
        if (vista === 'lista') divLista.classList.remove('hidden');
        else divLista.classList.add('hidden');
    }
    
    if (divFormulario) {
        if (vista === 'formulario') divFormulario.classList.remove('hidden');
        else divFormulario.classList.add('hidden');
    }

    // 2. ILUMINACIÓN DEL MENÚ
    const botonesMenu = {
        'dashboard': 'btn-dashboard',
        'calendario': 'btn-calendario',
        'lista': 'btn-lista',
        'formulario': 'btn-nuevo'
    };

    Object.keys(botonesMenu).forEach(claveVista => {
        const idBoton = botonesMenu[claveVista];
        const boton = document.getElementById(idBoton);
        
        if (boton) {
            boton.classList.remove('active');
            boton.style.backgroundColor = "transparent";
            boton.style.color = "#6b7280";
            boton.style.fontWeight = "500";
            boton.style.borderBottom = "none";
        }
    });

    const idActivo = botonesMenu[vista];
    const botonActivo = document.getElementById(idActivo);
    
    if (botonActivo) {
        botonActivo.classList.add('active');
        botonActivo.style.backgroundColor = "#eff6ff";
        botonActivo.style.color = "#1d4ed8";
        botonActivo.style.fontWeight = "700";
        botonActivo.style.borderBottom = "3px solid #1d4ed8";
    }

    // 3. LÓGICA DE CARGA AUTOMÁTICA Y ACTUALIZACIÓN
    if (vista === 'calendario') {
        const keyMes = `${mesVisualizado.getFullYear()}-${String(mesVisualizado.getMonth()+1).padStart(2,'0')}`;
        if (!memoriaMeses[keyMes]) {
            console.log("📅 [cambiarVista] Mes no cargado. Iniciando carga:", keyMes);
            cargarReservasParaRango(mesVisualizado.getFullYear(), mesVisualizado.getMonth());
        } else {
            console.log("📅 [cambiarVista] Mes ya en memoria. Renderizando.");
            renderizarCalendario();
        }
    } else if (vista === 'dashboard') {
        actualizarDashboard();
    } else if (vista === 'lista') {
        filtrarYRenderizarReservas();
    }
}


// 🆕 CARGA INICIAL AMPLIADA: 3 meses atrás + Hoy + 3 meses adelante
async function obtenerReservas() {
    const contenedorCards = document.getElementById("contenedor-cards");
    
    if (contenedorCards) {
        if (!contenedorCards.innerHTML || Object.keys(memoriaMeses).length === 0) {
            contenedorCards.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">⏳ Cargando reservas de los últimos 7 meses...</p>`;
        }
    }

    try {
        const hoy = new Date();
        
        const tresMesesAtras = new Date(hoy);
        tresMesesAtras.setMonth(hoy.getMonth() - 3);
        
        const tresMesesFuturos = new Date(hoy);
        tresMesesFuturos.setMonth(hoy.getMonth() + 3);
        
        const inicio = tresMesesAtras.toISOString().split('T')[0];
        const fin = tresMesesFuturos.toISOString().split('T')[0];

        const urlConTiempoReal = `${WEB_APP_URL}?fechaInicio=${inicio}&fechaFin=${fin}&_=${new Date().getTime()}`;
        
        const respuesta = await fetch(urlConTiempoReal);
        const datos = await respuesta.json();
        
        if (Array.isArray(datos)) {
            // 1. Limpiar memoria anterior
            memoriaMeses = {};
            
            // 2. Distribuir datos por mes en la memoria
            datos.forEach(r => {
                if (r.Fecha_Llegada) {
                    const fechaStr = String(r.Fecha_Llegada).substring(0, 10);
                    const partes = fechaStr.split('-');
                    if (partes.length === 3) {
                        const keyMes = `${partes[0]}-${partes[1]}`;
                        if (!memoriaMeses[keyMes]) memoriaMeses[keyMes] = [];
                        memoriaMeses[keyMes].push(r);
                    }
                }
            });

            console.log(`✅ Carga inicial exitosa: ${datos.length} reservas cargadas (3 meses atrás + 3 adelante).`);
            if (contenedorCards) contenedorCards.innerHTML = "";
            
            // 3. Actualizar UI
            actualizarDashboard();
            renderizarCalendario(); 
            filtrarYRenderizarReservas();
        } else {
            console.error("Formato de datos inválido");
        }
        
    } catch (e) { 
        console.error("Error al descargar reservas:", e); 
        if (contenedorCards) {
            contenedorCards.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px; font-weight:500;">❌ Error de conexión. Revisa tu internet.</p>`;
        }
    }
}


// 🆕 CARGA BAJO DEMANDA: Para meses pasados o futuros que no están en memoria
async function cargarReservasParaRango(anio, mes) {
    const inicio = new Date(anio, mes, 1);
    const fin = new Date(anio, mes + 1, 0);
    
    const fechaInicio = inicio.toISOString().split('T')[0];
    const fechaFin = fin.toISOString().split('T')[0];
    const keyMes = `${anio}-${String(mes+1).padStart(2,'0')}`;
    
    if (memoriaMeses[keyMes]) {
        console.log(`📅 Mes ${keyMes} ya está en memoria.`);
        return;
    }

    try {
        console.log(`📡 Solicitando mes: ${keyMes} (${fechaInicio} a ${fechaFin})`);
        const url = `${WEB_APP_URL}?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&_=${new Date().getTime()}`;
        const respuesta = await fetch(url);
        const datos = await respuesta.json();
        
        if (Array.isArray(datos)) {
            memoriaMeses[keyMes] = datos;
            console.log(`✅ Cargado mes ${keyMes}: ${datos.length} registros.`);
            
            if (obtenerVistaActual() === 'calendario') {
                renderizarCalendario();
            }
        }
    } catch (e) {
        console.error(`❌ Error cargando mes ${keyMes}:`, e);
    }
}


// 🆕 ACTUALIZAR DASHBOARD: Calcula totales SOLO del mes en curso
function actualizarDashboard() {
    todasLasReservas = Object.values(memoriaMeses).flat();

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    
    const reservasDelMesActual = todasLasReservas.filter(r => {
        if (!r.Fecha_Llegada) return false;
        const fechaStr = String(r.Fecha_Llegada).substring(0, 10);
        const partes = fechaStr.split('-');
        if (partes.length !== 3) return false;
        
        const mesReserva = parseInt(partes[1], 10) - 1;
        const anioReserva = parseInt(partes[0], 10);
        
        return mesReserva === mesActual && anioReserva === anioActual;
    });

    const totalReservasEl = document.getElementById("dash-total-reservas");
    const ingresosTotalesEl = document.getElementById("dash-ingresos-totales");
    const saldosPendientesEl = document.getElementById("dash-saldos-pendientes");

    if (!reservasDelMesActual || reservasDelMesActual.length === 0) {
        if (totalReservasEl) totalReservasEl.innerText = "0";
        if (ingresosTotalesEl) ingresosTotalesEl.innerText = "$0.00";
        if (saldosPendientesEl) saldosPendientesEl.innerText = "$0.00";
        return;
    }

    let ingresos = 0;
    let pendientes = 0;

    reservasDelMesActual.forEach(r => {
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") {
            return;
        }

        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        const pago = parseFloat(r.Pago_Liquidacion) || parseFloat(r.Pago) || 0;

        ingresos += (anticipo + pago);
        pendientes += (total - anticipo - pago);
    });

    if (totalReservasEl) totalReservasEl.innerText = reservasDelMesActual.length;
    if (ingresosTotalesEl) ingresosTotalesEl.innerText = `$${ingresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    if (saldosPendientesEl) saldosPendientesEl.innerText = `$${pendientes.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}


// 🔥 FUNCIÓN CENTRAL: Filtra, Ordena y Dibuja una Tarjeta Única por Reservación
function filtrarYRenderizarReservas() {
    const contenedor = document.getElementById("contenedor-cards");
    if (!contenedor) return;

    if (!todasLasReservas || todasLasReservas.length === 0) {
        todasLasReservas = Object.values(memoriaMeses).flat();
    }

    const textoBusqueda = document.getElementById("buscador-reservas")?.value.toLowerCase() || "";
    const fDesde = document.getElementById("auditoria-desde")?.value || "";
    const fHasta = document.getElementById("auditoria-hasta")?.value || "";

    const hoyTimestamp = new Date(new Date().setHours(0,0,0,0)).getTime();

    let reservasFiltradas = todasLasReservas.filter(r => {
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") return false;
        if (!r.Nombre_Completo) return false;

        const nombreTexto = r.Nombre_Completo ? String(r.Nombre_Completo).toLowerCase() : "";
        const cumpleTexto = nombreTexto.includes(textoBusqueda) || 
                            (r.Telefono && String(r.Telefono).includes(textoBusqueda));
        
        const stringLlegada = r.Fecha_Llegada ? r.Fecha_Llegada.substring(0, 10) : "";
        const stringSalida = r.Fecha_Salida ? r.Fecha_Salida.substring(0, 10) : "";

        if (!stringLlegada || !stringSalida) return false;

        const inicioReserva = new Date(stringLlegada + "T00:00:00").getTime();
        const finReserva = new Date(stringSalida + "T00:00:00").getTime();

        if (!fDesde && !fHasta) {
            return cumpleTexto && (finReserva >= hoyTimestamp);
        }

        const limiteDesde = fDesde ? new Date(fDesde + "T00:00:00").getTime() : 0;
        const limiteHasta = fHasta ? new Date(fHasta + "T00:00:00").getTime() : Infinity;

        const cumplePeriodo = (inicioReserva <= limiteHasta && finReserva >= limiteDesde);

        return cumpleTexto && cumplePeriodo;
    });

    reservasFiltradas.sort((a, b) => {
        const tA = new Date((a.Fecha_Llegada || "").substring(0, 10) + "T00:00:00").getTime();
        const tB = new Date((b.Fecha_Llegada || "").substring(0, 10) + "T00:00:00").getTime();
        return tA - tB;
    });

    // 4. Renderizar
    contenedor.innerHTML = "";
    if (reservasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">📋 No se encontraron reservaciones para este criterio.</p>`;
        return;
    }

    // 🎨 PALETA DE COLORES PARA TARJETAS (misma familia de tonos que el calendario)
    const PALETA_TARJETAS = [
        { fondo: "#e0f2fe", borde: "#7dd3fc", nombre: "#0369a1" }, // Azul
        { fondo: "#dcfce7", borde: "#86efac", nombre: #15803d" }, // Verde
        { fondo: "#f3e8ff", borde: "#d8b4fe", nombre: "#6b21a8" }, // Morado
        { fondo: "#ffedd5", borde: "#fdba74", nombre: "#c2410c" }, // Naranja
        { fondo: "#fce7f3", borde: "#f9a8d4", nombre: "#be185d" }  // Rosa
    ];

    reservasFiltradas.forEach((r, indice) => {
        const card = document.createElement("div");
        const color = PALETA_TARJETAS[indice % PALETA_TARJETAS.length]; // 🎨 rota entre los 5 colores
        
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        const valorPagoRaw = r.Pago_Liquidacion || r.Pago || 0;
        const pago = parseFloat(valorPagoRaw) || 0;
        const saldoPendiente = total - anticipo - pago;

        let etiquetaSaldo = "";
        if (saldoPendiente > 0) {
            etiquetaSaldo = `<span style="background-color:#fff7ed; color:#c2410c; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; white-space:nowrap;">⏳ Pendiente: $${saldoPendiente.toFixed(2)}</span>`;
        } else {
            etiquetaSaldo = `<span style="background-color:#ecfdf5; color:#15803d; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; white-space:nowrap;">✅ Liquidado</span>`;
        }

        const formatearA_Español = (fTxt) => {
            if (!fTxt) return "---";
            const limpio = fTxt.substring(0, 10);
            const partes = limpio.split("-");
            if (partes.length !== 3) return fTxt;
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        };

        // 🎨 La tarjeta toma el color de la paleta (fondo suave + borde acento)
        card.innerHTML = `
            <div style="background-color:${color.fondo}; padding:16px; border-radius:16px; border:1px solid ${color.borde}; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
                    <div style="flex:1;">
                        <h4 style="font-weight:bold; color:${color.nombre}; margin:0; font-size:15px;">${r.Nombre_Completo}</h4>
                        <p style="font-size:11px; color:#6b7280; margin:2px 0 0 0;">📱 ${r.Telefono || "Sin teléfono"}</p>
                    </div>
                    <div>${etiquetaSaldo}</div>
                </div>
                
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:1px solid ${color.borde}; border-bottom:1px solid ${color.borde}; font-size:12px; color:#4b5563; margin-bottom:8px;">
                    <div>🛫 <b>Llegada:</b><br>${formatearA_Español(r.Fecha_Llegada)}</div>
                    <div>🛬 <b>Salida:</b><br>${formatearA_Español(r.Fecha_Salida)}</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; gap:8px;">
                    <span style="color:#4b5563; font-size:13px;">Total: <b>$${total.toFixed(2)} MN</b></span>
                    <button type="button" onclick="abrirModalModificar('${r.Num_Reservacion || r.id || r.Nombre_Completo}')" style="background-color:#2563eb; color:#ffffff; padding:8px 14px; border:none; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer; white-space:nowrap;">✏️ Actualizar / Cancelar</button>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}


// Auxiliar para resetear los rangos de auditoría
function limpiarFiltroAuditoria() {
    const d = document.getElementById("auditoria-desde");
    const h = document.getElementById("auditoria-hasta");
    if (d) d.value = "";
    if (h) h.value = "";
    filtrarYRenderizarReservas();
}

// ⚠️ CÓDIGO SIN USO ACTUALMENTE (candidato a eliminación futura)
function filtrarReservas() {
    const txt = document.getElementById("buscador")?.value.toLowerCase() || "";
    const flt = todasLasReservas.filter(r => 
        (r.Nombre_Completo && r.Nombre_Completo.toLowerCase().includes(txt)) || 
        (r.Telefono && r.Telefono.includes(txt))
    );
    renderizarCards(flt);
}

async function guardarReserva(event) {
    event.preventDefault();

    const fLlegadaTxt = document.getElementById("Fecha_Llegada")?.value;
    const fSalidaTxt = document.getElementById("Fecha_Salida")?.value;
    const idReserva = document.getElementById("form-reserva-id").value;

    if (!fLlegadaTxt || !fSalidaTxt) {
        alert("⚠️ Por favor, selecciona las fechas de llegada y salida.");
        return;
    }

    const fechaLlegada = new Date(fLlegadaTxt + "T00:00:00").getTime();
    const fechaSalida = new Date(fSalidaTxt + "T00:00:00").getTime();

    if (fechaSalida <= fechaLlegada) {
        alert("❌ Error: La fecha de salida debe ser posterior a la fecha de llegada.");
        return;
    }

    // 🛡️ VALIDACIÓN DE CHOQUE: Solo validamos disponibilidad si es una reserva NUEVA
    if (!idReserva && verificarConflictoFechas(fLlegadaTxt, fSalidaTxt)) {
        alert("🚫 ¡Conflicto de fechas! Los días seleccionados ya se encuentran ocupados.");
        return;
    }

    // ✅ FIX #5: CONSTRUCCIÓN DEL OBJETO EN UN SOLO LUGAR.
    // (Antes: primero se asignaba con obtenerValorMoneda(), luego se sobrescribía
    //  con data-raw, y el bloque de idReserva/accion estaba DUPLICADO dos veces.)
    // obtenerValorMoneda() ya prioriza data-raw y devuelve el número limpio.
    const datos = {
        "Nombre_Completo": document.getElementById("Nombre_Completo")?.value || "",
        "Telefono": document.getElementById("Telefono")?.value || "",
        "Fecha_Llegada": fLlegadaTxt,
        "Fecha_Salida": fSalidaTxt,
        "Total_Reserva": obtenerValorMoneda("Total_Reserva"),
        "Anticipo": obtenerValorMoneda("Anticipo"),
        "Fecha_Anticipo": document.getElementById("Fecha_Anticipo")?.value || "",
        "Pago_Liquidacion": obtenerValorMoneda("Pago"),
        "Fecha_Pago_Liq": document.getElementById("Fecha_Pago")?.value || "",
        "Pago_Limpieza": obtenerValorMoneda("Pago_Limpieza"),
        "Fecha_Limpieza": document.getElementById("Fecha_Limpieza")?.value || "",
        "Pago_Brazaletes": obtenerValorMoneda("Pago_Brazaletes"),
        "Comision_Pagada": obtenerValorMoneda("Comision_Pagada"),
        "Fecha_Comision": document.getElementById("Fecha_Comision")?.value || "",
        "Observaciones": document.getElementById("Observaciones")?.value || ""
    };

    // ✅ El backend decide solo: si lleva idReserva EDITA, si no, CREA
    if (idReserva) {
        datos["idReserva"] = idReserva;
    }

    const btn = event.target.querySelector("button[type='submit']");
    const textoOriginal = btn.innerText;
    btn.innerText = idReserva ? "Actualizando Excel..." : "Guardando..."; 
    btn.disabled = true;

    try {
        const r = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(datos) });
        const res = await r.json();
        
        if (res.status === "success") {
            alert(idReserva ? "🎉 ¡Reservación modificada con éxito!" : `🎉 ¡Éxito! Folio: ${res.id}`);
            
            // ✅ FIX #3: limpieza completa del formulario (reset + data-raw + botones)
            limpiarFormulario();
            
            // 🔥 Forzamos la descarga de datos frescos y ESPERAMOS a que termine
            await obtenerReservas();
            
            // Ya con los datos nuevos, redirigimos a la lista actualizada
            cambiarVista('lista');
            
        } else { 
            alert("⚠️ Servidor: " + res.message); 
        }
    } catch (e) { 
        alert("❌ Error de red al conectar con Google Sheets."); 
    } finally { 
        btn.innerText = textoOriginal; 
        btn.disabled = false; 
    }
}


// 🆕 FUNCIÓN CORREGIDA: verificarConflictoFechas
function verificarConflictoFechas(llegadaNueva, salidaNueva) {
    if (!todasLasReservas || todasLasReservas.length === 0) return false;
    
    const inicioNuevo = new Date(llegadaNueva + "T00:00:00").getTime();
    const finNuevo = new Date(salidaNueva + "T00:00:00").getTime();

    return todasLasReservas.some(r => {
        // 🛡️ Ignorar si la reserva está CANCELADA
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") {
            return false;
        }

        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        const inicioExistente = new Date(String(r.Fecha_Llegada).substring(0, 10) + "T00:00:00").getTime();
        const finExistente = new Date(String(r.Fecha_Salida).substring(0, 10) + "T00:00:00").getTime();

        // Fórmula de solapamiento: (InicioA < FinB) Y (FinA > InicioB)
        return (inicioNuevo < finExistente && finNuevo > inicioExistente);
    });
}


// 🆕 RENDERIZADO OPTIMIZADO: Usa memoriaMeses
function renderizarCalendario() {
    const contenedor = document.getElementById("calendario-contenedor");
    const titulo = document.getElementById("calendario-mes-año");
    if (!contenedor) return;

    try {
        contenedor.innerHTML = "";
        
        if (typeof mesVisualizado === "undefined" || !(mesVisualizado instanceof Date)) {
            mesVisualizado = new Date();
        }

        const año = mesVisualizado.getFullYear();
        const mes = mesVisualizado.getMonth();
        const keyMes = `${año}-${String(mes+1).padStart(2,'0')}`;

        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        if (titulo) titulo.innerText = `${meses[mes]} ${año}`;

        const reservasDelMes = memoriaMeses[keyMes] || [];
        
        const mapaOcupacion = {};
        
        reservasDelMes.forEach((r, indice) => {
            if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") return;
            if (!r.Fecha_Llegada || !r.Fecha_Salida) return;

            const inicioStr = String(r.Fecha_Llegada).substring(0, 10);
            const finStr = String(r.Fecha_Salida).substring(0, 10);
            
            const inicioFecha = new Date(inicioStr + "T00:00:00");
            const finFecha = new Date(finStr + "T00:00:00");

            let diaActual = new Date(inicioFecha);
            while (diaActual < finFecha) {
                if (diaActual.getFullYear() === año && diaActual.getMonth() === mes) {
                    const fechaKey = diaActual.toISOString().split('T')[0];
                    mapaOcupacion[fechaKey] = { reserva: r, indice: indice };
                }
                diaActual.setDate(diaActual.getDate() + 1);
            }
        });

        const primerDiaSemana = new Date(año, mes, 1).getDay();
        const diasEnMes = new Date(año, mes + 1, 0).getDate();

        const celdasVacias = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
        for (let i = 0; i < celdasVacias; i++) {
            const divVacio = document.createElement("div");
            divVacio.className = "p-2 border bg-gray-50 text-transparent select-none";
            divVacio.innerText = "-";
            contenedor.appendChild(divVacio);
        }

        for (let i = 1; i <= diasEnMes; i++) {
            const mesStr = String(mes + 1).padStart(2, '0');
            const diaStr = String(i).padStart(2, '0');
            const fechaCeldaStr = `${año}-${mesStr}-${diaStr}`;

            const diaDiv = document.createElement("div");
            diaDiv.innerText = i;

            const datoOcupado = mapaOcupacion[fechaCeldaStr];

            if (datoOcupado) {
                const { reserva, indice } = datoOcupado;
                const numeroColor = indice % 5;
                diaDiv.className = `p-2 border text-center rounded celda-ocupada user-color-${numeroColor}`;
                            
                diaDiv.onclick = () => {
                    const formatearFecha = (f) => {
                        if (!f) return "N/A";
                        const p = String(f).substring(0, 10).split("-");
                        return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : f;
                    };
                
                    const total = parseFloat(reserva.Total_Reserva) || 0;
                    const anticipo = parseFloat(reserva.Anticipo) || 0;
                    const pago = parseFloat(reserva.Pago_Liquidacion) || parseFloat(reserva.Pago) || 0;
                    const saldo = total - anticipo - pago;
                    
                    const estadoSaldo = saldo > 0 ? `⏳ Pendiente: $${saldo.toFixed(2)}` : `✅ Liquidado`;
                
                    const mensaje = 
                        `🏠 Condominio 112 - RESERVACIÓN COMPLETA\n` +
                        `=======================================\n` +
                        `👤 Huésped: ${reserva.Nombre_Completo || "N/A"}\n` +
                        `📱 Teléfono: ${reserva.Telefono || "N/A"}\n` +
                        `📅 Llegada: ${formatearFecha(reserva.Fecha_Llegada)}\n` +
                        `📅 Salida: ${formatearFecha(reserva.Fecha_Salida)}\n` +
                        `---------------------------------------\n` +
                        `💰 TOTAL RESERVA: $${total.toFixed(2)}\n` +
                        `  • Anticipo: $${anticipo.toFixed(2)}\n` +
                        `  • Pago Liq: $${pago.toFixed(2)}\n` +
                        `  • Saldo: ${estadoSaldo}\n` +
                        `---------------------------------------\n` +
                        `🧹 Limpieza: $${parseFloat(reserva.Pago_Limpieza)||0} (${formatearFecha(reserva.Fecha_Limpieza)})\n` +
                        `🎟️ Brazaletes: $${parseFloat(reserva.Pago_Brazaletes)||0}\n` +
                        `💼 Comisión: $${parseFloat(reserva.Comision_Pagada)||0} (${formatearFecha(reserva.Fecha_Comision)})\n` +
                        `---------------------------------------\n` +
                        `📝 Obs: ${reserva.Observaciones || "Ninguna"}`;
                
                    alert(mensaje);
                };
            
            } else {
                diaDiv.className = "p-2 border text-center text-gray-700 hover:bg-gray-100 cursor-pointer rounded transition-colors";
                diaDiv.onclick = () => {
                    const formLlegada = document.getElementById("Fecha_Llegada");
                    if (formLlegada) {
                        formLlegada.value = fechaCeldaStr;
                        cambiarVista('formulario');
                    }
                };
            }
            contenedor.appendChild(diaDiv);
        }
    } catch (error) {
        console.error("Error renderizarCalendario:", error);
        contenedor.innerHTML = `<p style="color:#dc2626; padding:20px; text-align:center;">⚠️ Error al dibujar calendario.</p>`;
    }
}


// ⚠️ CÓDIGO SIN USO ACTUALMENTE (candidato a eliminación futura)
function obtenerReservaPorFecha(fechaCalendarioStr) {
    if (!todasLasReservas || todasLasReservas.length === 0) return null;

    const tiempoCelda = new Date(fechaCalendarioStr + "T00:00:00").getTime();

    return todasLasReservas.find(r => {
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") return false;
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        const limpiaLlegada = r.Fecha_Llegada.split("T")[0];
        const limpiaSalida = r.Fecha_Salida.split("T")[0];

        const inicioExistente = new Date(limpiaLlegada + "T00:00:00").getTime();
        const finExistente = new Date(limpiaSalida + "T00:00:00").getTime();

        return (tiempoCelda >= inicioExistente && tiempoCelda < finExistente);
    });
}


// 🆕 CAMBIAR MES: Carga bajo demanda
function cambiarMes(dir) {
    mesVisualizado.setMonth(mesVisualizado.getMonth() + dir);
    
    const nuevoAnio = mesVisualizado.getFullYear();
    const nuevoMes = mesVisualizado.getMonth();
    const keyMes = `${nuevoAnio}-${String(nuevoMes+1).padStart(2,'0')}`;
    
    if (memoriaMeses[keyMes]) {
        renderizarCalendario();
    } else {
        console.log("🔄 Cargando mes nuevo:", keyMes);
        cargarReservasParaRango(nuevoAnio, nuevoMes);
    }
}


// ⚠️ CÓDIGO SIN USO ACTUALMENTE (candidato a eliminación futura)
function verificarNocheOcupada(f) {
    if (!todasLasReservas || todasLasReservas.length === 0) return false;
    let txt = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    return todasLasReservas.some(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        return (txt >= r.Fecha_Llegada.split("T")[0] && txt < r.Fecha_Salida.split("T")[0]);
    });
}

function formatearFecha(f) {
    if (!f) return "--";
    const p = f.split("T")[0].split("-");
    if (p.length < 3) return f;
    return `${p[2]}/${p[1]}/${p[0]}`;
}


// ⚠️ CÓDIGO SIN USO ACTUALMENTE (candidato a eliminación futura)
function obtenerReservaConIndice(fechaCalendarioStr) {
    if (!todasLasReservas || todasLasReservas.length === 0) return null;

    const tiempoCelda = new Date(fechaCalendarioStr + "T00:00:00").getTime();

    const indice = todasLasReservas.findIndex(r => {
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") return false;
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        const stringLlegada = String(r.Fecha_Llegada).substring(0, 10);
        const stringSalida = String(r.Fecha_Salida).substring(0, 10);

        const inicioExistente = new Date(stringLlegada + "T00:00:00").getTime();
        const finExistente = new Date(stringSalida + "T00:00:00").getTime();

        return (tiempoCelda >= inicioExistente && tiempoCelda < finExistente);
    });

    if (indice !== -1) {
        return {
            reserva: todasLasReservas[indice],
            indice: indice
        };
    }
    return null;
}


// ✏️ Se ejecuta al pulsar el botón azul "Actualizar / Cancelar"
function abrirModalModificar(identificador) {
    if (!todasLasReservas || todasLasReservas.length === 0) return;

    const reserva = todasLasReservas.find(r => 
        r.Num_Reservacion == identificador || r.id == identificador || r.Nombre_Completo == identificador
    );

    if (!reserva) {
        alert("⚠️ No se encontraron los datos de esta reservación.");
        return;
    }

    console.log("🔍 [Depuración DV] Datos originales recibidos de la base de datos:", reserva);

    // 1. Modo edición: título y botón de volver
    document.getElementById("titulo-formulario").innerText = "✏️ Modificar / Cancelar Reservación";
    const btnCancelar = document.getElementById("btn-cancelar-edicion");
    if (btnCancelar) {
        btnCancelar.classList.remove("hidden");
        btnCancelar.style.display = "inline-block";
    }

    // 2. Texto del botón de envío principal
    const btnGuardar = document.querySelector("#form-reserva button[type='submit']");
    if (btnGuardar) btnGuardar.innerText = "Guardar Cambios Reserva";

    // 3. Guardamos el ID en el campo oculto para que el sistema sepa que es una EDICIÓN
    document.getElementById("form-reserva-id").value = reserva.Num_Reservacion || reserva.id || "";

    // 4. ✅ FIX #5: MAPEO SIMPLIFICADO EN UN SOLO BLOQUE
    //    (Antes existían 3 bloques que se pisaban entre sí: camposNumericos con una función
    //     inexistente, camposMoneda duplicado, y camposEstandar que sobrescribía el formato)

    // 4a. Campos de texto simples
    const camposTexto = ["Nombre_Completo", "Telefono", "Observaciones"];
    camposTexto.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = reserva[id] || "";
    });

    // 4b. Campos de moneda: formato visual + data-raw limpio
    //     (el campo "Pago" del HTML se llena desde Pago_Liquidacion o Pago del JSON)
    CAMPOS_MONEDA.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        const valorBD = (id === "Pago") 
            ? (reserva.Pago_Liquidacion || reserva.Pago)
            : reserva[id];

        // Si no hay valor en la base de datos, dejar el campo vacío (no forzar 0.00)
        if (valorBD === null || valorBD === undefined || valorBD === "") {
            el.value = "";
            el.setAttribute('data-raw', "");
            return;
        }

        const valor = parseFloat(valorBD) || 0;
        el.value = formatearMoneda(valor);        // ✅ FIX #2: la función ahora SÍ existe
        el.setAttribute('data-raw', valor);
    });

    // 4c. Fechas (se cortan a AAAA-MM-DD para el input type="date")
    const mapeoFechas = [
        { idHtml: "Fecha_Llegada", propiedadJson: reserva.Fecha_Llegada },
        { idHtml: "Fecha_Salida", propiedadJson: reserva.Fecha_Salida },
        { idHtml: "Fecha_Anticipo", propiedadJson: reserva.Fecha_Anticipo },
        { idHtml: "Fecha_Pago", propiedadJson: reserva.Fecha_Pago_Liq || reserva.Fecha_Pago || reserva.Fecha_Pago_Liquidacion },
        { idHtml: "Fecha_Limpieza", propiedadJson: reserva.Fecha_Limpieza },
        { idHtml: "Fecha_Comision", propiedadJson: reserva.Fecha_Comision }
    ];

    mapeoFechas.forEach(campo => {
        const elemento = document.getElementById(campo.idHtml);
        if (elemento) {
            elemento.value = campo.propiedadJson ? String(campo.propiedadJson).substring(0, 10) : "";
        }
    });

    // 5. 🚨 Botón rojo de CANCELACIÓN (aparece solo en modo edición)
    const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
    if (btnCancelarReserva) {
        btnCancelarReserva.classList.remove("hidden"); 
    
        btnCancelarReserva.onclick = function() {
            if (confirm("⚠️ ¿Estás seguro de que deseas CANCELAR esta reservación? El espacio quedará liberado.")) {
                ejecutarCancelacion(reserva.Num_Reservacion);
            }
        };
    }

    // 6. Redirigimos automáticamente al usuario a la pestaña del formulario
    cambiarVista('formulario');
}


// 🔙 Función por si el usuario decide no modificar nada y quiere regresar a la lista
function cancelarEdicion() {
    // ✅ FIX #3: limpieza completa (antes el reset() no borraba los data-raw)
    limpiarFormulario();
    cambiarVista('lista');
}


/**
 * Envía la orden de cancelación al servidor de Google Sheets
 * @param {string|number} idReservacion - El Folio o número de la reservación
 */
async function ejecutarCancelacion(idReservacion) {
    console.log("❌ [Cancelación] Solicitando cancelar folio:", idReservacion);
    
    const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
    if (btnCancelarReserva) {
        btnCancelarReserva.innerText = "⏳ Cancelando...";
        btnCancelarReserva.disabled = true;
    }

    // ✅ Solo action + id (SIN idReserva, o el backend lo trataría como edición)
    const datos = {
        action: "cancelar",
        id: idReservacion
    };
    
    try {
        const r = await fetch(WEB_APP_URL, { 
            method: "POST", 
            body: JSON.stringify(datos) 
        });
        const res = await r.json();

        if (res.status === "success") {
            alert("⚠️ Reservación cancelada y espacio liberado con éxito.");
            
            // ✅ FIX #3: limpieza completa (reset + data-raw + botones)
            limpiarFormulario();
            
            // 🔄 FORZAR RECARGA DE DATOS INMEDIATA
            console.log("🔄 Recargando datos para liberar fecha...");
            await obtenerReservas();

            cambiarVista('lista');
            
        } else {
            alert("❌ Hubo un detalle al procesar la cancelación en el servidor.");
        }
    } catch (error) {
        console.error("Error en proceso de cancelación:", error);
        alert("❌ Error de red al intentar conectar con el servidor de cancelaciones.");
    } finally {
        if (btnCancelarReserva) {
            btnCancelarReserva.innerText = "❌ Cancelar Reservación";
            btnCancelarReserva.disabled = false;
        }
    }
}


// 🌙 LÓGICA DE TEMA OSCURO (pendiente de implementar)
// ✅ FIX #1: se eliminó el bloque final roto que tenía una llave "}" sobrante
// y podía hacer fallar la carga de TODO el archivo JavaScript.
