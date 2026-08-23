// 🌐 PON AQUÍ TU ENLACE LARGO DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwhQ1e0ma32EtEx3U5Xih2wOJTJNI1hKPTZk4r4UqM0TnVmh7dtwGtKHOO3kaj8GbY5/exec";

let todasLasReservas = [];
let mesVisualizado = new Date(); 

// 🔄 Inicializar app e íconos al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    obtenerReservas();
});

// 🗺️ Cambiar entre pestañas (Módulos) y forzar dibujado del calendario
function cambiarVista(vistaDestino) {
    const vistas = ['dashboard', 'calendario', 'lista', 'nuevo'];
    vistas.forEach(v => {
        const element = document.getElementById(`vista-${v}`);
        const btn = document.getElementById(`btn-${v}`);
        
        if (v === vistaDestino) {
            element.classList.remove('hidden');
            if (btn) btn.style.color = "#2563eb"; // Color azul para pestaña activa
        } else {
            element.classList.add('hidden');
            if (btn) btn.style.color = "#6b7280"; // Color gris para inactivas
        }
    });

    // ⚡ SI SE ABRE EL CALENDARIO, SE DIBUJA EN ESE INSTANTE
    if (vistaDestino === 'calendario') {
        renderizarCalendario();
    }
}

// 📥 Consultar reservas desde Google Sheets
async function obtenerReservas() {
    try {
        const respuesta = await fetch(WEB_APP_URL);
        todasLasReservas = await respuesta.json();
        
        // Ejecutar las actualizaciones visuales una vez que lleguen los datos
        actualizarDashboard();
        renderizarCards(todasLasReservas);
        renderizarCalendario(); 
    } catch (error) {
        console.error("Error al cargar datos de Google Sheets:", error);
    }
}

// 📊 Actualizar métricas del Inicio
function actualizarDashboard() {
    document.getElementById("dash-activas").innerText = todasLasReservas.length;
    let total = todasLasReservas.reduce((sum, res) => sum + (Number(res.Total_Reserva) || 0), 0);
    document.getElementById("dash-ingresos").innerText = "$" + total.toLocaleString('es-MX');
}

// 📑 Dibujar las "Cards" modernas en la vista de Reservas
function renderizarCards(lista) {
    const contenedor = document.getElementById("contenedor-cards");
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        contenedor.innerHTML = `<p class="text-slate-400 text-sm text-center col-span-full py-8">No se encontraron reservas.</p>`;
        return;
    }

    lista.forEach(res => {
        const card = document.createElement("div");
        card.className = "bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3";
        card.innerHTML = `
            <div class="flex justify-between items-start border-b border-slate-100 pb-2">
                <div>
                    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm font-mono font-bold">${res.Num_Reservacion}</span>
                    <h3 class="font-bold text-slate-800 text-base mt-1">${res.Nombre_Completo}</h3>
                </div>
                <span class="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Registrado</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-50 p-2 rounded-lg">
                    <span class="text-slate-400 block">📅 Llegada</span>
                    <span class="font-semibold text-slate-700">${formatearFecha(res.Fecha_Llegada)}</span>
                </div>
                <div class="bg-slate-50 p-2 rounded-lg">
                    <span class="text-slate-400 block">📅 Salida</span>
                    <span class="font-semibold text-slate-700">${formatearFecha(res.Fecha_Salida)}</span>
                </div>
            </div>
            <div class="flex justify-between text-xs pt-1">
                <span class="text-slate-500">📞 ${res.Telefono}</span>
                <span class="font-bold text-slate-800 text-sm">$${(Number(res.Total_Reserva) || 0).toLocaleString('es-MX')}</span>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// 🔍 Buscador en tiempo real para filtrar las tarjetas
function filtrarReservas() {
    const texto = document.getElementById("buscador").value.toLowerCase();
    const filtradas = todasLasReservas.filter(res => 
        res.Nombre_Completo.toLowerCase().includes(texto) || 
        res.Telefono.includes(texto)
    );
    renderizarCards(filtradas);
}

// ➕ Enviar nueva reservación a Google Sheets
async function guardarReserva(event) {
    event.preventDefault();
    
    // Recopilar datos del formulario
    const campos = [
        "Nombre_Completo", "Telefono", "Fecha_Llegada", "Fecha_Salida", 
        "Total_Reserva", "Anticipo", "Fecha_Anticipo", "Pago", "Fecha_Pago", 
        "Pago_Limpieza", "Fecha_Limpieza", "Pago_Brazaletes", "Comision_Pagada", 
        "Fecha_Comision", "Observaciones"
    ];
    
    let datos = {};
    campos.forEach(id => {
        datos[id] = document.getElementById(id).value;
    });

    const boton = event.target.querySelector("button");
    boton.innerText = "Guardando...";
    boton.disabled = true;

    try {
        const respuesta = await fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(datos)
        });
        
        const resultado = await respuesta.json();
        
        if (resultado.status === "success") {
            alert(`🎉 ¡Éxito! Reserva agendada con folio: ${resultado.id}`);
            document.getElementById("form-reserva").reset();
            cambiarVista('dashboard');
            obtenerReservas(); // Recargar datos automáticamente
        } else {
            alert(resultado.message); // Muestra el mensaje de error por empalme
        }
    } catch (error) {
        alert("Ocurrió un problema en la red al conectar con Google Sheets.");
        console.error(error);
    } finally {
        boton.innerText = "Guardar Reservación";
        boton.disabled = false;
    }
}

// 📅 Estructurar un Calendario interactivo con navegación de meses
function renderizarCalendario() {
    const contenedor = document.getElementById("calendario-contenedor");
    if (!contenedor) return;
    
    // Obtener el año y mes que el usuario quiere ver en este momento
    const añoActual = mesVisualizado.getFullYear();
    const mesActual = mesVisualizado.getMonth();
    
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    
    contenedor.style.display = "grid";
    contenedor.style.gridTemplateColumns = "repeat(7, 1fr)";
    contenedor.style.gap = "6px";
    contenedor.innerHTML = "";
    
    // 🏷️ TÍTULO DEL MES CON BOTONES DE NAVEGACIÓN ANTERIOR Y SIGUIENTE
    const cabeceraMes = document.createElement("div");
    cabeceraMes.style.gridColumn = "span 7";
    cabeceraMes.style.display = "flex";
    cabeceraMes.style.justifyContent = "space-between";
    cabeceraMes.style.alignItems = "center";
    cabeceraMes.style.padding = "4px 0 12px 0";
    
    cabeceraMes.innerHTML = `
        <span style="font-size: 16px; font-weight: bold; color: #1e3a8a;">📍 ${meses[mesActual]} ${añoActual}</span>
        <div style="display: flex; gap: 8px;">
            <button onclick="cambiarMes(-1)" style="padding: 4px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer;">‹</button>
            <button onclick="cambiarMes(1)" style="padding: 4px 12px; background-color: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer;">›</button>
        </div>
    `;
    contenedor.appendChild(cabeceraMes);

    // Crear encabezados de días de la semana
    const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    diasSemana.forEach(d => {
        contenedor.innerHTML += `<div style="font-weight: bold; color: #9ca3af; padding-bottom: 8px;">${d}</div>`;
    });

    const primerDiaMes = new Date(añoActual, mesActual, 1).getDay();
    const totalDiasMes = new Date(añoActual, mesActual + 1, 0).getDate();

    // Rellenar espacios en blanco
    for (let i = 0; i < primerDiaMes; i++) {
        contenedor.innerHTML += `<div></div>`;
    }

    // Generar casillas de los días
    for (let dia = 1; dia <= totalDiasMes; dia++) {
        let fechaActual = new Date(añoActual, mesActual, dia);
        let estaOcupado = verificarNocheOcupada(fechaActual);

        let estiloCaja = estaOcupado 
            ? "background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; font-weight: bold;" 
            : "background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;";

        contenedor.innerHTML += `
            <div style="padding: 8px 0; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 35px; ${estiloCaja}">
                <span>${dia}</span>
            </div>
        `;
    }
}

// 🔄 Función para avanzar o retroceder meses
function cambiarMes(direccion) {
    mesVisualizado.setMonth(mesVisualizado.getMonth() + direccion);
    renderizarCalendario();
}

// 🧠 Verificar ocupación cruzando fechas de forma segura contra Google Sheets
function verificarNocheOcupada(fecha) {
    if (!todasLasReservas || todasLasReservas.length === 0) return false;
    
    // Convertir la fecha actual que evalúa el calendario a formato ISO puro (YYYY-MM-DD)
    let año = fecha.getFullYear();
    let mes = String(fecha.getMonth() + 1).padStart(2, '0');
    let dia = String(fecha.getDate()).padStart(2, '0');
    let fTextoEvaluar = `${año}-${mes}-${dia}`;

    return todasLasReservas.some(res => {
        if (!res.Fecha_Llegada || !res.Fecha_Salida) return false;
        
        // Limpiar formatos de fecha por si vienen con horas adicionales de la base de datos
        let entrada = res.Fecha_Llegada.split("T")[0];
        let salida = res.Fecha_Salida.split("T")[0];
        
        // La noche pertenece al registro si es igual/mayor a la entrada y menor estricta a la salida
        return (fTextoEvaluar >= entrada && fTextoEvaluar < salida);
    });
}

// 🛠️ Función auxiliar para formatear fechas de YYYY-MM-DD a DD/MM/YYYY
function formatearFecha(f) {
    if (!f) return "--";
    const partes = f.split("-");
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
