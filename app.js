// 🌐 PON AQUÍ TU ENLACE LARGO DE GOOGLE APPS SCRIPT
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwhQ1e0ma32EtEx3U5Xih2wOJTJNI1hKPTZk4r4UqM0TnVmh7dtwGtKHOO3kaj8GbY5/exec";

let todasLasReservas = [];
let mesVisualizado = new Date(); 

document.addEventListener("DOMContentLoaded", () => { obtenerReservas(); });

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
    try {
        const respuesta = await fetch(WEB_APP_URL);
        todasLasReservas = await respuesta.json();
        actualizarDashboard();
        renderizarCards(todasLasReservas);
        renderizarCalendario(); 
    } catch (e) { console.error("Error:", e); }
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

function renderizarCalendario() {
    const con = document.getElementById("calendario-contenedor");
    if (!con) return;
    const a = mesVisualizado.getFullYear(), m = mesVisualizado.getMonth();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    con.style.display = "grid"; con.style.gridTemplateColumns = "repeat(7, 1fr)"; con.style.gap = "6px"; con.innerHTML = "";
    
    const cab = document.createElement("div");
    cab.style = "grid-column:span 7; display:flex; justify-content:space-between; align-items:center; padding-bottom:12px;";
    cab.innerHTML = `
        <span style="font-size:16px; font-weight:bold; color:#1e3a8a;">📍 ${meses[m]} ${a}</span>
        <div>
            <button type="button" onclick="cambiarMes(-1)" style="padding:4px 12px; background:#f3f4f6; border:1px solid #d1d5db; border-radius:6px; font-weight:bold; cursor:pointer;">‹</button>
            <button type="button" onclick="cambiarMes(1)" style="padding:4px 12px; background:#f3f4f6; border:1px solid #d1d5db; border-radius:6px; font-weight:bold; cursor:pointer;">›</button>
        </div>`;
    con.appendChild(cab);

    ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].forEach(d => { con.innerHTML += `<div style="font-weight:bold; color:#9ca3af; padding-bottom:8px;">${d}</div>`; });
    const pDia = new Date(a, m, 1).getDay(), tDias = new Date(a, m + 1, 0).getDate();
    for (let i = 0; i < pDia; i++) { con.innerHTML += `<div></div>`; }

    for (let d = 1; d <= tDias; d++) {
        let fAct = new Date(a, m, d);
        let oc = verificarNocheOcupada(fAct);
        let est = oc ? "background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-weight:bold;" : "background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;";
        con.innerHTML += `<div style="padding:8px 0; border-radius:8px; display:flex; flex-direction:column; justify-content:center; align-items:center; min-height:35px; ${est}"><span>${d}</span></div>`;
    }
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
