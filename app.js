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
    const vistas = ['dashboard', 'calendario', 'lista', 'nuevo'];
    vistas.forEach(v => {
        const element = document.getElementById(`vista-${v}`);
        const btn = document.getElementById(`btn-${v}`);
        if (v === vistaDestino) {
            if (element) element.classList.remove('hidden');
            if (btn) btn.style.color = "#2563eb";
        } else {
            if (element) element.classList.add('hidden');
            if (btn) btn.style.color = "#6b7280";
        }
    });
    if (vistaDestino === 'calendario' || vistaDestino === 'lista' || vistaDestino === 'dashboard') {
        obtenerReservas();
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
    const act = document.getElementById("dash-activas");
    const ing = document.getElementById("dash-ingresos");
    if (act) act.innerText = todasLasReservas.length;
    let tot = todasLasReservas.reduce((s, r) => s + (Number(r.Total_Reserva) || 0), 0);
    if (ing) ing.innerText = "$" + tot.toLocaleString('es-MX');
}

function renderizarCards(lista) {
    const contenedor = document.getElementById("contenedor-cards");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    if (!lista || lista.length === 0) {
        contenedor.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:20px;">No hay reservas.</p>`;
        return;
    }
    lista.forEach(res => {
        const card = document.createElement("div");
        card.style = "background:white; padding:16px; border-radius:16px; border:1px solid #e5e7eb; margin-bottom:12px;";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f3f4f6; padding-bottom:8px;">
                <div>
                    <span style="font-family:monospace; font-weight:bold; background:#f3f4f6; padding:2px 6px; border-radius:4px; font-size:12px;">${res.Num_Reservacion || '---'}</span>
                    <h3 style="font-size:16px; font-weight:bold; margin:6px 0 0 0;">${res.Nombre_Completo || '---'}</h3>
                </div>
                <span style="font-size:12px; background:#dbeafe; color:#1e40af; padding:4px 8px; border-radius:9999px;">Registrado</span>
            </div>
            <div style="display:grid; grid-template-cols:1fr 1fr; gap:8px; margin-top:8px;">
                <div style="background:#f9fafb; padding:8px; border-radius:8px; font-size:12px;">
                    <span style="color:#9ca3af; display:block;">📅 Llegada</span>
                    <span style="font-weight:600;">${formatearFecha(res.Fecha_Llegada)}</span>
                </div>
                <div style="background:#f9fafb; padding:8px; border-radius:8px; font-size:12px;">
                    <span style="color:#9ca3af; display:block;">📅 Salida</span>
                    <span style="font-weight:600;">${formatearFecha(res.Fecha_Salida)}</span>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px; margin-top:8px;">
                <span style="color:#6b7280;">📞 ${res.Telefono || '---'}</span>
                <span style="font-weight:bold;">$${(Number(res.Total_Reserva) || 0).toLocaleString('es-MX')}</span>
            </div>`;
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
    if (!contenedor || !titulo) return;

    contenedor.innerHTML = "";

    const año = mesVisualizado.getFullYear();
    const mes = mesVisualizado.getMonth();

    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    titulo.innerText = `${meses[mes]} ${año}`;

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
        const diaDiv = document.createElement("div");
        diaDiv.innerText = i;

        const mesStr = String(mes + 1).padStart(2, '0');
        const diaStr = String(i).padStart(2, '0');
        const fechaCeldaStr = `${año}-${mesStr}-${diaStr}`;

        const reservaDelDia = obtenerReservaPorFecha(fechaCeldaStr);

        if (reservaDelDia) {
            diaDiv.className = "p-2 border text-center font-bold bg-red-100 text-red-700 rounded cursor-pointer hover:bg-red-200 transition-colors";
            
            diaDiv.onclick = () => {
                // CORRECCIÓN DIRECTA: Se eliminaron las referencias a 'r'
                const fLlegada = reservaDelDia.Fecha_Llegada ? reservaDelDia.Fecha_Llegada.split("T")[0] : "No definida";
                const fSalida = reservaDelDia.Fecha_Salida ? reservaDelDia.Fecha_Salida.split("T")[0] : "No definida";

                alert(`📌 DETALLES DE LA RESERVACIÓN
--------------------------------------------
👤 Huésped: ${reservaDelDia.Nombre_Completo}
📱 Teléfono: ${reservaDelDia.Telefono || "No registrado"}
📅 Llegada: ${fLlegada}
📅 Salida: ${fSalida}
💵 Total: $${reservaDelDia.Total_Reserva} MN
💰 Anticipo: $${reservaDelDia.Anticipo || 0} MN
📝 Obs: ${reservaDelDia.Observaciones || "Ninguna"}`);
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
}



// 🔑 RECUERDA AGREGAR ESTA FUNCIÓN AUXILIAR ABAJO EN TU APP.JS SI AÚN NO LA TIENES:
function obtenerReservaPorFecha(fechaCalendarioStr) {
    if (!todasLasReservas || todasLasReservas.length === 0) return null;

    const tiempoCelda = new Date(fechaCalendarioStr + "T00:00:00").getTime();

    return todasLasReservas.find(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;

        const inicioExistente = new Date(r.Fecha_Llegada.split("T")[0] + "T00:00:00").getTime();
        const finExistente = new Date(r.Fecha_Salida.split("T")[0] + "T00:00:00").getTime();

        // Si la fecha cae dentro del rango de ocupación (sin contar el día exacto de salida)
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
