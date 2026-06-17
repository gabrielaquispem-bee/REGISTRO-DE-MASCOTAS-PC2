// CONFIGURACIÓN DE CREDENCIALES DE TU PROYECTO DE SUPABASE
const SUPABASE_URL = "https://cozwiiezfkzgidivlamd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_muj_5eJZQMX_neliIphTcA_GmaACXfc";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// CAPTURA DE COMPONENTES DEL DOM
const petForm = document.getElementById('petForm');
const speciesSelect = document.getElementById('speciesSelect');
const breedSelect = document.getElementById('breedSelect');
const attentionSelect = document.getElementById('attentionSelect');
const medicalSelect = document.getElementById('medicalSelect');
const filterSpecies = document.getElementById('filterSpecies');
const petsTableBody = document.getElementById('petsTableBody');
const tableLoader = document.getElementById('tableLoader');
const responseMessage = document.getElementById('responseMessage');
const btnSubmit = document.getElementById('btnSubmit');

// Almacén global local para no sobrecargar de peticiones a Supabase al filtrar
let databaseMascotas = [];

// ==========================================================================
// 1. CONSUMIR TABLAS CATÁLOGO OBLIGATORIAS DESDE SUPABASE
// ==========================================================================
async function inicializarCatalogos() {
    try {
        const { data: listEspecies } = await _supabase.from('especies').select('*');
        const { data: listRazas } = await _supabase.from('razas').select('*');
        const { data: listAtenciones } = await _supabase.from('tipos_atencion').select('*');
        const { data: listCondiciones } = await _supabase.from('condiciones_medicas').select('*');

        // Llenar select de Especies en el formulario
        speciesSelect.innerHTML = '<option value="">-- Especie --</option>';
        listEspecies.forEach(e => {
            speciesSelect.innerHTML += `<option value="${e.id}">${e.nombre}</option>`;
        });

        // Llenar select de Especies para el FILTRO OBLIGATORIO (Incluye la opción "Todos")
        filterSpecies.innerHTML = '<option value="TODOS">🐾 Mostrar Todos</option>';
        listEspecies.forEach(e => {
            filterSpecies.innerHTML += `<option value="${e.nombre}">${e.nombre}</option>`;
        });

        // Llenar select de Razas
        breedSelect.innerHTML = '<option value="">-- Raza --</option>';
        listRazas.forEach(r => {
            breedSelect.innerHTML += `<option value="${r.id}">${r.nombre}</option>`;
        });

        // Llenar select de Tipos de Atención
        attentionSelect.innerHTML = '<option value="">-- Atención --</option>';
        listAtenciones.forEach(a => {
            attentionSelect.innerHTML += `<option value="${a.id}">${a.nombre}</option>`;
        });

        // Llenar select de Condiciones Médicas
        medicalSelect.innerHTML = '<option value="">-- Condición --</option>';
        listCondiciones.forEach(c => {
            medicalSelect.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

    } catch (error) {
        console.error("Fallo crítico cargando catálogos del examen:", error);
    }
}

// ==========================================================================
// 2. LISTAR REGISTROS (Mascotas registradas con sus JOINS correspondientes)
// ==========================================================================
async function cargarMascotasRegistradas() {
    try {
        tableLoader.textContent = "Accediendo al historial clínico cloud...";
        tableLoader.classList.remove('hidden');

        // Realizamos el JOIN multidireccional con las 4 tablas catálogo
        const { data, error } = await _supabase
            .from('mascotas')
            .select(`
                id, nombre_mascota, edad_mascota, peso,
                nombre_dueno, apellido_dueno, dni_dueno, celular, correo, observaciones,
                especies(nombre),
                razas(nombre),
                tipos_atencion(nombre),
                condiciones_medicas(nombre)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        databaseMascotas = data; // Guardamos en la caché global interna
        renderizarTablaMascotas(databaseMascotas);

    } catch (error) {
        console.error("Error al traer registros:", error);
        tableLoader.textContent = "Error de sincronización de datos.";
    }
}

function renderizarTablaMascotas(listaMascotas) {
    petsTableBody.innerHTML = "";

    if (listaMascotas.length === 0) {
        tableLoader.textContent = "No hay registros clínicos que coincidan.";
        tableLoader.classList.remove('hidden');
        return;
    }

    tableLoader.classList.add('hidden');

    listaMascotas.forEach(m => {
        const row = document.createElement('tr');
        
        // Mapeamos los datos de dueños y mascotas requeridos en el listado
        row.innerHTML = `
            <td><strong>${m.nombre_mascota}</strong></td>
            <td>${m.edad_mascota} años</td>
            <td>${parseFloat(m.peso).toFixed(2)} Kg</td>
            <td>${m.nombre_dueno} ${m.apellido_dueno}</td>
            <td><code>${m.dni_dueno}</code></td>
            <td>${m.celular}</td>
            <td>${m.especies ? m.especies.nombre : 'N/A'}</td>
            <td>${m.razas ? m.razas.nombre : 'N/A'}</td>
            <td>${m.tipos_atencion ? m.tipos_atencion.nombre : 'N/A'}</td>
            <td><code>${m.condiciones_medicas ? m.condiciones_medicas.nombre : 'N/A'}</code></td>
        `;
        petsTableBody.appendChild(row);
    });
}

// ==========================================================================
// 3. REGISTRAR DATOS MEDIANTE EL FORMULARIO
// ==========================================================================
petForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Sincronizando paciente...";
    responseMessage.className = "hidden";

    // Captura de entradas textuales y numéricas
    const petName = document.getElementById('petName').value;
    const petAge = document.getElementById('petAge').value;
    const petWeight = document.getElementById('petWeight').value;
    const ownerFirstName = document.getElementById('ownerFirstName').value;
    const ownerLastName = document.getElementById('ownerLastName').value;
    const ownerDni = document.getElementById('ownerDni').value;
    const ownerPhone = document.getElementById('ownerPhone').value;
    const ownerEmail = document.getElementById('ownerEmail').value;
    const observations = document.getElementById('observations').value;

    // IDs foráneos seleccionados
    const especieId = speciesSelect.value;
    const razaId = breedSelect.value;
    const atencionId = attentionSelect.value;
    const condicionId = medicalSelect.value;

    try {
        const { error } = await _supabase
            .from('mascotas')
            .insert([
                {
                    nombre_mascota: petName,
                    edad_mascota: parseInt(petAge),
                    peso: parseFloat(petWeight),
                    nombre_dueno: ownerFirstName,
                    apellido_dueno: ownerLastName,
                    dni_dueno: ownerDni,
                    celular: ownerPhone,
                    correo: ownerEmail,
                    id_especie: parseInt(especieId),
                    id_raza: parseInt(razaId),
                    id_tipo_atencion: parseInt(atencionId),
                    id_condicion_medica: parseInt(condicionId),
                    observaciones: observations
                }
            ]);

        if (error) throw error;

        responseMessage.textContent = "¡Historial de mascota registrado exitosamente en la nube!";
        responseMessage.className = "success";
        petForm.reset();

        // Refrescar automáticamente la tabla para ver el nuevo registro insertado
        await cargarMascotasRegistradas();

    } catch (err) {
        console.error("Error al insertar mascota:", err);
        responseMessage.textContent = `Fallo: ${err.message || 'Compruebe conexión de red'}`;
        responseMessage.className = "error";
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Registrar Mascota";
    }
});

// ==========================================================================
// 4. FILTRO OBLIGATORIO POR ESPECIE (TRAÍDO DESDE CATÁLOGO)
// ==========================================================================
filterSpecies.addEventListener('change', (e) => {
    const seleccion = e.target.value;

    if (seleccion === "TODOS") {
        renderizarTablaMascotas(databaseMascotas);
    } else {
        // Filtramos contrastando con la propiedad relacional inyectada por el JOIN (.especies.nombre)
        const mascotasFiltradas = databaseMascotas.filter(m => m.especies && m.especies.nombre === seleccion);
        renderizarTablaMascotas(mascotasFiltradas);
    }
});

// CICLO DE INICIO: Levantar toda la data relacional al abrir la página web
window.addEventListener('DOMContentLoaded', () => {
    inicializarCatalogos();
    cargarMascotasRegistradas();
});
