// 🌐 PON AQUÍ TU ENLACE LARGO DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwhQ1e0ma32EtEx3U5Xih2wOJTJNI1hKPTZk4r4UqM0TnVmh7dtwGtKHOO3kaj8GbY5/exec";

let todasLasReservas = [];
let mesVisualizado = new Date(); 

// 🔄 CONFIGURACIÓN AL CARGAR LA PÁGINA
document.addEventListener("DOMContentLoaded", () => { 
    // 1. Mostramos la pantalla del dashboard inmediatamente
    cambiarVista('dashboard'); 
    
    // 2. Forzamos la primera carga de datos al instante
    obtenerReservas();
    
    // 3. Mantenemos el autorefresco cada 30 segundos para el tiempo real
    setInterval(() => {
        console.log("🔄 Sincronizando reservas en segundo plano...");
        obtenerReservas();
    }, 30000); 
});

function cambiarVista(vistaDestino) {
    const vistas = ['dashboard', 'calendario', 'lista', 'formulario'];
    
    vistas.forEach(vista => {
        const elemento = document.getElementById(`vista-${vista}`);
        if (elemento) {
            elemento.classList.add('hidden');
            elemento.style.display = 'none'; // Refuerzo nativo para asegurar que se oculte
        }
    });

    const elementoDestino = document.getElementById(`vista-${vistaDestino}`);
    if (elementoDestino) {
        elementoDestino.classList.remove('hidden');
        
        // Forzamos el despliegue nativo según el tipo de sección
        if (vistaDestino === 'dashboard') {
            elementoDestino.style.display = 'flex'; 
            actualizarDashboard();
        } else if (vistaDestino === 'formulario') {
            elementoDestino.style.display = 'block'; // 🔥 Fuerza al formulario a mostrarse
        } else {
            elementoDestino.style.display = 'grid';
            if (vistaDestino === 'calendario') renderizarCalendario();
            if (vistaDestino === 'lista') filtrarYRenderizarReservas(todasLasReservas);
        }
    }
}

async function obtenerReservas() {
    const contenedorCards = document.getElementById("contenedor-cards");
    
    if (contenedorCards) {
        contenedorCards.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">⏳ Cargando reservaciones desde Google Sheets...</p>`;
    }

    try {
        const respuesta = await fetch(WEB_APP_URL);
        todasLasReservas = await respuesta.json();
        
        // 🔄 ACTUALIZACIÓN COMPONENTES
        actualizarDashboard();
        renderizarCalendario(); 
        
        // 🔥 CORRECCIÓN: Llamamos a la nueva función unificada en vez de la vieja renderizarCards
        if (typeof filtrarYRenderizarReservas === "function") {
            filtrarYRenderizarReservas();
        }
        
    } catch (e) { 
        console.error("Error al descargar reservas:", e); 
        if (contenedorCards) {
            contenedorCards.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px; font-weight:500;">❌ Error al conectar con el servidor. Revisa tu conexión.</p>`;
        }
    }
}


function actualizarDashboard() {
    const totalReservasEl = document.getElementById("dash-total-reservas");
    const ingresosTotalesEl = document.getElementById("dash-ingresos-totales");
    const saldosPendientesEl = document.getElementById("dash-saldos-pendientes");

    // 🛡️ SEGURIDAD: Si aún no se descargan las reservas, salimos de forma segura sin romper la página
    if (!todasLasReservas || todasLasReservas.length === 0) {
        if (totalReservasEl) totalReservasEl.innerText = "0";
        if (ingresosTotalesEl) ingresosTotalesEl.innerText = "$0.00";
        if (saldosPendientesEl) saldosPendientesEl.innerText = "$0.00";
        return;
    }

    let ingresos = 0;
    let pendientes = 0;

    todasLasReservas.forEach(r => {
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        const pago = parseFloat(r.Pago) || 0;

        ingresos += (anticipo + pago);
        pendientes += (total - anticipo - pago);
    });

    if (totalReservasEl) totalReservasEl.innerText = todasLasReservas.length;
    if (ingresosTotalesEl) ingresosTotalesEl.innerText = `$${ingresos.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    if (saldosPendientesEl) saldosPendientesEl.innerText = `$${pendientes.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}

// 🔥 FUNCIÓN CENTRAL: Filtra, Ordena y Dibuja una Tarjeta Única por Reservación
function filtrarYRenderizarReservas() {
    const contenedor = document.getElementById("contenedor-cards");
    if (!contenedor) return;

    const textoBusqueda = document.getElementById("buscador-reservas")?.value.toLowerCase() || "";
    const fDesde = document.getElementById("auditoria-desde")?.value || "";
    const fHasta = document.getElementById("auditoria-hasta")?.value || "";

    // Capturamos el día de hoy a las 00:00:00 local para comparar vencimientos
    const hoyTimestamp = new Date(new Date().setHours(0,0,0,0)).getTime();

    // 1. Filtrar las reservas de la base de datos
    let reservasFiltradas = todasLasReservas.filter(r => {
        if (!r.Nombre_Completo) return false;

        // Filtro A: Buscador por Nombre o Teléfono
        const cumpleTexto = r.Nombre_Completo.toLowerCase().includes(textoBusqueda) || 
                             (r.Telefono && r.Telefono.includes(textoBusqueda));

        // Filtro B: Si NO hay fechas de auditoría puestas, ocultamos las reservaciones pasadas
        if (!fDesde && !fHasta) {
            const fechaSalidaReserva = new Date(r.Fecha_Salida.split("T") + "T00:00:00").getTime();
            return cumpleTexto && (fechaSalidaReserva >= hoyTimestamp);
        }

        // Filtro C: Si la Auditoría por Periodo está activa, validamos el rango elegido
        const inicioReserva = new Date(r.Fecha_Llegada.split("T") + "T00:00:00").getTime();
        const finReserva = new Date(r.Fecha_Salida.split("T") + "T00:00:00").getTime();
        
        const limiteDesde = fDesde ? new Date(fDesde + "T00:00:00").getTime() : 0;
        const limiteHasta = fHasta ? new Date(fHasta + "T00:00:00").getTime() : Infinity;

        // La reserva se muestra si choca o cae dentro del periodo auditado
        const cumplePeriodo = (inicioReserva <= limiteHasta && finReserva >= limiteDesde);

        return cumpleTexto && cumplePeriodo;
    });

    // 2. Ordenar de forma cronológica: Las reservas más próximas a realizarse van primero
    reservasFiltradas.sort((a, b) => {
        return new Date(a.Fecha_Llegada.split("T") + "T00:00:00") - new Date(b.Fecha_Llegada.split("T") + "T00:00:00");
    });

    // 3. Renderizar Tarjeta Única
    contenedor.innerHTML = "";
    if (reservasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">📋 No se encontraron reservaciones para este criterio.</p>`;
        return;
    }

    reservasFiltradas.forEach(r => {
        const card = document.createElement("div");
        
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        const pago = parseFloat(r.Pago) || 0;
        const saldoPendiente = total - anticipo - pago;

        let etiquetaSaldo = "";
        if (saldoPendiente > 0) {
            etiquetaSaldo = `<span style="background-color:#fff7ed; color:#c2410c; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold;">⏳ Pendiente: $${saldoPendiente}</span>`;
        } else {
            etiquetaSaldo = `<span style="background-color:#ecfdf5; color:#15803d; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold;">✅ Liquidado</span>`;
        }

        // Formateo de fechas a DD-MM-AAAA para tu lectura cómoda
        const formatearA_Español = (fTxt) => {
            if (!fTxt) return "---";
            const p = fTxt.split("T")[0].split("-");
            return `${p[2]}-${p[1]}-${p[0]}`;
        };

        card.innerHTML = `
            <div style="background-color:#ffffff; padding:16px; border-radius:16px; border:1px solid #f3f4f6; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:12px;">
                <div style="display:flex; justify-between; align-items:flex-start; margin-bottom:8px;">
                    <div style="flex:1;">
                        <h4 style="font-weight:bold; color:#1f2937; margin:0; font-size:15px;">${r.Nombre_Completo}</h4>
                        <p style="font-size:11px; color:#9ca3af; margin:2px 0 0 0;">📱 ${r.Telefono || "Sin teléfono"}</p>
                    </div>
                    <div>${etiquetaSaldo}</div>
                </div>
                
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-top:1px solid #f9fafb; border-bottom:1px solid #f9fafb; font-size:12px; color:#4b5563; margin-bottom:8px;">
                    <div>🛫 <b>Llegada:</b><br>${formatearA_Español(r.Fecha_Llegada)}</div>
                    <div>🛬 <b>Salida:</b><br>${formatearA_Español(r.Fecha_Salida)}</div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                    <span style="color:#9ca3af;">Total Estancia: <b>$${total} MN</b></span>
                    <button type="button" onclick="abrirModalModificar('${r.Num_Reservacion || r.id}')" style="background-color:#2563eb; color:#ffffff; padding:6px 12px; border:none; border-radius:8px; font-size:11px; font-weight:bold; cursor:pointer;">✏️ Actualizar / Cancelar</button>
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

function filtrarReservas() {
    const txt = document.getElementById("buscador").value.toLowerCase();
    const flt = todasLasReservas.filter(r => 
        (r.Nombre_Completo && r.Nombre_Completo.toLowerCase().includes(txt)) || 
        (r.Telefono && r.Telefono.includes(txt))
    );
    renderizarCards(flt);
}

async function guardarReserva(event) {
    event.preventDefault();

    // 1. OBTENER VALORES DE FECHAS PARA VALIDACIÓN
    const fLlegadaTxt = document.getElementById("Fecha_Llegada")?.value;
    const fSalidaTxt = document.getElementById("Fecha_Salida")?.value;

    if (!fLlegadaTxt || !fSalidaTxt) {
        alert("⚠️ Por favor, selecciona las fechas de llegada y salida.");
        return;
    }

    const fechaLlegada = new Date(fLlegadaTxt + "T00:00:00");
    const fechaSalida = new Date(fSalidaTxt + "T00:00:00");

    // 2. VALIDACIÓN 1: FECHA LOGICA
    if (fechaSalida <= fechaLlegada) {
        alert("❌ Error: La fecha de salida debe ser posterior a la fecha de llegada.");
        return;
    }

    // 3. VALIDACIÓN 2: DISPONIBILIDAD (DÍAS OCUPADOS)
    if (verificarConflictoFechas(fLlegadaTxt, fSalidaTxt)) {
        alert("🚫 ¡Conflicto de fechas! Los días seleccionados ya se encuentran ocupados por otra reservación.");
        return;
    }

    // 4. PROCESO DE GUARDADO TRADICIONAL
    const campos = ["Nombre_Completo", "Telefono", "Fecha_Llegada", "Fecha_Salida", "Total_Reserva", "Anticipo", "Fecha_Anticipo", "Pago", "Fecha_Pago", "Pago_Limpieza", "Fecha_Limpieza", "Pago_Brazaletes", "Comision_Pagada", "Fecha_Comision", "Observaciones"];
    let datos = {};
    campos.forEach(id => { const el = document.getElementById(id); datos[id] = el ? el.value : ""; });
    
    const btn = event.target.querySelector("button");
    btn.innerText = "Guardando..."; btn.disabled = true;
    
    try {
        const r = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(datos) });
        const res = await r.json();
        if (res.status === "success") {
            alert(`🎉 ¡Éxito! Folio: ${res.id}`);
            document.getElementById("form-reserva").reset();
            cambiarVista('dashboard');
        } else { alert(res.message); }
    } catch (e) { alert("Error de red"); } finally { btn.innerText = "Guardar Reservación"; btn.disabled = false; }
}

// 🔑 FUNCIÓN AUXILIAR: Verifica si el rango elegido choca con otra reserva
function verificarConflictoFechas(llegadaNueva, salidaNueva) {
    if (!todasLasReservas || todasLasReservas.length === 0) return false;
    
    // Convertimos los strings a milisegundos para comparar rangos de tiempo fácilmente
    const inicioNuevo = new Date(llegadaNueva + "T00:00:00").getTime();
    const finNuevo = new Date(salidaNueva + "T00:00:00").getTime();

    return todasLasReservas.some(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        const inicioExistente = new Date(r.Fecha_Llegada.split("T")[0] + "T00:00:00").getTime();
        const finExistente = new Date(r.Fecha_Salida.split("T")[0] + "T00:00:00").getTime();

        // Fórmula de solapamiento de rangos: (InicioA < FinB) Y (FinA > InicioB)
        return (inicioNuevo < finExistente && finNuevo > inicioExistente);
    });
}

//  FUNCIÓN renderizarCalendario...
function renderizarCalendario() {
    const contenedor = document.getElementById("calendario-contenedor");
    const titulo = document.getElementById("calendario-mes-año");
    if (!contenedor) return;

    try {
        contenedor.innerHTML = "";

        // Seguridad: Asegurar que mesVisualizado exista antes de usarlo
        if (typeof mesVisualizado === "undefined" || !(mesVisualizado instanceof Date)) {
            mesVisualizado = new Date();
        }

        const año = mesVisualizado.getFullYear();
        const mes = mesVisualizado.getMonth();

        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        
        if (titulo) {
            titulo.innerText = `${meses[mes]} ${año}`;
        }

        const primerDiaSemana = new Date(año, mes, 1).getDay();
        const diasEnMes = new Date(año, mes + 1, 0).getDate();

        // Cuadrado de días (Lunes a Domingo)
        const celdasVacias = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
        for (let i = 0; i < celdasVacias; i++) {
            const divVacio = document.createElement("div");
            divVacio.className = "p-2 border bg-gray-50 text-transparent select-none";
            divVacio.innerText = "-";
            contenedor.appendChild(divVacio);
        }

    for (let i = 1; i <= diasEnMes; i++) {
        const diaDiv = document.createElement("div");
        diaDiv.innerText = i;

        const mesStr = String(mes + 1).padStart(2, '0');
        const diaStr = String(i).padStart(2, '0');
        const fechaCeldaStr = `${año}-${mesStr}-${diaStr}`;

        // Buscamos si el día está ocupado y obtenemos el objeto de la reserva junto con su índice
        const resultadoBusqueda = obtenerReservaConIndice(fechaCeldaStr);

        if (resultadoBusqueda) {
            const { reserva, indice } = resultadoBusqueda;
            
            // Asignamos uno de los 5 colores basados en la posición de la reserva
            const numeroColor = indice % 5;
            diaDiv.className = `p-2 border text-center rounded celda-ocupada user-color-${numeroColor}`;
            
            diaDiv.onclick = () => {
                // 🔄 CONVERSIÓN DE FORMATO: Pasamos de AAAA-MM-DD a DD-MM-AAAA para tu lectura fácil
                const formatearFecha = (fechaTxt) => {
                    if (!fechaTxt) return "No definida";
                    const partes = fechaTxt.split("T")[0].split("-");
                    return `${partes[2]}-${partes[1]}-${partes[0]}`; // DD-MM-AAAA
                };

                const fLlegadaEspañol = formatearFecha(reserva.Fecha_Llegada);
                const fSalidaEspañol = formatearFecha(reserva.Fecha_Salida);

                alert(`📌 DETALLES DE LA RESERVACIÓN
--------------------------------------------
👤 Huésped: ${reserva.Nombre_Completo}
📱 Teléfono: ${reserva.Telefono || "No registrado"}
📅 Llegada: ${fLlegadaEspañol}
📅 Salida: ${fSalidaEspañol}
💵 Total: $${reserva.Total_Reserva} MN
💰 Anticipo: $${reserva.Anticipo || 0} MN
📝 Obs: ${reserva.Observaciones || "Ninguna"}`);
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
        console.error("Falla en renderizarCalendario:", error);
        contenedor.innerHTML = `<p style="color:#dc2626; padding:20px; text-align:center;">⚠️ Error interno al dibujar el calendario: ${error.message}</p>`;
    }
}



// 🔑 RECUERDA AGREGAR ESTA FUNCIÓN AUXILIAR 
function obtenerReservaPorFecha(fechaCalendarioStr) {
    if (!todasLasReservas || todasLasReservas.length === 0) return null;

    const tiempoCelda = new Date(fechaCalendarioStr + "T00:00:00").getTime();

    return todasLasReservas.find(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        // Limpiamos cualquier formato de hora (como 'T00:00:00.000Z') partiendo el string por la letra T
        const limpiaLlegada = r.Fecha_Llegada.split("T")[0];
        const limpiaSalida = r.Fecha_Salida.split("T")[0];

        const inicioExistente = new Date(limpiaLlegada + "T00:00:00").getTime();
        const finExistente = new Date(limpiaSalida + "T00:00:00").getTime();

        return (tiempoCelda >= inicioExistente && tiempoCelda < finExistente);
    });
}


function cambiarMes(dir) { mesVisualizado.setMonth(mesVisualizado.getMonth() + dir); renderizarCalendario(); }

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

function obtenerReservaConIndice(fechaCalendarioStr) {
    if (!todasLasReservas || todasLasReservas.length === 0) return null;

    const tiempoCelda = new Date(fechaCalendarioStr + "T00:00:00").getTime();

    // Buscamos la posición (índice) en el arreglo original de reservas
    const indice = todasLasReservas.findIndex(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        const stringLlegada = r.Fecha_Llegada.split("T")[0];
        const stringSalida = r.Fecha_Salida.split("T")[0];

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
