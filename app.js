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
    // 1. Lista de todos los contenedores visuales declarados en el HTML
    const vistas = ['dashboard', 'calendario', 'lista', 'formulario'];
    
    // 2. Ocultamos absolutamente todas las vistas agregando la clase 'hidden'
    vistas.forEach(vista => {
        const elemento = document.getElementById(`vista-${vista}`);
        if (elemento) {
            elemento.classList.add('hidden');
        }
    });

    // 3. Mostramos únicamente la vista seleccionada removiendo 'hidden'
    const elementoDestino = document.getElementById(`vista-${vistaDestino}`);
    if (elementoDestino) {
        elementoDestino.classList.remove('hidden');
    }

    // 4. Acciones inteligentes: Refrescamos los componentes según la pestaña activa
    if (vistaDestino === 'dashboard') {
        actualizarDashboard();
    } else if (vistaDestino === 'calendario') {
        renderizarCalendario();
    } else if (vistaDestino === 'lista') {
        renderizarCards(todasLasReservas);
    }
}

async function obtenerReservas() {
    // ⏳ Colocamos mensajes de carga visuales antes de hacer el fetch
    const contenedorCards = document.getElementById("contenedor-cards");
    const contenedorCal = document.getElementById("calendario-contenedor");
    
    if (contenedorCards) {
        contenedorCards.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">⏳ Cargando reservaciones desde Google Sheets...</p>`;
    }
    // Nota: No limpiamos el calendario completo para no romper los botones, 
    // pero si gustas puedes poner un aviso temporal.

    try {
        const respuesta = await fetch(WEB_APP_URL);
        todasLasReservas = await respuesta.json();
        actualizarDashboard();
        renderizarCards(todasLasReservas);
        renderizarCalendario(); 
    } catch (e) { 
        console.error("Error:", e); 
        if (contenedorCards) {
            contenedorCards.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px;">❌ Error al conectar con el servidor. Revisa tu conexión.</p>`;
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

function renderizarCards(reservas) {
    const contenedor = document.getElementById("contenedor-cards");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    // 🛡️ SEGURIDAD: Si no hay datos todavía, mostramos un aviso limpio
    if (!reservas || reservas.length === 0) {
        contenedor.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">⏳ Cargando reservaciones desde Google Sheets...</p>`;
        return;
    }

    reservas.forEach(r => {
        const card = document.createElement("div");
        card.className = "bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3";
        
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        const pago = parseFloat(r.Pago) || 0;
        const saldoPendiente = total - anticipo - pago;

        // 🎨 OPCIÓN 3 INTEGRADA: Alerta visual si tiene saldo pendiente
        let etiquetaSaldo = "";
        if (saldoPendiente > 0) {
            etiquetaSaldo = `<span class="px-2.5 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-lg">⏳ Pendiente: $${saldoPendiente}</span>`;
        } else {
            etiquetaSaldo = `<span class="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-lg">✅ Liquidado</span>`;
        }

        const fLlegada = r.Fecha_Llegada ? r.Fecha_Llegada.split("T")[0] : "---";
        const fSalida = r.Fecha_Salida ? r.Fecha_Salida.split("T")[0] : "---";

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-gray-800 text-base">${r.Nombre_Completo}</h4>
                    <p class="text-xs text-gray-400 mt-0.5">📱 ${r.Telefono || "Sin teléfono"}</p>
                </div>
                ${etiquetaSaldo}
            </div>
            <div class="grid grid-cols-2 gap-2 py-2 border-y border-gray-50 text-xs text-gray-600">
                <div>🛫 <span class="font-medium">Llegada:</span><br><span class="text-gray-800 font-bold">${fLlegada}</span></div>
                <div>🛬 <span class="font-medium">Salida:</span><br><span class="text-gray-800 font-bold">${fSalida}</span></div>
            </div>
            <div class="flex justify-between items-center text-xs pt-1">
                <span class="text-gray-400 font-medium">Total de la estancia:</span>
                <span class="text-gray-800 font-bold text-sm">$${total} MN</span>
            </div>
        `;
        contenedor.appendChild(card);
    });
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
