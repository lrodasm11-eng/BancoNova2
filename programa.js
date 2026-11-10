
/* =====================================
   BANCO NOVA
   SISTEMA SIN BASE DE DATOS EXTERNA
===================================== */

const CLAVE = "bancoNovaDatos";

const dinero = n => Number(n).toLocaleString("es-GT", {
    style: "currency",
    currency: "GTQ"
});

const fechaActual = () => new Date().toLocaleString("es-GT");

const escapar = texto => String(texto ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
})[c]);

function generarCuenta() {
    return "BN" + Math.floor(10000000 + Math.random() * 90000000);
}

function cargarDatos() {
    try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado) return JSON.parse(guardado);
    } catch (error) {
        console.error("Error al leer los datos:", error);
    }

    const inicial = {
        usuarios: [
            {
                id: 1, nombre: "Administrador",
                correo: "admin@banconova.com",
                password: "admin123",
                cuenta: "BN00000001", saldo: 0,
                rol: "admin", bloqueado: false, fecha: fechaActual()
            },
            {
                id: 2, nombre: "María López",
                correo: "maria@banconova.com",
                password: "maria123",
                cuenta: "BN00000002", saldo: 2500,
                rol: "usuario", bloqueado: false, fecha: fechaActual()
            },
            {
                id: 3, nombre: "Carlos Pérez",
                correo: "carlos@banconova.com",
                password: "carlos123",
                cuenta: "BN00000003", saldo: 1800,
                rol: "usuario", bloqueado: false, fecha: fechaActual()
            }
        ],
        movimientos: [],
        ahorros: [],
        publicaciones: [],
        reportes: [],
        siguienteId: 4
    };

    localStorage.setItem(CLAVE, JSON.stringify(inicial));
    return inicial;
}

let datos = cargarDatos();
let usuarioActual = null;
let transferenciaPendiente = null;
let ultimoRecibo = null;

function guardarDatos() {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
}

function buscarUsuario(id) {
    return datos.usuarios.find(u => u.id === Number(id));
}

function notificar(mensaje) {
    const caja = document.getElementById("notificacion");
    caja.textContent = mensaje;
    caja.classList.remove("oculto");

    clearTimeout(window.temporizadorNotificacion);

    window.temporizadorNotificacion = setTimeout(() => {
        caja.classList.add("oculto");
    }, 3000);
}

/* =====================================
   PANTALLAS
===================================== */

function mostrarPantalla(id) {
    ["pantallaLogin", "pantallaRegistro", "panelUsuario", "panelAdmin"]
        .forEach(p => document.getElementById(p).classList.add("oculto"));

    document.getElementById(id).classList.remove("oculto");
}

document.getElementById("mostrarRegistro").addEventListener("click", e => {
    e.preventDefault();
    mostrarPantalla("pantallaRegistro");
});

document.getElementById("mostrarLogin").addEventListener("click", e => {
    e.preventDefault();
    mostrarPantalla("pantallaLogin");
});

/* =====================================
   REGISTRO
===================================== */

document.getElementById("formRegistro").addEventListener("submit", e => {
    e.preventDefault();

    const nombre = document.getElementById("nombreRegistro").value.trim();
    const correo = document.getElementById("correoRegistro").value.trim().toLowerCase();
    const password = document.getElementById("passwordRegistro").value;
    const mensaje = document.getElementById("mensajeRegistro");

    if (datos.usuarios.some(u => u.correo === correo)) {
        mensaje.textContent = "Este correo ya está registrado.";
        return;
    }

    const nuevo = {
        id: datos.siguienteId++,
        nombre,
        correo,
        password,
        cuenta: generarCuenta(),
        saldo: 1500,
        rol: "usuario",
        bloqueado: false,
        fecha: fechaActual()
    };

    datos.usuarios.push(nuevo);
    guardarDatos();
    e.target.reset();
    mensaje.textContent = "";

    notificar("¡Cuenta creada exitosamente!");
    iniciarSesion(nuevo);
});

/* =====================================
   INICIO DE SESION
===================================== */

document.getElementById("formLogin").addEventListener("submit", e => {
    e.preventDefault();

    const correo = document.getElementById("correoLogin").value.trim().toLowerCase();
    const password = document.getElementById("passwordLogin").value;

    const usuario = datos.usuarios.find(
        u => u.correo === correo && u.password === password
    );

    if (!usuario) {
        document.getElementById("mensajeLogin").textContent =
            "Correo o contraseña incorrectos.";
        return;
    }

    if (usuario.bloqueado) {
        document.getElementById("mensajeLogin").textContent =
            "Tu cuenta se encuentra bloqueada.";
        return;
    }

    iniciarSesion(usuario);
});

function iniciarSesion(usuario) {
    usuarioActual = usuario;

    if (usuario.rol === "admin") {
        mostrarPantalla("panelAdmin");
        renderizarAdmin();
    } else {
        mostrarPantalla("panelUsuario");
        document.getElementById("nombreUsuario").textContent = usuario.nombre;
        mostrarSeccion("inicio");
        actualizarSistema();
    }
}

/* =====================================
   CERRAR SESION
===================================== */

document.getElementById("cerrarSesion").addEventListener("click", cerrarSesion);
document.getElementById("cerrarSesionAdmin").addEventListener("click", cerrarSesion);

function cerrarSesion() {
    usuarioActual = null;
    transferenciaPendiente = null;
    ultimoRecibo = null;

    cerrarModal();
    document.getElementById("formLogin").reset();
    document.getElementById("mensajeLogin").textContent = "";
    document.getElementById("reciboTransferencia").classList.add("oculto");

    mostrarPantalla("pantallaLogin");
}

/* =====================================
   NAVEGACION
===================================== */

document.querySelectorAll(".opcion-menu").forEach(boton => {
    boton.addEventListener("click", () => mostrarSeccion(boton.dataset.seccion));
});

document.querySelectorAll("[data-ir]").forEach(boton => {
    boton.addEventListener("click", () => mostrarSeccion(boton.dataset.ir));
});

function mostrarSeccion(nombre) {
    document.querySelectorAll(".seccion").forEach(s => s.classList.add("oculto"));

    const seccion = document.getElementById("seccion-" + nombre);
    if (seccion) seccion.classList.remove("oculto");

    document.querySelectorAll(".opcion-menu").forEach(b => {
        b.classList.toggle("activa", b.dataset.seccion === nombre);
    });

    actualizarSistema();
}

/* =====================================
   ACTUALIZACION GENERAL
===================================== */

function actualizarSistema() {
    if (!usuarioActual || usuarioActual.rol !== "usuario") return;

    usuarioActual = buscarUsuario(usuarioActual.id);
    if (!usuarioActual) return;

    document.getElementById("saldoUsuario").textContent = dinero(usuarioActual.saldo);
    document.getElementById("numeroCuenta").textContent =
        "Número de cuenta: " + usuarioActual.cuenta;
    document.getElementById("nombreUsuario").textContent = usuarioActual.nombre;
    document.getElementById("saludoUsuario").textContent =
        usuarioActual.nombre.split(" ")[0];

    document.getElementById("totalTransferencias").textContent =
        datos.movimientos.filter(m =>
            m.usuarioId === usuarioActual.id &&
            m.tipo === "Transferencia enviada"
        ).length;

    document.getElementById("totalAhorros").textContent =
        datos.ahorros.filter(a => a.usuarioId === usuarioActual.id).length;

    document.getElementById("totalPublicaciones").textContent =
        datos.publicaciones.filter(p => p.usuarioId === usuarioActual.id).length;

    renderizarActividad();
    renderizarMovimientos();
    renderizarAhorros();
    renderizarPublicaciones();
    renderizarContactos();
    renderizarDestinatarios();
    renderizarPerfil();
}

/* =====================================
   MOVIMIENTOS
===================================== */

function registrarMovimiento(usuarioId, tipo, monto, descripcion) {
    datos.movimientos.unshift({
        id: Date.now() + Math.random(),
        usuarioId,
        tipo,
        monto: Number(monto),
        descripcion,
        fecha: fechaActual()
    });
}

function renderizarMovimientos() {
    const lista = document.getElementById("listaMovimientos");

    const movimientos = datos.movimientos.filter(
        m => m.usuarioId === usuarioActual.id
    );

    lista.innerHTML = movimientos.length
        ? movimientos.map(m => {
            const entrada = m.tipo === "Transferencia recibida";
            return `
                <div class="tarjeta-movimiento ${entrada ? "entrada" : "salida"}">
                    <h3>${escapar(m.tipo)}</h3>
                    <p>${escapar(m.descripcion)}</p>
                    <p>${escapar(m.fecha)}</p>
                    <p class="${entrada ? "positivo" : "negativo"}">
                        ${entrada ? "+" : "-"} ${dinero(m.monto)}
                    </p>
                </div>
            `;
        }).join("")
        : "<p>Aún no tienes movimientos registrados.</p>";
}

function renderizarActividad() {
    const lista = document.getElementById("actividadReciente");

    const movimientos = datos.movimientos.filter(
        m => m.usuarioId === usuarioActual.id
    ).slice(0, 3);

    lista.innerHTML = movimientos.length
        ? movimientos.map(m =>
            `<p>${escapar(m.tipo)} · ${dinero(m.monto)}</p>`
        ).join("")
        : "<p>No hay actividad reciente.</p>";
}

/* =====================================
   TRANSFERENCIAS CON CONFIRMACION
===================================== */

function renderizarDestinatarios() {
    const select = document.getElementById("cuentaDestino");

    const usuarios = datos.usuarios.filter(u =>
        u.rol === "usuario" &&
        u.id !== usuarioActual.id &&
        !u.bloqueado
    );

    select.innerHTML = '<option value="">Selecciona un usuario</option>' +
        usuarios.map(u => `
            <option value="${u.id}">
                ${escapar(u.nombre)} - ${escapar(u.cuenta)}
            </option>
        `).join("");
}

/* Primero se revisan los datos y se abre la ventana.
   Todavía NO se mueve dinero. */

document.getElementById("formTransferencia").addEventListener("submit", e => {
    e.preventDefault();

    const destinatario = buscarUsuario(
        document.getElementById("cuentaDestino").value
    );

    const monto = Number(
        document.getElementById("montoTransferencia").value
    );

    const descripcion =
        document.getElementById("descripcionTransferencia").value.trim()
        || "Transferencia entre cuentas";

    const mensaje = document.getElementById("mensajeTransferencia");
    mensaje.textContent = "";

    if (!destinatario || destinatario.rol !== "usuario" ||
        destinatario.bloqueado) {
        mensaje.textContent = "Selecciona un destinatario válido.";
        return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
        mensaje.textContent = "Ingresa un monto válido.";
        return;
    }

    if (monto > usuarioActual.saldo) {
        mensaje.textContent = "No tienes saldo suficiente.";
        return;
    }

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const totalDiario = datos.movimientos
        .filter(m =>
            m.usuarioId === usuarioActual.id &&
            m.tipo === "Transferencia enviada" &&
            new Date(m.id).getTime() >= inicioDia.getTime()
        )
        .reduce((total, m) => total + m.monto, 0);

    if (totalDiario + monto > 30000) {
        mensaje.textContent = "Superaste el límite diario de Q30,000.";
        notificar("Límite diario de transferencias excedido.");
        return;
    }

    transferenciaPendiente = {
        destinatarioId: destinatario.id,
        monto,
        descripcion
    };

    document.getElementById("confirmarDestinatario").textContent =
        destinatario.nombre;

    document.getElementById("confirmarCuenta").textContent =
        destinatario.cuenta;

    document.getElementById("confirmarMonto").textContent = dinero(monto);

    document.getElementById("confirmarDescripcion").textContent = descripcion;

    document.getElementById("modalConfirmacion").classList.remove("oculto");
});

/* Si se cancela, no se modifica ningún saldo. */

function cerrarModal() {
    document.getElementById("modalConfirmacion").classList.add("oculto");
    transferenciaPendiente = null;
}

document.getElementById("cancelarTransferencia").addEventListener("click", () => {
    cerrarModal();
    notificar("Transferencia cancelada.");
});

/* Solo al confirmar se realiza la operación. */

document.getElementById("aceptarTransferencia").addEventListener("click", () => {
    if (!transferenciaPendiente || !usuarioActual) return;

    const operacion = { ...transferenciaPendiente };
    const destinatario = buscarUsuario(operacion.destinatarioId);

    // Comprobar nuevamente los datos antes de ejecutar.
    if (!destinatario || destinatario.bloqueado ||
        destinatario.id === usuarioActual.id) {
        cerrarModal();
        notificar("El destinatario ya no está disponible.");
        return;
    }

    if (operacion.monto <= 0 ||
        operacion.monto > usuarioActual.saldo) {
        cerrarModal();
        notificar("No tienes saldo suficiente.");
        return;
    }

    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    const totalDiario = datos.movimientos
        .filter(m =>
            m.usuarioId === usuarioActual.id &&
            m.tipo === "Transferencia enviada" &&
            new Date(m.id).getTime() >= inicioDia.getTime()
        )
        .reduce((total, m) => total + m.monto, 0);

    if (totalDiario + operacion.monto > 30000) {
        cerrarModal();
        notificar("Superaste el límite diario de Q30,000.");
        return;
    }

    // Ejecutar la transferencia.
    usuarioActual.saldo -= operacion.monto;
    destinatario.saldo += operacion.monto;

    registrarMovimiento(
        usuarioActual.id,
        "Transferencia enviada",
        operacion.monto,
        "Para " + destinatario.nombre + ": " + operacion.descripcion
    );

    registrarMovimiento(
        destinatario.id,
        "Transferencia recibida",
        operacion.monto,
        "De " + usuarioActual.nombre + ": " + operacion.descripcion
    );

    ultimoRecibo = {
        codigo: "NV-" + Date.now(),
        destinatario: destinatario.nombre,
        cuenta: destinatario.cuenta,
        monto: operacion.monto,
        descripcion: operacion.descripcion,
        fecha: fechaActual()
    };

    cerrarModal();
    guardarDatos();
    actualizarSistema();

    document.getElementById("formTransferencia").reset();
    document.getElementById("mensajeTransferencia").textContent =
        "¡Transferencia realizada correctamente!";

    mostrarRecibo();
    notificar("¡Transferencia enviada exitosamente!");
});

/* =====================================
   COMPROBANTE
===================================== */

function mostrarRecibo() {
    const caja = document.getElementById("reciboTransferencia");

    if (!ultimoRecibo) return;

    caja.innerHTML = `
        <h3>Banco Nova</h3>
        <h2>Comprobante de transferencia</h2>
        <p><strong>Código:</strong> ${escapar(ultimoRecibo.codigo)}</p>
        <p><strong>Destinatario:</strong> ${escapar(ultimoRecibo.destinatario)}</p>
        <p><strong>Cuenta:</strong> ${escapar(ultimoRecibo.cuenta)}</p>
        <p><strong>Monto:</strong> ${dinero(ultimoRecibo.monto)}</p>
        <p><strong>Descripción:</strong> ${escapar(ultimoRecibo.descripcion)}</p>
        <p><strong>Fecha:</strong> ${escapar(ultimoRecibo.fecha)}</p>
        <p>¡Gracias por utilizar Banco Nova!</p>
        <button class="btn-secundario" onclick="window.print()">
            Imprimir comprobante
        </button>
    `;

    caja.classList.remove("oculto");
}

/* =====================================
   AHORROS
===================================== */

document.getElementById("formAhorro").addEventListener("submit", e => {
    e.preventDefault();

    const nombre = document.getElementById("nombreAhorro").value.trim();
    const objetivo = Number(document.getElementById("objetivoAhorro").value);
    const aporte = Number(document.getElementById("aporteAhorro").value);

    if (!Number.isFinite(objetivo) || !Number.isFinite(aporte) ||
        objetivo <= 0 || aporte < 0 || aporte > usuarioActual.saldo) {
        notificar("Revisa el objetivo y el aporte inicial.");
        return;
    }

    usuarioActual.saldo -= aporte;

    datos.ahorros.push({
        id: Date.now(),
        usuarioId: usuarioActual.id,
        nombre,
        objetivo,
        acumulado: aporte,
        fecha: fechaActual()
    });

    if (aporte > 0) {
        registrarMovimiento(usuarioActual.id, "Aporte a ahorro", aporte,
            "Meta: " + nombre);
    }

    guardarDatos();
    e.target.reset();
    actualizarSistema();
    notificar("¡Tu meta de ahorro fue creada!");
});

function renderizarAhorros() {
    const lista = document.getElementById("listaAhorros");
    const ahorros = datos.ahorros.filter(a => a.usuarioId === usuarioActual.id);

    lista.innerHTML = ahorros.length
        ? ahorros.map(a => {
            const porcentaje = Math.min(100, a.acumulado / a.objetivo * 100);
            return `
                <div class="tarjeta-elemento">
                    <h3>${escapar(a.nombre)}</h3>
                    <p>Ahorrado: ${dinero(a.acumulado)}</p>
                    <p>Objetivo: ${dinero(a.objetivo)}</p>
                    <div class="progreso">
                        <div style="width:${porcentaje}%"></div>
                    </div>
                    <p>${porcentaje.toFixed(1)}% completado</p>
                    <button class="btn-secundario" onclick="aportarAhorro(${a.id})">
                        Agregar dinero
                    </button>
                </div>
            `;
        }).join("")
        : "<p>Aún no tienes metas de ahorro.</p>";
}

function aportarAhorro(id) {
    const ahorro = datos.ahorros.find(a =>
        a.id === Number(id) && a.usuarioId === usuarioActual.id
    );

    if (!ahorro) return;

    const monto = Number(prompt("¿Cuánto deseas agregar a tu ahorro?"));

    if (!Number.isFinite(monto) || monto <= 0 || monto > usuarioActual.saldo) {
        notificar("Monto inválido o saldo insuficiente.");
        return;
    }

    usuarioActual.saldo -= monto;
    ahorro.acumulado += monto;

    registrarMovimiento(usuarioActual.id, "Aporte a ahorro", monto,
        "Meta: " + ahorro.nombre);

    guardarDatos();
    actualizarSistema();
    notificar("¡Aporte agregado correctamente!");
}

/* =====================================
   COMUNIDAD
===================================== */

document.getElementById("formPublicacion").addEventListener("submit", e => {
    e.preventDefault();

    const texto = document.getElementById("textoPublicacion").value.trim();
    const categoria = document.getElementById("categoriaPublicacion").value;

    if (!texto) return;

    datos.publicaciones.unshift({
        id: Date.now(),
        usuarioId: usuarioActual.id,
        nombre: usuarioActual.nombre,
        texto,
        categoria,
        fecha: fechaActual(),
        likes: [],
        comentarios: []
    });

    guardarDatos();
    e.target.reset();
    actualizarSistema();
    notificar("¡Tu publicación ya está en la comunidad!");
});

function renderizarPublicaciones() {
    const lista = document.getElementById("listaPublicaciones");

    if (!datos.publicaciones.length) {
        lista.innerHTML = "<p>Aún no hay publicaciones. ¡Sé la primera persona en compartir algo!</p>";
        return;
    }

    lista.innerHTML = datos.publicaciones.map(p => `
        <div class="tarjeta-publicacion">
            <h3>${escapar(p.nombre)}</h3>
            <small>${escapar(p.categoria)} · ${escapar(p.fecha)}</small>
            <p>${escapar(p.texto)}</p>

            <div class="publicacion-acciones">
                <button onclick="reaccionar(${p.id})">
                    ♥ ${p.likes.length} Me gusta
                </button>
                <button onclick="comentar(${p.id})">
                    Comentar (${p.comentarios.length})
                </button>
                <button onclick="reportar(${p.id})">Reportar</button>
                ${p.usuarioId === usuarioActual.id
                    ? `<button onclick="eliminarPublicacion(${p.id})">Eliminar</button>`
                    : ""}
            </div>

            <div class="comentarios">
                ${p.comentarios.map(c => `
                    <div class="comentario">
                        <strong>${escapar(c.nombre)}</strong>
                        <p>${escapar(c.texto)}</p>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");
}

function reaccionar(id) {
    const p = datos.publicaciones.find(p => p.id === Number(id));
    if (!p) return;

    const indice = p.likes.indexOf(usuarioActual.id);

    if (indice >= 0) p.likes.splice(indice, 1);
    else p.likes.push(usuarioActual.id);

    guardarDatos();
    renderizarPublicaciones();
}

function comentar(id) {
    const p = datos.publicaciones.find(p => p.id === Number(id));
    if (!p) return;

    const texto = prompt("Escribe tu comentario:");

    if (!texto || !texto.trim()) return;

    p.comentarios.push({
        nombre: usuarioActual.nombre,
        usuarioId: usuarioActual.id,
        texto: texto.trim()
    });

    guardarDatos();
    renderizarPublicaciones();
    notificar("Comentario publicado.");
}

function eliminarPublicacion(id) {
    const p = datos.publicaciones.find(p => p.id === Number(id));

    if (!p || p.usuarioId !== usuarioActual.id) return;
    if (!confirm("¿Deseas eliminar esta publicación?")) return;

    datos.publicaciones = datos.publicaciones.filter(p => p.id !== Number(id));
    datos.reportes = datos.reportes.filter(r => r.publicacionId !== Number(id));

    guardarDatos();
    actualizarSistema();
    notificar("Publicación eliminada.");
}

function reportar(id) {
    const motivo = prompt("¿Por qué deseas reportar esta publicación?");

    if (!motivo || !motivo.trim()) return;

    datos.reportes.push({
        id: Date.now(),
        publicacionId: Number(id),
        reportante: usuarioActual.nombre,
        motivo: motivo.trim(),
        fecha: fechaActual(),
        revisado: false
    });

    guardarDatos();
    notificar("Reporte enviado al administrador.");
}

/* =====================================
   CONTACTOS
===================================== */

document.getElementById("formContacto").addEventListener("submit", e => {
    e.preventDefault();

    const id = Number(document.getElementById("usuarioContacto").value);
    if (!id || id === usuarioActual.id) return;

    const clave = "novaContactos_" + usuarioActual.id;
    const contactos = JSON.parse(localStorage.getItem(clave) || "[]");

    if (contactos.includes(id)) {
        notificar("Este contacto ya está agregado.");
        return;
    }

    contactos.push(id);
    localStorage.setItem(clave, JSON.stringify(contactos));

    e.target.reset();
    renderizarContactos();
    notificar("Contacto agregado.");
});

function renderizarContactos() {
    const select = document.getElementById("usuarioContacto");
    const lista = document.getElementById("listaContactos");

    const usuarios = datos.usuarios.filter(u =>
        u.rol === "usuario" && u.id !== usuarioActual.id && !u.bloqueado
    );

    select.innerHTML = '<option value="">Selecciona un usuario</option>' +
        usuarios.map(u =>
            `<option value="${u.id}">${escapar(u.nombre)}</option>`
        ).join("");

    const clave = "novaContactos_" + usuarioActual.id;
    const contactos = JSON.parse(localStorage.getItem(clave) || "[]");

    const registrados = contactos.map(buscarUsuario).filter(Boolean);

    lista.innerHTML = registrados.length
        ? registrados.map(u => `
            <div class="tarjeta-elemento">
                <h3>${escapar(u.nombre)}</h3>
                <p>${escapar(u.correo)}</p>
                <p>${escapar(u.cuenta)}</p>
                <button class="btn-secundario" onclick="quitarContacto(${u.id})">
                    Quitar contacto
                </button>
            </div>
        `).join("")
        : "<p>Aún no tienes contactos agregados.</p>";
}

function quitarContacto(id) {
    const clave = "novaContactos_" + usuarioActual.id;
    let contactos = JSON.parse(localStorage.getItem(clave) || "[]");

    contactos = contactos.filter(x => x !== Number(id));
    localStorage.setItem(clave, JSON.stringify(contactos));

    renderizarContactos();
    notificar("Contacto eliminado.");
}

/* =====================================
   PERFIL
===================================== */

function renderizarPerfil() {
    document.getElementById("perfilNombre").textContent = usuarioActual.nombre;
    document.getElementById("perfilCorreo").textContent = usuarioActual.correo;
    document.getElementById("perfilCuenta").textContent =
        "Cuenta: " + usuarioActual.cuenta;
    document.getElementById("perfilFecha").textContent =
        "Registrado: " + usuarioActual.fecha;
}

document.getElementById("eliminarCuenta").addEventListener("click", () => {
    if (!confirm("¿Seguro que deseas eliminar tu cuenta de demostración?")) return;

    const id = usuarioActual.id;

    datos.usuarios = datos.usuarios.filter(u => u.id !== id);
    datos.movimientos = datos.movimientos.filter(m => m.usuarioId !== id);
    datos.ahorros = datos.ahorros.filter(a => a.usuarioId !== id);
    datos.publicaciones = datos.publicaciones.filter(p => p.usuarioId !== id);

    datos.publicaciones.forEach(p => {
        p.likes = p.likes.filter(x => x !== id);
        p.comentarios = p.comentarios.filter(c => c.usuarioId !== id);
    });

    guardarDatos();
    localStorage.removeItem("novaContactos_" + id);

    cerrarSesion();
    notificar("Cuenta eliminada.");
});

/* =====================================
   ADMINISTRADOR
===================================== */

function renderizarAdmin() {
    document.getElementById("adminTotalUsuarios").textContent =
        datos.usuarios.filter(u => u.rol === "usuario").length;

    document.getElementById("adminTotalMovimientos").textContent =
        datos.movimientos.length;

    document.getElementById("adminTotalPublicaciones").textContent =
        datos.publicaciones.length;

    renderizarUsuariosAdmin();
    renderizarMovimientosAdmin();
    renderizarReportesAdmin();
}

function renderizarUsuariosAdmin() {
    const lista = document.getElementById("listaUsuarios");
    const usuarios = datos.usuarios.filter(u => u.rol === "usuario");

    lista.innerHTML = usuarios.length
        ? usuarios.map(u => `
            <div class="tarjeta-elemento">
                <h3>${escapar(u.nombre)}</h3>
                <p>${escapar(u.correo)}</p>
                <p>Cuenta: ${escapar(u.cuenta)}</p>
                <p>Saldo: ${dinero(u.saldo)}</p>
                <p>Estado: ${u.bloqueado ? "Bloqueado" : "Activo"}</p>
                <button class="admin-boton bloquear"
                    onclick="cambiarEstadoUsuario(${u.id})">
                    ${u.bloqueado ? "Desbloquear" : "Bloquear"}
                </button>
            </div>
        `).join("")
        : "<p>No hay usuarios registrados.</p>";
}

function cambiarEstadoUsuario(id) {
    const u = buscarUsuario(id);
    if (!u || u.rol === "admin") return;

    u.bloqueado = !u.bloqueado;

    guardarDatos();
    renderizarAdmin();

    notificar(u.bloqueado ? "Usuario bloqueado." : "Usuario desbloqueado.");
}

function renderizarMovimientosAdmin() {
    const lista = document.getElementById("listaMovimientosAdmin");

    lista.innerHTML = datos.movimientos.length
        ? datos.movimientos.slice(0, 20).map(m => {
            const u = buscarUsuario(m.usuarioId);

            return `
                <div class="tarjeta-movimiento">
                    <h3>${escapar(m.tipo)}</h3>
                    <p>Usuario: ${escapar(u?.nombre || "Cuenta eliminada")}</p>
                    <p>${escapar(m.descripcion)}</p>
                    <p>${dinero(m.monto)} · ${escapar(m.fecha)}</p>
                </div>
            `;
        }).join("")
        : "<p>No hay movimientos registrados.</p>";
}

function renderizarReportesAdmin() {
    const lista = document.getElementById("listaReportes");

    lista.innerHTML = datos.reportes.length
        ? datos.reportes.map(r => {
            const p = datos.publicaciones.find(p => p.id === r.publicacionId);

            return `
                <div class="tarjeta-elemento">
                    <h3>Reporte de publicación</h3>
                    <p>Reportado por: ${escapar(r.reportante)}</p>
                    <p>Motivo: ${escapar(r.motivo)}</p>
                    <p>Fecha: ${escapar(r.fecha)}</p>
                    <p>Estado: ${r.revisado ? "Revisado" : "Pendiente"}</p>
                    ${p
                        ? `<p>Publicación: ${escapar(p.texto)}</p>`
                        : "<p>La publicación ya no existe.</p>"}
                    ${!r.revisado
                        ? `<button class="admin-boton"
                            onclick="revisarReporte(${r.id})">Marcar revisado</button>`
                        : ""}
                </div>
            `;
        }).join("")
        : "<p>No hay reportes pendientes.</p>";
}

function revisarReporte(id) {
    const reporte = datos.reportes.find(r => r.id === Number(id));
    if (!reporte) return;

    reporte.revisado = true;

    guardarDatos();
    renderizarAdmin();
    notificar("Reporte marcado como revisado.");
}

/* =====================================
   INICIO
===================================== */

mostrarPantalla("pantallaLogin");
