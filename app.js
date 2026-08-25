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
    
    // 3. Mantenemos el autorefresco inteligente en segundo plano cada 30 segundos
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
    }, 30000); 
});

// 🔑 FUNCIÓN AUXILIAR: Detecta qué pestaña está viendo el usuario en su pantalla
function obtenerVistaActual() {
    const vistas = ['dashboard', 'calendario', 'lista', 'formulario'];
    let vistaActiva = 'dashboard';
    
    vistas.forEach(vista => {
        const elemento = document.getElementById(`vista-${vista}`);
        // Si el elemento existe y NO tiene la clase hidden, significa que está visible en pantalla
        if (elemento && !elemento.classList.contains('hidden')) {
            vistaActiva = vista;
        }
    });
    
    return vistaActiva;
}

/**
 * Controla la navegación del sistema ocultando/mostrando las vistas con los IDs correctos
 * e iluminando dinámicamente el botón del módulo activo.
 */
function cambiarVista(vista) {
    console.log("🔄 [Navegación] Cambiando a la vista:", vista);

    // =========================================================
    // 1. CONTROL DE CONTENEDORES (Usando los IDs reales de tu HTML)
    // =========================================================
    // Buscamos los contenedores soportando el prefijo "vista-" que usa tu proyecto
    const divDashboard = document.getElementById('vista-dashboard') || document.getElementById('dashboard');
    const divCalendario = document.getElementById('vista-calendario') || document.getElementById('calendario');
    const divLista = document.getElementById('vista-lista') || document.getElementById('lista');
    const divFormulario = document.getElementById('vista-formulario') || document.getElementById('formulario');

    // Mostramos u ocultamos alternando la clase 'hidden' de Tailwind CSS
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


    // ==========================================
    // 2. ILUMINACIÓN DINÁMICA DEL MENÚ DE MÓDULOS
    // ==========================================
    const botonesMenu = {
        'dashboard': 'btn-dashboard',
        'calendario': 'btn-calendario',
        'lista': 'btn-lista',
        'formulario': 'btn-nuevo'
    };

    // Recorremos todos los botones para dejarlos en estado "Apagado" (Gris / Normal)
    Object.keys(botonesMenu).forEach(claveVista => {
        const idBoton = botonesMenu[claveVista];
        const boton = document.getElementById(idBoton);
        
        if (boton) {
            boton.classList.remove('active');
            // Estilos limpios para el botón inactivo
            boton.style.backgroundColor = "transparent";
            boton.style.color = "#6b7280";          // Texto Gris
            boton.style.fontWeight = "500";         // Grosor de letra normal
            boton.style.borderBottom = "none";      // Sin línea inferior
        }
    });

    // Encendemos únicamente el botón del módulo seleccionado por el usuario
    const idActivo = botonesMenu[vista];
    const botonActivo = document.getElementById(idActivo);
    
    if (botonActivo) {
        botonActivo.classList.add('active');
        // Estilos destacados para el botón activo
        botonActivo.style.backgroundColor = "#eff6ff"; // Fondo azul muy claro
        botonActivo.style.color = "#1d4ed8";          // Texto Azul fuerte
        botonActivo.style.fontWeight = "700";         // Letra en Negrita
        botonActivo.style.borderBottom = "3px solid #1d4ed8"; // Línea inferior azul indicadora
    }
}


async function obtenerReservas() {
    const contenedorCards = document.getElementById("contenedor-cards");
    
    if (contenedorCards) {
        // Nota: Solo pintamos el mensaje si el contenedor está totalmente vacío 
        // para no parpadear la pantalla si el usuario ya está viendo datos.
        if (!contenedorCards.innerHTML || todasLasReservas.length === 0) {
            contenedorCards.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">⏳ Cargando reservaciones desde Google Sheets...</p>`;
        }
    }

    try {
        // 🔥 ROMPE-CACHÉ: Agregamos un sello de tiempo único (milisegundos actuales) al final de la URL
        // Esto obliga al navegador del celular a descargar datos en vivo SI REGLA DE EXCEPCIÓN.
        const urlConTiempoReal = `${WEB_APP_URL}?_=${new Date().getTime()}`;
        
        const respuesta = await fetch(urlConTiempoReal);
        todasLasReservas = await respuesta.json();
        
        // 🔄 ACTUALIZACIÓN COMPONENTES EN PANTALLA
        actualizarDashboard();
        renderizarCalendario(); 
        
        if (typeof filtrarYRenderizarReservas === "function") {
            filtrarYRenderizarReservas();
        }
        
    } catch (e) { 
        console.error("Error al descargar reservas:", e); 
        if (contenedorCards && todasLasReservas.length === 0) {
            contenedorCards.innerHTML = `<p style="color:#dc2626; text-align:center; padding:20px; font-weight:500;">❌ Error al conectar con el servidor. Revisa tu conexión.</p>`;
        }
    }
}


function actualizarDashboard() {
    const totalReservasEl = document.getElementById("dash-total-reservas");
    const ingresosTotalesEl = document.getElementById("dash-ingresos-totales");
    const saldosPendientesEl = document.getElementById("dash-saldos-pendientes");

    if (!todasLasReservas || todasLasReservas.length === 0) {
        if (totalReservasEl) totalReservasEl.innerText = "0";
        if (ingresosTotalesEl) ingresosTotalesEl.innerText = "$0.00";
        if (saldosPendientesEl) saldosPendientesEl.innerText = "$0.00";
        return;
    }

    let ingresos = 0;
    let pendientes = 0;

    todasLasReservas.forEach(r => {
        // 🚨 CANDADO NUEVO: Si la reserva está cancelada, no pintes sus fechas en el calendario
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") {
            return; // Salta a la siguiente reserva sin bloquear días
        }
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        
        // 🛡️ CORRECCIÓN AQUÍ: Aseguramos leer el abono posterior correctamente
        const pago = parseFloat(r.Pago) || parseFloat(r.Pago_Liquidacion) || 0;

        // El dinero que YA entró a tu bolsa es el anticipo + los abonos posteriores
        ingresos += (anticipo + pago);
        
        // El saldo que te deben es el total menos todo lo abonado
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
        // 🚨 CANDADO DE CANCELACIONES: Si el estado es "Cancelada", se ignora por completo
        if (r.Estado && String(r.Estado).trim().toLowerCase() === "cancelada") return false;
    
        if (!r.Nombre_Completo) return false;

    
        // Filtro A: Buscador por Nombre o Teléfono
        const nombreTexto = r.Nombre_Completo ? String(r.Nombre_Completo).toLowerCase() : "";
        const cumpleTexto = nombreTexto.includes(textoBusqueda) || 
                            (r.Telefono && String(r.Telefono).includes(textoBusqueda));
        
        // 🛡️ CORRECCIÓN DE EXTRACCIÓN: Tomamos los primeros 10 caracteres (AAAA-MM-DD) de forma segura
        const stringLlegada = r.Fecha_Llegada ? r.Fecha_Llegada.substring(0, 10) : "";
        const stringSalida = r.Fecha_Salida ? r.Fecha_Salida.substring(0, 10) : "";

        if (!stringLlegada || !stringSalida) return false;

        // Convertimos a tiempo seguro de media noche local para la comparación
        const inicioReserva = new Date(stringLlegada + "T00:00:00").getTime();
        const finReserva = new Date(stringSalida + "T00:00:00").getTime();

        // Filtro B: Si NO hay fechas de auditoría puestas, ocultamos las reservaciones pasadas
        if (!fDesde && !fHasta) {
            return cumpleTexto && (finReserva >= hoyTimestamp);
        }

        // Filtro C: Si la Auditoría por Periodo está activa, validamos el rango elegido
        const limiteDesde = fDesde ? new Date(fDesde + "T00:00:00").getTime() : 0;
        const limiteHasta = fHasta ? new Date(fHasta + "T00:00:00").getTime() : Infinity;

        // La reserva se muestra si choca o cae dentro del periodo auditado
        const cumplePeriodo = (inicioReserva <= limiteHasta && finReserva >= limiteDesde);

        return cumpleTexto && cumplePeriodo;
    });

    // 2. Ordenar de forma cronológica: Las reservas más próximas a realizarse van primero
    reservasFiltradas.sort((a, b) => {
        const tA = new Date((a.Fecha_Llegada || "").substring(0, 10) + "T00:00:00").getTime();
        const tB = new Date((b.Fecha_Llegada || "").substring(0, 10) + "T00:00:00").getTime();
        return tA - tB;
    });

    // 3. Renderizar Tarjeta Única
    contenedor.innerHTML = "";
    if (reservasFiltradas.length === 0) {
        contenedor.innerHTML = `<p style="color:#6b7280; text-align:center; padding:20px; font-weight:500;">📋 No se encontraron reservaciones para este criterio.</p>`;
        return;
    }

    reservasFiltradas.forEach(r => {
        const card = document.createElement("div");
        
        // 🛡️ REFUERZO DE VARIABLES: Aseguramos leer correctamente el campo del Excel
        console.log("💎 Analizando objeto reserva en tarjeta:", r);
        
        const total = parseFloat(r.Total_Reserva) || 0;
        const anticipo = parseFloat(r.Anticipo) || 0;
        
        // 🔄 BUSQUEDA SEGURA: Evaluamos cuál propiedad del JSON contiene el dinero de la liquidación
         const valorPagoRaw = r.Pago_Liquidacion || r.Pago || 0;
         const pago = parseFloat(valorPagoRaw) || 0;
        
        // Operación matemática real: Total menos todo lo abonado
        const saldoPendiente = total - anticipo - pago;

        let etiquetaSaldo = "";
        // Si el saldo pendiente es menor o igual a 0, la cuenta está saldada
        if (saldoPendiente > 0) {
            etiquetaSaldo = `<span style="background-color:#fff7ed; color:#c2410c; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; white-space:nowrap;">⏳ Pendiente: $${saldoPendiente}</span>`;
        } else {
            etiquetaSaldo = `<span style="background-color:#ecfdf5; color:#15803d; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:bold; white-space:nowrap;">✅ Liquidado</span>`;
        }

        // 🔄 CONVERSIÓN DE FORMATO TOTALMENTE CORREGIDA: Pasa de AAAA-MM-DD a DD-MM-AAAA
        const formatearA_Español = (fTxt) => {
            if (!fTxt) return "---";
            const limpio = fTxt.substring(0, 10); // "AAAA-MM-DD"
            const partes = limpio.split("-");     // ["AAAA", "MM", "DD"]
            if (partes.length !== 3) return fTxt;
            return `${partes[2]}-${partes[1]}-${partes[0]}`; // "DD-MM-AAAA"
        };

        card.innerHTML = `
            <div style="background-color:#ffffff; padding:16px; border-radius:16px; border:1px solid #f3f4f6; box-shadow:0 1px 3px rgba(0,0,0,0.05); margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; gap:8px;">
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

                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; gap:8px;">
                    <span style="color:#4b5563; font-size:13px;">Total: <b>$${total} MN</b></span>
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

    const fLlegadaTxt = document.getElementById("Fecha_Llegada")?.value;
    const fSalidaTxt = document.getElementById("Fecha_Salida")?.value;
    const idReserva = document.getElementById("form-reserva-id").value; // 🆕 Captura si es edición

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
    // (si estamos editando al mismo huésped, omitimos para que no choque consigo mismo)
    if (!idReserva && verificarConflictoFechas(fLlegadaTxt, fSalidaTxt)) {
        alert("🚫 ¡Conflicto de fechas! Los días seleccionados ya se encuentran ocupados.");
        return;
    }

        // 358: Arreglo de campos alineado de forma idéntica con el Backend (Google Sheets)
    const campos = [
        "Nombre_Completo", "Telefono", "Fecha_Llegada", "Fecha_Salida", "Total_Reserva", 
        "Anticipo", "Fecha_Anticipo", "Pago_Limpieza", "Fecha_Limpieza", 
        "Pago_Brazaletes", "Comision_Pagada", "Fecha_Comision", "Observaciones"
    ];
    
    let datos = {};
    campos.forEach(id => { const el = document.getElementById(id); datos[id] = el ? el.value : ""; });

    // 🛡️ TRATAMIENTO ESPECIAL DE LIQUIDACIÓN: Mapeamos los IDs del HTML a las variables del Backend
    const elPago = document.getElementById("Pago");
    datos["Pago_Liquidacion"] = elPago ? elPago.value : "";

    const elFechaPago = document.getElementById("Fecha_Pago");
    datos["Fecha_Pago_Liq"] = elFechaPago ? elFechaPago.value : "";

    // 🔄 INYECTAMOS EL ID DE ACCIÓN COMPATIBLE CON TU CÓDIGO.GS
    if (idReserva) {
        datos["idReserva"] = idReserva; // 🚨 Cambiado de "Num_Reservacion" a "idReserva" para que active la edición
        datos["accion"] = "editar";
    } else {
        datos["accion"] = "crear";
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
            
            // 1. Limpiamos el formulario primero pero nos quedamos en espera
            document.getElementById("form-reserva").reset();
            document.getElementById("form-reserva-id").value = "";
            document.getElementById("titulo-formulario").innerText = "📝 Nueva Reservación";
            document.getElementById("btn-cancelar-edicion").classList.add("hidden");
            document.getElementById("btn-cancelar-edicion").style.display = "none";

            document.getElementById("btn-cancelar-edicion").style.display = "none";
            // 🛠️ LÍNEA NUEVA: Ocultamos el botón rojo de cancelación tras una operación exitosa
            const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
            if (btnCancelarReserva) btnCancelarReserva.classList.add("hidden");
            
            const btnGuardar = document.querySelector("#form-reserva button[type='submit']");
            if (btnGuardar) btnGuardar.innerText = "Guardar Reservación";

            // 2. 🔥 Forzamos la descarga de datos frescos en internet y ESPERAMOS a que termine
            await obtenerReservas();
            
            // 3. Ya con los datos nuevos en la mano, redirigimos visualmente a la lista actualizada
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

            const resultadoBusqueda = (typeof obtenerReservaConIndice === "function") 
                ? obtenerReservaConIndice(fechaCeldaStr) 
                : null;

            if (resultadoBusqueda) {
                const { reserva, indice } = resultadoBusqueda;
                const numeroColor = indice % 5;
                
                diaDiv.className = `p-2 border text-center rounded celda-ocupada user-color-${numeroColor}`;
                
                diaDiv.onclick = () => {
                    // 🛡️ EXTRACCIÓN Y FORMATEO SEGURO A DD-MM-AAAA
                    const formatearFecha = (fechaTxt) => {
                        if (!fechaTxt) return "No definida";
                        const limpio = String(fechaTxt).substring(0, 10); 
                        const partes = limpio.split("-");                 
                        if (partes.length !== 3) return fechaTxt;
                        return `${partes[2]}-${partes[1]}-${partes[0]}`;   
                    };

                    const fLlegadaEspañol = formatearFecha(reserva.Fecha_Llegada);
                    const fSalidaEspañol = formatearFecha(reserva.Fecha_Salida);

                    alert(`📌 DETALLES DE LA RESERVACIÓN\n--------------------------------------------\n👤 Huésped: ${reserva.Nombre_Completo || "Desconocido"}\n📱 Teléfono: ${reserva.Telefono || "No registrado"}\n📅 Llegada: ${fLlegadaEspañol}\n📅 Salida: ${fSalidaEspañol}\n💵 Total: $${reserva.Total_Reserva || 0} MN\n💰 Anticipo: $${reserva.Anticipo || 0} MN\n📝 Obs: ${reserva.Observaciones || "Ninguna"}`);
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

    const indice = todasLasReservas.findIndex(r => {
        if (!r.Fecha_Llegada || !r.Fecha_Salida) return false;
        
        // Extracción limpia y segura de "AAAA-MM-DD"
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

    // Buscamos la reserva por Folio, ID o por Nombre si no hay ID único
    const reserva = todasLasReservas.find(r => 
        r.Num_Reservacion == identificador || r.id == identificador || r.Nombre_Completo == identificador
    );

    if (!reserva) {
        alert("⚠️ No se encontraron los datos de esta reservación.");
        return;
    }

    console.log("🔍 [Depuración DV] Datos originales recibidos de la base de datos:", reserva);

    // 1. Cambiamos visualmente el título del formulario y encendemos el botón de volver
    document.getElementById("titulo-formulario").innerText = "✏️ Modificar / Cancelar Reservación";
    const btnCancelar = document.getElementById("btn-cancelar-edicion");
    if (btnCancelar) {
        btnCancelar.classList.remove("hidden");
        btnCancelar.style.display = "inline-block";
    }

    // 2. Cambiamos el texto del botón de envío principal
    const btnGuardar = document.querySelector("#form-reserva button[type='submit']");
    if (btnGuardar) btnGuardar.innerText = "Guardar Cambios en la Reserva";

    // 3. Guardamos el ID en el campo oculto para que el sistema sepa que es una EDICIÓN
    document.getElementById("form-reserva-id").value = reserva.Num_Reservacion || reserva.id || "";

    // 4. Mapeamos los campos numéricos y de texto estándar
    const camposEstandar = [
        "Nombre_Completo", "Telefono", "Total_Reserva", "Anticipo", 
        "Pago_Limpieza", "Pago_Brazaletes", "Comision_Pagada", "Observaciones"
    ];

    camposEstandar.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.value = reserva[id] || "";
        }
    });

    // 5. 🛡️ DEPURACIÓN DE LIQUIDACIÓN: Mapea con seguridad al id="Pago" de tu HTML
    const elementoPago = document.getElementById("Pago");
    if (elementoPago) {
        // Busca bajo el nombre 'Pago_Liquidacion' o 'Pago' según responda tu Sheets
        elementoPago.value = reserva.Pago_Liquidacion || reserva.Pago || "";
    }

    // 6. 📅 TRATAMIENTO SEGURO DE FECHAS (Corta los primeros 10 caracteres AAAA-MM-DD para el input tipo date)
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
            const valorFecha = campo.propiedadJson ? String(campo.propiedadJson).substring(0, 10) : "";
            elemento.value = valorFecha;
        }
    });

    // 7. 🚨 CONTROL DEL BOTÓN ROJO DE CANCELACIÓN (Aparece solo en edición)
    const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
    if (btnCancelarReserva) {
        btnCancelarReserva.classList.remove("hidden"); 
    
        // Programamos la acción de clic de forma aislada
        btnCancelarReserva.onclick = function() {
            if (confirm("⚠️ ¿Estás seguro de que deseas CANCELAR esta reservación? El espacio quedará liberado.")) {
                ejecutarCancelacion(reserva.Num_Reservacion);
            }
        };
    }

    // 8. Redirigimos automáticamente al usuario a la pestaña del formulario
    cambiarVista('formulario');
}


// 🔙 Función por si el usuario decide no modificar nada y quiere regresar a la lista
function cancelarEdicion() {
    document.getElementById("form-reserva").reset();
    document.getElementById("form-reserva-id").value = "";
    document.getElementById("titulo-formulario").innerText = "📝 Nueva Reservación";
    document.getElementById("btn-cancelar-edicion").classList.add("hidden");
    document.getElementById("btn-cancelar-edicion").style.display = "none";
    
    const btnGuardar = document.querySelector("#form-reserva button[type='submit']");
    if (btnGuardar) btnGuardar.innerText = "Guardar Reservación";
    
    cambiarVista('lista');
}

/**
 * Envía la orden de cancelación al servidor de Google Sheets
 * @param {string|number} idReservacion - El Folio o número de la reservación
 */
async function ejecutarCancelacion(idReservacion) {
    console.log("❌ [Cancelación] Solicitando cancelar folio:", idReservacion);
    
    // Cambiamos el texto del botón rojo para dar feedback visual
    const btnCancelarReserva = document.getElementById("btn-cancelar-reserva");
    if (btnCancelarReserva) {
        btnCancelarReserva.innerText = "⏳ Cancelando...";
        btnCancelarReserva.disabled = true;
    }

    // Estructuramos los datos que va a recibir tu archivo Código.gs
    const datos = {
        action: "cancelar",
        id: idReservacion
    };

    try {
        // Hacemos el envío de datos a tu URL de Google Apps Script
        const r = await fetch(WEB_APP_URL, { 
            method: "POST", 
            body: JSON.stringify(datos) 
        });
        const res = await r.json();

        if (res.status === "success") {
            alert("⚠️ Reservación cancelada y espacio liberado con éxito.");
            
            // Limpiamos el formulario por seguridad
            document.getElementById("form-reserva").reset();
            document.getElementById("form-reserva-id").value = "";
            document.getElementById("titulo-formulario").innerText = "📋 Nueva Reservación";
            if (btnCancelarReserva) btnCancelarReserva.classList.add("hidden");

            // Recargamos los datos frescos desde el Excel y regresamos a la lista
            await obtenerReservas();
            cambiarVista('lista');
        } else {
            alert("❌ Hubo un detalle al procesar la cancelación en el servidor.");
        }
    } catch (error) {
        console.error("Error en proceso de cancelación:", error);
        alert("❌ Error de red al intentar conectar con el servidor de cancelaciones.");
    } finally {
        // Restauramos el estado del botón por si acaso
        if (btnCancelarReserva) {
            btnCancelarReserva.innerText = "❌ Cancelar Reservación";
            btnCancelarReserva.disabled = false;
        }
    }
}
